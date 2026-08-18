import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from './client';

export class CampaignDispatcher {
  /**
   * Resolves target contacts for a campaign based on inclusion/exclusion filter
   */
  static async getTargetContacts(audienceFilterJson: string) {
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

    // 1. Fetch all active contacts with their groups and tags
    const allActiveContacts = await prisma.contact.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        groups: true,
        tags: true,
      },
    });

    if (filter.sendToAll) {
      // If sendToAll is true, still apply exclusion rules
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

      // Check Inclusion (Match ANY included group OR ANY included tag)
      const matchesGroup = cGroupIds.some((gId) => includeGroupSet.has(gId));
      const matchesTag = cTagIds.some((tId) => includeTagSet.has(tId));

      const isIncluded = (includeGroupSet.size === 0 && includeTagSet.size === 0) || matchesGroup || matchesTag;

      if (!isIncluded) return false;

      // Check Exclusion
      const isExcluded =
        cGroupIds.some((gId) => excludeGroupSet.has(gId)) ||
        cTagIds.some((tId) => excludeTagSet.has(tId));

      return !isExcluded;
    });
  }

  /**
   * Interpolate variable mapping values for a single contact
   */
  static resolveVariableValues(
    contact: any,
    mappings: Record<string, string>,
    templateComponents?: any[] | string
  ): { bodyVars: string[]; headerVars: string[] } {
    let customAttrs: Record<string, any> = {};
    try {
      customAttrs = contact.customAttributes ? JSON.parse(contact.customAttributes) : {};
    } catch {
      customAttrs = {};
    }

    let parsedComponents: any[] = [];
    try {
      if (typeof templateComponents === 'string') {
        parsedComponents = JSON.parse(templateComponents);
      } else if (Array.isArray(templateComponents)) {
        parsedComponents = templateComponents;
      }
    } catch {}

    const bodyComp = parsedComponents.find((c) => c && c.type === 'BODY');
    const headerComp = parsedComponents.find((c) => c && c.type === 'HEADER');

    const expectedBodyVarsCount = bodyComp?.text
      ? (bodyComp.text.match(/{{\d+}}/g) || []).length
      : 0;
    const expectedHeaderVarsCount =
      headerComp?.format === 'TEXT' && headerComp.text
        ? (headerComp.text.match(/{{\d+}}/g) || []).length
        : 0;

    const evalField = (field: string) => {
      if (!field) return '-';
      if (field === 'firstName') return contact.firstName || contact.name || 'Customer';
      if (field === 'lastName') return contact.lastName || '';
      if (field === 'fullName') return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.name || 'Customer';
      if (field === 'phoneNumber') return contact.phoneNumber || '';
      if (field === 'email') return contact.email || '';
      if (field.startsWith('custom.')) {
        const attrName = field.replace('custom.', '');
        return customAttrs[attrName] !== undefined ? String(customAttrs[attrName]) : '-';
      }
      return field; // Static text fallback
    };

    const bodyVars: string[] = [];
    const headerVars: string[] = [];

    // Only populate body variables if the template actually has placeholders
    if (expectedBodyVarsCount > 0) {
      for (let i = 1; i <= expectedBodyVarsCount; i++) {
        const key = String(i);
        const mappedField = mappings[key] || mappings[`body_${i}`] || 'fullName';
        bodyVars.push(evalField(mappedField));
      }
    }

    // Only populate header variables if the template header is text and has placeholders
    if (expectedHeaderVarsCount > 0) {
      for (let i = 1; i <= expectedHeaderVarsCount; i++) {
        const key = `header_${i}`;
        const mappedField = mappings[key] || mappings['header_1'] || 'fullName';
        headerVars.push(evalField(mappedField));
      }
    }

    return { bodyVars, headerVars };
  }

  /**
   * Run and dispatch campaign messages
   */
  static async startCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });

    if (!campaign) throw new Error('Campaign not found');

    // Update status to RUNNING
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const rateLimit = settings?.rateLimitPerSecond || 20;
    const delayMs = Math.max(20, Math.floor(1000 / rateLimit));

    const client = await WhatsAppClient.createFromSettings();
    const contacts = await this.getTargetContacts(campaign.audienceFilter);

    let mappings: Record<string, string> = {};
    try {
      mappings = JSON.parse(campaign.variableMappings || '{}');
    } catch {
      mappings = {};
    }

    // Update total count
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalContacts: contacts.length },
    });

    let sentCount = 0;
    let failedCount = 0;

    // Asynchronously dispatch messages
    (async () => {
      for (const contact of contacts) {
        // Check if campaign was paused/cancelled
        const currentCampaignState = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { status: true },
        });

        if (
          currentCampaignState?.status === 'PAUSED' ||
          currentCampaignState?.status === 'CANCELLED'
        ) {
          break;
        }

        const { bodyVars, headerVars } = this.resolveVariableValues(
          contact,
          mappings,
          campaign.template.components
        );

        let msgRecord = await prisma.campaignMessage.create({
          data: {
            campaignId: campaign.id,
            contactId: contact.id,
            phoneNumber: contact.phoneNumber,
            status: 'PENDING',
          },
        });

        try {
          const sendRes = await client.sendTemplateMessage({
            to: contact.phoneNumber,
            templateName: campaign.template.name,
            languageCode: campaign.template.language,
            headerMediaUrl: campaign.headerMediaUrl || undefined,
            headerVariables: headerVars,
            bodyVariables: bodyVars,
            templateComponents: campaign.template.components,
          });

          const wamid = sendRes.messages?.[0]?.id || null;

          await prisma.campaignMessage.update({
            where: { id: msgRecord.id },
            data: {
              status: 'SENT',
              wamid: wamid,
              sentAt: new Date(),
            },
          });

          sentCount++;

          // In Mock Mode, simulate real delivery and read progression after a short delay
          if (settings?.isMockMode && wamid) {
            setTimeout(async () => {
              try {
                await prisma.campaignMessage.update({
                  where: { id: msgRecord.id },
                  data: {
                    status: 'DELIVERED',
                    deliveredAt: new Date(),
                  },
                });
                await prisma.campaign.update({
                  where: { id: campaignId },
                  data: { deliveredCount: { increment: 1 } },
                });
              } catch {}
            }, 1200);

            // 70% chance of opening / reading
            if (Math.random() > 0.3) {
              setTimeout(async () => {
                try {
                  await prisma.campaignMessage.update({
                    where: { id: msgRecord.id },
                    data: {
                      status: 'READ',
                      readAt: new Date(),
                    },
                  });
                  await prisma.campaign.update({
                    where: { id: campaignId },
                    data: { readCount: { increment: 1 } },
                  });
                } catch {}
              }, 2800);
            }

            // 20% chance of replying
            if (Math.random() > 0.8) {
              setTimeout(async () => {
                try {
                  await prisma.campaignMessage.update({
                    where: { id: msgRecord.id },
                    data: {
                      status: 'REPLIED',
                      repliedAt: new Date(),
                    },
                  });
                  await prisma.campaign.update({
                    where: { id: campaignId },
                    data: { repliedCount: { increment: 1 } },
                  });
                  // Add inbound message to chat
                  await prisma.chatMessage.create({
                    data: {
                      contactId: contact.id,
                      phoneNumber: contact.phoneNumber,
                      direction: 'INBOUND',
                      messageType: 'text',
                      body: 'Thanks for the update! Can I get more details on this?',
                      status: 'DELIVERED',
                    },
                  });
                } catch {}
              }, 4500);
            }
          }
        } catch (err: any) {
          failedCount++;
          await prisma.campaignMessage.update({
            where: { id: msgRecord.id },
            data: {
              status: 'FAILED',
              errorCode: String(err.code || 'UNKNOWN'),
              errorMessage: err.message,
              failedAt: new Date(),
            },
          });
        }

        // Update campaign live counter
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            sentCount,
            failedCount,
          },
        });

        // Throttle
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      // Mark complete
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    })();
  }
}
