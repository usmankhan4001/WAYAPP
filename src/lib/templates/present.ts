// Pure helpers that turn Meta template records into plain words for the Templates tab.
// No React, no network: everything here is unit tested.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TemplateRecord = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TemplateComponent = Record<string, any>

export type StatusKey = 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED'
export type StatusFilter = 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'
export type CategoryFilter = 'ALL' | 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
export type BadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary'

/** 'welcome_offer_2026' -> 'Welcome offer 2026' */
export function plainName(name: unknown): string {
  const text = String(name ?? '').replace(/[_\-\s]+/g, ' ').trim()
  if (!text) return 'Untitled message'
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function parseComponents(raw: unknown): TemplateComponent[] {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(value) ? value.filter(Boolean) : []
  } catch {
    return []
  }
}

export function bodyTextOf(template: TemplateRecord): string {
  const body = parseComponents(template?.components).find((c) => c.type === 'BODY')
  return typeof body?.text === 'string' ? body.text : ''
}

/** First non-empty line of the message, for the list row. */
export function firstLine(text: string): string {
  return (text.split('\n').find((l) => l.trim()) ?? '').trim()
}

/** Variable numbers used in a text, in order: 'Hi {{2}} {{1}}' -> ['1', '2'] */
export function variableNumbers(text: string): string[] {
  const found = (text.match(/{{\s*\d+\s*}}/g) ?? []).map((m) => m.replace(/[{}\s]/g, ''))
  return Array.from(new Set(found)).sort((a, b) => Number(a) - Number(b))
}

const DEFAULT_SAMPLES = ['Sam', 'Order 1042', 'Tomorrow at 2 PM', 'SAVE20', 'Monday', 'Dubai']

export function defaultSample(n: number | string): string {
  return DEFAULT_SAMPLES[Number(n) - 1] ?? `Sample ${n}`
}

/** Replace {{n}} with the given sample, else a default sample, so a preview never shows raw braces. */
export function fillSamples(text: string, samples: Record<string, string> = {}): string {
  return text.replace(/{{\s*(\d+)\s*}}/g, (_m, n: string) => samples[n]?.trim() || defaultSample(n))
}

export function statusInfo(status: unknown): { key: StatusKey; label: string; variant: BadgeVariant } {
  switch (String(status ?? '').toUpperCase()) {
    case 'APPROVED':
      return { key: 'APPROVED', label: 'Approved', variant: 'success' }
    case 'PENDING':
    case 'IN_APPEAL':
      return { key: 'PENDING', label: 'Waiting for Meta', variant: 'warning' }
    case 'PAUSED':
    case 'DISABLED':
      return { key: 'PAUSED', label: 'Paused', variant: 'secondary' }
    default:
      return { key: 'REJECTED', label: 'Rejected', variant: 'destructive' }
  }
}

export function categoryLabel(category: unknown): string {
  switch (String(category ?? '').toUpperCase()) {
    case 'MARKETING':
      return 'Promotion'
    case 'UTILITY':
      return 'Update'
    case 'AUTHENTICATION':
      return 'Login code'
    default:
      return 'Other'
  }
}

/** One plain sentence for a rejected template. */
export function rejectionSentence(reason: unknown): string {
  const text = String(reason ?? '').trim()
  if (!text || text.toUpperCase() === 'NONE') {
    return 'Meta did not say why. Check the wording and the example values, then send it again.'
  }
  const first = text.split(/(?<=[.!?])\s/)[0].trim()
  const sentence = first.length > 160 ? `${first.slice(0, 157)}...` : first
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
}

export interface TemplateFilters {
  query?: string
  status?: StatusFilter
  category?: CategoryFilter
}

export function filterTemplates(list: TemplateRecord[], f: TemplateFilters = {}): TemplateRecord[] {
  const q = (f.query ?? '').trim().toLowerCase()
  return list.filter((t) => {
    if (f.status && f.status !== 'ALL' && statusInfo(t.status).key !== f.status) return false
    if (f.category && f.category !== 'ALL' && String(t.category).toUpperCase() !== f.category) return false
    if (!q) return true
    return `${plainName(t.name)} ${t.name} ${bodyTextOf(t)}`.toLowerCase().includes(q)
  })
}

/**
 * Counts for the chips. Each chip group is counted with the other group's filter and the search
 * applied, so the numbers match what the person will see after tapping.
 */
export function chipCounts(list: TemplateRecord[], f: TemplateFilters = {}) {
  const byStatus = filterTemplates(list, { query: f.query, category: f.category })
  const byCategory = filterTemplates(list, { query: f.query, status: f.status })
  const s = (key: StatusKey) => byStatus.filter((t) => statusInfo(t.status).key === key).length
  const c = (key: string) => byCategory.filter((t) => String(t.category).toUpperCase() === key).length
  return {
    status: { ALL: byStatus.length, APPROVED: s('APPROVED'), PENDING: s('PENDING'), REJECTED: s('REJECTED') },
    category: {
      ALL: byCategory.length,
      MARKETING: c('MARKETING'),
      UTILITY: c('UTILITY'),
      AUTHENTICATION: c('AUTHENTICATION'),
    },
  }
}

/** Insert the next {{n}} into a text at an optional cursor position, padding with spaces as needed. */
export function insertVariable(text: string, cursor?: number): { text: string; number: number; cursor: number } {
  const used = variableNumbers(text).map(Number)
  const number = (used.length ? Math.max(...used) : 0) + 1
  const token = `{{${number}}}`
  const at = cursor == null || cursor < 0 || cursor > text.length ? text.length : cursor
  const before = text.slice(0, at)
  const after = text.slice(at)
  const lead = before && !/\s$/.test(before) ? ' ' : ''
  const trail = after && !/^[\s.,!?]/.test(after) ? ' ' : ''
  const next = `${before}${lead}${token}${trail}${after}`
  return { text: next, number, cursor: before.length + lead.length + token.length }
}

/** Friendly label for a variable chip: the first is usually the person's name. */
export function variableLabel(n: number | string): string {
  return Number(n) === 1 ? 'Name' : `Detail ${n}`
}

export function contactLabel(c: TemplateRecord): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
  return name || c.phoneNumber || 'Unknown contact'
}
