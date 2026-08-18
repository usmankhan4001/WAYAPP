import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: {
          include: {
            tags: { include: { tag: true } },
            groups: { include: { group: true } },
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
        notes: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        events: {
          include: {
            actor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching conversation details');
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) {
    return authResult.response;
  }

  const { session } = authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { assignedToId, status } = body;

    const existing = await prisma.conversation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const updateData: any = {};
    const eventsToCreate: any[] = [];

    // Handle assignment change
    if (assignedToId !== undefined) {
      updateData.assignedToId = assignedToId;
      eventsToCreate.push({
        conversationId: id,
        actorId: session.userId,
        type: assignedToId ? 'ASSIGNED' : 'UNASSIGNED',
        payload: JSON.stringify({ assignedToId, previousAssignedToId: existing.assignedToId }),
      });
    }

    // Handle status change
    if (status && status !== existing.status) {
      updateData.status = status;
      eventsToCreate.push({
        conversationId: id,
        actorId: session.userId,
        type: 'STATUS_CHANGED',
        payload: JSON.stringify({ status, previousStatus: existing.status }),
      });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    if (eventsToCreate.length > 0) {
      await prisma.conversationEvent.createMany({
        data: eventsToCreate,
      });
    }

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: any) {
    logger.error({ error }, 'Error updating conversation');
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
