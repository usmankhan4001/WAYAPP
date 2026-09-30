import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

let cachedVapidKeys: { publicKey: string; privateKey: string } | null = null;

/**
 * Resolves or auto-generates VAPID keys so background Web Push always works out of the box
 */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (cachedVapidKeys) return cachedVapidKeys;

  // 1. Check environment variables
  const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  if (envPublic && envPrivate) {
    cachedVapidKeys = { publicKey: envPublic, privateKey: envPrivate };
    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@wayapp.xyz',
        cachedVapidKeys.publicKey,
        cachedVapidKeys.privateKey
      );
    } catch {}
    return cachedVapidKeys;
  }

  // 2. Check Database Settings table for generated VAPID keys
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    });

    if (settings?.encryptionCheck && settings.encryptionCheck.includes(':VAPID:')) {
      const [pub, priv] = settings.encryptionCheck.split(':VAPID:');
      if (pub && priv) {
        cachedVapidKeys = { publicKey: pub, privateKey: priv };
        try {
          webpush.setVapidDetails('mailto:admin@wayapp.xyz', pub, priv);
        } catch {}
        return cachedVapidKeys;
      }
    }

    // Generate new persistent VAPID keypair
    const newKeys = webpush.generateVAPIDKeys();
    cachedVapidKeys = {
      publicKey: newKeys.publicKey,
      privateKey: newKeys.privateKey,
    };

    await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        encryptionCheck: `${newKeys.publicKey}:VAPID:${newKeys.privateKey}`,
      },
      create: {
        id: 'default',
        encryptionCheck: `${newKeys.publicKey}:VAPID:${newKeys.privateKey}`,
      },
    });

    try {
      webpush.setVapidDetails('mailto:admin@wayapp.xyz', newKeys.publicKey, newKeys.privateKey);
    } catch {}

    return cachedVapidKeys;
  } catch (err) {
    logger.warn({ err }, 'Failed to persist VAPID keys in DB, using ephemeral keypair');
    const fallback = webpush.generateVAPIDKeys();
    cachedVapidKeys = { publicKey: fallback.publicKey, privateKey: fallback.privateKey };
    try {
      webpush.setVapidDetails('mailto:admin@wayapp.xyz', fallback.publicKey, fallback.privateKey);
    } catch {}
    return cachedVapidKeys;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;

/** Current hour (0-23) in the business timezone. */
export function currentHourInTz(now: Date = new Date(), tz?: string): number {
  const zone = tz || process.env.BUSINESS_TZ || 'Asia/Dubai';
  try {
    const h = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: zone }).format(now);
    return parseInt(h, 10) % 24;
  } catch {
    return now.getUTCHours();
  }
}

/**
 * True when `hour` falls inside [start, end). Handles overnight windows (22 -> 7).
 * Equal or missing bounds mean quiet hours are off.
 */
export function isInQuietHours(hour: number, start?: number | null, end?: number | null): boolean {
  if (start == null || end == null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function sendExpoPushes(
  subs: Array<{ id: string; expoToken: string | null }>,
  payload: PushNotificationPayload
): Promise<void> {
  const contactId: string | undefined =
    payload.data?.contactId ?? payload.url?.match(/[?&]contactId=([^&]+)/)?.[1];
  let conversationId: string | undefined = payload.data?.conversationId;
  let badge: number | undefined;
  try {
    if (contactId && !conversationId) {
      const conv = await prisma.conversation.findUnique({ where: { contactId }, select: { id: true } });
      conversationId = conv?.id;
    }
    const agg = await prisma.conversation.aggregate({ _sum: { unreadCount: true } });
    badge = agg?._sum?.unreadCount ?? undefined;
  } catch (err) {
    logger.warn({ err }, 'Could not compute push badge/conversation');
  }

  for (const batch of chunk(subs, EXPO_BATCH_SIZE)) {
    const messages = batch.map((sub) => ({
      to: sub.expoToken,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      channelId: 'messages',
      // One thread per contact so notifications stack instead of piling up (iOS).
      ...(contactId ? { threadId: contactId } : {}),
      ...(badge !== undefined ? { badge } : {}),
      data: { ...payload.data, url: payload.url, contactId, conversationId },
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      const json: any = await res.json().catch(() => null);
      const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
      const dead: string[] = [];
      tickets.forEach((t, i) => {
        if (t?.status === 'error' && t?.details?.error === 'DeviceNotRegistered' && batch[i]) {
          dead.push(batch[i].id);
        }
      });
      if (dead.length > 0) {
        await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
      }
    } catch (expoErr) {
      logger.error({ expoErr }, 'Failed to deliver Expo push batch');
    }
  }
}

/**
 * Sends native OS background push notification to all subscribed mobile/desktop devices
 * (Even if browser / app is completely closed)
 */
export async function sendPushNotification(
  userId: string | null,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    const keys = await getVapidKeys();
    const all = await prisma.pushSubscription.findMany({
      where: userId ? { userId } : {},
    });

    const hour = currentHourInTz();
    const subscriptions = all.filter((s) => !s.muted && !isInQuietHours(hour, s.quietStart, s.quietEnd));
    if (subscriptions.length === 0) return;

    // 1. Mobile Expo push, batched
    const expoSubs = subscriptions.filter((s) => s.expoToken);
    if (expoSubs.length > 0) await sendExpoPushes(expoSubs, payload);

    for (const sub of subscriptions) {
      // 2. Web Browser & PWA Push (Works when app is closed on Android, iOS, Windows, Mac)
      if (sub.p256dh && sub.auth && keys.publicKey && keys.privateKey) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify({
              title: payload.title,
              body: payload.body,
              url: payload.url || '/inbox',
              ...payload.data,
            })
          );
        } catch (webErr: any) {
          // If subscription has expired or was revoked (HTTP 410 or 404), clean up
          if (webErr.statusCode === 410 || webErr.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error in sendPushNotification');
  }
}
