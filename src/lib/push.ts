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
    const subscriptions = await prisma.pushSubscription.findMany({
      where: userId ? { userId } : {},
    });

    if (subscriptions.length === 0) return;

    for (const sub of subscriptions) {
      // 1. Mobile Expo Push Token
      if (sub.expoToken) {
        try {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: sub.expoToken,
              title: payload.title,
              body: payload.body,
              data: { ...payload.data, url: payload.url },
            }),
          });
        } catch (expoErr) {
          logger.error({ expoErr }, 'Failed to deliver Expo push');
        }
      }

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
