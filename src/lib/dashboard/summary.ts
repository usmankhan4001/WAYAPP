import type { PrismaClient } from '@prisma/client'
import { REPLY_WINDOW_MS } from '@/lib/whatsapp/window'

export type DashboardRange = 'today' | '7d' | '30d'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
export const UNANSWERED_AFTER_MS = 15 * 60 * 1000
export const CLOSING_SOON_FROM_MS = REPLY_WINDOW_MS - 3 * HOUR // 21h
export const FAILED_LOOKBACK_MS = DAY

export function parseRange(value: string | null | undefined): DashboardRange {
  return value === '7d' || value === '30d' ? value : 'today'
}

export interface Windows {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  bucketMs: number
  buckets: number
}

/**
 * "today" is the calendar day so far (UTC) against the same elapsed time yesterday,
 * so the comparison is like for like. 7d and 30d are rolling windows against the
 * window of equal length immediately before them.
 */
export function computeWindows(range: DashboardRange, now: Date = new Date()): Windows {
  if (range === 'today') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const elapsed = now.getTime() - start.getTime()
    const prevStart = new Date(start.getTime() - DAY)
    return {
      start,
      end: now,
      prevStart,
      prevEnd: new Date(prevStart.getTime() + elapsed),
      bucketMs: HOUR,
      buckets: Math.floor(elapsed / HOUR) + 1,
    }
  }
  const days = range === '7d' ? 7 : 30
  const start = new Date(now.getTime() - days * DAY)
  return {
    start,
    end: now,
    prevStart: new Date(start.getTime() - days * DAY),
    prevEnd: start,
    bucketMs: DAY,
    buckets: days,
  }
}

export interface ChatRow {
  direction: string
  status: string
  timestamp: Date
}
export interface CampaignRow {
  sentAt: Date | null
  deliveredAt: Date | null
  readAt: Date | null
}
export interface Metric {
  value: number
  previous: number
  change: number | null
}
export interface TodayNumbers {
  sent: Metric
  delivered: Metric
  read: Metric
  replies: Metric
}

export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

// Half-open [from, to): a timestamp exactly on a boundary belongs to the later window.
const inRange = (d: Date | null | undefined, from: Date, to: Date): d is Date =>
  !!d && d.getTime() >= from.getTime() && d.getTime() < to.getTime()

function countIn(chat: ChatRow[], camp: CampaignRow[], from: Date, to: Date) {
  let sent = 0
  let delivered = 0
  let read = 0
  let replies = 0
  for (const m of chat) {
    // Internal notes never count as traffic.
    if (m.direction === 'INTERNAL' || !inRange(m.timestamp, from, to)) continue
    if (m.direction === 'INBOUND') replies++
    else if (m.direction === 'OUTBOUND') {
      sent++
      if (m.status === 'DELIVERED' || m.status === 'READ') delivered++
      if (m.status === 'READ') read++
    }
  }
  for (const c of camp) {
    if (inRange(c.sentAt, from, to)) sent++
    if (inRange(c.deliveredAt, from, to)) delivered++
    if (inRange(c.readAt, from, to)) read++
  }
  return { sent, delivered, read, replies }
}

export function computeNumbers(chat: ChatRow[], camp: CampaignRow[], w: Windows): TodayNumbers {
  const cur = countIn(chat, camp, w.start, w.end)
  const prev = countIn(chat, camp, w.prevStart, w.prevEnd)
  const metric = (k: keyof typeof cur): Metric => ({
    value: cur[k],
    previous: prev[k],
    change: percentChange(cur[k], prev[k]),
  })
  return { sent: metric('sent'), delivered: metric('delivered'), read: metric('read'), replies: metric('replies') }
}

export interface Bucket {
  label: string
  current: number
  previous: number
}

export function computeRepliesOverTime(chat: ChatRow[], w: Windows): Bucket[] {
  const cur = new Array<number>(w.buckets).fill(0)
  const prev = new Array<number>(w.buckets).fill(0)
  for (const m of chat) {
    if (m.direction !== 'INBOUND') continue
    const t = m.timestamp.getTime()
    if (t >= w.start.getTime() && t < w.end.getTime()) {
      const i = Math.min(w.buckets - 1, Math.floor((t - w.start.getTime()) / w.bucketMs))
      cur[i]++
    } else if (t >= w.prevStart.getTime() && t < w.start.getTime()) {
      const i = Math.floor((t - w.prevStart.getTime()) / w.bucketMs)
      if (i < w.buckets) prev[i]++
    }
  }
  return cur.map((current, i) => {
    const d = new Date(w.start.getTime() + i * w.bucketMs)
    const label =
      w.bucketMs === HOUR
        ? `${String(d.getUTCHours()).padStart(2, '0')}:00`
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    return { label, current, previous: prev[i] }
  })
}

export interface ContactRef {
  id: string
  name: string
}
export interface AttentionItem {
  count: number
  contacts: ContactRef[]
}
export interface ConversationSnapshot {
  contact: ContactRef
  /** latest non-internal message */
  last: { direction: string; timestamp: Date } | null
}
export interface InboundSnapshot {
  contact: ContactRef
  timestamp: Date
}
export interface FailedSnapshot {
  contact: ContactRef
}

const sample = (refs: ContactRef[]): ContactRef[] => {
  const seen = new Set<string>()
  const out: ContactRef[] = []
  for (const r of refs) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push(r)
    if (out.length === 3) break
  }
  return out
}

