import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type C = { id: string; status: string; groups: string[]; tags: string[]; consentSource: string | null }

const { db, prismaMock } = vi.hoisted(() => {
  const db = { contacts: [] as any[] }
  // Minimal evaluator for the Prisma where shapes the resolver produces.
  const match = (c: any, w: any): boolean => {
    if (!w) return true
    if (w.AND) return w.AND.every((x: any) => match(c, x))
    if (w.OR) return w.OR.some((x: any) => match(c, x))
    if (w.NOT) return !(Array.isArray(w.NOT) ? w.NOT.some((x: any) => match(c, x)) : match(c, w.NOT))
    if (w.status !== undefined) return c.status === w.status
    if (w.groups) return c.groups.some((g: string) => w.groups.some.groupId.in.includes(g))
    if (w.tags) return c.tags.some((t: string) => w.tags.some.tagId.in.includes(t))
    if (w.consentSource !== undefined) {
      if (w.consentSource === '') return c.consentSource === ''
      if (w.consentSource.not === null) return c.consentSource !== null
    }
    return true
  }
  const prismaMock = {
    contact: { findMany: vi.fn(async ({ where }: any) => db.contacts.filter((c) => match(c, where))) },
  }
  return { db, prismaMock }
})

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/whatsapp/client', () => ({ WhatsAppClient: { createFromSettings: vi.fn() } }))
vi.mock('@/worker/outbound-webhooks', () => ({ enqueueOutboundWebhook: vi.fn() }))

import { getTargetContacts, parseAudienceFilter, consentRequiredForMarketing } from '@/worker/dispatcher'

const mk = (id: string, o: Partial<C> = {}): C => ({ id, status: 'ACTIVE', groups: [], tags: [], consentSource: 'form', ...o })

beforeEach(() => {
  db.contacts = [
    mk('a', { groups: ['g1'] }),
    mk('b', { tags: ['t1'] }),
    mk('c', { groups: ['g1'], tags: ['t1'] }),
    mk('d', { groups: ['g2'], consentSource: null }),
    mk('e', { groups: ['g1'], status: 'UNSUBSCRIBED' }),
    mk('f', { tags: ['t1'], status: 'BLOCKED' }),
    mk('g', { groups: ['g1'], tags: ['tx'] }),
  ]
})

const ids = async (f: unknown, opts = {}) => (await getTargetContacts(typeof f === 'string' ? f : JSON.stringify(f), opts)).map((c: any) => c.id)

// The preview and the dispatcher both call getTargetContacts, so equal filters give
// equal recipients by construction; these cases pin down what that set must be.
describe('audience resolver (preview === dispatch)', () => {
  const cases: [string, unknown, string[]][] = [
    ['sendToAll', { sendToAll: true }, ['a', 'b', 'c', 'd', 'g']],
    ['includeGroups', { includeGroups: ['g1'] }, ['a', 'c', 'g']],
    ['includeTags', { includeTags: ['t1'] }, ['b', 'c']],
    ['groups and tags together', { includeGroups: ['g2'], includeTags: ['t1'] }, ['b', 'c', 'd']],
    ['sendToAll with excludes', { sendToAll: true, excludeGroups: ['g2'], excludeTags: ['tx'] }, ['a', 'b', 'c']],
    ['include with exclude', { includeGroups: ['g1'], excludeTags: ['t1'] }, ['a', 'g']],
    ['empty filter', {}, []],
    ['sendToAll false and no includes', { sendToAll: false, excludeGroups: ['g1'] }, []],
    ['legacy singular keys are ignored, not send-to-all', { groupId: 'g1' }, []],
  ]
  for (const [name, filter, expected] of cases) {
    it(`${name}`, async () => {
      expect(await ids(filter)).toEqual(expected)
      // Same call twice (preview then dispatch) gives the same recipients.
      expect(await ids(filter)).toEqual(await ids(filter))
    })
  }

  it('never includes unsubscribed or blocked contacts', async () => {
    const r = await ids({ sendToAll: true })
    expect(r).not.toContain('e')
    expect(r).not.toContain('f')
  })

  it('invalid JSON resolves to nobody and is reported invalid', async () => {
    prismaMock.contact.findMany.mockClear()
    expect(await ids('{not json')).toEqual([])
    expect(parseAudienceFilter('{not json').valid).toBe(false)
    expect(parseAudienceFilter('[]').valid).toBe(false)
    expect(prismaMock.contact.findMany).not.toHaveBeenCalled()
  })

  it('consent enforcement removes contacts with no consentSource when asked', async () => {
    expect(await ids({ sendToAll: true }, { requireConsent: true })).toEqual(['a', 'b', 'c', 'g'])
  })
})

describe('REQUIRE_CONSENT_FOR_MARKETING', () => {
  const original = process.env.REQUIRE_CONSENT_FOR_MARKETING
  afterEach(() => {
    if (original === undefined) delete process.env.REQUIRE_CONSENT_FOR_MARKETING
    else process.env.REQUIRE_CONSENT_FOR_MARKETING = original
  })
  it('is off by default and on only for "on"', () => {
    delete process.env.REQUIRE_CONSENT_FOR_MARKETING
    expect(consentRequiredForMarketing()).toBe(false)
    process.env.REQUIRE_CONSENT_FOR_MARKETING = 'on'
    expect(consentRequiredForMarketing()).toBe(true)
  })
})
