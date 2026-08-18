import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { encryptString } from '@/lib/crypto';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const bots = await prisma.bot.findMany({
      include: { knowledgeBase: true },
      orderBy: { updatedAt: 'desc' },
    });

    // Sanitize encrypted API keys before returning
    const safeBots = bots.map((b) => {
      let safeAiConfig = null;
      if (b.aiConfig) {
        try {
          const parsed = JSON.parse(b.aiConfig);
          safeAiConfig = {
            ...parsed,
            hasApiKey: Boolean(parsed.apiKeyEncrypted),
            apiKeyEncrypted: undefined,
          };
        } catch {}
      }
      return {
        ...b,
        aiConfig: safeAiConfig ? JSON.stringify(safeAiConfig) : b.aiConfig,
      };
    });

    return NextResponse.json(safeBots);
  } catch (error: any) {
    logger.error({ error }, 'Error fetching bots');
    return NextResponse.json({ error: 'Failed to retrieve bots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const {
      name,
      description,
      kind = 'KEYWORD',
      triggerConfig,
      aiConfig,
      actionsJson,
      knowledgeBaseId,
      isActive = true,
      cooldownSeconds = 60,
      dailyCap = 100,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Bot name is required' }, { status: 400 });
    }

    let processedAiConfig: string | null = null;
    if (aiConfig) {
      const parsed = typeof aiConfig === 'string' ? JSON.parse(aiConfig) : aiConfig;
      if (parsed.apiKey) {
        parsed.apiKeyEncrypted = encryptString(parsed.apiKey);
        delete parsed.apiKey;
      }
      processedAiConfig = JSON.stringify(parsed);
    }

    const bot = await prisma.bot.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        kind,
        triggerConfig: typeof triggerConfig === 'string' ? triggerConfig : JSON.stringify(triggerConfig || {}),
        aiConfig: processedAiConfig,
        actionsJson: typeof actionsJson === 'string' ? actionsJson : JSON.stringify(actionsJson || []),
        knowledgeBaseId: knowledgeBaseId || null,
        isActive,
        cooldownSeconds: Number(cooldownSeconds) || 60,
        dailyCap: Number(dailyCap) || 100,
      },
    });

    return NextResponse.json({ success: true, bot });
  } catch (error: any) {
    logger.error({ error }, 'Error creating bot');
    return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 });
  }
}
