import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get('contactId');
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const sessions = await prisma.conversationSession.findMany({
      where: {
        ...(contactId ? { contactId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        contact: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
            customAttributes: true,
          },
        },
        flow: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return NextResponse.json(sessions);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching conversation sessions');
    return NextResponse.json({ error: 'Failed to retrieve conversation sessions' }, { status: 500 });
  }
}
