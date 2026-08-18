import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'flows:read');
  if ('response' in authResult) return authResult.response;

  try {
    const flows = await prisma.flow.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { runs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(flows);
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 flows list');
    return NextResponse.json({ error: 'Failed to retrieve flows' }, { status: 500 });
  }
}
