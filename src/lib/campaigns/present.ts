/**
 * Plain-language helpers for the broadcast screens. Pure functions only, so they are unit tested
 * and the components stay thin. Nothing here calls the network or changes sending behaviour.
 */

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface StatusPill {
  label: string
  tone: PillTone
}

const STATUS_PILLS: Record<string, StatusPill> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  QUEUED: { label: 'Sending', tone: 'info' },
  RUNNING: { label: 'Sending', tone: 'info' },
  COMPLETED: { label: 'Sent', tone: 'success' },
  PAUSED: { label: 'Paused', tone: 'warning' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  FAILED: { label: 'Failed', tone: 'danger' },
}

export function campaignStatusPill(status: string | null | undefined): StatusPill {
  return STATUS_PILLS[String(status || '').toUpperCase()] ?? { label: 'Draft', tone: 'neutral' }
}

/** Filter chips shown on the list. Each chip groups the raw database statuses it covers. */
export const STATUS_FILTERS: { value: string; label: string; statuses: string[] }[] = [
  { value: 'ALL', label: 'All', statuses: [] },
  { value: 'DRAFT', label: 'Draft', statuses: ['DRAFT'] },
  { value: 'SCHEDULED', label: 'Scheduled', statuses: ['SCHEDULED'] },
  { value: 'SENDING', label: 'Sending', statuses: ['QUEUED', 'RUNNING'] },
  { value: 'SENT', label: 'Sent', statuses: ['COMPLETED'] },
  { value: 'PAUSED', label: 'Paused', statuses: ['PAUSED'] },
  { value: 'FAILED', label: 'Failed', statuses: ['FAILED'] },
]

export function matchesFilter(status: string, filter: string): boolean {
  const f = STATUS_FILTERS.find((x) => x.value === filter)
  if (!f || f.value === 'ALL') return true
  return f.statuses.includes(String(status).toUpperCase())
}

export function countByFilter(campaigns: { status: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const f of STATUS_FILTERS) out[f.value] = campaigns.filter((c) => matchesFilter(c.status, f.value)).length
  return out
}

interface Counters {
  totalContacts?: number | null
  sentCount?: number | null
  deliveredCount?: number | null
  readCount?: number | null
  repliedCount?: number | null
  failedCount?: number | null
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.max(0, Math.min(100, Math.round((part / whole) * 100))) : 0)

/** Each figure as a share of everyone in the broadcast, for the slim progress bar. */
export function progressPercents(c: Counters) {
  const total = c.totalContacts ?? 0
  return {
    sent: pct(c.sentCount ?? 0, total),
    delivered: pct(c.deliveredCount ?? 0, total),
    read: pct(c.readCount ?? 0, total),
    replied: pct(c.repliedCount ?? 0, total),
    failed: pct(c.failedCount ?? 0, total),
    /** sent plus failed: how far through the list the broadcast has got */
    done: pct((c.sentCount ?? 0) + (c.failedCount ?? 0), total),
  }
}

const ERROR_WORDS: Record<string, string> = {
  '131026': 'This number is not on WhatsApp',
  '131047': 'More than 24 hours since they last wrote, so a template is needed',
  '131049': 'WhatsApp held this message back to protect people from too many marketing messages',
  '131048': 'Your number hit a temporary sending limit. Try again later',
  '130429': 'Too many messages were sent at once. Try again later',
  '131056': 'Too many messages to the same person in a short time',
  '131051': 'This type of message is not supported',
  '131053': 'The picture or file could not be sent',
  '132000': 'The message details do not match the template',
  '132001': 'The template was not found or is not approved',
  '132005': 'The translated message is too long',
  '132012': 'A detail in the message is in the wrong format',
  '132015': 'This template has been paused by WhatsApp',
  '132016': 'This template has been disabled by WhatsApp',
  '190': 'WhatsApp is not connected. Reconnect your number in Settings',
  '133010': 'Your number is not registered yet',
  '470': 'More than 24 hours since they last wrote, so a template is needed',
}

/** Turns a WhatsApp error code (or message) into words an owner can act on. */
export function translateError(code?: string | number | null, message?: string | null): string {
  const key = code == null ? '' : String(code).trim()
  if (key && ERROR_WORDS[key]) return ERROR_WORDS[key]
  const m = String(message || '').toLowerCase()
  if (m.includes('not a valid whatsapp') || m.includes('not on whatsapp')) return ERROR_WORDS['131026']
  if (m.includes('rate') && m.includes('limit')) return ERROR_WORDS['130429']
  if (m.includes('opt') && m.includes('out')) return 'This person asked not to receive messages'
  if (m.includes('token') || m.includes('unauthor')) return ERROR_WORDS['190']
  if (key || m) return 'This message could not be delivered'
  return ''
}

