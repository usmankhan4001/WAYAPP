import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'conversations:read');
  if ('response' in authResult) return authResult.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedToId = searchParams.get('assignedToId');

    const where: any = {};
    if (status) where.status = status;
    if (assignedToId === 'none') where.assignedToId = null;
    else if (assignedToId) where.assignedToId = assignedToId;

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        contact: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        messages: { take: 1, orderBy: { timestamp: 'desc' } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(conversations);
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 conversations list');
    return NextResponse.json({ error: 'Failed to retrieve conversations' }, { status: 500 });
  }
}
