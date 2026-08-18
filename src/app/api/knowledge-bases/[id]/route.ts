import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { chunkMarkdownContent } from '@/lib/ai/knowledge';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const kb = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: { bots: true },
    });

    if (!kb) {
      return NextResponse.json({ error: 'Knowledge Base not found' }, { status: 404 });
    }

    return NextResponse.json(kb);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching knowledge base');
    return NextResponse.json({ error: 'Failed to retrieve Knowledge Base' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, contentMarkdown, rawNotes } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();
    if (rawNotes !== undefined) dataToUpdate.rawNotes = rawNotes;

    if (contentMarkdown !== undefined) {
      dataToUpdate.contentMarkdown = contentMarkdown;
      const chunks = chunkMarkdownContent(contentMarkdown);
      dataToUpdate.chunks = JSON.stringify(chunks);
    }

    const updated = await prisma.knowledgeBase.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, knowledgeBase: updated });
  } catch (error: any) {
    logger.error({ error }, 'Error updating knowledge base');
    return NextResponse.json({ error: 'Failed to update Knowledge Base' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    await prisma.knowledgeBase.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Knowledge Base deleted' });
  } catch (error: any) {
    logger.error({ error }, 'Error deleting knowledge base');
    return NextResponse.json({ error: 'Failed to delete Knowledge Base' }, { status: 500 });
  }
}
