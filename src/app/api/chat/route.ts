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

  const { session } = authResult;
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId');
  const conversationId = searchParams.get('conversationId');
  const filter = searchParams.get('filter') || 'all'; // all, mine, unassigned, resolved, spam
  const search = searchParams.get('search')?.trim().toLowerCase();
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const cursor = searchParams.get('cursor') || undefined;
  const messageLimit = Math.min(parseInt(searchParams.get('messageLimit') || '100', 10), 500);

  try {
    // 1. Fetch message thread for specific contact / conversation
    if (contactId || conversationId) {
      const where: any = {};
      if (contactId) where.contactId = contactId;
      if (conversationId) where.conversationId = conversationId;

      const messages = await prisma.chatMessage.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        take: messageLimit,
      });

      // Reset unread count for this conversation
      if (contactId) {
        await prisma.conversation.updateMany({
          where: { contactId },
          data: { unreadCount: 0 },
        });
      }

      return NextResponse.json(messages);
    }

    // 2. Build conversation filter query
    const whereClause: any = {};

    if (filter === 'mine') {
      whereClause.assignedToId = session.userId;
      whereClause.status = { notIn: ['RESOLVED', 'SPAM'] };
    } else if (filter === 'unassigned') {
      whereClause.assignedToId = null;
      whereClause.status = { notIn: ['RESOLVED', 'SPAM'] };
    } else if (filter === 'resolved') {
      whereClause.status = 'RESOLVED';
    } else if (filter === 'spam') {
      whereClause.status = 'SPAM';
    } else {
      // 'all' active
      whereClause.status = { notIn: ['RESOLVED', 'SPAM'] };
      // SECURITY: Enforce RBAC. Only Admins can see ALL active chats.
      if (session.role === 'MEMBER') {
        whereClause.assignedToId = session.userId; // Force 'mine' filter for standard members
      }
    }

    if (search) {
      whereClause.contact = {
        OR: [
          { phoneNumber: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    // Fetch conversations with relations
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        contact: {
          include: {
            tags: { include: { tag: true } },
            groups: { include: { group: true } },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Pagination: detect if there's a next page
    let nextCursor: string | null = null;
    if (conversations.length > limit) {
      const lastItem = conversations.pop();
      nextCursor = lastItem?.id || null;
    }

    // Fallback: If no conversation rows exist yet, return contacts with chats
    if (conversations.length === 0 && filter === 'all' && !search) {
      const contactsWithChats = await prisma.contact.findMany({
        where: {
          chatMessages: { some: {} },
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
    }

    return NextResponse.json({ conversations, nextCursor });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching chat conversations');
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

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (contact.status === 'UNSUBSCRIBED' || contact.status === 'BLOCKED') {
      return NextResponse.json(
        { error: 'Cannot send message: Contact has unsubscribed or opted out.' },
        { status: 400 }
      );
    }

    // 24-HOUR CUSTOMER CARE WINDOW ENFORCEMENT
    const isFreeFormMessage = !templateName;
    if (isFreeFormMessage) {
      const now = Date.now();
      const lastInteraction = contact.lastInteractionAt ? new Date(contact.lastInteractionAt).getTime() : 0;
      const hoursSinceLastMessage = (now - lastInteraction) / (1000 * 60 * 60);

      if (hoursSinceLastMessage > 24) {
        return NextResponse.json(
          {
            error:
              '24-Hour WhatsApp Policy Restriction: Free-text messages cannot be sent because more than 24 hours have passed since the customer last messaged. Please use an approved WhatsApp Template instead.',
            requiresTemplate: true,
          },
          { status: 403 }
        );
      }
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

    // Ensure Conversation row exists
    const conversation = await prisma.conversation.upsert({
      where: { contactId: contact.id },
      update: {
        lastMessageAt: new Date(),
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
      },
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
