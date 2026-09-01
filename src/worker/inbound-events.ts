import { processInboundFlow } from './flows';
import { processInboundBot } from './bots';
import { processInboundAutomation } from '@/lib/whatsapp/automation';
import { enqueueOutboundWebhook } from './outbound-webhooks';
import { InboundConversationEvent } from '@/lib/whatsapp/types';
import { logger } from '@/lib/logger';

export async function processInboundEvent(event: InboundConversationEvent): Promise<void> {
  const { contactId, conversationId, phoneNumber, bodyText, messageType } = event;

  // 1. Emit outbound webhook to customer integrations
  enqueueOutboundWebhook('message.received', {
    contactId,
    conversationId,
    phoneNumber,
    messageType,
    body: bodyText,
  }).catch((err) => logger.error({ err }, 'Webhook enqueue error'));

  // 2. Try Visual Flow Builder Engine
  const handledByFlow = await processInboundFlow({
    contactId,
    phoneNumber,
    bodyText,
  });

  if (handledByFlow) {
    logger.info({ contactId }, '[InboundEvents] Handled by Visual Flow');
    return;
  }

  // 3. Try Bot Engine (AI / Keyword / HTTP)
  const handledByBot = await processInboundBot({
    contactId,
    conversationId,
    phoneNumber,
    bodyText,
  });

  if (handledByBot) {
    logger.info({ contactId }, '[InboundEvents] Handled by Bot');
    return;
  }

  // 4. Try Legacy/Generic Keyword Automations
  try {
    await processInboundAutomation({
      contactId,
      phoneNumber,
      bodyText,
    });
  } catch (autoErr: any) {
    logger.error({ err: autoErr.message }, '[InboundEvents] Error in AutomationEngine');
  }
}
