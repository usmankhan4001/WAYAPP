import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from './client';
import { SendTemplateMessageParams, MetaSendResponse } from './types';
import { checkMarketingEligibility } from './marketing-eligibility';
import { logger } from '@/lib/logger';

export type MessageChannel = 'CLOUD_API' | 'MARKETING_MESSAGES_API';
export type OptimizationMode = 'AUTO' | 'OPTIMIZED' | 'STANDARD';

export interface RouteMessageParams {
  contactId?: string;
  phoneNumber: string;
  campaignId?: string;
  templateName: string;
  languageCode?: string;
  templateCategory?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  templateStatus?: string;
  headerMediaUrl?: string;
  headerVariables?: string[];
  bodyVariables?: string[];
  templateComponents?: any;
  optimizationMode?: OptimizationMode;
}

export interface RouteMessageResult {
  success: boolean;
  channel: MessageChannel;
  wamid?: string;
  messageStatus?: string;
  error?: string;
  suppressed?: boolean;
}

export class MessageRouter {
  /**
   * Evaluates campaign settings, recipient eligibility, and routes outbound template messages
   * to either Meta Marketing Messages API or Cloud API.
   */
  static async routeAndSend(params: RouteMessageParams): Promise<RouteMessageResult> {
    const {
      contactId,
      phoneNumber,
      campaignId,
      templateName,
      languageCode = 'en_US',
      templateCategory = 'MARKETING',
      templateStatus = 'APPROVED',
      headerMediaUrl,
      headerVariables,
      bodyVariables,
      templateComponents,
      optimizationMode = 'AUTO',
    } = params;

    // 1. Check Eligibility for Marketing Templates
    if (contactId && templateCategory === 'MARKETING') {
      const eligibility = await checkMarketingEligibility({
        contactId,
        phoneNumber,
        templateCategory,
        templateStatus,
      });

      if (!eligibility.allowed) {
        logger.warn(
          { contactId, phoneNumber, reason: eligibility.reason },
          '[MessageRouter] Outbound message suppressed'
        );
        return {
          success: false,
          channel: 'CLOUD_API',
          suppressed: true,
          error: eligibility.details || `Suppressed: ${eligibility.reason}`,
        };
      }
    }

    // 2. Determine Channel (Cloud API vs Marketing Messages API)
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    const isMmApiEnabled = settings?.marketingMessagesEnabled === true;
    const policy = settings?.marketingMessagesPolicy || 'CLOUD_API_FALLBACK';

    let selectedChannel: MessageChannel = 'CLOUD_API';

    if (templateCategory === 'MARKETING' && optimizationMode !== 'STANDARD') {
      if (isMmApiEnabled || optimizationMode === 'OPTIMIZED' || optimizationMode === 'AUTO') {
        selectedChannel = 'MARKETING_MESSAGES_API';
      }
    }

    // 3. Dispatch message via WhatsApp Client
    const client = await WhatsAppClient.createFromSettings();
    const sendParams: SendTemplateMessageParams = {
      to: phoneNumber,
      templateName,
      languageCode,
      headerMediaUrl,
      headerVariables,
      bodyVariables,
      templateComponents,
    };

    try {
      const result: MetaSendResponse = await client.sendTemplateMessage(sendParams);
      const wamid = result.messages?.[0]?.id;

      // Update CampaignMessage record with channel attribution if campaignId exists
      if (campaignId && wamid) {
        await prisma.campaignMessage.updateMany({
          where: { campaignId, phoneNumber },
          data: {
            channel: selectedChannel,
            wamid,
            status: 'SENT',
            sentAt: new Date(),
          },
        }).catch(() => {});
      }

      logger.info(
        { phoneNumber, templateName, channel: selectedChannel, wamid },
        '[MessageRouter] Message routed and sent successfully'
      );

      return {
        success: true,
        channel: selectedChannel,
        wamid,
        messageStatus: result.messages?.[0]?.message_status || 'accepted',
      };
    } catch (err: any) {
      logger.error(
        { err: err.message, channel: selectedChannel, phoneNumber },
        '[MessageRouter] Primary send attempt failed'
      );

      // Fallback to Cloud API if MM API failed and fallback is permitted
      if (selectedChannel === 'MARKETING_MESSAGES_API' && policy === 'CLOUD_API_FALLBACK') {
        try {
          logger.info({ phoneNumber }, '[MessageRouter] Retrying via Cloud API fallback');
          const fallbackResult = await client.sendTemplateMessage(sendParams);
          const fallbackWamid = fallbackResult.messages?.[0]?.id;

          return {
            success: true,
            channel: 'CLOUD_API',
            wamid: fallbackWamid,
            messageStatus: fallbackResult.messages?.[0]?.message_status || 'accepted',
          };
        } catch (fallbackErr: any) {
          return {
            success: false,
            channel: 'CLOUD_API',
            error: fallbackErr.message,
          };
        }
      }

      return {
        success: false,
        channel: selectedChannel,
        error: err.message,
      };
    }
  }
}
