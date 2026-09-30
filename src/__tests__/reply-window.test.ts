import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { chatMessage: { findFirst: vi.fn() } },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { getReplyWindow, computeReplyWindow } from '@/lib/whatsapp/window'

const H = 60 * 60 * 1000
const now = new Date('2026-01-10T12:00:00Z')

describe('reply window', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is closed with no inbound message at all', async () => {
    prismaMock.chatMessage.findFirst.mockResolvedValue(null)
    const w = await getReplyWindow('c1', now)
    expect(w).toEqual({ isOpen: false, windowExpiresAt: null, lastInboundAt: null })
  })

  it('queries only INBOUND messages, newest first', async () => {
    prismaMock.chatMessage.findFirst.mockResolvedValue(null)
    await getReplyWindow('c1', now)
    expect(prismaMock.chatMessage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { contactId: 'c1', direction: 'INBOUND' }, orderBy: { timestamp: 'desc' } })
    )
  })

  it('is open 23h59m after the last inbound', async () => {
    prismaMock.chatMessage.findFirst.mockResolvedValue({ timestamp: new Date(now.getTime() - 24 * H + 60_000) })
    expect((await getReplyWindow('c1', now)).isOpen).toBe(true)
  })

  it('is closed at exactly 24h', () => {
    const w = computeReplyWindow(new Date(now.getTime() - 24 * H), now)
    expect(w.isOpen).toBe(false)
    expect(w.windowExpiresAt).toBe(now.toISOString())
  })

  it('is closed after 24h', () => {
    expect(computeReplyWindow(new Date(now.getTime() - 30 * H), now).isOpen).toBe(false)
  })
})
