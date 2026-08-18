import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      include: {
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(endpoints);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching webhook endpoints');
    return NextResponse.json({ error: 'Failed to retrieve endpoints' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const { name, url, events = 'message.received,message.status_updated,contact.created' } = body;

    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json({ error: 'Endpoint name and URL are required' }, { status: 400 });
    }

    // Generate random HMAC signing secret
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        secret,
        events: Array.isArray(events) ? events.join(',') : events,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, endpoint });
  } catch (error: any) {
    logger.error({ error }, 'Error creating webhook endpoint');
    return NextResponse.json({ error: 'Failed to create webhook endpoint' }, { status: 500 });
  }
}
