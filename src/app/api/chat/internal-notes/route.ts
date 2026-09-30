import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/rbac'
import { createInternalNote } from '@/lib/whatsapp/chat-extras'
import { logger } from '@/lib/logger'

/**
 * Add a team-only note to a chat. This route deliberately does not import WhatsAppClient: a
 * note is stored and nothing else. It is not an inbound message, so it does not open the reply
 * window, raise unread counts or fire webhooks.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('response' in authResult) return authResult.response

  try {
    const { contactId, body } = await request.json()
    const text = typeof body === 'string' ? body.trim() : ''
    if (!contactId || !text) {
      return NextResponse.json({ error: 'A contact and a note are required.' }, { status: 400 })
    }

    const contact = await prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })

    const message = await createInternalNote({
      contactId: contact.id,
      phoneNumber: contact.phoneNumber,
      authorId: authResult.session.userId,
      body: text.slice(0, 4000),
    })
    return NextResponse.json({ success: true, message })
  } catch (error) {
    logger.error({ error }, 'Error saving internal note')
    return NextResponse.json({ error: 'Could not save the note.' }, { status: 500 })
  }
}
