// backend/src/services/selfImprovement/feeds/coachPatternsFeed.ts
// Tier M4 / Feed 8 — weekly aggregation of Sazon Coach query intents.
//
// **Privacy is non-negotiable.** Read users' messages to derive an intent
// cluster, then DROP THE BODY. The observation file persists meta only:
//
//   - char_count
//   - has_attached_recipe
//   - intent cluster (one of CLUSTER_LABELS)
//
// Fixture body content never appears in renderCoachPatternsMarkdown
// output — there's a static guard test for this.
//
// Fires weekly. Pre-launch the cron lies dormant (no Coach query volume →
// status=skipped). Post-launch the cron picks up automatically.

import fs from 'fs';
import path from 'path';
import { logger } from '../../../utils/logger';
import { FeedDeps, FeedRunResult } from './types';
import { parseJsonColumn } from '../../../utils/jsonColumns';

const FEED_ID = 'coach-patterns';

export type CoachIntent =
  | 'recipe_idea'
  | 'macro_question'
  | 'ingredient_swap'
  | 'meal_plan_help'
  | 'cooking_technique'
  | 'small_talk'
  | 'unclassified';

export const CLUSTER_LABELS: CoachIntent[] = [
  'recipe_idea',
  'macro_question',
  'ingredient_swap',
  'meal_plan_help',
  'cooking_technique',
  'small_talk',
  'unclassified',
];

/** Raw query — body is read for clustering then DROPPED. Never persisted. */
export interface RawCoachQuery {
  body: string;
  attachments?: string; // JSON string of attachment descriptors
  createdAt: Date;
}

/** Meta-only output. The body is GONE. */
export interface CoachQueryMeta {
  charCount: number;
  hasAttachedRecipe: boolean;
  intent: CoachIntent;
  hour: number; // 0–23 in UTC, for time-of-day clustering
}

export interface CoachPatternsDeps extends FeedDeps {
  /**
   * Source of truth for the query stream. Production passes a Prisma
   * iterator over `coach_messages` filtered to `role='user'` + last 7 days.
   * Tests pass a fixture array.
   */
  fetchQueries?: (since: Date, until: Date) => Promise<RawCoachQuery[]>;
  /** Cluster a batch. Tests inject deterministic stub; prod uses Haiku. */
  clusterFn?: (queries: RawCoachQuery[]) => Promise<CoachIntent[]>;
  windowDays?: number;
}

