// backend/src/services/selfImprovement/feeds/types.ts
// Tier M1 — shared types for observation feeds. Each feed exports a runner
// that returns a `FeedRunResult`. The cron wrapper logs token cost and bails
// CI if any single run exceeds the configured ceiling.

export interface FeedRunResult {
  feedId: string;
  outputPath: string | null;
  itemCount: number;
  tokenCost: number;
  status: 'ok' | 'skipped' | 'error';
  reason?: string;
}

export interface FeedDeps {
  fetchFn?: typeof fetch;
  now?: () => Date;
  outputRoot?: string;
}

export const COST_CEILINGS_USD: Record<string, number> = {
  'competitor-releases': 0.1,
  'recipe-gaps': 0.1,
  'trends': 0.5,
};
