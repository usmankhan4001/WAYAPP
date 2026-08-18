import { generateAiResponse, AiProviderName } from './provider';

export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  keywords: string[];
}

/**
 * Splits markdown content into searchable chunks
 */
export function chunkMarkdownContent(markdown: string): KnowledgeChunk[] {
  const sections = markdown.split(/\n(?=#{1,3}\s)/g);
  const chunks: KnowledgeChunk[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;

    const lines = section.split('\n');
    const headerLine = lines[0].replace(/^#{1,3}\s*/, '').trim();
    const title = headerLine || `Section ${i + 1}`;
    const content = section;

    // Extract keywords
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const uniqueKeywords = Array.from(new Set(words));

    chunks.push({
      id: `chunk_${i + 1}`,
      title,
      content,
      keywords: uniqueKeywords,
    });
  }

  return chunks;
}

/**
 * Retrieves top-K most relevant chunks for a user query using keyword frequency & match scoring
 */
export function retrieveTopChunks(chunks: KnowledgeChunk[], query: string, topK: number = 3): KnowledgeChunk[] {
  if (!chunks || chunks.length === 0) return [];

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (queryTerms.length === 0) {
    return chunks.slice(0, topK);
  }

  const scored = chunks.map((chunk) => {
    let score = 0;
    const lowerContent = chunk.content.toLowerCase();
    const lowerTitle = chunk.title.toLowerCase();

    for (const term of queryTerms) {
      if (lowerTitle.includes(term)) score += 5;
      if (chunk.keywords.includes(term)) score += 2;
      const count = (lowerContent.match(new RegExp(term, 'g')) || []).length;
      score += Math.min(count, 5);
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}

/**
 * AI-powered Knowledge Base generator: formats raw text notes into clean, structured Knowledge Base Markdown
 */
export async function generateKnowledgeBaseMarkdown(
  rawNotes: string,
  config: {
    provider: AiProviderName;
    apiKey: string;
    model?: string;
    companyName?: string;
  }
): Promise<string> {
  const systemPrompt = `You are a Knowledge Base architect for an enterprise customer service WhatsApp bot.
Your job is to transform raw unstructured business notes, pricing, FAQs, and policies into a clear, highly structured Markdown knowledge base.
Include:
- Company Overview & Core Services
- Pricing & Plans (if mentioned)
- Frequently Asked Questions (FAQ) with concise, accurate answers
- Support & Contact Policies
Use clear markdown headers (## and ###) for every section so each section can be indexed for retrieval.`;

  return await generateAiResponse({
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Here are the raw notes for ${config.companyName || 'our business'}:\n\n${rawNotes}\n\nPlease generate the structured Knowledge Base:`,
      },
    ],
  });
}
