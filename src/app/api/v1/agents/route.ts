import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'agents:read');
  if ('response' in authResult) return authResult.response;

  try {
    const agents = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        lastLoginAt: true,
        _count: { select: { assignedChats: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(agents);
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 agents list');
    return NextResponse.json({ error: 'Failed to retrieve agents' }, { status: 500 });
  }
}
