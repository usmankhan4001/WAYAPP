// Plain-words helpers for the Contacts screens. Pure, no React, no database.

export type ContactLike = {
  id?: string
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
  status?: string | null
  leadStage?: string | null
  consentSource?: string | null
  consentAt?: string | Date | null
  tags?: Array<{ tagId?: string; tag?: { id?: string; name?: string } }>
}

export type ContactFilter =
  | { kind: 'all' }
  | { kind: 'label'; id: string }
  | { kind: 'stage'; id: string }
  | { kind: 'optedOut' }

export function contactName(c: ContactLike): string {
  const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
  return name || 'Customer'
}

/** Phone as shown to people: a leading plus, digits grouped after the country code. */
export function formatPhone(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/[^\d]/g, '')
  if (!digits) return ''
  const cc = digits.length > 10 ? digits.length - 9 : Math.min(2, digits.length)
  const rest = digits.slice(cc)
  const groups = rest.match(/.{1,3}/g) ?? []
  return ['+' + digits.slice(0, cc), ...groups].join(' ')
}

export function isOptedOut(c: ContactLike): boolean {
  return c.status === 'UNSUBSCRIBED' || c.status === 'BLOCKED'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function plainDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export type ConsentSummary = {
  recorded: boolean
  optedOut: boolean
  sentence: string
}

/** The one sentence shown under 'Permission to message'. */
export function consentSentence(c: ContactLike): ConsentSummary {
  const optedOut = isOptedOut(c)
  const source = c.consentSource?.trim()
  const when = c.consentAt ? plainDate(c.consentAt) : ''
  if (!source && !when) {
    return { recorded: false, optedOut, sentence: 'No permission recorded' }
  }
  const parts = ['Agreed']
  if (when) parts.push(`on ${when}`)
  if (source) parts.push(`via ${source}`)
  return { recorded: true, optedOut, sentence: parts.join(' ') }
}

export function matchesContactFilter(c: ContactLike, f: ContactFilter): boolean {
  switch (f.kind) {
    case 'all':
      return true
    case 'label':
      return (c.tags ?? []).some((t) => (t.tagId ?? t.tag?.id) === f.id)
    case 'stage':
      return (c.leadStage || 'NEW_LEAD') === f.id
    case 'optedOut':
      return isOptedOut(c)
  }
}

export function filterContacts<T extends ContactLike>(list: T[], f: ContactFilter): T[] {
  return list.filter((c) => matchesContactFilter(c, f))
}

export type ContactCounts = {
  all: number
  optedOut: number
  byLabel: Record<string, number>
  byStage: Record<string, number>
}

export function countContacts(list: ContactLike[]): ContactCounts {
  const out: ContactCounts = { all: list.length, optedOut: 0, byLabel: {}, byStage: {} }
  for (const c of list) {
    if (isOptedOut(c)) out.optedOut++
    const stage = c.leadStage || 'NEW_LEAD'
    out.byStage[stage] = (out.byStage[stage] ?? 0) + 1
    for (const t of c.tags ?? []) {
      const id = t.tagId ?? t.tag?.id
      if (id) out.byLabel[id] = (out.byLabel[id] ?? 0) + 1
    }
  }
  return out
}

/** Plain-word stage names for people (the stored ids stay unchanged). */
export const STAGE_WORDS: Record<string, string> = {
  NEW_LEAD: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Interested',
  PROPOSAL_SENT: 'Offer sent',
  WON: 'Won',
  LOST: 'Lost',
}

export function stageWord(id: string | null | undefined): string {
  return STAGE_WORDS[id || 'NEW_LEAD'] ?? 'New'
}
