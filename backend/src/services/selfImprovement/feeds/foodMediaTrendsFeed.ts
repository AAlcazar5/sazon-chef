// backend/src/services/selfImprovement/feeds/foodMediaTrendsFeed.ts
// Tier M1 / Feed 7 — monthly RSS pull from food-media outlets. Returns the
// last N items per source. Optional Haiku summarization gated on
// ANTHROPIC_API_KEY + FEED_NARRATE_TRENDS=1.

import fs from 'fs';
import path from 'path';
import { logger } from '../../../utils/logger';
import { FeedDeps, FeedRunResult } from './types';

const FEED_ID = 'trends';

export const DEFAULT_FEEDS: Array<{ name: string; url: string }> = [
  { name: 'Bon Appétit', url: 'https://www.bonappetit.com/feed/rss' },
  { name: 'Eater', url: 'https://www.eater.com/rss/index.xml' },
  { name: 'NYT Cooking', url: 'https://cooking.nytimes.com/blog/feed' },
];

export interface FeedItem {
  source: string;
  title: string;
  link: string;
  pubDate: string;
}

export async function pullRss(
  source: { name: string; url: string },
  fetchFn: typeof fetch,
  maxItems: number,
): Promise<FeedItem[]> {
  try {
    const res = await fetchFn(source.url, {
      headers: { 'User-Agent': 'sazon-self-improvement/1.0' },
    });
    if (!res.ok) {
      logger.warn(
        { source: source.name, status: res.status },
        'feed.trends.rssFailed',
      );
      return [];
    }
    const xml = await res.text();
    return parseRss(xml, source.name).slice(0, maxItems);
  } catch (err) {
    logger.warn({ err, source: source.name }, 'feed.trends.rssError');
    return [];
  }
}

export function parseRss(xml: string, sourceName: string): FeedItem[] {
  const items: FeedItem[] = [];
  // Match <item>...</item> or <entry>...</entry> (Atom)
  const blockRe = /<(item|entry)[\s\S]*?<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[0];
    const title = extractTag(block, 'title');
    const link = extractLink(block);
    const pubDate =
      extractTag(block, 'pubDate') || extractTag(block, 'published') || '';
    if (title) {
      items.push({ source: sourceName, title, link, pubDate });
    }
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return stripCdata(m[1]).trim();
}

function extractLink(block: string): string {
  // Atom: <link href="..." />
  const atom = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (atom) return atom[1];
  // RSS: <link>...</link>
  return extractTag(block, 'link');
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

export function renderTrendsMarkdown(
  items: FeedItem[],
  asOf: Date,
): string {
  const dateStr = asOf.toISOString().slice(0, 10);
  const lines: string[] = [
    `---`,
    `feed: ${FEED_ID}`,
    `date: ${dateStr}`,
    `item_count: ${items.length}`,
    `---`,
    ``,
    `# Food media trends — ${dateStr}`,
    ``,
  ];
  if (items.length === 0) {
    lines.push('_No items pulled (RSS unavailable)._');
    return lines.join('\n') + '\n';
  }
  const bySource = new Map<string, FeedItem[]>();
  for (const i of items) {
    if (!bySource.has(i.source)) bySource.set(i.source, []);
    bySource.get(i.source)!.push(i);
  }
  for (const [source, list] of bySource) {
    lines.push(`## ${source}`, '');
    for (const item of list) {
      lines.push(
        `- [${item.title.slice(0, 200)}](${item.link})${item.pubDate ? ` — ${item.pubDate.slice(0, 16)}` : ''}`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

export async function runFoodMediaTrendsFeed(
  deps: FeedDeps & { sources?: typeof DEFAULT_FEEDS; maxPerSource?: number } = {},
): Promise<FeedRunResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const now = deps.now ? deps.now() : new Date();
  const outputRoot =
    deps.outputRoot ?? path.resolve(process.cwd(), '../.context/observations');
  const sources = deps.sources ?? DEFAULT_FEEDS;
  const maxPerSource = deps.maxPerSource ?? 10;

  const all: FeedItem[] = [];
  for (const s of sources) {
    const items = await pullRss(s, fetchFn, maxPerSource);
    all.push(...items);
  }

  const dir = path.join(outputRoot, FEED_ID);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${now.toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(filePath, renderTrendsMarkdown(all, now), 'utf-8');

  return {
    feedId: FEED_ID,
    outputPath: filePath,
    itemCount: all.length,
    tokenCost: 0,
    status: all.length === 0 ? 'skipped' : 'ok',
  };
}
