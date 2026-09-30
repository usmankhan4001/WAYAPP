import { describe, it, expect } from 'vitest'
import {
  consentSentence, contactName, countContacts, filterContacts, formatPhone, stageWord,
} from '@/lib/contacts/present'

const list = [
  { id: '1', firstName: 'Sara', leadStage: 'WON', status: 'ACTIVE', tags: [{ tagId: 'a' }, { tagId: 'b' }] },
  { id: '2', phoneNumber: '+971501234567', status: 'UNSUBSCRIBED', tags: [{ tag: { id: 'a' } }] },
  { id: '3', leadStage: 'LOST', status: 'ACTIVE' },
]

describe('consentSentence', () => {
  it('reads plainly with date and source', () => {
    const r = consentSentence({ consentAt: '2026-09-12T10:00:00Z', consentSource: 'website form' })
    expect(r.sentence).toBe('Agreed on 12 Sep 2026 via website form')
    expect(r.recorded).toBe(true)
  })
  it('warns when nothing is recorded', () => {
    const r = consentSentence({})
    expect(r).toMatchObject({ recorded: false, sentence: 'No permission recorded' })
  })
  it('flags opted out', () => {
    expect(consentSentence({ status: 'UNSUBSCRIBED' }).optedOut).toBe(true)
  })
})

describe('filters and counts', () => {
  it('filters by label, stage and opted out', () => {
    expect(filterContacts(list, { kind: 'label', id: 'a' }).map((c) => c.id)).toEqual(['1', '2'])
    expect(filterContacts(list, { kind: 'stage', id: 'NEW_LEAD' }).map((c) => c.id)).toEqual(['2'])
    expect(filterContacts(list, { kind: 'optedOut' }).map((c) => c.id)).toEqual(['2'])
    expect(filterContacts(list, { kind: 'all' })).toHaveLength(3)
  })
  it('counts', () => {
    const c = countContacts(list)
    expect(c.all).toBe(3)
    expect(c.optedOut).toBe(1)
    expect(c.byLabel).toEqual({ a: 2, b: 1 })
    expect(c.byStage).toMatchObject({ WON: 1, NEW_LEAD: 1, LOST: 1 })
  })
})

describe('display', () => {
  it('formats phones and names', () => {
    expect(formatPhone('+971501234567')).toBe('+971 501 234 567')
    expect(formatPhone('')).toBe('')
    expect(contactName({})).toBe('Customer')
    expect(contactName({ firstName: 'A', lastName: 'B' })).toBe('A B')
    expect(stageWord('QUALIFIED')).toBe('Interested')
  })
})
