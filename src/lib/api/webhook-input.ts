import { WEBHOOK_EVENT_NAMES, isWebhookEvent } from '@/lib/webhook-events'

export const DEFAULT_WEBHOOK_EVENTS = ['message.received', 'message.status_updated', 'contact.created']

export type EventsCheck = { ok: true; events: string } | { ok: false; error: string }

/**
 * Turns whatever the caller sent (an array or a comma string) into the stored comma list,
 * rejecting names that are not in the catalog. Before this, any typo was saved and then
 * silently never matched. `*` means every event.
 */
export function normalizeEvents(input: unknown): EventsCheck {
  const list = (Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [])
    .map((e) => String(e).trim())
    .filter(Boolean)
  if (list.length === 0) return { ok: false, error: 'Pick at least one event.' }
  const unknown = list.filter((e) => e !== '*' && !isWebhookEvent(e))
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown event: ${unknown.join(', ')}. Valid events: ${WEBHOOK_EVENT_NAMES.join(', ')}` }
  }
  return { ok: true, events: Array.from(new Set(list)).join(',') }
}

/** Never send the signing secret back after creation; keep only a short hint of it. */
export function publicEndpoint<T extends { secret: string }>(ep: T) {
  const { secret, ...rest } = ep
  return { ...rest, secretHint: `${secret.slice(0, 6)}...${secret.slice(-4)}` }
}
