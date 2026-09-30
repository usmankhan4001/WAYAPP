import { describe, it, expect } from 'vitest'
import {
  campaignStatusPill, matchesFilter, countByFilter, progressPercents, translateError,
  messageStatusPill, maskPhone, toScheduledIso, validateStep, type WizardState,
} from '@/lib/campaigns/present'

const base: WizardState = {
  name: 'Eid offer', templateId: 't1', requiredVars: ['1'], mappings: { '1': 'firstName' },
  needsHeaderImage: false, headerMediaUrl: '', sendToAll: true, includeCount: 0, audienceCount: 10,
  whenMode: 'now', scheduledAt: null, sendConfirm: '', now: Date.parse('2026-01-01T00:00:00Z'),
}

describe('campaign status', () => {
  it('maps database statuses to plain pills', () => {
    expect(campaignStatusPill('RUNNING').label).toBe('Sending')
    expect(campaignStatusPill('QUEUED').label).toBe('Sending')
    expect(campaignStatusPill('COMPLETED').label).toBe('Sent')
    expect(campaignStatusPill('FAILED').tone).toBe('danger')
    expect(campaignStatusPill('weird').label).toBe('Draft')
  })
  it('groups filters and counts', () => {
    expect(matchesFilter('RUNNING', 'SENDING')).toBe(true)
    expect(matchesFilter('DRAFT', 'SENT')).toBe(false)
    const c = countByFilter([{ status: 'QUEUED' }, { status: 'RUNNING' }, { status: 'DRAFT' }])
    expect(c).toMatchObject({ ALL: 3, SENDING: 2, DRAFT: 1, SENT: 0 })
  })
})

describe('progressPercents', () => {
  it('computes shares of the whole list and guards zero', () => {
    const p = progressPercents({ totalContacts: 200, sentCount: 100, deliveredCount: 50, readCount: 20, repliedCount: 2, failedCount: 10 })
    expect(p).toMatchObject({ sent: 50, delivered: 25, read: 10, replied: 1, failed: 5, done: 55 })
    expect(progressPercents({ totalContacts: 0, sentCount: 5 }).sent).toBe(0)
    expect(progressPercents({ totalContacts: 2, sentCount: 9 }).sent).toBe(100)
  })
})

describe('translateError', () => {
  it('translates known codes', () => {
    expect(translateError(131026)).toBe('This number is not on WhatsApp')
    expect(translateError('131026', 'x')).toBe('This number is not on WhatsApp')
  })
  it('falls back to plain words and empty', () => {
    expect(translateError(999999, 'boom')).toBe('This message could not be delivered')
    expect(translateError(null, null)).toBe('')
  })
  it('never leaks the code in the plain text', () => {
    expect(translateError(131047)).not.toMatch(/\d{6}/)
  })
})

describe('misc', () => {
  it('message pills and masking', () => {
    expect(messageStatusPill('DELIVERED').label).toBe('Delivered')
    expect(messageStatusPill(undefined).label).toBe('Waiting')
    expect(maskPhone('+971501234567')).toBe('+971 •••• 567')
    expect(maskPhone('123')).toBe('•••••')
  })
  it('builds a schedule time', () => {
    expect(toScheduledIso('', '10:00')).toBeNull()
    expect(toScheduledIso('2026-05-01', '10:00')).toMatch(/^2026-0[45]-/)
  })
})

describe('validateStep', () => {
  it('requires a name', () => {
    expect(validateStep(1, { ...base, name: '  ' })).toMatch(/name/)
    expect(validateStep(1, base)).toBeNull()
  })
  it('requires a message, filled blanks and header picture', () => {
    expect(validateStep(2, { ...base, templateId: '' })).toMatch(/Pick a message/)
    expect(validateStep(2, { ...base, mappings: {} })).toMatch(/every blank/)
    expect(validateStep(2, { ...base, needsHeaderImage: true })).toMatch(/picture/)
    expect(validateStep(2, base)).toBeNull()
  })
  it('requires an audience', () => {
    expect(validateStep(3, { ...base, sendToAll: false, includeCount: 0 })).toMatch(/Choose who/)
    expect(validateStep(3, { ...base, audienceCount: 0 })).toMatch(/No one/)
    expect(validateStep(3, base)).toBeNull()
  })
  it('checks schedule and SEND confirmation', () => {
    expect(validateStep(4, { ...base, whenMode: 'later' })).toMatch(/date and time/)
    expect(validateStep(4, { ...base, whenMode: 'later', scheduledAt: '2025-01-01T00:00:00Z' })).toMatch(/future/)
    expect(validateStep(4, { ...base, whenMode: 'later', scheduledAt: '2027-01-01T00:00:00Z' })).toBeNull()
    expect(validateStep(4, { ...base, audienceCount: 51 })).toMatch(/SEND/)
    expect(validateStep(4, { ...base, audienceCount: 51, sendConfirm: 'SEND' })).toBeNull()
    expect(validateStep(4, { ...base, audienceCount: 50 })).toBeNull()
  })
})

import { templateInfo } from '@/lib/campaigns/present'
describe('templateInfo', () => {
  it('finds blanks and header image need', () => {
    const t = { components: JSON.stringify([{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'Hi {{1}} {{2}} {{1}}' }]) }
    expect(templateInfo(t)).toMatchObject({ vars: ['1', '2'], needsHeaderImage: true })
    expect(templateInfo(null).vars).toEqual([])
  })
})
