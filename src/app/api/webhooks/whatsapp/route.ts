import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMetaSignature } from '@/lib/whatsapp/signature';
import { MetaWebhookPayload } from '@/lib/whatsapp/types';
import { sanitizePhoneNumber } from '@/lib/whatsapp/phone';
import { decryptString, timingSafeCompare } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Valid status lifecycle ranking to prevent status regression
const STATUS_RANK: Record<string, number> = {
  PENDING: 1,
  SENDING: 2,
  SENT: 3,
  DELIVERED: 4,
  READ: 5,
  REPLIED: 6,
  FAILED: 99,
};

/**
 * GET handler: Meta Webhook Verification Handshake
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
    logger.info('Meta Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 });
}

/**
 * POST handler: Ingest delivery receipts, template status approvals & incoming messages from Meta
 */
export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`webhook:${clientIp}`, { limit: 600, windowSeconds: 60 });
  if (!rateLimit.success) {
    logger.warn(`Meta Webhook rate limit exceeded from ${clientIp}`);
    return NextResponse.json({ error: 'Too many webhook requests' }, { status: 429 });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    const isMock = settings?.isMockMode === true;
    const appSecret = decryptString(settings?.appSecret);

    // Verify Meta HMAC signature if appSecret is configured.
    // If appSecret is not yet configured, log a warning and proceed so incoming messages are never dropped.
    if (!isMock && appSecret && appSecret.trim() !== '') {
      if (!verifyMetaSignature(rawBody, signature, appSecret)) {
        logger.warn('Meta Webhook signature validation failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    let payload: MetaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (payload.object !== 'whatsapp_business_account' && payload.object !== 'whatsapp') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Process all entries and changes
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const field = change.field;
        const value: any = change.value;
        if (!value) continue;

        // 1. Template Status Updates (APPROVED, REJECTED, PAUSED, etc.)
        if (field === 'message_template_status_update' || value.event) {
          const templateName = value.message_template_name || value.element_name;
          const templateLanguage = value.message_template_language || value.language;
          const metaEvent = (value.event || '').toUpperCase();
          const reason = value.reason || value.rejection_reason || null;

          if (templateName) {
            let status = 'APPROVED';
            if (metaEvent === 'REJECTED') status = 'REJECTED';
            else if (metaEvent === 'PAUSED') status = 'PAUSED';
            else if (metaEvent === 'APPROVED') status = 'APPROVED';
            else if (metaEvent === 'PENDING') status = 'PENDING';

            await prisma.template.updateMany({
              where: {
                name: templateName,
                ...(templateLanguage ? { language: templateLanguage } : {}),
              },
              data: {
                status,
                rejectedReason: reason,
                qualityScore: status === 'APPROVED' ? 'GREEN' : status === 'REJECTED' ? 'RED' : 'YELLOW',
                syncedAt: new Date(),
              },
            });
          }
        }

        // 2. Status Updates (SENT, DELIVERED, READ, FAILED)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id;
            const newStatus = (statusObj.status || '').toUpperCase();
            const timestamp = statusObj.timestamp
              ? new Date(parseInt(statusObj.timestamp, 10) * 1000)
              : new Date();

            // Update ChatMessage receipts with forward-progression guard
            const existingChat = await prisma.chatMessage.findFirst({
              where: { wamid },
              select: { id: true, status: true },
            });
            if (existingChat) {
              const CHAT_STATUS_RANK: Record<string, number> = {
                SENT: 1, DELIVERED: 2, READ: 3, FAILED: 99,
              };
              const currentChatRank = CHAT_STATUS_RANK[existingChat.status] || 0;
              const nextChatRank = CHAT_STATUS_RANK[newStatus] || 0;
              if (nextChatRank > currentChatRank || newStatus === 'FAILED') {
                await prisma.chatMessage.update({
                  where: { id: existingChat.id },
                  data: { status: newStatus },
                }).catch((err) => logger.warn({ err, wamid }, 'Failed to update ChatMessage status'));
              }
            }

            // Update CampaignMessage with idempotency and transition guard
            const existingMsg = await prisma.campaignMessage.findUnique({
              where: { wamid },
            });

            if (existingMsg) {
              const currentRank = STATUS_RANK[existingMsg.status] || 0;
              const nextRank = STATUS_RANK[newStatus] || 0;

              // Only update if new status is a progressive transition or FAILED
              if (nextRank > currentRank || newStatus === 'FAILED') {
                const updateData: any = { status: newStatus };
                const campaignIncrement: any = {};

                if (newStatus === 'DELIVERED') {
                  updateData.deliveredAt = timestamp;
                  if (existingMsg.status !== 'DELIVERED' && existingMsg.status !== 'READ' && existingMsg.status !== 'REPLIED') {
                    campaignIncrement.deliveredCount = { increment: 1 };
                  }
                } else if (newStatus === 'READ') {
                  updateData.readAt = timestamp;
                  if (existingMsg.status !== 'READ' && existingMsg.status !== 'REPLIED') {
                    campaignIncrement.readCount = { increment: 1 };
                  }
                } else if (newStatus === 'FAILED') {
                  updateData.failedAt = timestamp;
                  const error = statusObj.errors?.[0];
                  if (error) {
                    updateData.errorCode = String(error.code);
                    updateData.errorMessage = `${error.title || ''}: ${error.message || ''} ${error.error_data?.details || ''}`.trim();

                    // Auto-suppression for Meta error 130472 (opted out / blocked)
                    if (error.code === 130472 || error.code === '130472') {
                      if (existingMsg.contactId) {
                        await prisma.contact.update({
                          where: { id: existingMsg.contactId },
                          data: { status: 'UNSUBSCRIBED', optedOutAt: new Date() },
                        }).catch(() => {});
                      }
                    }
                  }
                  if (existingMsg.status !== 'FAILED') {
                    campaignIncrement.failedCount = { increment: 1 };
                  }
                }

                await prisma.campaignMessage.update({
                  where: { id: existingMsg.id },
                  data: updateData,
                });

                if (Object.keys(campaignIncrement).length > 0) {
                  await prisma.campaign.update({
                    where: { id: existingMsg.campaignId },
                    data: campaignIncrement,
                  });
                }
              }
            }
          }
        }

        // 3. Incoming Customer Messages & 2-Way Inbox
        if (value.messages && Array.isArray(value.messages)) {
          const contactInfo = value.contacts?.[0];
          const profileName = contactInfo?.profile?.name || 'Customer';

          for (const incoming of value.messages) {
            const rawSenderPhone = incoming.from;
            const messageWamid = incoming.id;
            const normalizedPhone = sanitizePhoneNumber(rawSenderPhone).e164 || `+${rawSenderPhone}`;

            // Check if STOP keyword sent for opt-out
            let isOptOut = false;
            let bodyText = '';
            let mediaUrl: string | null = null;
            let interactiveId: string | undefined = undefined;
            let interactiveTitle: string | undefined = undefined;
            let buttonPayload: string | undefined = undefined;
            const messageType = incoming.type || 'text';

            if (incoming.type === 'text') {
              bodyText = incoming.text?.body || '';
            } else if (incoming.type === 'image') {
              mediaUrl = incoming.image?.id ? `/api/media/${incoming.image.id}` : null;
              bodyText = incoming.image?.caption || 'Photo';
            } else if (incoming.type === 'video') {
              mediaUrl = incoming.video?.id ? `/api/media/${incoming.video.id}` : null;
              bodyText = incoming.video?.caption || 'Video';
            } else if (incoming.type === 'audio') {
              mediaUrl = incoming.audio?.id ? `/api/media/${incoming.audio.id}` : null;
              bodyText = 'Audio recording';
            } else if (incoming.type === 'voice') {
              mediaUrl = incoming.voice?.id ? `/api/media/${incoming.voice.id}` : null;
              bodyText = 'Voice note';
            } else if (incoming.type === 'document') {
              mediaUrl = incoming.document?.id ? `/api/media/${incoming.document.id}` : null;
              bodyText = incoming.document?.filename || incoming.document?.caption || 'Document';
            } else if (incoming.type === 'location' && incoming.location) {
              const loc = incoming.location;
              const mapUrl = `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
              bodyText = loc.name ? `📍 ${loc.name} (${mapUrl})` : `📍 Location: ${mapUrl}`;
            } else if (incoming.type === 'button') {
              bodyText = incoming.button?.text || '';
              buttonPayload = incoming.button?.payload;
            } else if (incoming.type === 'interactive') {
              interactiveId =
                incoming.interactive?.button_reply?.id ||
                incoming.interactive?.list_reply?.id;
              interactiveTitle =
                incoming.interactive?.button_reply?.title ||
                incoming.interactive?.list_reply?.title;
              bodyText = interactiveTitle || '';
            } else {
              bodyText = `[${incoming.type?.toUpperCase()} attachment]`;
            }

            if (bodyText.trim().toUpperCase() === 'STOP' || bodyText.trim().toUpperCase() === 'UNSUBSCRIBE') {
              isOptOut = true;
            }

            // Find existing contact by exact phone or matching normalized digits
            const cleanDigits = rawSenderPhone.replace(/[^0-9]/g, '');
            const phoneConditions: any[] = [
              { phoneNumber: normalizedPhone },
              { phoneNumber: cleanDigits },
              { phoneNumber: `+${cleanDigits}` },
            ];
            if (cleanDigits.length >= 8) {
              phoneConditions.push({ phoneNumber: { endsWith: cleanDigits.slice(-9) } });
            }

            let contact = await prisma.contact.findFirst({
              where: {
                OR: phoneConditions,
              },
            });

            if (contact) {
              contact = await prisma.contact.update({
                where: { id: contact.id },
                data: {
                  phoneNumber: normalizedPhone,
                  lastInteractionAt: new Date(),
                  ...(isOptOut ? { status: 'UNSUBSCRIBED', optedOutAt: new Date() } : {}),
                },
              });
            } else {
              contact = await prisma.contact.create({
                data: {
                  phoneNumber: normalizedPhone,
                  firstName: profileName,
                  status: isOptOut ? 'UNSUBSCRIBED' : 'ACTIVE',
                  optedOutAt: isOptOut ? new Date() : null,
                  lastInteractionAt: new Date(),
                },
              });
            }

            // If contact opted out, record suppression and cancel active sessions
            if (isOptOut) {
              await prisma.contactSuppression.create({
                data: {
                  contactId: contact.id,
                  type: 'MARKETING_OPT_OUT',
                  reason: `Customer sent: ${bodyText.trim()}`,
                },
              }).catch(() => {});

              await prisma.conversationSession.updateMany({
                where: { contactId: contact.id, status: 'ACTIVE' },
                data: { status: 'CANCELLED' },
              }).catch(() => {});
            }

            // Upsert Conversation for multi-agent inbox
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
            
            // Auto-Route if unassigned
            if (!conversation.assignedToId) {
              const { AssignmentEngine } = await import('@/lib/whatsapp/routing');
              await AssignmentEngine.routeConversation(conversation.id);
            }

            // Idempotent ChatMessage upsert by wamid
            await prisma.chatMessage.upsert({
              where: { wamid: messageWamid },
              update: {
                body: bodyText,
                mediaUrl,
                status: 'DELIVERED',
              },
              create: {
                contactId: contact.id,
                conversationId: conversation.id,
                phoneNumber: normalizedPhone,
                direction: 'INBOUND',
                wamid: messageWamid,
                messageType,
                body: bodyText,
                mediaUrl,
                status: 'DELIVERED',
                timestamp: new Date(parseInt(incoming.timestamp, 10) * 1000),
              },
            });

            // REPLIED attribution on recent campaign message within 24 hours
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentCampaignMsg = await prisma.campaignMessage.findFirst({
              where: {
                phoneNumber: normalizedPhone,
                status: { in: ['SENT', 'DELIVERED', 'READ'] },
                createdAt: { gte: dayAgo },
              },
              orderBy: { createdAt: 'desc' },
            });

            if (recentCampaignMsg) {
              await prisma.campaignMessage.update({
                where: { id: recentCampaignMsg.id },
                data: {
                  status: 'REPLIED',
                  repliedAt: new Date(),
                },
              });

              await prisma.campaign.update({
                where: { id: recentCampaignMsg.campaignId },
                data: { repliedCount: { increment: 1 } },
              });
            }

            // Trigger Automations & Bot Engines asynchronously
            try {
              const { processInboundEvent } = await import('@/worker/inbound-events');
              processInboundEvent({
                contactId: contact.id,
                conversationId: conversation.id,
                phoneNumber: normalizedPhone,
                wamid: messageWamid,
                bodyText,
                messageType,
                interactiveId,
                interactiveTitle,
                buttonPayload,
                timestamp: new Date(parseInt(incoming.timestamp, 10) * 1000),
              }).catch((err) => logger.error({ err }, 'Inbound event processing error'));
            } catch {}

            // Trigger Background Native OS Push Notifications (Even when app is closed)
            try {
              const { sendPushNotification } = await import('@/lib/push');
              const senderDisplayName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || profileName || normalizedPhone;
              sendPushNotification(null, {
                title: `WhatsApp from ${senderDisplayName}`,
                body: bodyText || 'Sent an attachment',
                url: `/inbox?contactId=${contact.id}`,
              }).catch(() => {});
            } catch {}
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    logger.error({ error }, 'Error in webhook handler');
    return NextResponse.json({ error: 'Internal processing error' }, { status: 500 });
  }
}
