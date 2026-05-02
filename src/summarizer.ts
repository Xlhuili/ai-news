import Anthropic from '@anthropic-ai/sdk';
import type { Article } from './types.js';

const CONCURRENCY = 5;

async function summarizeOne(client: Anthropic, article: Article): Promise<string | undefined> {
  const description = article.summary ?? '';
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      system: 'You are a news summarizer. Given a news article title and description, write exactly one concise sentence summarizing the core news. Output only the sentence, no quotes.',
      messages: [
        {
          role: 'user',
          content: `Title: ${article.title}\nDescription: ${description}`,
        },
      ],
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text.trim() : undefined;
  } catch {
    return undefined;
  }
}

export async function enrichWithAISummaries(articles: Article[]): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('⚠ ANTHROPIC_API_KEY 未设置，跳过 AI 摘要');
    return;
  }

  const client = new Anthropic({ apiKey });

  process.stdout.write(`正在生成 AI 摘要（共 ${articles.length} 篇）`);

  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const chunk = articles.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map((a) => summarizeOne(client, a)));

    results.forEach((result, j) => {
      if (result.status === 'fulfilled' && result.value) {
        chunk[j].summary = result.value;
      }
      // on failure: keep the original truncated description as fallback
    });

    process.stdout.write('.');
  }

  console.log(' 完成');
}
