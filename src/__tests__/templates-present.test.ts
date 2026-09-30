import { describe, it, expect } from 'vitest'
import {
  plainName, fillSamples, statusInfo, filterTemplates, chipCounts, insertVariable,
  variableNumbers, rejectionSentence, firstLine, bodyTextOf, contactLabel,
} from '@/lib/templates/present'

const mk = (name: string, status: string, category: string, text = 'Hi {{1}}') => ({
  name, status, category, components: JSON.stringify([{ type: 'BODY', text }]),
})
const list = [
  mk('welcome_offer', 'APPROVED', 'MARKETING', 'Hello {{1}}, 20% off'),
  mk('order_update', 'PENDING', 'UTILITY', 'Your order shipped'),
  mk('bad_one', 'REJECTED', 'MARKETING'),
  mk('old_one', 'PAUSED', 'UTILITY'),
]

describe('templates present helpers', () => {
  it('converts snake_case to plain words', () => {
    expect(plainName('welcome_offer')).toBe('Welcome offer')
    expect(plainName('')).toBe('Untitled message')
  })
  it('fills sample values and falls back to defaults', () => {
    expect(fillSamples('Hi {{1}}, code {{4}}', { '1': 'Ana' })).toBe('Hi Ana, code SAVE20')
    expect(fillSamples('{{9}}')).toBe('Sample 9')
  })
  it('maps status', () => {
    expect(statusInfo('APPROVED').variant).toBe('success')
    expect(statusInfo('PENDING').label).toBe('Waiting for Meta')
    expect(statusInfo('REJECTED').variant).toBe('destructive')
    expect(statusInfo('PAUSED').label).toBe('Paused')
  })
  it('filters by status, category and search', () => {
    expect(filterTemplates(list, { status: 'APPROVED' })).toHaveLength(1)
    expect(filterTemplates(list, { category: 'UTILITY' })).toHaveLength(2)
    expect(filterTemplates(list, { query: 'welcome' })).toHaveLength(1)
    expect(filterTemplates(list, { query: 'shipped' })).toHaveLength(1)
  })
  it('counts chips against the other filter', () => {
    const c = chipCounts(list, { category: 'MARKETING' })
    expect(c.status.ALL).toBe(2)
    expect(c.status.APPROVED).toBe(1)
    expect(c.category.ALL).toBe(4)
  })
  it('inserts the next variable', () => {
    expect(insertVariable('Hi').text).toBe('Hi {{1}}')
    expect(insertVariable('Hi {{1}} and').number).toBe(2)
    expect(insertVariable('Hi , bye', 3).text).toBe('Hi {{1}}, bye')
    expect(variableNumbers('{{2}} {{1}} {{2}}')).toEqual(['1', '2'])
  })
  it('writes one-sentence rejection reasons', () => {
    expect(rejectionSentence('')).toMatch(/did not say why/)
    expect(rejectionSentence('Variables are adjacent. More text here.')).toBe('Variables are adjacent.')
  })
  it('reads message text and contact names', () => {
    expect(firstLine('\n\nHello\nWorld')).toBe('Hello')
    expect(bodyTextOf(list[0])).toContain('Hello')
    expect(contactLabel({ firstName: 'Ana', lastName: 'K', phoneNumber: '+1' })).toBe('Ana K')
    expect(contactLabel({ phoneNumber: '+1' })).toBe('+1')
  })
})
