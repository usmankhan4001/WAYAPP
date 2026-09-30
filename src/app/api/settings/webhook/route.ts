import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { decryptString } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { getSubscriptionStatus, registerWebhook, subscribeWaba } from '@/lib/whatsapp/webhook-subscription';

/**
 * GET  -> is Meta currently sending incoming messages to this app?
 * POST -> point Meta back at this app ("Fix incoming messages").
 * Admin only. The App ID and App Secret are the ones already stored in Settings.
 */
async function load(request: NextRequest) {
  const [settings, authConfig] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 'default' } }),
    prisma.authConfig.findUnique({ where: { id: 'default' } }),
  ]);
  const appId = authConfig?.metaAppId || process.env.META_APP_ID || '';
  const appSecret = decryptString(settings?.appSecret) || process.env.META_APP_SECRET || '';
  const verifyToken = settings?.webhookVerifyToken || '';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const callbackUrl = `${process.env.APP_URL?.replace(/\/$/, '') || `${proto}://${host}`}/api/webhooks/whatsapp`;
  return { settings, appId, appSecret, verifyToken, callbackUrl };
}

function missing(appId: string, appSecret: string, verifyToken: string) {
  if (!appId) return 'Add your Meta App ID in Settings first.';
  if (!appSecret) return 'Add your Meta App Secret in Settings first.';
  if (!verifyToken) return 'The verify token is missing. Save your connection settings first.';
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in auth) return auth.response;

  const { appId, appSecret, verifyToken, callbackUrl } = await load(request);
  const problem = missing(appId, appSecret, verifyToken);
  if (problem) return NextResponse.json({ state: 'unknown', message: problem, callbackUrl });

  const status = await getSubscriptionStatus({ appId, appSecret, expectedCallbackUrl: callbackUrl });
  if (!status.ok) return NextResponse.json({ state: 'unknown', message: status.reason, callbackUrl });
  if (status.registered && status.matches && status.hasMessages) {
    return NextResponse.json({ state: 'working', message: 'Incoming messages are reaching this app.', callbackUrl });
  }
  const why = !status.registered
    ? 'Meta is not sending incoming messages anywhere right now.'
    : !status.matches
      ? 'Meta is sending incoming messages to a different address.'
      : 'Meta is not subscribed to incoming messages.';
  return NextResponse.json({ state: 'broken', message: why, callbackUrl });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in auth) return auth.response;

  const { settings, appId, appSecret, verifyToken, callbackUrl } = await load(request);
  const problem = missing(appId, appSecret, verifyToken);
  if (problem) return NextResponse.json({ ok: false, message: problem }, { status: 400 });

  const result = await registerWebhook({ appId, appSecret, callbackUrl, verifyToken });
  if (!result.ok) {
    logger.warn({ reason: result.reason }, '[webhook] could not register callback with Meta');
    return NextResponse.json({ ok: false, message: result.reason }, { status: 502 });
  }

  // Also make sure the WhatsApp account itself is subscribed to this app (best effort).
  const token = decryptString(settings?.accessToken) || process.env.META_ACCESS_TOKEN || '';
  const wabaId = settings?.wabaId || process.env.META_WABA_ID || '';
  if (token && wabaId) await subscribeWaba({ wabaId, accessToken: token });

  return NextResponse.json({ ok: true, message: 'Done. Incoming messages now reach this app.', callbackUrl });
}
