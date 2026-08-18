import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { chunkMarkdownContent, generateKnowledgeBaseMarkdown } from '@/lib/ai/knowledge';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const kbs = await prisma.knowledgeBase.findMany({
      include: {
        _count: { select: { bots: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(kbs);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching knowledge bases');
    return NextResponse.json({ error: 'Failed to retrieve knowledge bases' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const { name, sourceType = 'GENERATED', rawNotes, contentMarkdown, action, aiConfig } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Knowledge Base name is required' }, { status: 400 });
    }

    let finalMarkdown = contentMarkdown || '';

    // If AI generation is requested
    if (action === 'GENERATE' && rawNotes) {
      const provider = aiConfig?.provider || 'gemini';
      const apiKey = aiConfig?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';

      finalMarkdown = await generateKnowledgeBaseMarkdown(rawNotes, {
        provider,
        apiKey,
        model: aiConfig?.model,
        companyName: name,
      });
    }

    if (!finalMarkdown.trim()) {
      return NextResponse.json(
        { error: 'Markdown content or raw notes are required to build Knowledge Base' },
        { status: 400 }
      );
    }

    // Automatically parse markdown into chunks
    const chunks = chunkMarkdownContent(finalMarkdown);

    const kb = await prisma.knowledgeBase.create({
      data: {
        name: name.trim(),
        sourceType,
        rawNotes: rawNotes || null,
        contentMarkdown: finalMarkdown,
        chunks: JSON.stringify(chunks),
        status: 'READY',
      },
    });

    return NextResponse.json({ success: true, knowledgeBase: kb });
  } catch (error: any) {
    logger.error({ error }, 'Error creating knowledge base');
    return NextResponse.json({ error: error.message || 'Failed to create Knowledge Base' }, { status: 500 });
  }
}
