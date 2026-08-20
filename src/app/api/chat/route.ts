import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { interpretMetaError } from '@/lib/whatsapp/errors';
import { sanitizePhoneNumber } from '@/lib/whatsapp/phone';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId');
  const conversationId = searchParams.get('conversationId');
  const filter = searchParams.get('filter') || 'all'; // all, unread
  const search = searchParams.get('search')?.trim().toLowerCase();

  try {
    // 1. Fetch message thread for specific contact / conversation
    if (contactId || conversationId) {
      let targetContactId = contactId;
      if (!targetContactId && conversationId) {
        const conv = await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { contactId: true },
        });
        targetContactId = conv?.contactId || null;
      }

      const where: any = {};
      if (targetContactId) {
        where.contactId = targetContactId;
      } else if (conversationId) {
        where.conversationId = conversationId;
      }

      const messages = await prisma.chatMessage.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });

      // Reset unread count for this conversation
      if (targetContactId) {
        await prisma.conversation.updateMany({
          where: { contactId: targetContactId },
          data: { unreadCount: 0 },
        }).catch(() => {});
      }

      return NextResponse.json(messages);
    }

    // 2. Fetch all 1-to-1 conversations
    const convWhere: any = {};
    if (filter === 'unread') {
      convWhere.unreadCount = { gt: 0 };
    }

    if (search) {
      convWhere.contact = {
        OR: [
          { phoneNumber: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    const conversations = await prisma.conversation.findMany({
      where: convWhere,
      include: {
        contact: {
          include: {
            tags: { include: { tag: true } },
            groups: { include: { group: true } },
          },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });

    // Also fetch contacts that do not have an explicit conversation record yet
    const existingContactIds = new Set(conversations.map((c) => c.contactId).filter(Boolean));

    if (filter !== 'unread') {
      const contactsWithoutConv = await prisma.contact.findMany({
        where: {
          id: { notIn: Array.from(existingContactIds) },
          ...(search
            ? {
                OR: [
                  { phoneNumber: { contains: search } },
                  { firstName: { contains: search } },
                  { lastName: { contains: search } },
                  { email: { contains: search } },
                ],
              }
            : {}),
        },
        include: {
          tags: { include: { tag: true } },
          groups: { include: { group: true } },
          chatMessages: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });

      // Map contacts without conversation records into conversation items
      const virtualConversations = contactsWithoutConv.map((contact) => ({
        id: `virtual_${contact.id}`,
        contactId: contact.id,
        contact,
        status: 'OPEN',
        lastMessageAt: contact.updatedAt,
        unreadCount: 0,
        messages: contact.chatMessages || [],
      }));

      return NextResponse.json([...conversations, ...virtualConversations]);
    }

    return NextResponse.json(conversations);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching 1-to-1 chat conversations');
    return NextResponse.json({ error: 'Failed to retrieve conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const {
      contactId,
      phoneNumber,
      text,
      templateName,
      languageCode,
      bodyVariables,
      headerMediaUrl,
      mediaUrl,
      mediaType,
      caption,
      filename,
    } = body;

    let contact: any = null;

    if (contactId) {
      contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
    }

    if (!contact && phoneNumber) {
      const normalized = sanitizePhoneNumber(phoneNumber).e164 || phoneNumber;
      contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phoneNumber: normalized },
            { phoneNumber: normalized.replace(/^\+/, '') },
            { phoneNumber: `+${normalized.replace(/^\+/, '')}` },
          ],
        },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            phoneNumber: normalized,
            firstName: 'Customer',
            status: 'ACTIVE',
            lastInteractionAt: new Date(),
          },
        });
      }
    }

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found or invalid' }, { status: 404 });
    }

    if (contact.status === 'UNSUBSCRIBED' || contact.status === 'BLOCKED') {
      return NextResponse.json(
        { error: 'Cannot send message: Contact has unsubscribed or opted out.' },
        { status: 400 }
      );
    }

    const client = await WhatsAppClient.createFromSettings();
    let wamid: string | null = null;
    let messageBody = text?.trim() || '';
    let savedMessageType = 'text';
    let savedMediaUrl = mediaUrl || null;

    if (mediaUrl && mediaType) {
      const origin = request.nextUrl.origin;
      const absoluteMediaUrl = mediaUrl.startsWith('http') ? mediaUrl : `${origin}${mediaUrl}`;

      const sendRes = await client.sendMediaMessage({
        to: contact.phoneNumber,
        type: mediaType as 'image' | 'video' | 'audio' | 'document',
        mediaUrl: absoluteMediaUrl,
        caption: caption?.trim() || text?.trim() || undefined,
        filename: filename || undefined,
      });

      wamid = sendRes.messages?.[0]?.id || null;
      savedMessageType = mediaType;
      messageBody = caption?.trim() || text?.trim() || filename || `[${mediaType.toUpperCase()}]`;
    } else if (templateName) {
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
      savedMessageType = 'template';
      messageBody = `[Template: ${templateName}]`;
    } else {
      if (!text?.trim()) {
        return NextResponse.json({ error: 'Message text or attachment is required' }, { status: 400 });
      }

      const sendRes = await client.sendTextMessage(contact.phoneNumber, text.trim());
      wamid = sendRes.messages?.[0]?.id || null;
      savedMessageType = 'text';
    }

    // Ensure Conversation row exists and update timestamp
    const conversation = await prisma.conversation.upsert({
      where: { contactId: contact.id },
      update: {
        lastMessageAt: new Date(),
        status: 'OPEN',
      },
      create: {
        contactId: contact.id,
        status: 'OPEN',
        lastMessageAt: new Date(),
        unreadCount: 0,
      },
    });

    const message = await prisma.chatMessage.create({
      data: {
        contactId: contact.id,
        conversationId: conversation.id,
        phoneNumber: contact.phoneNumber,
        direction: 'OUTBOUND',
        wamid,
        messageType: savedMessageType,
        body: messageBody,
        mediaUrl: savedMediaUrl,
        status: 'SENT',
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true, message, conversation });
  } catch (error: any) {
    logger.error({ error }, 'Error sending WhatsApp 1-to-1 message');
    const errInfo = interpretMetaError(error.code, error.message);
    return NextResponse.json(
      {
        success: false,
        error: `${errInfo.title}: ${errInfo.userMessage} (${errInfo.action})`,
        category: errInfo.category,
        requiresTemplate: error.code === 131047 || error.code === 131026 || error.message?.includes('24 hour'),
      },
      { status: 400 }
    );
  }
}
