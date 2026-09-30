import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { sanitizePhoneNumber } from '@/lib/whatsapp/phone';
import { logger } from '@/lib/logger';
import { campaignDispatchEnabled } from '@/lib/feature-gates';
import { enqueueOutboundWebhook } from './outbound-webhooks';

// In-memory token bucket for campaign pacing
class TokenBucket {
  private capacity: number;
  private tokens: number;
  private lastRefill: number;
  private refillRate: number; // tokens per ms

  constructor(ratePerSecond: number) {
    this.capacity = Math.max(1, ratePerSecond);
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
    this.refillRate = this.capacity / 1000;
  }

  async acquire(): Promise<void> {
    while (true) {
      const now = Date.now();
      const elapsed = now - this.lastRefill;
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
      this.lastRefill = now;

      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }

      const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTime, 100)));
    }
  }
}

export interface AudienceFilter {
  sendToAll?: boolean;
  includeGroups?: string[];
  includeTags?: string[];
  excludeGroups?: string[];
  excludeTags?: string[];
}

/** True when marketing templates may only go to contacts with a recorded consent source. */
export function consentRequiredForMarketing(): boolean {
  return process.env.REQUIRE_CONSENT_FOR_MARKETING?.trim().toLowerCase() === 'on';
}

/**
 * Parses the stored audience filter. Never falls back to "everyone": unparsable
 * JSON is reported as invalid so the caller can stop.
 */
export function parseAudienceFilter(
  json: string | null | undefined
): { valid: true; filter: AudienceFilter } | { valid: false } {
  try {
    const parsed = JSON.parse(json || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { valid: false };
    return { valid: true, filter: parsed as AudienceFilter };
  } catch {
    return { valid: false };
  }
}

const ids = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];

/**
 * Builds the database condition for an audience. Returns null when the filter selects
 * nobody (empty filter, or invalid JSON) so the result fails closed.
 * Only ACTIVE contacts are ever included and exclusions always apply.
 */
export function buildAudienceWhere(
  audienceFilterJson: string,
  opts: { requireConsent?: boolean } = {}
): Record<string, any> | null {
  const parsed = parseAudienceFilter(audienceFilterJson);
  if (!parsed.valid) return null;
  const f = parsed.filter;
  const includeGroups = ids(f.includeGroups);
  const includeTags = ids(f.includeTags);
  const excludeGroups = ids(f.excludeGroups);
  const excludeTags = ids(f.excludeTags);

  const and: Record<string, any>[] = [{ status: 'ACTIVE' }];

  if (f.sendToAll !== true) {
    const anyOf: Record<string, any>[] = [];
    if (includeGroups.length) anyOf.push({ groups: { some: { groupId: { in: includeGroups } } } });
    if (includeTags.length) anyOf.push({ tags: { some: { tagId: { in: includeTags } } } });
    if (anyOf.length === 0) return null; // empty filter: nobody
    and.push({ OR: anyOf });
  }

  const not: Record<string, any>[] = [];
  if (excludeGroups.length) not.push({ groups: { some: { groupId: { in: excludeGroups } } } });
  if (excludeTags.length) not.push({ tags: { some: { tagId: { in: excludeTags } } } });
  if (not.length) and.push({ NOT: not });

  if (opts.requireConsent) and.push({ consentSource: { not: null } }, { NOT: { consentSource: '' } });

  return { AND: and };
}

/**
 * The single audience resolver, used by both the preview and the dispatcher, so what
 * is previewed is exactly what is sent. Fails closed: empty or invalid filters give [].
 */
export async function getTargetContacts(audienceFilterJson: string, opts: { requireConsent?: boolean } = {}) {
  const where = buildAudienceWhere(audienceFilterJson, opts);
  if (!where) return [];
  return prisma.contact.findMany({
    where,
    select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true, consentSource: true },
    orderBy: { id: 'asc' },
  });
}

/**
 * Executes or resumes a campaign dispatch job
 */