/** Status of one recipient's message, as a pill. */
export function messageStatusPill(status: string | null | undefined): StatusPill {
  switch (String(status || '').toUpperCase()) {
    case 'READ':
      return { label: 'Read', tone: 'info' }
    case 'REPLIED':
      return { label: 'Replied', tone: 'success' }
    case 'DELIVERED':
      return { label: 'Delivered', tone: 'success' }
    case 'SENT':
      return { label: 'Sent', tone: 'neutral' }
    case 'FAILED':
      return { label: 'Failed', tone: 'danger' }
    default:
      return { label: 'Waiting', tone: 'neutral' }
  }
}

/** Plain labels for the contact fields a message can be personalised with. */
export const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  fullName: 'Full name',
  phoneNumber: 'Phone number',
  email: 'Email',
  'custom.company': 'Company',
  'custom.city': 'City',
  'custom.order_id': 'Order number',
  'custom.spend': 'Total spent',
  'custom.tier': 'Membership level',
}

/** Shows just enough of a number to recognise it: +971 •••• 567 */
export function maskPhone(phone: string): string {
  const p = String(phone || '')
  if (p.length <= 7) return '•••••'
  return `${p.slice(0, 4)} ${'•'.repeat(4)} ${p.slice(-3)}`
}

export const BIG_AUDIENCE = 50

export interface WizardState {
  name: string
  templateId: string
  /** placeholder numbers the chosen template needs, e.g. ['1','2'] */
  requiredVars: string[]
  mappings: Record<string, string>
  needsHeaderImage: boolean
  headerMediaUrl: string
  sendToAll: boolean
  includeCount: number
  audienceCount: number | null
  whenMode: 'now' | 'later'
  scheduledAt: string | null
  sendConfirm: string
  now?: number
}

/** Builds an ISO time from the date and time inputs; null when either is empty or invalid. */
export function toScheduledIso(date: string, time: string): string | null {
  if (!date || !time) return null
  const d = new Date(`${date}T${time}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Returns a plain-words problem for the given step, or null when the step is fine to leave. */
export function validateStep(step: 1 | 2 | 3 | 4, s: WizardState): string | null {
  if (!s.name.trim()) return 'Give your broadcast a name so you can find it later.'
  if (step === 1) return null
  if (!s.templateId) return 'Pick a message to send.'
  const missing = s.requiredVars.filter((v) => !String(s.mappings[v] ?? '').trim())
  if (missing.length) return 'Choose what to fill in for every blank in your message.'
  if (s.needsHeaderImage && !s.headerMediaUrl.trim()) return 'Add the picture link this message needs.'
  if (step === 2) return null
  if (!s.sendToAll && s.includeCount === 0) return 'Choose who should get this message, or pick Everyone.'
  if (s.audienceCount === 0) return 'No one matches this choice yet. Change who should get it.'
  if (step === 3) return null
  if (s.whenMode === 'later') {
    if (!s.scheduledAt) return 'Choose a date and time to send.'
    if (new Date(s.scheduledAt).getTime() <= (s.now ?? Date.now())) return 'Choose a time in the future.'
  }
  if ((s.audienceCount ?? 0) > BIG_AUDIENCE && s.sendConfirm.trim() !== 'SEND') return 'Type SEND to confirm this large audience.'
  return null
}

/** Reads a template's components (JSON string or array) and reports what the wizard must ask for. */
export function templateInfo(template: { components?: unknown } | null | undefined) {
  let comps: any[] = []
  try {
    const raw = template?.components
    comps = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : []
  } catch {
    comps = []
  }
  const body = comps.find((c) => c?.type === 'BODY')
  const header = comps.find((c) => c?.type === 'HEADER')
  const matches: string[] = String(body?.text || '').match(/\{\{(\d+)\}\}/g) || []
  const vars = Array.from(new Set(matches.map((m) => m.replace(/[^0-9]/g, ''))))
  return {
    bodyText: String(body?.text || ''),
    vars,
    needsHeaderImage: header?.format === 'IMAGE',
    examples: (body?.example?.body_text?.[0] ?? []) as string[],
  }
}