/** Open chats where the customer wrote last and we have not answered for over 15 minutes. */
export function computeUnanswered(convs: ConversationSnapshot[], now: Date): AttentionItem {
  const hits = convs.filter(
    (c) => c.last && c.last.direction === 'INBOUND' && now.getTime() - c.last.timestamp.getTime() > UNANSWERED_AFTER_MS
  )
  return { count: hits.length, contacts: sample(hits.map((h) => h.contact)) }
}

/**
 * Customers whose latest INBOUND message is 21h to 24h old: the free-reply window
 * closes within 3 hours. Inbound-only, as in lib/whatsapp/window.ts. Pass inbound
 * rows from at least the last 24h; only the newest per contact is considered.
 */
export function computeClosingSoon(inbound: InboundSnapshot[], now: Date): AttentionItem {
  const latest = new Map<string, InboundSnapshot>()
  for (const m of inbound) {
    const cur = latest.get(m.contact.id)
    if (!cur || m.timestamp > cur.timestamp) latest.set(m.contact.id, m)
  }
  const hits = [...latest.values()].filter((m) => {
    const age = now.getTime() - m.timestamp.getTime()
    return age >= CLOSING_SOON_FROM_MS && age < REPLY_WINDOW_MS
  })
  hits.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  return { count: hits.length, contacts: sample(hits.map((h) => h.contact)) }
}

export function computeFailed(failed: FailedSnapshot[]): AttentionItem {
  return { count: failed.length, contacts: sample(failed.map((f) => f.contact)) }
}

export interface LeadBar {
  key: string
  label: string
  count: number
  color?: string | null
}

export function buildLeads(
  tags: Array<{ id: string; name: string; color: string | null; _count: { contacts: number } }>,
  stages: Array<{ leadStage: string; _count: { _all: number } }>
) {
  const byLabel: LeadBar[] = tags
    .map((t) => ({ key: t.id, label: t.name, count: t._count.contacts, color: t.color }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
  const byStage: LeadBar[] = stages
    .map((s) => ({
      key: s.leadStage,
      label: s.leadStage.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()),
      count: s._count._all,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
  return { byLabel, byStage }
}

type ContactLike = { id: string; firstName: string | null; lastName: string | null; phoneNumber: string }
const contactSel = { id: true, firstName: true, lastName: true, phoneNumber: true } as const
const toRef = (c: ContactLike): ContactRef => ({
  id: c.id,
  name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.phoneNumber,
})

export async function loadDashboardSummary(db: PrismaClient, range: DashboardRange, now: Date = new Date()) {
  const w = computeWindows(range, now)

  const [chat, camp, openConvs, inbound24, failed, tags, stages, recent, contactCount, campaignCount] = await Promise.all([
    db.chatMessage.findMany({
      where: { timestamp: { gte: w.prevStart, lte: now }, direction: { in: ['INBOUND', 'OUTBOUND'] } },
      select: { direction: true, status: true, timestamp: true },
    }),
    // Not queried on purpose: the dispatcher writes a ChatMessage for every broadcast send and the
    // webhook advances its status, so adding CampaignMessage rows would count each broadcast twice.
    Promise.resolve([] as CampaignRow[]),
    db.conversation.findMany({
      where: { status: 'OPEN', archived: false },
      select: {
        contact: { select: contactSel },
        messages: {
          where: { direction: { not: 'INTERNAL' } },
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { direction: true, timestamp: true },
        },
      },
      take: 1000,
    }),
    db.chatMessage.findMany({
      where: { direction: 'INBOUND', timestamp: { gte: new Date(now.getTime() - REPLY_WINDOW_MS) } },
      select: { timestamp: true, contact: { select: contactSel } },
    }),
    db.chatMessage.findMany({
      where: { direction: 'OUTBOUND', status: 'FAILED', timestamp: { gte: new Date(now.getTime() - FAILED_LOOKBACK_MS) } },
      orderBy: { timestamp: 'desc' },
      select: { contact: { select: contactSel } },
    }),
    db.tag.findMany({ select: { id: true, name: true, color: true, _count: { select: { contacts: true } } } }),
    db.contact.groupBy({ by: ['leadStage'], _count: { _all: true } }),
    db.conversation.findMany({
      where: { archived: false },
      orderBy: { lastMessageAt: 'desc' },
      take: 5,
      select: {
        id: true,
        unreadCount: true,
        lastMessageAt: true,
        contact: { select: contactSel },
        messages: {
          where: { direction: { not: 'INTERNAL' } },
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { body: true, messageType: true, direction: true },
        },
      },
    }),
    db.contact.count(),
    db.campaign.count(),
  ])

  return {
    range,
    today: computeNumbers(chat, camp, w),
    needsAttention: {
      unansweredChats: computeUnanswered(
        openConvs.map((c) => ({ contact: toRef(c.contact), last: c.messages[0] ?? null })),
        now
      ),
      repliesClosingSoon: computeClosingSoon(
        inbound24.map((m) => ({ contact: toRef(m.contact), timestamp: m.timestamp })),
        now
      ),
      failedMessages: computeFailed(failed.map((f) => ({ contact: toRef(f.contact) }))),
    },
    repliesOverTime: computeRepliesOverTime(chat, w),
    leads: buildLeads(tags, stages),
    recentChats: recent.map((c) => {
      const m = c.messages[0]
      return {
        id: c.id,
        contact: toRef(c.contact),
        unreadCount: c.unreadCount,
        lastMessageAt: c.lastMessageAt.toISOString(),
        preview: m ? m.body || `[${m.messageType}]` : '',
        lastDirection: m?.direction ?? null,
      }
    }),
    setup: { hasContacts: contactCount > 0, hasCampaigns: campaignCount > 0 },
  }
}

export type DashboardSummary = Awaited<ReturnType<typeof loadDashboardSummary>>
