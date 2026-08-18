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
    const notes = await prisma.conversationNote.findMany({
      where: { conversationId: id },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching notes');
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(
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
    const { body: noteBody } = body;

    if (!noteBody?.trim()) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 });
    }

    const note = await prisma.conversationNote.create({
      data: {
        conversationId: id,
        authorId: session.userId,
        body: noteBody.trim(),
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Record ConversationEvent
    await prisma.conversationEvent.create({
      data: {
        conversationId: id,
        actorId: session.userId,
        type: 'NOTE_ADDED',
        payload: JSON.stringify({ noteId: note.id, preview: noteBody.substring(0, 50) }),
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    logger.error({ error }, 'Error creating internal note');
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
