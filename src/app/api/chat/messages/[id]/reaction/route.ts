import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/rbac'
import { WhatsAppClient } from '@/lib/whatsapp/client'
import { attachReaction, isSendable } from '@/lib/whatsapp/chat-extras'
import { logger } from '@/lib/logger'

/**
 * React to a message. Sends a Meta 'reaction' message and stores the emoji on the target
 * message's reactions JSON; it never creates a bubble. An empty emoji removes our reaction.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(request)
  if ('response' in authResult) return authResult.response

  try {
    const { id } = await params
    const { emoji } = await request.json()
    if (typeof emoji !== 'string' || emoji.length > 16) {
      return NextResponse.json({ error: 'A valid emoji is required.' }, { status: 400 })
    }

    const message = await prisma.chatMessage.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })
    if (!isSendable(message) || !message.wamid) {
      return NextResponse.json({ error: 'You cannot react to this message.' }, { status: 400 })
    }

    const client = await WhatsAppClient.createFromSettings()
    await client.sendReaction({ to: message.phoneNumber, messageId: message.wamid, emoji })

    const updated = await attachReaction(message.wamid, emoji, authResult.session.userId)
    return NextResponse.json({ success: true, message: updated })
  } catch (error: any) {
    logger.error({ error }, 'Error sending reaction')
    return NextResponse.json({ error: 'Could not send the reaction. Try again.' }, { status: 400 })
  }
}
