import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'templates:read');
  if ('response' in authResult) return authResult.response;

  try {
    const templates = await prisma.template.findMany({
      orderBy: { syncedAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 templates list');
    return NextResponse.json({ error: 'Failed to retrieve templates' }, { status: 500 });
  }
}
