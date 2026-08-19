import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const {
      contactId,
      text = 'Hello! I am replying to your message.',
      mediaUrl,
      mediaType = 'text',
    } = body;

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const now = new Date();

    // 1. Update contact last interaction time to open the 24-hour service window
    await prisma.contact.update({
      where: { id: contact.id },
      data: {
        lastInteractionAt: now,
        status: contact.status === 'UNSUBSCRIBED' ? 'ACTIVE' : contact.status,
      },
    });

    // 2. Ensure Conversation exists and is marked OPEN with incremented unread count
    const conversation = await prisma.conversation.upsert({
      where: { contactId: contact.id },
      update: {
        lastMessageAt: now,
        unreadCount: { increment: 1 },
        status: 'OPEN',
      },
      create: {
        contactId: contact.id,
        status: 'OPEN',
        lastMessageAt: now,
        unreadCount: 1,
      },
    });

    const fakeWamid = `wamid.HBgL${Date.now()}SIMULATED${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 3. Create INBOUND ChatMessage
    const chatMessage = await prisma.chatMessage.create({
      data: {
        contactId: contact.id,
        conversationId: conversation.id,
        phoneNumber: contact.phoneNumber,
        direction: 'INBOUND',
        wamid: fakeWamid,
        messageType: mediaType || 'text',
        body: text || 'Inbound simulated message',
        mediaUrl: mediaUrl || null,
        status: 'DELIVERED',
        timestamp: now,
      },
    });

    // 4. Trigger automations / bot workflows asynchronously
    try {
      const { processInboundEvent } = await import('@/worker/inbound-events');
      processInboundEvent({
        contactId: contact.id,
        conversationId: conversation.id,
        phoneNumber: contact.phoneNumber,
        wamid: fakeWamid,
        bodyText: text || '',
        messageType: mediaType || 'text',
        timestamp: now,
      }).catch((err) => logger.error({ err }, 'Simulated inbound event processing error'));
    } catch {}

    return NextResponse.json({
      success: true,
      message: chatMessage,
      conversation,
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to simulate inbound message');
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
