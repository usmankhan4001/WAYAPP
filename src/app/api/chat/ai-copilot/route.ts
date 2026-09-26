import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAiResponse, AiProviderName } from '@/lib/ai/provider';
import { isModuleEnabled } from '@/lib/modules';
import { decryptString } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  // 2026-09 containment: this route previously had NO authentication. Anyone who
  // could reach it could read recent chat messages for an arbitrary contactId and
  // spend the configured AI provider's credits. Auth is now mandatory and
  // fail-closed; the module check below is defence in depth, not the gate.
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN', 'MEMBER']);
  if ('response' in authResult) return authResult.response;

  try {
    const enabled = await isModuleEnabled('ai_copilot');
    if (!enabled) {
      return NextResponse.json({ error: 'AI Sales Co-Pilot module is currently disabled.' }, { status: 403 });
    }

    const body = await request.json();
    const { action, contactId, text, targetLanguage = 'Arabic', chatHistory = [] } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    // Try finding configured AI Bot or global settings for API Keys
    const aiBot = await prisma.bot.findFirst({
      where: { kind: 'AI', isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    let provider: AiProviderName = 'gemini';
    let apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    let model = '';

    if (aiBot?.aiConfig) {
      try {
        const conf = JSON.parse(aiBot.aiConfig);
        if (conf.provider) provider = conf.provider;
        if (conf.apiKeyEncrypted) {
          const dec = decryptString(conf.apiKeyEncrypted);
          if (dec) apiKey = dec;
        } else if (conf.apiKey) {
          apiKey = conf.apiKey;
        }
        if (conf.model) model = conf.model;
      } catch (err) {
        logger.warn({ err }, 'Failed to parse AI bot config; using defaults');
      }
    }

    // 1. ACTION: SUGGEST REPLY
    if (action === 'suggest_reply') {
      let recentMsgs = chatHistory;
      if (!recentMsgs.length && contactId) {
        recentMsgs = await prisma.chatMessage.findMany({
          where: { contactId },
          orderBy: { timestamp: 'desc' },
          take: 6,
        });
        recentMsgs.reverse();
      }

      const formattedHistory = recentMsgs
        .map((m: any) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.body || '[Media]'}`)
        .join('\n');

      const systemPrompt = `You are a high-performing WhatsApp sales co-pilot. Analyze the conversation history and provide 2 distinct, highly persuasive, professional WhatsApp reply suggestions for the sales agent to send to the customer.
Format output strictly as JSON array of strings: ["Option 1 (Direct & Friendly)", "Option 2 (Value & Closing)"]
Keep messages concise, friendly, with 1-2 relevant emojis, natural WhatsApp style.`;

      if (!apiKey) {
        // High quality rule-based fallback if no LLM key configured
        const lastMsg = recentMsgs[recentMsgs.length - 1]?.body?.toLowerCase() || '';
        if (lastMsg.includes('price') || lastMsg.includes('cost') || lastMsg.includes('how much')) {
          return NextResponse.json({
            suggestions: [
              'Hi! Thanks for inquiring. Our packages start from $29/mo with 0% markup on official WhatsApp rates. Would you like a quick overview brochure? 📄',
              'Hello! We offer flexible plans tailored to your team size. May I know how many messages or agents you plan to manage each month? 🚀',
            ],
          });
        }
        return NextResponse.json({
          suggestions: [
            'Hi there! Thank you for reaching out to us. How can I assist you with your requirements today? 😊',
            'Hello! Thanks for your message. I would be happy to guide you through our solutions. Would you like to see a quick demo or pricing? ✨',
          ],
        });
      }

      try {
        const responseText = await generateAiResponse({
          provider,
          apiKey,
          model,
          systemPrompt,
          messages: [{ role: 'user', content: `Conversation history:\n${formattedHistory}\n\nSuggest 2 replies:` }],
          temperature: 0.7,
        });

        let suggestions: string[] = [];
        try {
          const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          suggestions = JSON.parse(cleaned);
        } catch {
          suggestions = responseText.split('\n\n').filter(Boolean).slice(0, 2);
        }

        return NextResponse.json({ suggestions });
      } catch (err: any) {
        logger.warn({ err }, 'AI Suggest reply failed, using smart fallback');
        return NextResponse.json({
          suggestions: [
            'Hi! Thank you for reaching out. How can I help you today? 😊',
            'Hello! Thanks for your message. Would you like to learn more about our enterprise solutions? ✨',
          ],
        });
      }
    }

    // 2. ACTION: POLISH TONE
    if (action === 'polish') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Text to polish is required' }, { status: 400 });
      }

      if (!apiKey) {
        // Fallback cleanup
        const polished = text.charAt(0).toUpperCase() + text.slice(1).trim();
        return NextResponse.json({ polished: `${polished} Please let us know if you have any questions! 😊` });
      }

      const systemPrompt = `You are an expert sales communication coach. Rephrase the sales agent's rough draft into a polite, persuasive, professional, and friendly WhatsApp sales message. Preserve key facts (numbers, links, names). Add 1-2 tasteful emojis. Return ONLY the polished text without quotes or explanations.`;

      const polished = await generateAiResponse({
        provider,
        apiKey,
        model,
        systemPrompt,
        messages: [{ role: 'user', content: text }],
        temperature: 0.4,
      });

      return NextResponse.json({ polished: polished.trim() });
    }

    // 3. ACTION: TRANSLATE
    if (action === 'translate') {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Text to translate is required' }, { status: 400 });
      }

      const systemPrompt = `You are a professional translator for business messaging. Translate the given text into ${targetLanguage}. Keep the tone natural, courteous, and accurate for WhatsApp business communication. Return ONLY the translated text.`;

      if (!apiKey) {
        return NextResponse.json({ translated: `[${targetLanguage}] ${text}` });
      }

      const translated = await generateAiResponse({
        provider,
        apiKey,
        model,
        systemPrompt,
        messages: [{ role: 'user', content: text }],
        temperature: 0.3,
      });

      return NextResponse.json({ translated: translated.trim() });
    }

    // 4. ACTION: SUMMARIZE CHAT
    if (action === 'summarize') {
      let recentMsgs = chatHistory;
      if (!recentMsgs.length && contactId) {
        recentMsgs = await prisma.chatMessage.findMany({
          where: { contactId },
          orderBy: { timestamp: 'desc' },
          take: 12,
        });
        recentMsgs.reverse();
      }

      const formattedHistory = recentMsgs
        .map((m: any) => `${m.direction === 'INBOUND' ? 'Customer' : 'Agent'}: ${m.body || '[Media]'}`)
        .join('\n');

      if (!apiKey) {
        return NextResponse.json({
          summary: `• Customer reached out regarding inquiries.\n• Agent engaged with standard responses.\n• Recommended next step: Qualify requirements and follow up with a demo/quote.`,
        });
      }

      const systemPrompt = `Summarize the following customer chat for a sales agent takeover in 3 clear bullet points:
1. Customer Goal / Inquiry
2. Key Details Shared (Budget, Location, Timeline, Pain points)
3. Recommended Next Step / Closing Action`;

      const summary = await generateAiResponse({
        provider,
        apiKey,
        model,
        systemPrompt,
        messages: [{ role: 'user', content: formattedHistory }],
        temperature: 0.3,
      });

      return NextResponse.json({ summary: summary.trim() });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    logger.error({ error }, 'AI Co-Pilot error');
    return NextResponse.json({ error: error.message || 'Internal AI Co-Pilot error' }, { status: 500 });
  }
}
