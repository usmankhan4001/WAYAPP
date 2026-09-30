import { describe, it, expect } from 'vitest'
import {
  describeTrigger, describeAction, describeRule, statusFor, flowStatusFor, describeBot,
  flowCanGoLive, validateRule, validateBot, splitKeywords, safeJson,
} from '@/lib/automations/present'

describe('automations present', () => {
  it('describes triggers in plain words', () => {
    expect(describeTrigger({ matchType: 'CONTAINS', keywords: ['price', 'cost'] })).toBe('When a message mentions "price" or "cost"')
    expect(describeTrigger({ matchType: 'CONTAINS', keywords: ['a', 'b', 'c'] })).toBe('When a message mentions "a", "b" or "c"')
    expect(describeTrigger({ matchType: 'EXACT', keywords: ['hi'] })).toBe('When a message is exactly "hi"')
    expect(describeTrigger({ matchType: 'ANY_INBOUND' })).toBe('When a customer sends any message')
    expect(describeTrigger({ matchType: 'REGEX', keywords: ['^x'] })).not.toMatch(/regex/i)
  })

  it('describes actions', () => {
    expect(describeAction({ type: 'ADD_TAG', payload: { tagName: 'Hot' } })).toBe('Adds the label "Hot"')
    expect(describeAction({ type: 'ASSIGN_GROUP', payload: { groupId: 'g1' } }, 'VIP')).toContain('"VIP"')
    expect(describeAction(undefined)).toBe('Does nothing yet')
  })

  it('describes a rule from raw JSON and survives bad JSON', () => {
    const r = describeRule({ triggerConfig: '{"matchType":"CONTAINS","keywords":["price"]}', actionsJson: '[{"type":"SEND_TEXT","payload":{"text":"Hello"}}]' })
    expect(r.when).toContain('"price"')
    expect(r.then).toBe('Replies: "Hello"')
    expect(describeRule({ triggerConfig: '{oops', actionsJson: 'x' }).then).toBe('Does nothing yet')
    expect(safeJson('nope', 5)).toBe(5)
  })

  it('maps status', () => {
    expect(statusFor(true)).toEqual({ label: 'On', tone: 'success' })
    expect(statusFor(false).label).toBe('Paused')
    expect(flowStatusFor('PUBLISHED').label).toBe('On')
    expect(flowStatusFor('DRAFT').label).toBe('Paused')
  })

  it('describes bots and flow readiness', () => {
    expect(describeBot({ kind: 'AI', knowledgeBase: { name: 'FAQ' } })).toContain('FAQ')
    expect(describeBot({ kind: 'KEYWORD', description: ' Mine ' })).toBe('Mine')
    expect(flowCanGoLive('[{"type":"trigger"}]')).toBe(true)
    expect(flowCanGoLive('[{"type":"message"}]')).toBe(false)
    expect(flowCanGoLive(undefined)).toBe(false)
  })

  it('validates forms with plain messages', () => {
    const base = { name: '', matchType: 'CONTAINS', keywords: ' , ', actionType: 'SEND_TEXT', text: '', templateName: '', tagName: '', groupId: '' }
    expect(Object.keys(validateRule(base)).sort()).toEqual(['action', 'keywords', 'name'])
    expect(validateRule({ ...base, name: 'x', matchType: 'ANY_INBOUND', text: 'hi' })).toEqual({})
    expect(splitKeywords('a, b,,c')).toEqual(['a', 'b', 'c'])
    const b = { name: 'Bot', kind: 'HTTP', keywords: '', replyText: '', instructions: '', serviceUrl: 'nope' }
    expect(validateBot(b).serviceUrl).toBeTruthy()
    expect(validateBot({ ...b, kind: 'AI' }).instructions).toBeTruthy()
    expect(validateBot({ ...b, kind: 'AI', instructions: 'Be kind' })).toEqual({})
  })
})
