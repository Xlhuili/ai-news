import type { Article } from './types.js';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replace(/\//g, '-');
}

export function generateReport(articles: Article[]): { content: string; filename: string } {
  const sorted = [...articles].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  const today = formatDate(new Date());
  const sourceNames = [...new Set(sorted.map((a) => a.source))];
  const sourceCount = sourceNames.length;

  const lines: string[] = [
    `# AI 新闻日报 · ${today}`,
    '',
    `> 共收录 **${sorted.length} 篇**文章，来自 **${sourceCount} 个**源：${sourceNames.join(' · ')}`,
    '',
    '---',
  ];

  for (const article of sorted) {
    lines.push('');
    lines.push(`## ${formatTime(article.publishedAt)} · ${article.source}`);
    lines.push('');
    lines.push(`### [${article.title}](${article.link})`);
    if (article.summary) {
      lines.push('');
      lines.push(article.summary);
    }
    lines.push('');
    lines.push('---');
  }

  return {
    content: lines.join('\n'),
    filename: `${today}.md`,
  };
}
