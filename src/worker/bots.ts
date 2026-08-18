import { prisma } from '@/lib/prisma';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { generateAiResponse, AiChatMessage } from '@/lib/ai/provider';
import { retrieveTopChunks, KnowledgeChunk } from '@/lib/ai/knowledge';
import { decryptString } from '@/lib/crypto';
import { logger } from '@/lib/logger';

// In-memory cooldown tracker: Map<"botId:contactId", timestamp>
const botCooldowns = new Map<string, number>();

export async function processInboundBot(params: {
  contactId: string;
  conversationId?: string;
  phoneNumber: string;
  bodyText: string;
}): Promise<boolean> {
  const { contactId, phoneNumber, bodyText } = params;
  if (!bodyText || !bodyText.trim()) return false;

  const normalizedInput = bodyText.trim().toLowerCase();

  try {
    const activeBots = await prisma.bot.findMany({
      where: { isActive: true },
      include: { knowledgeBase: true },
    });

    for (const bot of activeBots) {
      let triggerMatched = false;
      let triggerConfig: any = {};

      try {
        triggerConfig = JSON.parse(bot.triggerConfig || '{}');
      } catch {}

      const keywords: string[] = Array.isArray(triggerConfig.keywords)
        ? triggerConfig.keywords.map((k: string) => k.toLowerCase().trim())
        : [];
      const matchType = triggerConfig.matchType || 'CONTAINS';

      if (matchType === 'ANY_INBOUND' || (bot.kind === 'AI' && keywords.length === 0)) {
        triggerMatched = true;
      } else if (matchType === 'EXACT') {
        triggerMatched = keywords.some((k) => k === normalizedInput);
      } else if (matchType === 'STARTS_WITH') {
        triggerMatched = keywords.some((k) => normalizedInput.startsWith(k));
      } else if (matchType === 'REGEX' && triggerConfig.regex) {
        try {
          // ReDoS-safe length bound on input
          const boundedInput = normalizedInput.substring(0, 500);
          const regex = new RegExp(triggerConfig.regex, 'i');
          triggerMatched = regex.test(boundedInput);
        } catch {}
      } else {
        // Default CONTAINS
        triggerMatched = keywords.some((k) => normalizedInput.includes(k));
      }

      if (!triggerMatched) continue;

      // 1. Guardrail: Per-contact cooldown
      const cooldownKey = `${bot.id}:${contactId}`;
      const lastTriggered = botCooldowns.get(cooldownKey) || 0;
      const cooldownMs = (bot.cooldownSeconds || 60) * 1000;
      const now = Date.now();

      if (now - lastTriggered < cooldownMs) {
        logger.info({ botId: bot.id, contactId }, '[BotEngine] Skipped due to cooldown');
        continue;
      }

      // 2. Guardrail: Daily execution cap
      if (bot.dailyCap && bot.executionCount >= bot.dailyCap) {
        logger.info({ botId: bot.id }, '[BotEngine] Bot reached daily execution cap');
        continue;
      }

      // Update cooldown timestamp
      botCooldowns.set(cooldownKey, now);

      const client = await WhatsAppClient.createFromSettings();

      // 3. Handle by Bot Kind
      if (bot.kind === 'AI') {
        let aiConfig: any = {};
        try {
          aiConfig = JSON.parse(bot.aiConfig || '{}');
        } catch {}

        const provider = aiConfig.provider || 'gemini';
        const model = aiConfig.model;
        const rawApiKey = decryptString(aiConfig.apiKeyEncrypted) || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';

        // Load last 5 messages for conversation memory
        const recentMessages = await prisma.chatMessage.findMany({
          where: { contactId },
          orderBy: { timestamp: 'desc' },
          take: 5,
        });
        recentMessages.reverse();

        const history: AiChatMessage[] = recentMessages.map((m) => ({
          role: m.direction === 'INBOUND' ? 'user' : 'assistant',
          content: m.body || '',
        }));

        // Retrieve Knowledge Base context if attached
        let kbContext = '';
        if (bot.knowledgeBase && bot.knowledgeBase.chunks) {
          try {
            const chunks: KnowledgeChunk[] = JSON.parse(bot.knowledgeBase.chunks);
            const topChunks = retrieveTopChunks(chunks, bodyText, 3);
            if (topChunks.length > 0) {
              kbContext = `\n\n--- KNOWLEDGE BASE FACTS ---\n${topChunks.map((c) => `[${c.title}]: ${c.content}`).join('\n\n')}\n--- END FACTS ---`;
            }
          } catch {}
        }

        const systemPrompt = `${aiConfig.systemPrompt || 'You are a helpful, professional customer support agent on WhatsApp. Answer concisely and politely.'}${kbContext}`;

        try {
          const aiReply = await generateAiResponse({
            provider,
            model,
            apiKey: rawApiKey,
            systemPrompt,
            messages: history,
          });

          if (aiReply && aiReply.trim()) {
            await client.sendTextMessage(phoneNumber, aiReply.trim());

            // Store outbound ChatMessage
            await prisma.chatMessage.create({
              data: {
                contactId,
                phoneNumber,
                direction: 'OUTBOUND',
                messageType: 'text',
                body: aiReply.trim(),
                status: 'SENT',
              },
            });
          }
        } catch (aiErr: any) {
          logger.error({ err: aiErr.message }, '[BotEngine] AI generation failed');
        }
      } else if (bot.kind === 'HTTP') {
        let triggerConfig: any = {};
        try {
          triggerConfig = JSON.parse(bot.triggerConfig || '{}');
        } catch {}

        const targetUrl = triggerConfig.webhookUrl;
        if (targetUrl) {
          try {
            const res = await fetch(targetUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contactId,
                phoneNumber,
                message: bodyText,
                timestamp: new Date().toISOString(),
              }),
            });

            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              const replyText = data.reply || data.text || data.message;
              if (replyText) {
                await client.sendTextMessage(phoneNumber, replyText);
                await prisma.chatMessage.create({
                  data: {
                    contactId,
                    phoneNumber,
                    direction: 'OUTBOUND',
                    messageType: 'text',
                    body: replyText,
                    status: 'SENT',
                  },
                });
              }
            }
          } catch (httpErr: any) {
            logger.error({ err: httpErr.message }, '[BotEngine] HTTP bot delivery failed');
          }
        }
      } else {
        // KEYWORD bot: actionsJson
        let actions: any[] = [];
        try {
          actions = JSON.parse(bot.actionsJson || '[]');
        } catch {}

        for (const action of actions) {
          if (action.type === 'SEND_TEXT' && action.payload?.text) {
            await client.sendTextMessage(phoneNumber, action.payload.text);

            await prisma.chatMessage.create({
              data: {
                contactId,
                phoneNumber,
                direction: 'OUTBOUND',
                messageType: 'text',
                body: action.payload.text,
                status: 'SENT',
              },
            });
          } else if (action.type === 'ADD_TAG' && action.payload?.tagId) {
            await prisma.contactsOnTags.upsert({
              where: {
                contactId_tagId: { contactId, tagId: action.payload.tagId },
              },
              update: {},
              create: { contactId, tagId: action.payload.tagId },
            }).catch(() => {});
          }
        }
      }

      // Update bot execution counters
      await prisma.bot.update({
        where: { id: bot.id },
        data: {
          executionCount: { increment: 1 },
          lastTriggeredAt: new Date(),
        },
      });

      return true; // Handled
    }
  } catch (error) {
    logger.error({ error }, '[BotEngine] Error processing inbound bot');
  }

  return false;
}
