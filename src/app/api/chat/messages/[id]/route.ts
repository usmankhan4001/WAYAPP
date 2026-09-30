import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/rbac'
import { logger } from '@/lib/logger'

/**
 * Star or unstar a message. Any signed-in team member may do this; it is a personal bookmark on
 * the thread, unlike editing the message body (ADMIN only, at /api/chat/message/[id]).
 */
async function setStar(request: NextRequest, params: Promise<{ id: string }>, forced?: boolean) {
  const authResult = await requireAuth(request)
  if ('response' in authResult) return authResult.response

  try {
    const { id } = await params
    const message = await prisma.chatMessage.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })

    let starred = forced
    if (starred === undefined) {
      const body = await request.json().catch(() => ({}))
      starred = typeof body?.starred === 'boolean' ? body.starred : !message.starred
    }

    const updated = await prisma.chatMessage.update({ where: { id }, data: { starred } })
    return NextResponse.json({ success: true, message: updated })
  } catch (error) {
    logger.error({ error }, 'Error starring chat message')
    return NextResponse.json({ error: 'Failed to update message.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return setStar(request, params)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return setStar(request, params)
}
