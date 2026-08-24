import { NextRequest, NextResponse } from 'next/server';
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
      },
      create: {
        userId: session?.userId || null,
        endpoint: uniqueKey,
        p256dh: keys?.p256dh || null,
        auth: keys?.auth || null,
        expoToken: expoToken || null,
        platform,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    logger.error({ error }, 'Error saving push subscription');
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
