import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/rbac';
import { generateAiResponse, AiChatMessage } from '@/lib/ai/provider';
import { retrieveTopChunks, KnowledgeChunk } from '@/lib/ai/knowledge';
import { decryptString } from '@/lib/crypto';
import { logger } from '@/lib/logger';

/**
 * Dry-run test for a bot's configuration. Never sends a real WhatsApp
 * message, never writes ChatMessage/execution-count rows — safe to call
 * from the Bots management UI to verify a bot before it goes live.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const testMessage: string = (body.message || '').trim();

    if (!testMessage) {
      return NextResponse.json({ error: 'A test message is required' }, { status: 400 });
    }

    const bot = await prisma.bot.findUnique({
      where: { id },
      include: { knowledgeBase: true },
    });

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const normalizedInput = testMessage.toLowerCase();
    let triggerConfig: any = {};
    try {
      triggerConfig = JSON.parse(bot.triggerConfig || '{}');
    } catch (error) {
      logger.warn({ error, botId: id }, '[BotTest] Failed to parse triggerConfig');
    }

    const keywords: string[] = Array.isArray(triggerConfig.keywords)
      ? triggerConfig.keywords.map((k: string) => k.toLowerCase().trim())
      : [];
    const matchType = triggerConfig.matchType || 'CONTAINS';

    let triggerMatched = false;
    if (matchType === 'ANY_INBOUND' || (bot.kind === 'AI' && keywords.length === 0)) {
      triggerMatched = true;
    } else if (matchType === 'EXACT') {
      triggerMatched = keywords.some((k) => k === normalizedInput);
    } else if (matchType === 'STARTS_WITH') {
      triggerMatched = keywords.some((k) => normalizedInput.startsWith(k));
    } else if (matchType === 'REGEX' && triggerConfig.regex) {
      try {
        triggerMatched = new RegExp(triggerConfig.regex, 'i').test(normalizedInput.substring(0, 500));
      } catch (error) {
        return NextResponse.json({ triggerMatched: false, error: `Invalid regex: ${(error as Error).message}` });
      }
    } else {
      triggerMatched = keywords.some((k) => normalizedInput.includes(k));
    }

    if (!triggerMatched) {
      return NextResponse.json({
        triggerMatched: false,
        note: 'This test message would not trigger the bot with its current keyword/match configuration.',
      });
    }

    if (bot.kind === 'AI') {
      let aiConfig: any = {};
      try {
        aiConfig = JSON.parse(bot.aiConfig || '{}');
      } catch (error) {
        logger.warn({ error, botId: id }, '[BotTest] Failed to parse aiConfig');
      }

      const provider = aiConfig.provider || 'gemini';
      const model = aiConfig.model;
      const rawApiKey =
        decryptString(aiConfig.apiKeyEncrypted) ||
        process.env.GEMINI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        '';

      if (!rawApiKey) {
        return NextResponse.json({
          triggerMatched: true,
          error: `No API key configured for ${provider} (neither on the bot nor in server environment variables). Add one before this bot can respond.`,
        });
      }

      let kbContext = '';
      if (bot.knowledgeBase?.chunks) {
        try {
          const chunks: KnowledgeChunk[] = JSON.parse(bot.knowledgeBase.chunks);
          const topChunks = retrieveTopChunks(chunks, testMessage, 3);
          if (topChunks.length > 0) {
            kbContext = `\n\n--- KNOWLEDGE BASE FACTS ---\n${topChunks.map((c) => `[${c.title}]: ${c.content}`).join('\n\n')}\n--- END FACTS ---`;
          }
        } catch (error) {
          logger.warn({ error, botId: id }, '[BotTest] Failed to parse knowledge base chunks');
        }
      }

      const systemPrompt = `${aiConfig.systemPrompt || 'You are a helpful, professional customer support agent on WhatsApp. Answer concisely and politely.'}${kbContext}`;
      const messages: AiChatMessage[] = [{ role: 'user', content: testMessage }];

      try {
        const reply = await generateAiResponse({ provider, model, apiKey: rawApiKey, systemPrompt, messages });
        return NextResponse.json({ triggerMatched: true, reply, usedKnowledgeBase: Boolean(kbContext) });
      } catch (error: any) {
        logger.error({ error, botId: id }, '[BotTest] AI generation failed');
        return NextResponse.json({ triggerMatched: true, error: error.message || 'AI provider request failed' });
      }
    }

    if (bot.kind === 'HTTP') {
      const targetUrl = triggerConfig.webhookUrl;
      if (!targetUrl) {
        return NextResponse.json({ triggerMatched: true, error: 'No webhook URL configured for this bot.' });
      }

      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contactId: 'test', phoneNumber: 'test', message: testMessage, timestamp: new Date().toISOString(), isTest: true }),
        });
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({
          triggerMatched: true,
          reply: data.reply || data.text || data.message || null,
          httpStatus: res.status,
          note: res.ok ? undefined : `Webhook responded with HTTP ${res.status}`,
        });
      } catch (error: any) {
        logger.error({ error, botId: id }, '[BotTest] HTTP webhook test failed');
        return NextResponse.json({ triggerMatched: true, error: `Could not reach webhook: ${error.message}` });
      }
    }

    // KEYWORD bot
    let actions: any[] = [];
    try {
      actions = JSON.parse(bot.actionsJson || '[]');
    } catch (error) {
      logger.warn({ error, botId: id }, '[BotTest] Failed to parse actionsJson');
    }
    const sendAction = actions.find((a) => a.type === 'SEND_TEXT');

    return NextResponse.json({
      triggerMatched: true,
      reply: sendAction?.payload?.text || null,
      note: sendAction ? undefined : 'This bot has no SEND_TEXT action configured.',
    });
  } catch (error: any) {
    logger.error({ error }, '[BotTest] Unexpected error');
    return NextResponse.json({ error: 'Bot test failed unexpectedly' }, { status: 500 });
  }
}
