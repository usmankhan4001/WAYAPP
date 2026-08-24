import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { sanitizePhoneNumber } from '@/lib/whatsapp/phone';
import { interpretMetaError } from '@/lib/whatsapp/errors';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const MessageSendSchema = z.object({
  to: z.string().min(6),
  type: z.enum(['text', 'template', 'image', 'video', 'document', 'audio']).default('text'),
  text: z.string().optional(),
  templateName: z.string().optional(),
  languageCode: z.string().default('en_US'),
  bodyVariables: z.array(z.string()).optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'messages:send');
  if ('response' in authResult) return authResult.response;

  const rateLimitKey = authResult.auth.type === 'API_KEY' ? `v1:${authResult.auth.keyId}` : `v1:${getClientIp(request)}`;
  const rateLimit = checkRateLimit(rateLimitKey, { limit: 120, windowSeconds: 60 });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many message requests' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = MessageSendSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid message payload' },
        { status: 400 }
      );
    }

    const { to, type, text, templateName, languageCode, bodyVariables, mediaUrl, caption, filename } = parseResult.data;

    const phoneResult = sanitizePhoneNumber(to);
    if (!phoneResult.isValid) {
      return NextResponse.json({ error: 'Recipient phone number is invalid E.164' }, { status: 400 });
    }

    // Lookup contact & check suppression
    const contact = await prisma.contact.upsert({
      where: { phoneNumber: phoneResult.e164 },
      update: {},
      create: { phoneNumber: phoneResult.e164 },
    });

    if (contact.status === 'UNSUBSCRIBED' || contact.status === 'BLOCKED') {
      return NextResponse.json(
        { error: 'Cannot send message: Recipient is unsubscribed or blocked.' },
        { status: 400 }
      );
    }

    // 24h Window Check for non-template messages
    if (type !== 'template' && !templateName) {
      const now = Date.now();
      const lastInteraction = contact.lastInteractionAt ? new Date(contact.lastInteractionAt).getTime() : 0;
      const hoursSinceLastMessage = (now - lastInteraction) / (1000 * 60 * 60);

      if (hoursSinceLastMessage > 24) {
        return NextResponse.json(
          {
            error:
              '24-Hour WhatsApp Policy: Free-text messages cannot be sent outside the 24-hour customer care window. Please use a template.',
            requiresTemplate: true,
          },
          { status: 403 }
        );
      }
    }

    const client = await WhatsAppClient.createFromSettings();
    let wamid: string | null = null;
    let savedBody = text || '';

    if (type === 'template' || templateName) {
      const template = await prisma.template.findFirst({
        where: { name: templateName },
      });

      const sendRes = await client.sendTemplateMessage({
        to: phoneResult.e164,
        templateName: templateName || '',
        languageCode: languageCode || template?.language || 'en_US',
        bodyVariables: bodyVariables || [],
        templateComponents: template?.components,
      });

      wamid = sendRes.messages?.[0]?.id || null;
      savedBody = `[Template: ${templateName}]`;
    } else if (mediaUrl) {
      const sendRes = await client.sendMediaMessage({
        to: phoneResult.e164,
        type: type as any,
        mediaUrl,
        caption: caption || text,
        filename,
      });

      wamid = sendRes.messages?.[0]?.id || null;
      savedBody = caption || text || `[${type.toUpperCase()}]`;
    } else {
      if (!text?.trim()) {
        return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
      }

      const sendRes = await client.sendTextMessage(phoneResult.e164, text.trim());
      wamid = sendRes.messages?.[0]?.id || null;
      savedBody = text.trim();
    }

    // Save ChatMessage
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
      },
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastInteractionAt: new Date() },
    });

    const message = await prisma.chatMessage.create({
      data: {
        contactId: contact.id,
        conversationId: conversation.id,
        phoneNumber: phoneResult.e164,
        direction: 'OUTBOUND',
        wamid,
        messageType: type,
        body: savedBody,
        mediaUrl: mediaUrl || null,
        status: 'SENT',
      },
    });

    return NextResponse.json({
      success: true,
      messageId: message.id,
      wamid,
      status: 'SENT',
      recipient: phoneResult.e164,
    });
  } catch (error: any) {
    const errInfo = interpretMetaError(error.code, error.message);
    return NextResponse.json(
      {
        error: `${errInfo.title}: ${errInfo.userMessage}`,
        metaCode: error.code,
      },
      { status: 400 }
    );
  }
}
