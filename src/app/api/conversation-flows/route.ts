import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { ensureDefaultFlows, GCC_STARTUP_FLOW } from '@/lib/whatsapp/conversation-engine';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    await ensureDefaultFlows();

    const flows = await prisma.conversationFlow.findMany({
      include: {
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeSessionsCount = await prisma.conversationSession.count({
      where: { status: 'ACTIVE' },
    });

    const completedSessionsCount = await prisma.conversationSession.count({
      where: { status: 'COMPLETED' },
    });

    return NextResponse.json({
      flows,
      stats: {
        totalFlows: flows.length,
        activeSessions: activeSessionsCount,
        completedSessions: completedSessionsCount,
      },
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching conversation flows');
    return NextResponse.json({ error: 'Failed to retrieve conversation flows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const { name, slug, description, definition, isActive } = body;

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const flow = await prisma.conversationFlow.upsert({
      where: { slug: slug.trim().toLowerCase() },
      update: {
        name: name.trim(),
        description: description?.trim() || null,
        definition: typeof definition === 'string' ? definition : JSON.stringify(definition || GCC_STARTUP_FLOW),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      create: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description?.trim() || null,
        definition: typeof definition === 'string' ? definition : JSON.stringify(definition || GCC_STARTUP_FLOW),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, flow });
  } catch (error: any) {
    logger.error({ error }, 'Error creating/updating conversation flow');
    return NextResponse.json({ error: 'Failed to save conversation flow' }, { status: 500 });
  }
}
