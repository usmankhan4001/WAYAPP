import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMetaSignature } from '@/lib/whatsapp/signature';
import { MetaWebhookPayload } from '@/lib/whatsapp/types';

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

  const configuredToken = settings?.webhookVerifyToken || 'whatsapp_wati_webhook_secret_2026';

  if (mode === 'subscribe' && token === configuredToken) {
    console.log('Meta Webhook verified successfully!');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST handler: Ingest delivery receipts & incoming messages from Meta
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    // Validate signature if app secret is provided
    if (settings?.appSecret && !verifyMetaSignature(rawBody, signature, settings.appSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: MetaWebhookPayload = JSON.parse(rawBody);

    if (payload.object !== 'whatsapp_business_account' && payload.object !== 'whatsapp') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // 1. Process Status Updates (sent, delivered, read, failed)
        if (value.statuses && value.statuses.length > 0) {
          for (const statusObj of value.statuses) {
            const wamid = statusObj.id;
            const status = statusObj.status.toUpperCase(); // SENT, DELIVERED, READ, FAILED
            const timestamp = new Date(parseInt(statusObj.timestamp, 10) * 1000);

            // Find corresponding CampaignMessage
            const existingMsg = await prisma.campaignMessage.findUnique({
              where: { wamid },
            });

            if (existingMsg) {
              const updateData: any = { status };
              const campaignIncrement: any = {};

              if (status === 'DELIVERED') {
                updateData.deliveredAt = timestamp;
                campaignIncrement.deliveredCount = { increment: 1 };
              } else if (status === 'READ') {
                updateData.readAt = timestamp;
                campaignIncrement.readCount = { increment: 1 };
              } else if (status === 'FAILED') {
                updateData.failedAt = timestamp;
                const error = statusObj.errors?.[0];
                if (error) {
                  updateData.errorCode = String(error.code);
                  updateData.errorMessage = `${error.title}: ${error.message} ${error.error_data?.details || ''}`.trim();
                }
                campaignIncrement.failedCount = { increment: 1 };
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

        // 2. Process Inbound Messages (Customer Replies)
        if (value.messages && value.messages.length > 0) {
          for (const incoming of value.messages) {
            const senderPhone = `+${incoming.from}`;
            const messageWamid = incoming.id;
            const contactProfile = value.contacts?.[0]?.profile;

            // Find or create Contact
            let contact = await prisma.contact.findUnique({
              where: { phoneNumber: senderPhone },
            });

            if (!contact) {
              contact = await prisma.contact.create({
                data: {
                  phoneNumber: senderPhone,
                  firstName: contactProfile?.name || 'Customer',
                  status: 'ACTIVE',
                },
              });
            } else if (contactProfile?.name && (!contact.firstName || contact.firstName === 'Customer')) {
              await prisma.contact.update({
                where: { id: contact.id },
                data: { firstName: contactProfile.name },
              });
            }

            // Extract message body
            let bodyText = '';
            if (incoming.type === 'text') {
              bodyText = incoming.text?.body || '';
            } else if (incoming.type === 'button') {
              bodyText = incoming.button?.text || '';
            } else if (incoming.type === 'interactive') {
              bodyText =
                incoming.interactive?.button_reply?.title ||
                incoming.interactive?.list_reply?.title ||
                '';
            } else {
              bodyText = `[${incoming.type.toUpperCase()} attachment]`;
            }

            // Store in ChatMessage
            await prisma.chatMessage.create({
              data: {
                contactId: contact.id,
                phoneNumber: senderPhone,
                direction: 'INBOUND',
                wamid: messageWamid,
                messageType: incoming.type,
                body: bodyText,
                status: 'DELIVERED',
                timestamp: new Date(parseInt(incoming.timestamp, 10) * 1000),
              },
            });

            // Update contact last interaction
            await prisma.contact.update({
              where: { id: contact.id },
              data: { lastInteractionAt: new Date() },
            });

            // Check if this contact received a recent campaign message, update replied status!
            const recentCampaignMsg = await prisma.campaignMessage.findFirst({
              where: {
                phoneNumber: senderPhone,
                status: { in: ['SENT', 'DELIVERED', 'READ'] },
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
          }
        }
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('Error in webhook handler:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
