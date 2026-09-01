import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { encryptString } from '@/lib/crypto';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const bot = await prisma.bot.findUnique({
      where: { id },
      include: { knowledgeBase: true },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    let safeAiConfig = null;
    if (bot.aiConfig) {
      try {
        const parsed = JSON.parse(bot.aiConfig);
        safeAiConfig = {
          ...parsed,
          hasApiKey: Boolean(parsed.apiKeyEncrypted),
          apiKeyEncrypted: undefined,
        };
      } catch (error) {
        logger.warn({ error, botId: id }, 'Failed to parse aiConfig while sanitizing bot');
      }
    }

    return NextResponse.json({
      ...bot,
      aiConfig: safeAiConfig ? JSON.stringify(safeAiConfig) : bot.aiConfig,
    });
  } catch (error: any) {
    logger.error({ error }, 'Error fetching bot');
    return NextResponse.json({ error: 'Failed to retrieve bot' }, { status: 500 });
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
    const existing = await prisma.bot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    let processedAiConfig = existing.aiConfig;
    if (body.aiConfig !== undefined) {
      const parsed = typeof body.aiConfig === 'string' ? JSON.parse(body.aiConfig) : body.aiConfig;
      let existingEncrypted = null;
      if (existing.aiConfig) {
        try {
          existingEncrypted = JSON.parse(existing.aiConfig).apiKeyEncrypted;
        } catch (error) {
          logger.warn({ error, botId: id }, 'Failed to parse existing aiConfig during update');
        }
      }

      if (parsed.apiKey && !parsed.apiKey.includes('••••')) {
        parsed.apiKeyEncrypted = encryptString(parsed.apiKey);
        delete parsed.apiKey;
      } else {
        parsed.apiKeyEncrypted = existingEncrypted;
        delete parsed.apiKey;
      }
      processedAiConfig = JSON.stringify(parsed);
    }

    const updated = await prisma.bot.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.kind ? { kind: body.kind } : {}),
        ...(body.triggerConfig !== undefined
          ? { triggerConfig: typeof body.triggerConfig === 'string' ? body.triggerConfig : JSON.stringify(body.triggerConfig) }
          : {}),
        aiConfig: processedAiConfig,
        ...(body.actionsJson !== undefined
          ? { actionsJson: typeof body.actionsJson === 'string' ? body.actionsJson : JSON.stringify(body.actionsJson) }
          : {}),
        ...(body.knowledgeBaseId !== undefined ? { knowledgeBaseId: body.knowledgeBaseId || null } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        ...(body.cooldownSeconds !== undefined ? { cooldownSeconds: Number(body.cooldownSeconds) } : {}),
        ...(body.dailyCap !== undefined ? { dailyCap: Number(body.dailyCap) } : {}),
      },
    });

    return NextResponse.json({ success: true, bot: updated });
  } catch (error: any) {
    logger.error({ error }, 'Error updating bot');
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 });
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
    await prisma.bot.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Bot deleted successfully' });
  } catch (error: any) {
    logger.error({ error }, 'Error deleting bot');
    return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 });
  }
}
