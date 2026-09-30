import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { contact: { findFirst: vi.fn(), findMany: vi.fn() } },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { findInboundContact } from '@/lib/whatsapp/contact-match'

describe('findInboundContact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.contact.findFirst.mockResolvedValue(null)
    prismaMock.contact.findMany.mockResolvedValue([])
  })

  it('prefers the exact E.164 match and never runs the suffix search', async () => {
    prismaMock.contact.findFirst.mockResolvedValueOnce({ id: 'a', phoneNumber: '+971501234567' })
    const m = await findInboundContact('971501234567', '+971501234567')
    expect(m).toEqual({ contact: { id: 'a', phoneNumber: '+971501234567' }, exact: true })
    expect(prismaMock.contact.findMany).not.toHaveBeenCalled()
  })

  it('accepts a single suffix match but flags it as fuzzy', async () => {
    prismaMock.contact.findMany.mockResolvedValue([{ id: 'b', phoneNumber: '0501234567' }])
    const m = await findInboundContact('971501234567', '+971501234567')
    expect(m?.exact).toBe(false)
    expect(m?.contact.id).toBe('b')
  })

  it('refuses an ambiguous suffix match (two different people)', async () => {
    prismaMock.contact.findMany.mockResolvedValue([{ id: 'b' }, { id: 'c' }])
    expect(await findInboundContact('971501234567', '+971501234567')).toBeNull()
  })

  it('returns null when nobody matches', async () => {
    expect(await findInboundContact('971501234567', '+971501234567')).toBeNull()
  })
})
