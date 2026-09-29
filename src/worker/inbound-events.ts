import { processInboundFlow } from './flows';
import { processInboundBot } from './bots';
import { processInboundAutomation } from '@/lib/whatsapp/automation';
import { enqueueOutboundWebhook } from './outbound-webhooks';
import { InboundConversationEvent } from '@/lib/whatsapp/types';
import { logger } from '@/lib/logger';

/**
 * Kill switch for the inbound automation engines (Visual Flows, Bots, keyword
 * Automations). They are HELD unless INBOUND_AUTOMATIONS=on.
 *
 * Why: the module toggles in Settings do not gate these engines — the worker never
 * calls isModuleEnabled() — and a seeded example flow is PUBLISHED at boot. Until
 * Meta's webhook was pointed at WayApp none of them had ever run against a real
 * customer; the moment inbound starts arriving they would all begin replying, on top
 * of whatever else already answers that number (n8n's booking-link flow). Held
 * inbound is still stored, still shown in the inbox, still pushed, and still emitted
 * as a `message.received` webhook. Only the auto-replies are paused.
 */
export function inboundAutomationsEnabled(): boolean {
  return process.env.INBOUND_AUTOMATIONS?.trim().toLowerCase() === 'on'
}

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

  if (!inboundAutomationsEnabled()) {
    logger.info({ contactId }, '[InboundEvents] Automations held (INBOUND_AUTOMATIONS is not "on") — no auto-reply sent')
    return
  }

  // 2. Try Visual Flow Builder Engine
  const handledByFlow = await processInboundFlow({
    contactId,
    conversationId,
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
      conversationId,
      phoneNumber,
      bodyText,
    });
  } catch (autoErr: any) {
    logger.error({ err: autoErr.message }, '[InboundEvents] Error in AutomationEngine');
  }
}
