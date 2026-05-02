import Parser from 'rss-parser';
import type { Article, Source } from './types.js';

const parser = new Parser({
  customFields: {
    item: ['description'],
  },
});

const SOURCES: Source[] = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'The Verge AI',  url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'Hacker News',   url: 'https://hnrss.org/newest?q=AI&count=30' },
];

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function extractDescription(item: Parser.Item & { description?: string }): string | undefined {
  const raw = item.contentSnippet ?? item.description ?? item.content;
  if (!raw) return undefined;
  const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  // Keep up to 300 chars as fallback; AI summarizer will replace this later
  return text.length > 300 ? text.slice(0, 300) + '…' : text;
}

async function fetchSource(source: Source, cutoff: Date): Promise<Article[]> {
  const feed = await parser.parseURL(source.url);
  const articles: Article[] = [];

  for (const item of feed.items) {
    const dateStr = item.pubDate ?? item.isoDate;
    if (!dateStr) continue;

    const publishedAt = new Date(dateStr);
    if (isNaN(publishedAt.getTime()) || publishedAt < cutoff) continue;

    articles.push({
      title: item.title?.trim() ?? '(无标题)',
      link: item.link ?? '',
      publishedAt,
      source: source.name,
      summary: extractDescription(item as Parser.Item & { description?: string }),
    });
  }

  return articles;
}

export async function fetchAllSources(): Promise<{ articles: Article[]; errors: string[] }> {
  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS);
  const results = await Promise.allSettled(SOURCES.map((s) => fetchSource(s, cutoff)));

  const articles: Article[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      articles.push(...result.value);
    } else {
      errors.push(`${SOURCES[i].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  }

  return { articles, errors };
}
