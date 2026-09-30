import { prisma } from '@/lib/prisma'
import {
  NOTE_DIRECTION,
  NOTE_TYPE,
  isInternalNote,
  isSendable,
  parseReactions,
  applyReaction,
  type Reaction,
} from './reactions'

/**
 * Chat extras: reactions, replies and internal notes.
 *
 * Internal notes are ChatMessage rows with direction 'INTERNAL' and messageType 'note'. They
 * live in the same table only so they sit in the thread, in order. They have no wamid, are
 * never handed to WhatsAppClient, never count as inbound for the 24h reply window (window.ts
 * only looks at INBOUND), never bump unread counts and are excluded from analytics and API
 * feeds. isSendable() is the single check every send path must pass.
 */

export { NOTE_DIRECTION, NOTE_TYPE, isInternalNote, isSendable, parseReactions, applyReaction }
export type { Reaction }

/**
 * Attach a reaction to the message it targets. Never creates a ChatMessage: a reaction is not a
 * bubble. Returns the updated message, or null when the target is unknown (reaction ignored).
 */
export async function attachReaction(targetWamid: string, emoji: string, from: string) {
  const target = await prisma.chatMessage.findUnique({ where: { wamid: targetWamid } })
  if (!target || isInternalNote(target)) return null
  const next = applyReaction(parseReactions(target.reactions), emoji, from)
  return prisma.chatMessage.update({
    where: { id: target.id },
    data: { reactions: next.length ? JSON.stringify(next) : null },
  })
}

/** Store an internal note. Deliberately imports nothing that can talk to Meta. */
export async function createInternalNote(params: { contactId: string; phoneNumber: string; authorId: string; body: string }) {
  const conversation = await prisma.conversation.findUnique({ where: { contactId: params.contactId } })
  return prisma.chatMessage.create({
    data: {
      contactId: params.contactId,
      conversationId: conversation?.id ?? null,
      phoneNumber: params.phoneNumber,
      direction: NOTE_DIRECTION,
      messageType: NOTE_TYPE,
      body: params.body,
      status: 'SENT',
      authorId: params.authorId,
      timestamp: new Date(),
    },
  })
}
