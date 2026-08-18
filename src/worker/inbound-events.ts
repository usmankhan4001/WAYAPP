import { processInboundFlow } from './flows';
import { processInboundBot } from './bots';
import { enqueueOutboundWebhook } from './outbound-webhooks';
import { logger } from '@/lib/logger';

export async function processInboundEvent(event: {
  contactId: string;
  conversationId?: string;
  phoneNumber: string;
  bodyText: string;
  messageType: string;
}): Promise<void> {
  const { contactId, conversationId, phoneNumber, bodyText, messageType } = event;

  // 1. Emit outbound webhook to customer integrations
  enqueueOutboundWebhook('message.received', {
    contactId,
    conversationId,
    phoneNumber,
    messageType,
    body: bodyText,
  }).catch((err) => logger.error({ err }, 'Webhook enqueue error'));

  // 2. Try Flow Builder Engine first
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
  }
}
