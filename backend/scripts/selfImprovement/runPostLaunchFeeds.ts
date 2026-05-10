// backend/scripts/selfImprovement/runPostLaunchFeeds.ts
// Tier M4 — entry point invoked by PM2 cron. Runs the two post-launch feeds:
//   Feed 4 — review scanner (daily, AppFollow → Haiku cluster → markdown)
//   Feed 8 — coach query patterns (weekly, Coach → meta-only aggregation)
//
// Pre-launch the cron lies dormant: AppFollow has no live store IDs (Feed 4
// returns 0 reviews) and Coach has no production query volume (Feed 8
// returns 0 queries). Both surface as status=skipped in the log; no markdown
// is written until real data flows.
//
// Honors SELF_IMPROVEMENT_ENGINE_ENABLED. FEED_ONLY=reviews|coach-patterns
// scopes the run to one feed.

import path from 'path';
import { logger } from '../../src/utils/logger';
import { prisma } from '../../src/lib/prisma';
import { runReviewScannerFeed } from '../../src/services/selfImprovement/feeds/reviewScannerFeed';
import {
  runCoachPatternsFeed,
  type RawCoachQuery,
} from '../../src/services/selfImprovement/feeds/coachPatternsFeed';
import type { FeedRunResult } from '../../src/services/selfImprovement/feeds/types';

const REVIEW_APPS = (process.env.SAZON_APP_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const OUTPUT_ROOT = path.resolve(__dirname, '../../../.context/observations');

async function fetchCoachQueries(since: Date, until: Date): Promise<RawCoachQuery[]> {
  // Privacy: SELECT only the fields we need. The body is read for clustering
  // and immediately dropped; never persisted.
  const rows = await (prisma as any).coachMessage.findMany({
    where: {
      role: 'user',
      createdAt: { gte: since, lte: until },
    },
    select: { content: true, attachments: true, createdAt: true },
    take: 5_000, // hard cap so a runaway week can't blow memory
  });
  return rows.map((r: any) => ({
    body: String(r.content ?? ''),
    attachments: r.attachments,
    createdAt: r.createdAt,
  }));
}

async function main(): Promise<void> {
  if (process.env.SELF_IMPROVEMENT_ENGINE_ENABLED === 'false') {
    logger.info('selfImprovement.postLaunchFeeds.killSwitchOn');
    return;
  }
  const onlyFeed = process.env.FEED_ONLY ?? '';
  const results: FeedRunResult[] = [];

  if (!onlyFeed || onlyFeed === 'reviews') {
    results.push(
      await runReviewScannerFeed(REVIEW_APPS, { outputRoot: OUTPUT_ROOT }),
    );
  }
  if (!onlyFeed || onlyFeed === 'coach-patterns') {
    results.push(
      await runCoachPatternsFeed({
        outputRoot: OUTPUT_ROOT,
        fetchQueries: fetchCoachQueries,
      }),
    );
  }

  for (const r of results) {
    logger.info(
      { feed: r.feedId, status: r.status, items: r.itemCount, reason: r.reason },
      'selfImprovement.postLaunchFeeds.run',
    );
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  logger.error({ err }, 'selfImprovement.postLaunchFeeds.fatal');
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