export async function dispatchCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  // Checked before the state-machine lock so a held campaign is left exactly as it was.
  if (!campaignDispatchEnabled()) {
    logger.warn({ campaignId }, '[Dispatcher] Campaign dispatch is held (CAMPAIGN_DISPATCH is not "on") - nothing sent')
    return { success: false, error: 'Campaign dispatch is disabled' }
  }

  logger.info({ campaignId }, '[Dispatcher] Starting campaign dispatch');

  // 1. Atomic state machine lock: transition from DRAFT/QUEUED/PAUSED/SCHEDULED to RUNNING.
  //    RUNNING is intentionally NOT in the where list — a campaign that is already
  //    running can never be locked again, so concurrent dispatch attempts fail here.
  const lockResult = await prisma.campaign.updateMany({
    where: {
      id: campaignId,
      status: { in: ['DRAFT', 'QUEUED', 'PAUSED', 'SCHEDULED'] },
    },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  if (lockResult.count === 0) {
    logger.warn({ campaignId }, '[Dispatcher] Campaign could not be locked or is already completed/cancelled');
    return { success: false, error: 'Campaign is not in a dispatchable state' };
  }

  try {
    // 2. Fetch Campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });

    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    // 3. Fetch Settings & Client
    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const rateLimit = settings?.rateLimitPerSecond || 20;
    const bucket = new TokenBucket(rateLimit);
    const client = await WhatsAppClient.createFromSettings();

    // 4. Resolve Target Audience Contacts
    if (!parseAudienceFilter(campaign.audienceFilter).valid) {
      logger.error({ campaignId, audienceFilter: campaign.audienceFilter }, '[Dispatcher] Invalid audienceFilter JSON - aborting to prevent accidental broadcast');
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'FAILED' },
      });
      return { success: false, error: 'Invalid audience filter configuration' };
    }

    // Same resolver as the preview. Marketing templates skip contacts with no recorded
    // consent when REQUIRE_CONSENT_FOR_MARKETING=on (default off).
    const requireConsent = consentRequiredForMarketing() && campaign.template?.category === 'MARKETING';
    const targetContacts = await getTargetContacts(campaign.audienceFilter || '{}', { requireConsent });

    // 5. Populate CampaignMessage records idempotently (skip duplicates)
    if (targetContacts.length > 0) {
      const messageRows = targetContacts.map((contact) => ({
        campaignId: campaign.id,
        contactId: contact.id,
        phoneNumber: sanitizePhoneNumber(contact.phoneNumber).e164 || contact.phoneNumber,
        status: 'PENDING',
      }));

      // Upsert ensures no duplicate rows for (campaignId, contactId) across both SQLite and PostgreSQL
      for (const row of messageRows) {
        if (row.contactId) {
          await prisma.campaignMessage.upsert({
            where: {
              campaignId_contactId: {
                campaignId: row.campaignId,
                contactId: row.contactId,
              },
            },
            update: {},
            create: row,
          }).catch((err) => {
            logger.warn({ error: err.message, campaignId: row.campaignId, contactId: row.contactId }, '[Dispatcher] Failed to upsert campaign message row');
          });
        }
      }

      // Update totalContacts count — preserve original count on resume
      if (campaign.totalContacts === 0 || targetContacts.length > campaign.totalContacts) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { totalContacts: targetContacts.length },
        });
      }
    }

    // 6. Fetch pending messages to dispatch (Resumes only PENDING messages)
    const pendingMessages = await prisma.campaignMessage.findMany({
      where: {
        campaignId: campaign.id,
        status: 'PENDING',
      },
      include: { contact: true },
    });

    logger.info({ campaignId, pendingCount: pendingMessages.length }, '[Dispatcher] Processing pending messages');

    let variableMappings: Record<string, string> = {};
    try {
      variableMappings = JSON.parse(campaign.variableMappings || '{}');
    } catch {}

    // 7. Dispatch Loop
    for (const msg of pendingMessages) {
      // Check if campaign was paused or cancelled mid-flight
      const currentCampaign = await prisma.campaign.findUnique({
        where: { id: campaign.id },
        select: { status: true },
      });

      if (currentCampaign?.status === 'PAUSED' || currentCampaign?.status === 'CANCELLED') {
        logger.info({ campaignId, status: currentCampaign.status }, '[Dispatcher] Dispatch interrupted by user action');
        return { success: true };
      }

      // Check contact active status
      if (msg.contact && msg.contact.status !== 'ACTIVE') {
        await prisma.campaignMessage.update({
          where: { id: msg.id },
          data: {
            status: 'FAILED',
            errorCode: 'SUPPRESSED',
            errorMessage: 'Contact is unsubscribed or blocked',
            failedAt: new Date(),
          },
        });
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { failedCount: { increment: 1 } },
        });
        continue;
      }

      // Rate limiter pacing
      await bucket.acquire();

      // Transition to SENDING
      await prisma.campaignMessage.update({
        where: { id: msg.id },
        data: { status: 'SENDING' },
      });

      // Resolve dynamic template parameters
      const contactData: Record<string, any> = {
        firstName: msg.contact?.firstName || 'Customer',
        lastName: msg.contact?.lastName || '',
        fullName: `${msg.contact?.firstName || ''} ${msg.contact?.lastName || ''}`.trim() || 'Customer',
        phone: msg.phoneNumber,
        email: msg.contact?.email || '',
      };

      if (msg.contact?.customAttributes) {
        try {
          const custom = JSON.parse(msg.contact.customAttributes);
          Object.assign(contactData, custom);
        } catch {}
      }

      // Build body variable parameters
      const bodyParameters: string[] = [];
      const keys = Object.keys(variableMappings).filter((k) => k !== 'header' && !isNaN(Number(k)));
      keys.sort((a, b) => Number(a) - Number(b));

      for (const k of keys) {
        const fieldName = variableMappings[k];
        const val = contactData[fieldName] !== undefined ? String(contactData[fieldName]) : '';
        bodyParameters.push(val || 'Valued Customer');
      }

      // Build header text-variable parameters (mappings keyed header_1..header_3)
      const headerParameters: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const fieldName = variableMappings[`header_${i}`];
        if (!fieldName) break;
        const val = contactData[fieldName] !== undefined ? String(contactData[fieldName]) : '';
        headerParameters.push(val || 'Valued Customer');
      }

      try {
        const sendResult = await client.sendTemplateMessage({
          to: msg.phoneNumber,
          templateName: campaign.template.name,
          languageCode: campaign.template.language || 'en_US',
          headerMediaUrl: campaign.headerMediaUrl || undefined,
          headerVariables: headerParameters.length > 0 ? headerParameters : undefined,
          bodyVariables: bodyParameters,
          templateComponents: campaign.template.components,
        });

        if (sendResult.messages?.[0]?.id) {
          const wamid = sendResult.messages[0].id;
          await prisma.campaignMessage.update({
            where: { id: msg.id },
            data: {
              wamid,
              status: 'SENT',
              sentAt: new Date(),
            },
          });
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { sentCount: { increment: 1 } },
          });

          // Mirror to ChatMessage table for inbox visibility
          if (msg.contactId) {
            try {
              const conversation = await prisma.conversation.upsert({
                where: { contactId: msg.contactId },
                update: { lastMessageAt: new Date() },
                create: {
                  contactId: msg.contactId,
                  status: 'OPEN',
                  lastMessageAt: new Date(),
                  unreadCount: 0,
                },
              });
              await prisma.chatMessage.create({
                data: {
                  contactId: msg.contactId,
                  conversationId: conversation.id,
                  phoneNumber: msg.phoneNumber,
                  direction: 'OUTBOUND',
                  wamid,
                  messageType: 'template',
                  body: `[Campaign: ${campaign.name}] Template: ${campaign.template.name}`,
                  status: 'SENT',
                },
              });
            } catch (chatErr: any) {
              logger.warn({ error: chatErr.message, phone: msg.phoneNumber }, '[Dispatcher] Failed to mirror message to ChatMessage table');
            }
          }
        } else {
          throw new Error('No message ID returned from Meta API');
        }
      } catch (sendError: any) {
        logger.error({ error: sendError.message, phone: msg.phoneNumber }, '[Dispatcher] Send failed');
        await prisma.campaignMessage.update({
          where: { id: msg.id },
          data: {
            status: 'FAILED',
            errorMessage: sendError.message || 'Failed to dispatch',
            failedAt: new Date(),
          },
        });
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { failedCount: { increment: 1 } },
        });
      }
    }

    // 8. Reconcile and Mark COMPLETED
    const remainingPending = await prisma.campaignMessage.count({
      where: { campaignId: campaign.id, status: { in: ['PENDING', 'SENDING'] } },
    });

    if (remainingPending === 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      logger.info({ campaignId }, '[Dispatcher] Campaign completed successfully');
      const final = await prisma.campaign.findUnique({
        where: { id: campaign.id },
        select: { name: true, sentCount: true, deliveredCount: true, readCount: true, failedCount: true },
      });
      await enqueueOutboundWebhook('campaign.completed', {
        campaignId: campaign.id,
        name: final?.name ?? campaign.name,
        sent: final?.sentCount ?? 0,
        delivered: final?.deliveredCount ?? 0,
        read: final?.readCount ?? 0,
        failed: final?.failedCount ?? 0,
      }).catch((err) => logger.warn({ campaignId, error: err?.message }, '[Dispatcher] campaign.completed webhook enqueue failed'));

    }

    return { success: true };
  } catch (error: any) {
    logger.error({ campaignId, error: error.message }, '[Dispatcher] Fatal error during dispatch');
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'FAILED' },
    }).catch(() => {});
    return { success: false, error: error.message };
  }
}
