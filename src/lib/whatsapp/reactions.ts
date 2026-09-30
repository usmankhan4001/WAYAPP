// Pure helpers (no database) so client components can use them too.

export const NOTE_DIRECTION = 'INTERNAL'
export const NOTE_TYPE = 'note'

export interface Reaction {
  emoji: string
  from: string // 'customer' or a user id
}

export function isInternalNote(message: { direction?: string | null; messageType?: string | null }): boolean {
  return message.direction === NOTE_DIRECTION || message.messageType === NOTE_TYPE
}

/** True only for rows that may be sent to Meta or quoted in a reply. */
export function isSendable(message: { direction?: string | null; messageType?: string | null }): boolean {
  return !isInternalNote(message)
}

export function parseReactions(raw: string | null | undefined): Reaction[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r) => r && typeof r.emoji === 'string' && typeof r.from === 'string')
  } catch {
    return []
  }
}

/**
 * One reaction per sender, like WhatsApp: a new emoji replaces the sender's old one and an
 * empty emoji removes it.
 */
export function applyReaction(current: Reaction[], emoji: string, from: string): Reaction[] {
  const others = current.filter((r) => r.from !== from)
  return emoji ? [...others, { emoji, from }] : others
}
