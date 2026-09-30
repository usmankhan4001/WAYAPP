import { describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { requireAuth } = vi.hoisted(() => ({ requireAuth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/auth/rbac', () => ({ requireAuth }))

import {
  computeWindows, computeNumbers, computeRepliesOverTime, computeUnanswered, computeClosingSoon,
  computeFailed, percentChange, parseRange,
} from '@/lib/dashboard/summary'
import { GET } from '@/app/api/dashboard/summary/route'

const H = 3600_000
const now = new Date('2026-05-10T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms)
const ref = (id: string) => ({ id, name: id })

describe('dashboard summary', () => {
  it('compares against the previous period and returns null change when previous is 0', () => {
    const w = computeWindows('7d', now)
    const chat = [
      { direction: 'OUTBOUND', status: 'READ', timestamp: ago(1 * H) },
      { direction: 'OUTBOUND', status: 'DELIVERED', timestamp: ago(2 * H) },
      { direction: 'OUTBOUND', status: 'SENT', timestamp: ago(8 * 24 * H) },
      { direction: 'INBOUND', status: 'SENT', timestamp: ago(3 * H) },
    ]
    const n = computeNumbers(chat, [], w)
    expect(n.sent).toEqual({ value: 2, previous: 1, change: 100 })
    expect(n.delivered.value).toBe(2)
    expect(n.read.value).toBe(1)
    expect(n.replies).toEqual({ value: 1, previous: 0, change: null })
    expect(percentChange(5, 0)).toBeNull()
  })

  it('ignores internal notes everywhere and counts campaign messages', () => {
    const w = computeWindows('today', now)
    const note = { direction: 'INTERNAL', status: 'SENT', timestamp: ago(1 * H) }
    const camp = [{ sentAt: ago(1 * H), deliveredAt: ago(1 * H), readAt: null }]
    const n = computeNumbers([note], camp, w)
    expect(n.sent.value).toBe(1)
    expect(n.replies.value).toBe(0)
    expect(computeRepliesOverTime([{ ...note, direction: 'INTERNAL' }], w).every((b) => b.current === 0)).toBe(true)
    expect(computeUnanswered([{ contact: ref('a'), last: null }], now).count).toBe(0)
  })

  it('buckets replies with the previous period as a second series', () => {
    const w = computeWindows('7d', now)
    const chat = [
      { direction: 'INBOUND', status: 'SENT', timestamp: ago(1 * H) },
      { direction: 'INBOUND', status: 'SENT', timestamp: ago(7 * 24 * H + 1 * H) },
    ]
    const b = computeRepliesOverTime(chat, w)
    expect(b).toHaveLength(7)
    expect(b[6].current).toBe(1)
    expect(b[6].previous).toBe(1)
  })

  it('unanswered needs an INBOUND last message older than 15 minutes', () => {
    const c = (dir: string, ms: number, id: string) => ({ contact: ref(id), last: { direction: dir, timestamp: ago(ms) } })
    const r = computeUnanswered(
      [c('INBOUND', 16 * 60_000, 'a'), c('INBOUND', 15 * 60_000, 'b'), c('INBOUND', 5 * 60_000, 'c'), c('OUTBOUND', 2 * H, 'd')],
      now
    )
    expect(r.count).toBe(1)
    expect(r.contacts).toEqual([ref('a')])
  })

  it('closing soon covers 21h inclusive to 24h exclusive, on the latest inbound only', () => {
    const m = (id: string, ms: number) => ({ contact: ref(id), timestamp: ago(ms) })
    const r = computeClosingSoon(
      [m('a', 21 * H), m('b', 24 * H), m('c', 20 * H + 59 * 60_000), m('d', 22 * H), m('d', 1 * H), m('e', 23 * H), m('f', 22 * H), m('g', 22 * H)],
      now
    )
    expect(r.contacts.map((x) => x.id)).toEqual(['e', 'f', 'g'])
    expect(r.count).toBe(5 - 1) // a, e, f, g (d has a fresher message; b and c are outside)
  })

  it('failed keeps the count and up to 3 distinct contacts', () => {
    const r = computeFailed(['a', 'a', 'b', 'c', 'd'].map((id) => ({ contact: ref(id) })))
    expect(r.count).toBe(5)
    expect(r.contacts.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('defaults an unknown range to today', () => {
    expect(parseRange('x')).toBe('today')
    expect(parseRange('30d')).toBe('30d')
  })

  it('API rejects signed-out requests', async () => {
    requireAuth.mockResolvedValue({ response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) })
    const res = await GET(new NextRequest('http://localhost/api/dashboard/summary?range=7d'))
    expect(res.status).toBe(401)
  })
})
