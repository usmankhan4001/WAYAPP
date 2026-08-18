import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from './client';

export interface TriggerConfig {
  matchType: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'REGEX' | 'ANY_INBOUND';
  keywords: string[];
}

export interface AutomationAction {
  type: 'SEND_TEXT' | 'SEND_TEMPLATE' | 'ADD_TAG' | 'ASSIGN_GROUP';
  payload: {
    text?: string;
    templateName?: string;
    templateLanguage?: string;
    tagName?: string;
    groupId?: string;
  };
}

/**
 * Evaluates inbound customer message against all active automations
 */
export async function processInboundAutomation(params: {
  contactId: string;
  phoneNumber: string;
  bodyText: string;
}) {
  const { contactId, phoneNumber, bodyText } = params;
  const cleanInput = bodyText.trim().toLowerCase();

  try {
    const activeAutomations = await prisma.automation.findMany({
      where: { isActive: true },
    });

    if (activeAutomations.length === 0) return;

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    const client = new WhatsAppClient({
      wabaId: settings?.wabaId || undefined,
      phoneNumberId: settings?.phoneNumberId || undefined,
      accessToken: settings?.accessToken || undefined,
      isMockMode: settings?.isMockMode ?? false,
    });

    for (const auto of activeAutomations) {
      let isMatch = false;
      let config: TriggerConfig = { matchType: 'CONTAINS', keywords: [] };

      try {
        config = JSON.parse(auto.triggerConfig);
      } catch {
        continue;
      }

      if (config.matchType === 'ANY_INBOUND') {
        isMatch = true;
      } else if (config.keywords && config.keywords.length > 0) {
        for (const kw of config.keywords) {
          const cleanKw = kw.trim().toLowerCase();
          if (!cleanKw) continue;

          if (config.matchType === 'EXACT' && cleanInput === cleanKw) {
            isMatch = true;
            break;
          } else if (config.matchType === 'CONTAINS' && cleanInput.includes(cleanKw)) {
            isMatch = true;
            break;
          } else if (config.matchType === 'STARTS_WITH' && cleanInput.startsWith(cleanKw)) {
            isMatch = true;
            break;
          } else if (config.matchType === 'REGEX') {
            try {
              const rx = new RegExp(cleanKw, 'i');
              if (rx.test(cleanInput)) {
                isMatch = true;
                break;
              }
            } catch {}
          }
        }
      }

      if (!isMatch) continue;

      // Match found! Execute actions
      let actions: AutomationAction[] = [];
      try {
        actions = JSON.parse(auto.actionsJson);
      } catch {
        continue;
      }

      for (const act of actions) {
        try {
          if (act.type === 'SEND_TEXT' && act.payload.text) {
            const sendResult = await client.sendTextMessage(phoneNumber, act.payload.text);

            // Log ChatMessage
            const wamid = sendResult.messages?.[0]?.id || `auto_${Date.now()}`;
            await prisma.chatMessage.create({
              data: {
                contactId,
                phoneNumber,
                direction: 'OUTBOUND',
                wamid,
                messageType: 'text',
                body: act.payload.text,
                status: 'DELIVERED',
              },
            });

            await prisma.automationLog.create({
              data: {
                automationId: auto.id,
                contactId,
                phoneNumber,
                triggerInput: bodyText,
                actionTaken: `Sent Auto-Reply Text: "${act.payload.text.substring(0, 40)}..."`,
                status: 'SUCCESS',
              },
            });
          } else if (act.type === 'SEND_TEMPLATE' && act.payload.templateName) {
            const sendResult = await client.sendTemplateMessage({
              to: phoneNumber,
              templateName: act.payload.templateName,
              languageCode: act.payload.templateLanguage || 'en_US',
            });

            const templateWamid = sendResult.messages?.[0]?.id || `auto_tpl_${Date.now()}`;
            await prisma.chatMessage.create({
              data: {
                contactId,
                phoneNumber,
                direction: 'OUTBOUND',
                wamid: templateWamid,
                messageType: 'template',
                body: `[Template: ${act.payload.templateName}]`,
                status: 'DELIVERED',
              },
            });

            await prisma.automationLog.create({
              data: {
                automationId: auto.id,
                contactId,
                phoneNumber,
                triggerInput: bodyText,
                actionTaken: `Dispatched Template: ${act.payload.templateName}`,
                status: 'SUCCESS',
              },
            });
          } else if (act.type === 'ADD_TAG' && act.payload.tagName) {
            const tag = await prisma.tag.upsert({
              where: { name: act.payload.tagName.trim() },
              update: {},
              create: { name: act.payload.tagName.trim(), color: '#10b981' },
            });

            await prisma.contactsOnTags.upsert({
              where: {
                contactId_tagId: {
                  contactId,
                  tagId: tag.id,
                },
              },
              update: {},
              create: { contactId, tagId: tag.id },
            });

            await prisma.automationLog.create({
              data: {
                automationId: auto.id,
                contactId,
                phoneNumber,
                triggerInput: bodyText,
                actionTaken: `Added Tag: ${act.payload.tagName}`,
                status: 'SUCCESS',
              },
            });
          } else if (act.type === 'ASSIGN_GROUP' && act.payload.groupId) {
            await prisma.contactsOnGroups.upsert({
              where: {
                contactId_groupId: {
                  contactId,
                  groupId: act.payload.groupId,
                },
              },
              update: {},
              create: { contactId, groupId: act.payload.groupId },
            });

            await prisma.automationLog.create({
              data: {
                automationId: auto.id,
                contactId,
                phoneNumber,
                triggerInput: bodyText,
                actionTaken: `Assigned to Group ID: ${act.payload.groupId}`,
                status: 'SUCCESS',
              },
            });
          }
        } catch (actErr: any) {
          await prisma.automationLog.create({
            data: {
              automationId: auto.id,
              contactId,
              phoneNumber,
              triggerInput: bodyText,
              actionTaken: `Failed action: ${act.type}`,
              status: 'FAILED',
              errorMessage: actErr.message,
            },
          });
        }
      }

      // Update execution counter
      await prisma.automation.update({
        where: { id: auto.id },
        data: {
          executionCount: { increment: 1 },
          lastTriggeredAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.error('Error in automation executor:', err);
  }
}
