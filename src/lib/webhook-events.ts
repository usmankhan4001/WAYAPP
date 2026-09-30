/**
 * The catalog of outbound webhook events. One list, used by the emitters, the endpoint
 * API and the Webhooks screen, so what is advertised and what is sent cannot drift apart.
 *
 * Before this file existed the endpoint API advertised `message.status_updated` and
 * `contact.created` as defaults while only `message.received` was ever emitted.
 *
 * Payloads are versioned by the envelope written in outbound-webhooks.ts:
 *   { event, timestamp, data }   and data is the shape documented here.
 * Add fields freely; never rename or remove one without a new event name.
 */
export const WEBHOOK_EVENTS = {
  'message.received': {
    label: 'Customer message received',
    data: '{ contactId, conversationId, phoneNumber, messageType, body, wamid, timestamp }',
  },
  'message.sent': {
    label: 'Message sent to a customer',
    data: '{ contactId, conversationId, phoneNumber, messageType, body, wamid, source }',
  },
  'message.status_updated': {
    label: 'Message delivered, read or failed',
    data: '{ wamid, phoneNumber, status, timestamp, errorCode? }',
  },
  'contact.created': {
    label: 'New contact added',
    data: '{ contactId, phoneNumber, firstName, lastName, source }',
  },
  'contact.updated': {
    label: 'Contact changed',
    data: '{ contactId, changed: string[] }',
  },
  'conversation.assigned': {
    label: 'Conversation assigned to an agent',
    data: '{ conversationId, contactId, assignedToId }',
  },
  'campaign.completed': {
    label: 'Broadcast finished',
    data: '{ campaignId, name, sent, delivered, read, failed }',
  },
} as const

export type WebhookEventName = keyof typeof WEBHOOK_EVENTS
export const WEBHOOK_EVENT_NAMES = Object.keys(WEBHOOK_EVENTS) as WebhookEventName[]
export function isWebhookEvent(name: string): name is WebhookEventName {
  return name in WEBHOOK_EVENTS
}
