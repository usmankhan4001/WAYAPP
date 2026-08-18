import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  try {
    const deliveries = await prisma.webhookDelivery.findMany({
      include: {
        endpoint: { select: { id: true, name: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(deliveries);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching webhook deliveries');
    return NextResponse.json({ error: 'Failed to retrieve deliveries' }, { status: 500 });
  }
}
