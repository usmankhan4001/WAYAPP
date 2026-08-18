import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// Configure VAPID if keys are provided
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@wayapp.io';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    logger.warn({ err }, 'VAPID configuration failed');
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Sends push notification to all subscriptions for a specific user (or broadcast)
 */
export async function sendPushNotification(
  userId: string | null,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: userId ? { userId } : {},
    });

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

      // 2. Web Browser Push (VAPID)
      if (sub.p256dh && sub.auth && vapidPublicKey && vapidPrivateKey) {
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
              url: payload.url || '/',
              ...payload.data,
            })
          );
        } catch (webErr: any) {
          // If subscription is expired or gone (410 / 404), cleanup
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
