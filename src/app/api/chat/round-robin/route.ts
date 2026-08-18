import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // Only Admins can trigger or configure round-robin routing
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { session } = authResult;

  try {
    // 1. Fetch all active agents
    const activeAgents = await prisma.user.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'MEMBER'] },
      },
      select: { id: true, name: true, email: true },
    });

    if (activeAgents.length === 0) {
      return NextResponse.json({ error: 'No active agents available for assignment' }, { status: 400 });
    }

    // 2. Fetch unassigned OPEN conversations
    const unassignedConversations = await prisma.conversation.findMany({
      where: {
        assignedToId: null,
        status: 'OPEN',
      },
      orderBy: { lastMessageAt: 'asc' },
    });

    if (unassignedConversations.length === 0) {
      return NextResponse.json({ message: 'No unassigned conversations to route', assignedCount: 0 });
    }

    let agentIndex = 0;
    let assignedCount = 0;

    for (const conv of unassignedConversations) {
      const agent = activeAgents[agentIndex % activeAgents.length];
      agentIndex++;

      await prisma.conversation.update({
        where: { id: conv.id },
        data: { assignedToId: agent.id },
      });

      await prisma.conversationEvent.create({
        data: {
          conversationId: conv.id,
          actorId: session.userId,
          type: 'ASSIGNED',
          payload: JSON.stringify({ assignedToId: agent.id, reason: 'round_robin' }),
        },
      });

      assignedCount++;
    }

    return NextResponse.json({
      success: true,
      assignedCount,
      agentCount: activeAgents.length,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error in round-robin auto-assignment');
    return NextResponse.json({ error: 'Failed to complete round-robin routing' }, { status: 500 });
  }
}
