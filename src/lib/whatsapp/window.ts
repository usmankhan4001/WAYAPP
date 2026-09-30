import { prisma } from '@/lib/prisma'

export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000

export interface ReplyWindow {
  isOpen: boolean
  windowExpiresAt: string | null
  lastInboundAt: string | null
}

/**
 * Pure calculation, kept separate so it can be tested without a database.
 * The window is open strictly before lastInbound + 24h; at exactly 24h it is closed.
 */
export function computeReplyWindow(lastInboundAt: Date | null, now: Date = new Date()): ReplyWindow {
  if (!lastInboundAt) return { isOpen: false, windowExpiresAt: null, lastInboundAt: null }
  const expires = new Date(lastInboundAt.getTime() + REPLY_WINDOW_MS)
  return {
    isOpen: now.getTime() < expires.getTime(),
    windowExpiresAt: expires.toISOString(),
    lastInboundAt: lastInboundAt.toISOString(),
  }
}

/**
 * The 24-hour customer-service window is measured from the contact's latest INBOUND
 * message. Contact.lastInteractionAt is not used: Shopify, WooCommerce and social
 * handlers also set it, which made windows look open when the customer never wrote.
 */
export async function getReplyWindow(contactId: string, now: Date = new Date()): Promise<ReplyWindow> {
  const last = await prisma.chatMessage.findFirst({
    where: { contactId, direction: 'INBOUND' },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  })
  return computeReplyWindow(last?.timestamp ?? null, now)
}
