import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { interpretMetaError } from '@/lib/whatsapp/errors';

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
    const { contactId, text, templateName, languageCode, bodyVariables, headerMediaUrl } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
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
    let wamid: string | null = null;
    let messageBody = text?.trim() || '';

    if (templateName) {
      const tpl = await prisma.template.findFirst({
        where: { name: templateName },
      });

      const sendRes = await client.sendTemplateMessage({
        to: contact.phoneNumber,
        templateName,
        languageCode: languageCode || tpl?.language || 'en_US',
        headerMediaUrl,
        bodyVariables: bodyVariables || [],
        templateComponents: tpl?.components,
      });

      wamid = sendRes.messages?.[0]?.id || null;
      messageBody = `[Template: ${templateName}]`;
    } else {
      if (!text?.trim()) {
        return NextResponse.json(
          { error: 'Message text is required' },
          { status: 400 }
        );
      }

      const sendRes = await client.sendTextMessage(contact.phoneNumber, text.trim());
      wamid = sendRes.messages?.[0]?.id || null;
    }

    const message = await prisma.chatMessage.create({
      data: {
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        direction: 'OUTBOUND',
        wamid,
        messageType: templateName ? 'template' : 'text',
        body: messageBody,
        status: 'SENT',
      },
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastInteractionAt: new Date() },
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    const errInfo = interpretMetaError(error.code, error.message);
    return NextResponse.json(
      {
        success: false,
        error: `${errInfo.title}: ${errInfo.userMessage} (${errInfo.action})`,
        category: errInfo.category,
      },
      { status: 400 }
    );
  }
}
