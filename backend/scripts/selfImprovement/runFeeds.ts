// backend/scripts/selfImprovement/runFeeds.ts
// Tier M1 — entry point invoked by PM2 cron. Runs all three free observation
// feeds (competitor releases, recipe gap audit, food-media trends) and logs
// per-feed status + token cost. Honors SELF_IMPROVEMENT_ENGINE_ENABLED.

import path from 'path';
import { logger } from '../../src/utils/logger';
import { prisma } from '../../src/lib/prisma';
import { runCompetitorReleasesFeed } from '../../src/services/selfImprovement/feeds/competitorReleasesFeed';
import { runRecipeGapAuditFeed } from '../../src/services/selfImprovement/feeds/recipeGapAuditFeed';
import { runFoodMediaTrendsFeed } from '../../src/services/selfImprovement/feeds/foodMediaTrendsFeed';
import { COST_CEILINGS_USD, FeedRunResult } from '../../src/services/selfImprovement/feeds/types';

const COMPETITOR_APPS = (process.env.COMPETITOR_APPS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const OUTPUT_ROOT = path.resolve(__dirname, '../../../.context/observations');

async function main(): Promise<void> {
  if (process.env.SELF_IMPROVEMENT_ENGINE_ENABLED === 'false') {
    logger.info('selfImprovement.feeds.killSwitchOn');
    return;
  }
  const onlyFeed = process.env.FEED_ONLY ?? '';
  const results: FeedRunResult[] = [];

  if (!onlyFeed || onlyFeed === 'competitor-releases') {
    results.push(
      await runCompetitorReleasesFeed(COMPETITOR_APPS, { outputRoot: OUTPUT_ROOT }),
    );
  }
  if (!onlyFeed || onlyFeed === 'recipe-gaps') {
    results.push(
      await runRecipeGapAuditFeed(prisma as unknown as any, {
        outputRoot: OUTPUT_ROOT,
      }),
    );
  }
  if (!onlyFeed || onlyFeed === 'trends') {
    results.push(await runFoodMediaTrendsFeed({ outputRoot: OUTPUT_ROOT }));
  }

  for (const r of results) {
    const ceiling = COST_CEILINGS_USD[r.feedId] ?? 0.5;
    if (r.tokenCost > ceiling) {
      logger.error(
        { feed: r.feedId, tokenCost: r.tokenCost, ceiling },
        'selfImprovement.feeds.overBudget',
      );
    } else {
      logger.info(
        { feed: r.feedId, status: r.status, items: r.itemCount, cost: r.tokenCost },
        'selfImprovement.feeds.run',
      );
    }
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  logger.error({ err }, 'selfImprovement.feeds.fatal');
  try {
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
