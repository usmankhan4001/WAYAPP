import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { endpoint, keys, expoToken, platform = 'web' } = body;

    if (!endpoint && !expoToken) {
      return NextResponse.json({ error: 'Endpoint or Expo token required' }, { status: 400 });
    }

    const uniqueKey = endpoint || expoToken;

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: uniqueKey },
      update: {
        userId: session?.userId || null,
        p256dh: keys?.p256dh || null,
        auth: keys?.auth || null,
        expoToken: expoToken || null,
        platform,
        lastSeenAt: new Date(),
      },
      create: {
        userId: session?.userId || null,
        endpoint: uniqueKey,
        p256dh: keys?.p256dh || null,
        auth: keys?.auth || null,
        expoToken: expoToken || null,
        platform,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    logger.error({ error }, 'Error saving push subscription');
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

const prefsSchema = z.object({
  token: z.string().min(1),
  muted: z.boolean().optional(),
  quietStart: z.number().int().min(0).max(23).nullable().optional(),
  quietEnd: z.number().int().min(0).max(23).nullable().optional(),
});

/** Update notification preferences for one of the caller's own devices. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = prefsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const { token, ...prefs } = parsed.data;
    const result = await prisma.pushSubscription.updateMany({
      where: { endpoint: token, userId: session.userId },
      data: prefs,
    });
    if (result.count === 0) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error updating push preferences');
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

/** Unregister a device (called on sign out). */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });
    await prisma.pushSubscription.deleteMany({ where: { endpoint: token, userId: session.userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error removing push subscription');
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