/** Heuristic cluster used by default. Body is read; output is intent only. */
export function heuristicIntent(body: string): CoachIntent {
  const t = body.toLowerCase();
  if (/\b(swap|substitute|instead of|replace|don'?t have|out of)\b/.test(t)) {
    return 'ingredient_swap';
  }
  if (/\b(macro|protein|calorie|carb|fat gram|fiber)\b/.test(t)) {
    return 'macro_question';
  }
  if (/\b(week|monday|tuesday|wednesday|thursday|friday|plan|prep)\b/.test(t)) {
    return 'meal_plan_help';
  }
  if (/\b(how do i|how to|technique|braise|sear|temper|fold|knead)\b/.test(t)) {
    return 'cooking_technique';
  }
  if (/\b(idea|recipe|what should|cook tonight|dinner|lunch|breakfast)\b/.test(t)) {
    return 'recipe_idea';
  }
  if (/\b(hi|hello|hey|thanks|thank you|cool|nice)\b/.test(t) && body.trim().length < 60) {
    return 'small_talk';
  }
  return 'unclassified';
}

export async function defaultClusterer(queries: RawCoachQuery[]): Promise<CoachIntent[]> {
  return queries.map((q) => heuristicIntent(q.body));
}

/** Detect a recipe attachment in the JSON descriptor without exposing body. */
export function hasAttachedRecipe(attachments: string | undefined): boolean {
  if (!attachments) return false;
  try {
    const parsed = parseJsonColumn('attachments', attachments);
    if (!Array.isArray(parsed)) return false;
    return parsed.some((a) => {
      if (!a || typeof a !== 'object') return false;
      const att = a as { type?: unknown; kind?: unknown; recipeId?: unknown };
      return att.type === 'recipe' || att.kind === 'recipe' || Boolean(att.recipeId);
    });
  } catch {
    return false;
  }
}

/**
 * Strip body, keep meta. The body is read for clustering, then this function
 * builds the output that will be persisted. Body never makes it through.
 */
export function buildMeta(query: RawCoachQuery, intent: CoachIntent): CoachQueryMeta {
  return {
    charCount: query.body.length,
    hasAttachedRecipe: hasAttachedRecipe(query.attachments),
    intent,
    hour: query.createdAt.getUTCHours(),
  };
}

export function renderCoachPatternsMarkdown(
  meta: CoachQueryMeta[],
  asOf: Date,
  windowDays: number,
): string {
  const dateStr = asOf.toISOString().slice(0, 10);
  const lines: string[] = [
    `---`,
    `feed: ${FEED_ID}`,
    `date: ${dateStr}`,
    `window_days: ${windowDays}`,
    `item_count: ${meta.length}`,
    `privacy: meta-only — message bodies are never persisted`,
    `---`,
    ``,
    `# Coach query patterns — week ending ${dateStr}`,
    ``,
  ];

  if (meta.length === 0) {
    lines.push('_No queries in window (no Coach traffic or kill-switch)._');
    return lines.join('\n') + '\n';
  }

  // Intent histogram
  const intentCounts: Record<CoachIntent, number> = {
    recipe_idea: 0,
    macro_question: 0,
    ingredient_swap: 0,
    meal_plan_help: 0,
    cooking_technique: 0,
    small_talk: 0,
    unclassified: 0,
  };
  for (const m of meta) intentCounts[m.intent] += 1;

  lines.push('## Intent histogram', '');
  for (const intent of CLUSTER_LABELS) {
    const c = intentCounts[intent];
    if (c > 0) {
      const pct = Math.round((100 * c) / meta.length);
      lines.push(`- **${intent}**: ${c} (${pct}%)`);
    }
  }
  lines.push('');

  // Char-count distribution (rough buckets)
  const buckets = { '<40': 0, '40–120': 0, '120–280': 0, '280+': 0 };
  for (const m of meta) {
    if (m.charCount < 40) buckets['<40']++;
    else if (m.charCount < 120) buckets['40–120']++;
    else if (m.charCount < 280) buckets['120–280']++;
    else buckets['280+']++;
  }
  lines.push('## Length distribution', '');
  for (const [bucket, count] of Object.entries(buckets)) {
    if (count > 0) {
      const pct = Math.round((100 * count) / meta.length);
      lines.push(`- ${bucket} chars: ${count} (${pct}%)`);
    }
  }
  lines.push('');

  // Attached recipe rate
  const withRecipe = meta.filter((m) => m.hasAttachedRecipe).length;
  const recipeRate = Math.round((100 * withRecipe) / meta.length);
  lines.push('## Recipe attachments', '');
  lines.push(`- ${withRecipe} of ${meta.length} queries (${recipeRate}%) had a recipe attached`);
  lines.push('');

  // Hour-of-day distribution (UTC) — coarse 6-hour buckets
  const hourBuckets = { '00–05': 0, '06–11': 0, '12–17': 0, '18–23': 0 };
  for (const m of meta) {
    if (m.hour < 6) hourBuckets['00–05']++;
    else if (m.hour < 12) hourBuckets['06–11']++;
    else if (m.hour < 18) hourBuckets['12–17']++;
    else hourBuckets['18–23']++;
  }
  lines.push('## Time of day (UTC)', '');
  for (const [bucket, count] of Object.entries(hourBuckets)) {
    if (count > 0) {
      const pct = Math.round((100 * count) / meta.length);
      lines.push(`- ${bucket}: ${count} (${pct}%)`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

export async function runCoachPatternsFeed(
  deps: CoachPatternsDeps = {},
): Promise<FeedRunResult> {
  if (process.env.SELF_IMPROVEMENT_ENGINE_ENABLED === 'false') {
    return {
      feedId: FEED_ID,
      outputPath: null,
      itemCount: 0,
      tokenCost: 0,
      status: 'skipped',
      reason: 'kill-switch',
    };
  }

  const now = deps.now ? deps.now() : new Date();
  const outputRoot =
    deps.outputRoot ?? path.resolve(process.cwd(), '../.context/observations');
  const windowDays = deps.windowDays ?? 7;
  const since = new Date(now.getTime() - windowDays * 86_400_000);

  const fetchQueries = deps.fetchQueries;
  const clusterFn = deps.clusterFn ?? defaultClusterer;

  let queries: RawCoachQuery[] = [];
  if (fetchQueries) {
    try {
      queries = await fetchQueries(since, now);
    } catch (err) {
      logger.warn({ err }, 'feed.coachPatterns.fetchError');
    }
  }

  let intents: CoachIntent[] = [];
  if (queries.length > 0) {
    try {
      intents = await clusterFn(queries);
      if (intents.length !== queries.length) {
        logger.warn(
          { expected: queries.length, got: intents.length },
          'feed.coachPatterns.intentCountMismatch',
        );
        // Fall back to unclassified rather than corrupting the histogram.
        intents = queries.map(() => 'unclassified' as CoachIntent);
      }
    } catch (err) {
      logger.warn({ err }, 'feed.coachPatterns.clusterError');
      intents = queries.map(() => 'unclassified' as CoachIntent);
    }
  }

  // Build meta. **From this point forward, no body string is in scope.**
  const meta: CoachQueryMeta[] = queries.map((q, i) => buildMeta(q, intents[i]));

  const dir = path.join(outputRoot, FEED_ID);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${now.toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(filePath, renderCoachPatternsMarkdown(meta, now, windowDays), 'utf-8');

  return {
    feedId: FEED_ID,
    outputPath: filePath,
    itemCount: meta.length,
    tokenCost: 0,
    status: meta.length === 0 ? 'skipped' : 'ok',
    reason: meta.length === 0 ? 'no_queries_in_window' : undefined,
  };
}
