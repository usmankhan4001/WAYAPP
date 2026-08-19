import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { sanitizePhoneNumber } from '@/lib/whatsapp/phone';
import { logger } from '@/lib/logger';

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

/**
 * Resolves target contacts for a campaign based on inclusion/exclusion filter.
 * Supports sendToAll, include/exclude groups & tags.
 */
export async function getTargetContacts(audienceFilterJson: string) {
  let filter: {
    sendToAll?: boolean;
    includeGroups?: string[];
    includeTags?: string[];
    excludeGroups?: string[];
    excludeTags?: string[];
  } = {};

  try {
    filter = JSON.parse(audienceFilterJson || '{}');
  } catch {
    filter = { sendToAll: true };
  }

  const allActiveContacts = await prisma.contact.findMany({
    where: { status: 'ACTIVE' },
    include: {
      groups: true,
      tags: true,
    },
  });

  if (filter.sendToAll) {
    return allActiveContacts.filter((c) => {
      const cGroupIds = c.groups.map((g) => g.groupId);
      const cTagIds = c.tags.map((t) => t.tagId);

      const isExcludedByGroup =
        filter.excludeGroups && filter.excludeGroups.some((gId) => cGroupIds.includes(gId));
      const isExcludedByTag =
        filter.excludeTags && filter.excludeTags.some((tId) => cTagIds.includes(tId));

      return !isExcludedByGroup && !isExcludedByTag;
    });
  }

  const includeGroupSet = new Set(filter.includeGroups || []);
  const includeTagSet = new Set(filter.includeTags || []);
  const excludeGroupSet = new Set(filter.excludeGroups || []);
  const excludeTagSet = new Set(filter.excludeTags || []);

  return allActiveContacts.filter((c) => {
    const cGroupIds = c.groups.map((g) => g.groupId);
    const cTagIds = c.tags.map((t) => t.tagId);

    const matchesGroup = cGroupIds.some((gId) => includeGroupSet.has(gId));
    const matchesTag = cTagIds.some((tId) => includeTagSet.has(tId));
    const isIncluded = (includeGroupSet.size === 0 && includeTagSet.size === 0) || matchesGroup || matchesTag;

    if (!isIncluded) return false;

    const isExcluded =
      cGroupIds.some((gId) => excludeGroupSet.has(gId)) ||
      cTagIds.some((tId) => excludeTagSet.has(tId));

    return !isExcluded;
  });
}

/**
 * Executes or resumes a campaign dispatch job
 */
export async function dispatchCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
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
    let audienceFilter: any = {};
    try {
      audienceFilter = JSON.parse(campaign.audienceFilter || '{}');
    } catch {}

    const contactWhere: any = {
      status: 'ACTIVE', // Enforce suppression
    };

    if (audienceFilter.groupId) {
      contactWhere.groups = { some: { groupId: audienceFilter.groupId } };
    }
    if (audienceFilter.tagId) {
      contactWhere.tags = { some: { tagId: audienceFilter.tagId } };
    }

    const targetContacts = await prisma.contact.findMany({
      where: contactWhere,
    });

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
          }).catch(() => {});
        }
      }

      // Update totalContacts count
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { totalContacts: targetContacts.length },
      });
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
