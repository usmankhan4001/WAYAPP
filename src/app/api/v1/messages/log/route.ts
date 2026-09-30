import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { sanitizePhoneNumber } from '@/lib/whatsapp/phone';
import { renderTemplateBody } from '@/lib/whatsapp/template-render';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { emitWebhook } from '@/worker/outbound-webhooks';

/**
 * Records an OUTBOUND message that something else already sent (n8n, a script, another
 * system talking to Meta directly) so it shows up in the WayApp inbox.
 *
 * Meta does not echo API-sent messages back through the webhook, so without this the
 * inbox only ever showed messages sent from inside WayApp itself and a conversation
 * looked one-sided. This endpoint sends NOTHING — it only writes the record.
 *
 * Idempotent on `wamid`: re-posting the same message is a no-op, so an n8n retry cannot
 * create duplicates. It deliberately does not touch `contact.lastInteractionAt` (that is
 * the customer's last activity, which the 24-hour reply window is measured from) or the
 * conversation's unread count.
 */
const LogSchema = z.object({
  to: z.string().min(6),
  // Required: Meta returns a wamid only for a send that was accepted, so a caller whose
  // send failed has nothing to log and this rejects instead of recording a phantom message.
  wamid: z.string().min(5).max(200),
  type: z.enum(['text', 'template', 'image', 'video', 'document', 'audio']).default('text'),
  text: z.string().max(4096).optional(),
  templateName: z.string().optional(),
  bodyVariables: z.array(z.string()).optional(),
  status: z.enum(['SENT', 'DELIVERED']).default('SENT'),
  sentAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'messages:send');
  if ('response' in authResult) return authResult.response;

  const rateKey = authResult.auth.type === 'API_KEY' ? `v1log:${authResult.auth.keyId}` : `v1log:${getClientIp(request)}`;
  if (!checkRateLimit(rateKey, { limit: 300, windowSeconds: 60 }).success) {
    return NextResponse.json({ error: 'Too many requests', code: 'rate_limited' }, { status: 429 });
  }

  try {
    const parsed = LogSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid payload', code: 'invalid_request' }, { status: 400 });
    }
    const { to, wamid, type, text, templateName, bodyVariables, status, sentAt } = parsed.data;

    const phone = sanitizePhoneNumber(to);
    if (!phone.isValid) {
      return NextResponse.json({ error: 'Recipient phone number is invalid E.164', code: 'invalid_request' }, { status: 400 });
    }

    const existing = await prisma.chatMessage.findUnique({ where: { wamid }, select: { id: true } });
    if (existing) return NextResponse.json({ success: true, messageId: existing.id, duplicate: true });

    let body = text?.trim() || '';
    if (templateName && !body) {
      const tpl = await prisma.template.findFirst({ where: { name: templateName }, select: { components: true } });
      body = renderTemplateBody(tpl?.components, bodyVariables || [], templateName);
    }
    if (!body && type !== 'text') body = `[${type.toUpperCase()}]`;

    // update is empty on purpose: logging a message must not change an existing contact,
    // in particular it must not resurrect an unsubscribed or blocked one.
    const contact = await prisma.contact.upsert({
      where: { phoneNumber: phone.e164 },
      update: {},
      create: { phoneNumber: phone.e164 },
    });

    const when = sentAt ? new Date(sentAt) : new Date();
    const conversation = await prisma.conversation.upsert({
      where: { contactId: contact.id },
      update: { lastMessageAt: when },
      create: { contactId: contact.id, status: 'OPEN', lastMessageAt: when },
    });

    const message = await prisma.chatMessage.create({
      data: {
        contactId: contact.id,
        conversationId: conversation.id,
        phoneNumber: phone.e164,
        direction: 'OUTBOUND',
        wamid,
        messageType: templateName ? 'template' : type,
        body,
        status,
        timestamp: when,
      },
    });

    void emitWebhook('message.sent', {
      contactId: contact.id,
      conversationId: conversation.id,
      phoneNumber: phone.e164,
      messageType: message.messageType,
      body,
      wamid,
      source: 'log',
    });

    return NextResponse.json({ success: true, messageId: message.id, duplicate: false });
  } catch (error: any) {
    logger.error({ error }, '[v1/messages/log] failed to record message');
    return NextResponse.json({ error: 'Failed to record message', code: 'internal_error' }, { status: 500 });
  }
}
