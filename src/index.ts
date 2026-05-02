import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import cron from 'node-cron';
import type { Article } from './types.js';
import { fetchAllSources } from './fetcher.js';
import { enrichWithAISummaries } from './summarizer.js';
import { generateReport } from './report.js';

function dedup(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((a) => {
    if (!a.link || seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });
}

async function runOnce() {
  const ts = new Date().toLocaleString('zh-CN', { hour12: false });
  console.log(`\n[${ts}] 正在抓取 RSS 源...`);

  const { articles: raw, errors } = await fetchAllSources();

  for (const err of errors) {
    console.warn(`  ⚠ 抓取失败 - ${err}`);
  }

  if (raw.length === 0) {
    console.error('  ✗ 未获取到任何文章，请检查网络或 RSS 源。');
    return;
  }

  const articles = dedup(raw);
  const removed = raw.length - articles.length;
  if (removed > 0) {
    console.log(`  去重：移除 ${removed} 篇重复文章（剩余 ${articles.length} 篇）`);
  }

  await enrichWithAISummaries(articles);

  const { content, filename } = generateReport(articles);

  const outputDir = join(process.cwd(), 'output');
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, filename), content, 'utf-8');

  const countBySource = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.source] = (acc[a.source] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`✓ 已生成日报：output/${filename}（共 ${articles.length} 篇文章）`);
  for (const [source, count] of Object.entries(countBySource)) {
    console.log(`  ${source}: ${count} 篇`);
  }
}

const isCron = process.argv.includes('--cron');

if (isCron) {
  console.log('定时模式已启动，每天 08:00 (Asia/Shanghai) 自动运行。');
  console.log('立即执行一次...');
  runOnce().catch((err) => console.error('✗ 运行出错：', err));

  cron.schedule(
    '0 8 * * *',
    () => runOnce().catch((err) => console.error('✗ 运行出错：', err)),
    { timezone: 'Asia/Shanghai' },
  );
} else {
  runOnce().catch((err) => {
    console.error('✗ 运行出错：', err);
    process.exit(1);
  });
}
