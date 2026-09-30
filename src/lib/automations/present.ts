// Plain-language helpers for the Automations area. Pure functions, no React, so they can be unit tested.
// The owner never sees match types, JSON or action codes; they see sentences.

export type StatusTone = 'success' | 'neutral'

export const AUTOMATIONS_OFF_MESSAGE =
  'Automatic replies are switched off for this account. What you build here is saved but will not answer customers yet.'

export function safeJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function statusFor(isActive: boolean): { label: 'On' | 'Paused'; tone: StatusTone } {
  return isActive ? { label: 'On', tone: 'success' } : { label: 'Paused', tone: 'neutral' }
}

/** A flow is live only when published; anything else (draft) reads as Paused. */
export function flowStatusFor(status: string | null | undefined) {
  return statusFor(status === 'PUBLISHED')
}

function quoteList(words: string[]): string {
  const q = words.map((w) => `"${w}"`)
  if (q.length <= 1) return q.join('')
  if (q.length === 2) return `${q[0]} or ${q[1]}`
  return `${q.slice(0, -1).join(', ')} or ${q[q.length - 1]}`
}

export function splitKeywords(input: string): string[] {
  return input
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

export function describeTrigger(cfg: { matchType?: string; keywords?: string[] } | null | undefined): string {
  const words = (cfg?.keywords || []).filter(Boolean)
  switch (cfg?.matchType) {
    case 'ANY_INBOUND':
      return 'When a customer sends any message'
    case 'EXACT':
      return words.length ? `When a message is exactly ${quoteList(words)}` : 'When a message matches exactly'
    case 'STARTS_WITH':
      return words.length ? `When a message starts with ${quoteList(words)}` : 'When a message starts with your words'
    case 'REGEX':
      return 'When a message fits a custom pattern'
    default:
      return words.length ? `When a message mentions ${quoteList(words)}` : 'When a message mentions your words'
  }
}

type Action = { type?: string; payload?: Record<string, any> } | undefined

export function describeAction(action: Action, groupName?: string): string {
  const p = action?.payload || {}
  switch (action?.type) {
    case 'SEND_TEXT':
      return p.text ? `Replies: "${String(p.text).slice(0, 90)}"` : 'Sends a text reply'
    case 'SEND_TEMPLATE':
      return p.templateName ? `Sends the approved message "${p.templateName}"` : 'Sends an approved message'
    case 'ADD_TAG':
      return p.tagName ? `Adds the label "${p.tagName}"` : 'Adds a label to the customer'
    case 'ASSIGN_GROUP':
      return `Adds the customer to the group "${groupName || p.groupId || 'chosen group'}"`
    default:
      return 'Does nothing yet'
  }
}

export function describeRule(
  rule: { triggerConfig?: string; actionsJson?: string },
  groups: { id: string; name: string }[] = []
) {
  const trigger = safeJson<any>(rule.triggerConfig, {})
  const action = safeJson<any[]>(rule.actionsJson, [])[0]
  const groupName = groups.find((g) => g.id === action?.payload?.groupId)?.name
  return { when: describeTrigger(trigger), then: describeAction(action, groupName) }
}

export const BOT_KIND_LABEL: Record<string, string> = {
  AI: 'AI assistant',
  KEYWORD: 'Keyword reply',
  HTTP: 'Connected service',
}

export function describeBot(bot: { kind?: string; description?: string | null; knowledgeBase?: { name?: string } | null }): string {
  if (bot.description?.trim()) return bot.description.trim()
  if (bot.kind === 'AI') {
    return bot.knowledgeBase?.name
      ? `Answers customer questions using "${bot.knowledgeBase.name}".`
      : 'Answers customer questions in a friendly way.'
  }
  if (bot.kind === 'KEYWORD') return 'Replies with a fixed message when a customer uses your keywords.'
  if (bot.kind === 'HTTP') return 'Hands the message to another system and sends back its answer.'
  return 'No description yet.'
}

export function describeFlow(flow: { description?: string | null }): string {
  return flow.description?.trim() || 'A step-by-step conversation you design on a canvas.'
}

/** Can this flow be switched on from the list? The builder blocks publishing without a start step. */
export function flowCanGoLive(nodesJson: string | null | undefined): boolean {
  return safeJson<any[]>(nodesJson, []).some((n) => n?.type === 'trigger')
}

export type RuleForm = {
  name: string
  matchType: string
  keywords: string
  actionType: string
  text: string
  templateName: string
  tagName: string
  groupId: string
}

/** Inline, plain-word validation. Empty object means the form is fine. */
export function validateRule(f: RuleForm): Partial<Record<'name' | 'keywords' | 'action', string>> {
  const errors: Partial<Record<'name' | 'keywords' | 'action', string>> = {}
  if (!f.name.trim()) errors.name = 'Give this reply a name so you can find it later.'
  if (f.matchType !== 'ANY_INBOUND' && splitKeywords(f.keywords).length === 0) {
    errors.keywords = 'Add at least one word or phrase, separated by commas.'
  }
  if (f.actionType === 'SEND_TEXT' && !f.text.trim()) errors.action = 'Type the message customers should get.'
  if (f.actionType === 'SEND_TEMPLATE' && !f.templateName) errors.action = 'Pick an approved message to send.'
  if (f.actionType === 'ADD_TAG' && !f.tagName.trim()) errors.action = 'Type the label to add.'
  if (f.actionType === 'ASSIGN_GROUP' && !f.groupId) errors.action = 'Pick a group.'
  return errors
}

export type BotForm = {
  name: string
  kind: string
  keywords: string
  replyText: string
  instructions: string
  serviceUrl: string
}

type BotErrors = Partial<Record<'name' | 'keywords' | 'replyText' | 'instructions' | 'serviceUrl', string>>

export function validateBot(f: BotForm): BotErrors {
  const errors: BotErrors = {}
  if (!f.name.trim()) errors.name = 'Give this assistant a name.'
  if (f.kind === 'KEYWORD') {
    if (splitKeywords(f.keywords).length === 0) errors.keywords = 'Add at least one word or phrase, separated by commas.'
    if (!f.replyText.trim()) errors.replyText = 'Type the reply customers should get.'
  }
  if (f.kind === 'AI' && !f.instructions.trim()) errors.instructions = 'Tell the assistant how to behave, in a sentence or two.'
  if (f.kind === 'HTTP' && !/^https?:\/\/\S+$/i.test(f.serviceUrl.trim())) {
    errors.serviceUrl = 'Enter the full address, starting with https://'
  }
  return errors
}
