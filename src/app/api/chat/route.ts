import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from '@/lib/whatsapp/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (contactId) {
      // Get full message history for specific contact
      const messages = await prisma.chatMessage.findMany({
        where: { contactId },
        orderBy: { timestamp: 'asc' },
      });
      return NextResponse.json(messages);
    }

    // Get all conversations with latest message & unread indicators
    const contactsWithChats = await prisma.contact.findMany({
      where: {
        chatMessages: {
          some: {},
        },
      },
      include: {
        groups: { include: { group: true } },
        tags: { include: { tag: true } },
        chatMessages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(contactsWithChats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, text } = body;

    if (!contactId || !text?.trim()) {
      return NextResponse.json(
        { error: 'Contact ID and message text are required' },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const client = await WhatsAppClient.createFromSettings();
    const sendRes = await client.sendTextMessage(contact.phoneNumber, text.trim());
    const wamid = sendRes.messages?.[0]?.id || null;

    const message = await prisma.chatMessage.create({
      data: {
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        direction: 'OUTBOUND',
        wamid,
        messageType: 'text',
        body: text.trim(),
        status: 'SENT',
      },
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastInteractionAt: new Date() },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
