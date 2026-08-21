import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMetaSignature } from '@/lib/whatsapp/signature';
import { decryptString, timingSafeCompare } from '@/lib/crypto';
import { isModuleEnabled } from '@/lib/modules';
import { logger } from '@/lib/logger';

/**
 * GET Handler: Meta Instagram & Messenger Webhook Verification Handshake
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  });

  const configuredToken = settings?.webhookVerifyToken;

  if (
    mode === 'subscribe' &&
    token &&
    configuredToken &&
    timingSafeCompare(token, configuredToken)
  ) {
    logger.info('Meta Social Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST Handler: Ingest direct Instagram DMs & Facebook Messenger messages
 */
export async function POST(request: NextRequest) {
  try {
    const enabled = await isModuleEnabled('multichannel');
    if (!enabled) {
      return NextResponse.json({ status: 'module_disabled' }, { status: 200 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    const appSecret = decryptString(settings?.appSecret);

    if (!verifyMetaSignature(rawBody, signature, appSecret)) {
      logger.warn('Meta Social Webhook signature validation failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const channel = payload.object === 'instagram' ? 'INSTAGRAM' : 'MESSENGER';

    for (const entry of payload.entry || []) {
      for (const messagingItem of entry.messaging || []) {
        const senderId = messagingItem.sender?.id;
        const recipientId = messagingItem.recipient?.id;
        const message = messagingItem.message;
        const postback = messagingItem.postback;

        if (!senderId || (!message && !postback)) continue;

        const bodyText = message?.text || postback?.title || postback?.payload || '[Attachment]';
        const messageMid = message?.mid || `social_${Date.now()}_${senderId}`;
        const identifier = `${channel.toLowerCase()}_${senderId}`;

        // Upsert Contact
        const contact = await prisma.contact.upsert({
          where: { phoneNumber: identifier },
          update: {
            lastInteractionAt: new Date(),
          },
          create: {
            phoneNumber: identifier,
            firstName: `${channel === 'INSTAGRAM' ? 'IG User' : 'Messenger User'} ${senderId.slice(-4)}`,
            status: 'ACTIVE',
            lastInteractionAt: new Date(),
          },
        });

        // Upsert Conversation
        const conversation = await prisma.conversation.upsert({
          where: { contactId: contact.id },
          update: {
            lastMessageAt: new Date(),
            unreadCount: { increment: 1 },
            status: 'OPEN',
          },
          create: {
            contactId: contact.id,
            status: 'OPEN',
            lastMessageAt: new Date(),
            unreadCount: 1,
          },
        });

        // Upsert ChatMessage
        await prisma.chatMessage.upsert({
          where: { wamid: messageMid },
          update: {
            body: bodyText,
            status: 'DELIVERED',
          },
          create: {
            contactId: contact.id,
            conversationId: conversation.id,
            phoneNumber: identifier,
            direction: 'INBOUND',
            wamid: messageMid,
            messageType: 'text',
            body: `[${channel}] ${bodyText}`,
            status: 'DELIVERED',
            timestamp: new Date(messagingItem.timestamp || Date.now()),
          },
        });

        // Auto trigger Inbound Events if active
        try {
          const { processInboundEvent } = await import('@/worker/inbound-events');
          processInboundEvent({
            contactId: contact.id,
            conversationId: conversation.id,
            phoneNumber: identifier,
            wamid: messageMid,
            bodyText,
            messageType: 'text',
            timestamp: new Date(),
          }).catch(() => {});
        } catch {}
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    logger.error({ error }, 'Meta Social Webhook processing error');
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
  }
}
