export type AiProviderName = 'openai' | 'gemini' | 'anthropic' | 'openrouter' | 'custom';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateAiOptions {
  provider: AiProviderName;
  model?: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  messages: AiChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

/**
 * Unified AI Provider Adapter supporting OpenAI, Anthropic, Gemini, OpenRouter, and OpenAI-compatible endpoints
 */
export async function generateAiResponse(options: GenerateAiOptions): Promise<string> {
  const {
    provider,
    model = getDefaultModel(provider),
    apiKey,
    baseUrl,
    systemPrompt,
    messages,
    maxTokens = 800,
    temperature = 0.7,
  } = options;

  if (!apiKey && provider !== 'custom') {
    throw new Error(`API key required for provider: ${provider}`);
  }

  // 1. Google Gemini Provider
  if (provider === 'gemini') {
    const geminiModel = model || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: any = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // 2. Anthropic Claude Provider
  if (provider === 'anthropic') {
    const claudeModel = model || 'claude-3-5-sonnet-20241022';
    const endpoint = 'https://api.anthropic.com/v1/messages';

    const claudeMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: claudeModel,
        system: systemPrompt || undefined,
        messages: claudeMessages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // 3. OpenAI / OpenRouter / Custom OpenAI-Compatible
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  let defaultModel = 'gpt-4o-mini';

  if (provider === 'openrouter') {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    defaultModel = 'meta-llama/llama-3.3-70b-instruct';
  } else if (provider === 'custom' && baseUrl) {
    endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  }

  const allMessages = [];
  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt });
  }
  allMessages.push(...messages);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://wayapp.io', 'X-Title': 'WAYAPP' } : {}),
    },
    body: JSON.stringify({
      model: model || defaultModel,
      messages: allMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${provider.toUpperCase()} API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function getDefaultModel(provider: AiProviderName): string {
  switch (provider) {
    case 'gemini':
      return 'gemini-1.5-flash';
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
    case 'openrouter':
      return 'meta-llama/llama-3.3-70b-instruct';
    case 'openai':
    default:
      return 'gpt-4o-mini';
  }
}
