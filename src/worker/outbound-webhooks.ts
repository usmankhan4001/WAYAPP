import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { WEBHOOK_EVENT_NAMES, isWebhookEvent, type WebhookEventName } from '@/lib/webhook-events';
import { checkWebhookUrl } from '@/lib/api/ssrf';

const RETRY_DELAYS_MS = [
  1 * 60 * 1000,      // Attempt 1: 1 min
  5 * 60 * 1000,      // Attempt 2: 5 min
  30 * 60 * 1000,     // Attempt 3: 30 min
  2 * 60 * 60 * 1000, // Attempt 4: 2 hours
  12 * 60 * 60 * 1000,// Attempt 5: 12 hours
];

/**
 * Enqueues an outbound webhook event for all active subscribed endpoints
 */
export async function enqueueOutboundWebhook(event: string, payload: Record<string, any>): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { isActive: true },
    });

    const matchingEndpoints = endpoints.filter((ep) => {
      const subscribedEvents = ep.events.split(',').map((e) => e.trim());
      return subscribedEvents.includes('*') || subscribedEvents.includes(event);
    });

    for (const ep of matchingEndpoints) {
      await prisma.webhookDelivery.create({
        data: {
          endpointId: ep.id,
          event,
          payload: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload,
          }),
          status: 'PENDING',
        },
      });
    }
  } catch (error) {
    logger.error({ error, event }, '[Webhooks] Failed to enqueue outbound webhook');
  }
}

/**
 * The way application code announces something happened. The event name must come from the
 * catalog in webhook-events.ts (the compiler rejects anything else, and a name that slips
 * through at runtime is dropped and logged). It never throws: a webhook problem must not
 * break sending a message or saving a contact.
 */
export async function emitWebhook<E extends WebhookEventName>(event: E, data: Record<string, unknown>): Promise<void> {
  try {
    if (!isWebhookEvent(event)) {
      logger.warn({ event, known: WEBHOOK_EVENT_NAMES }, '[Webhooks] Unknown event name dropped');
      return;
    }
    await enqueueOutboundWebhook(event, data);
  } catch (error) {
    logger.error({ error, event }, '[Webhooks] emitWebhook failed');
  }
}

/**
 * Worker cycle: Delivers pending outbound webhooks with exponential backoff
 */
export async function processOutboundWebhooks(): Promise<void> {
  try {
    const now = new Date();
    const pendingDeliveries = await prisma.webhookDelivery.findMany({
      where: {
        status: 'PENDING',
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
      include: { endpoint: true },
      take: 20,
    });

    for (const delivery of pendingDeliveries) {
      const { endpoint, payload, attempts } = delivery;
      const timestamp = Math.floor(Date.now() / 1000).toString();

      // Compute HMAC signature
      const signaturePayload = `${timestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', endpoint.secret)
        .update(signaturePayload, 'utf8')
        .digest('hex');

      try {
        // Re-check at send time: DNS may have changed since the endpoint was saved.
        const safe = await checkWebhookUrl(endpoint.url);
        if (!safe.ok) throw new Error(safe.reason);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WAYAPP-Signature': signature,
            'X-WAYAPP-Timestamp': timestamp,
            'X-WAYAPP-Event': delivery.event,
          },
          body: payload,
          signal: controller.signal,
          redirect: 'manual', // a redirect could point at a private address
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'DELIVERED',
              attempts: attempts + 1,
            },
          });
        } else {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
      } catch (sendErr: any) {
        const nextAttempt = attempts + 1;
        if (nextAttempt >= 5) {
          // Dead-letter FAILED
          await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              status: 'FAILED',
              attempts: nextAttempt,
              lastError: sendErr.message || 'Delivery timed out',
            },
          });
        } else {
          const delayMs = RETRY_DELAYS_MS[nextAttempt - 1] || 60000;
          await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: {
              attempts: nextAttempt,
              nextRetryAt: new Date(Date.now() + delayMs),
              lastError: sendErr.message || 'Delivery failed',
            },
          });
        }
      }
    }
  } catch (error) {
    logger.error({ error }, '[Webhooks] Error in outbound webhook delivery loop');
  }
}
