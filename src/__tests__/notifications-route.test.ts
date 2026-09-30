import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    conversation: { findMany: vi.fn().mockResolvedValue([]) },
    chatMessage: { findMany: vi.fn().mockResolvedValue([]) },
    campaign: { findMany: vi.fn().mockResolvedValue([]) },
    template: { findMany: vi.fn().mockResolvedValue([]) },
    settings: { findFirst: vi.fn().mockResolvedValue({ isConnected: false, updatedAt: new Date() }) },
  },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth/rbac', () => ({ requireAuth: vi.fn().mockResolvedValue({ session: { userId: 'u1' } }) }))

import { GET } from '@/app/api/notifications/route'

describe('GET /api/notifications', () => {
  it('returns a connection item when not connected', async () => {
    prismaMock.conversation.findMany.mockResolvedValueOnce([
      { contactId: 'c1', unreadCount: 1, lastMessageAt: new Date(), contact: { firstName: 'Sara', lastName: null, phoneNumber: '+1' } },
    ])
    const res = await GET(new NextRequest('http://localhost/api/notifications'))
    const body = await res.json()
    expect(body.items.map((i: { kind: string }) => i.kind).sort()).toEqual(['connection', 'message'])
  })
})
