import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { apiError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';

/** Messages of one conversation, newest first, paginated with `cursor` (a message id). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authenticateApiRequest(request, 'conversations:read');
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
    const cursor = searchParams.get('cursor');

    const conversation = await prisma.conversation.findUnique({ where: { id }, select: { id: true } });
    if (!conversation) return apiError('Conversation not found', 'not_found', 404);

    const rows = await prisma.chatMessage.findMany({
      where: { conversationId: id, direction: { not: 'INTERNAL' } },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    });

    let nextCursor: string | null = null;
    if (rows.length > limit) nextCursor = rows.pop()?.id || null;

    return NextResponse.json({ data: rows, pagination: { nextCursor, limit } });
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 conversation messages');
    return apiError('Failed to retrieve messages', 'internal_error', 500);
  }
}
