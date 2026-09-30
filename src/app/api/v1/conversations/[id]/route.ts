import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { apiError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { emitWebhook } from '@/worker/outbound-webhooks';

/**
 * Assign a conversation to an agent (`assignedToId`) or unassign it (`null`), and/or change
 * its status. Emits `conversation.assigned` when the assignee actually changes to an agent.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateApiRequest(request, 'conversations:write');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { assignedToId, status } = body;

    if (assignedToId === undefined && status === undefined) {
      return apiError('Send assignedToId and/or status', 'invalid_request', 400);
    }
    if (status !== undefined && !['OPEN', 'PENDING', 'RESOLVED', 'SPAM'].includes(status)) {
      return apiError('status must be OPEN, PENDING, RESOLVED or SPAM', 'invalid_request', 400);
    }
    if (assignedToId !== undefined && assignedToId !== null && typeof assignedToId !== 'string') {
      return apiError('assignedToId must be an agent id or null', 'invalid_request', 400);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true, contactId: true, assignedToId: true },
    });
    if (!conversation) return apiError('Conversation not found', 'not_found', 404);

    if (assignedToId) {
      const agent = await prisma.user.findUnique({ where: { id: assignedToId }, select: { id: true } });
      if (!agent) return apiError('Agent not found', 'not_found', 404);
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(assignedToId !== undefined ? { assignedToId } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    if (assignedToId !== undefined && assignedToId !== conversation.assignedToId) {
      await prisma.conversationEvent.create({
        data: {
          conversationId: id,
          actorId: authResult.auth.userId || null,
          type: assignedToId ? 'ASSIGNED' : 'UNASSIGNED',
          payload: JSON.stringify({ assignedToId, via: 'api' }),
        },
      }).catch(() => {});
      if (assignedToId) {
        void emitWebhook('conversation.assigned', {
          conversationId: id,
          contactId: conversation.contactId,
          assignedToId,
        });
      }
    }

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 conversation update');
    return apiError('Failed to update conversation', 'internal_error', 500);
  }
}
