// backend/src/services/selfImprovement/feeds/reviewScannerFeed.ts
// Tier M4 / Feed 4 — daily ingest of App Store + Play Store reviews via
// AppFollow. Each review is clustered by theme using Haiku 4.5 into one of:
//   bug | feature_request | persona_complaint | praise
// Output: `.context/observations/reviews/<date>.md`. Cron stays dormant
// pre-launch (no live store IDs → AppFollow returns empty → status=skipped).
//
// Privacy: only the review *body* + author handle leave AppFollow; nothing
// the user typed elsewhere is touched. Cluster output never includes
// store-author PII beyond what the review API already exposes.

import fs from 'fs';
import path from 'path';
import { logger } from '../../../utils/logger';
import { FeedDeps, FeedRunResult } from './types';

const FEED_ID = 'reviews';
const APPFOLLOW_HOST = 'https://api.appfollow.io/v2/reviews';

export type ReviewCluster =
  | 'bug'
  | 'feature_request'
  | 'persona_complaint'
  | 'praise'
  | 'unclassified';

export const CLUSTER_LABELS: ReviewCluster[] = [
  'bug',
  'feature_request',
  'persona_complaint',
  'praise',
  'unclassified',
];

export interface RawReview {
  app: string;
  store: 'ios' | 'android';
  reviewId: string;
  rating: number; // 1–5
  title: string;
  body: string;
  author: string;
  publishedAt: string; // ISO
}

export interface ClusteredReview extends RawReview {
  cluster: ReviewCluster;
  clusterReason?: string;
}

export interface ReviewScannerDeps extends FeedDeps {
  /** Cluster a batch of reviews. Tests inject a deterministic stub. */
  clusterFn?: (reviews: RawReview[]) => Promise<ClusteredReview[]>;
}

export async function fetchAppFollowReviews(
  apps: string[],
  fetchFn: typeof fetch,
): Promise<RawReview[]> {
  const apiKey = process.env.APPFOLLOW_API_KEY;
  if (!apiKey || apps.length === 0) return [];

  const out: RawReview[] = [];
  for (const app of apps) {
    try {
      const url = `${APPFOLLOW_HOST}?ext_id=${encodeURIComponent(app)}`;
      const res = await fetchFn(url, {
        headers: { 'X-AppFollow-API-Token': apiKey },
      });
      if (!res.ok) {
        logger.warn(
          { app, status: res.status },
          'feed.reviews.fetchFailed',
        );
        continue;
      }
      const json = (await res.json()) as {
        list?: Array<{
          review_id?: string;
          store?: string;
          rating?: number;
          title?: string;
          content?: string;
          author?: string;
          updated?: string;
        }>;
      };
      for (const r of json.list ?? []) {
        if (!r.review_id) continue;
        const store: 'ios' | 'android' =
          (r.store ?? '').toLowerCase().startsWith('android') ? 'android' : 'ios';
        out.push({
          app,
          store,
          reviewId: String(r.review_id),
          rating: typeof r.rating === 'number' ? r.rating : 0,
          title: String(r.title ?? '').slice(0, 200),
          body: String(r.content ?? '').slice(0, 4000),
          author: String(r.author ?? '').slice(0, 120),
          publishedAt: String(r.updated ?? ''),
        });
      }
    } catch (err) {
      logger.warn({ err, app }, 'feed.reviews.error');
    }
  }
  return out;
}

/**
 * Heuristic cluster — used as the default `clusterFn` when no LLM is
 * configured (tests, dev). Production injects a Haiku-backed clusterFn.
 *
 * Rules (lifestyle-voice tone):
 *   - rating ≤ 2 + matches /crash|bug|broken|error|fix/i  → bug
 *   - rating ≥ 4 + matches /love|amazing|great|delicious/i → praise
 *   - rating ≤ 3 + matches /macro|cut|bulk|diet/i → persona_complaint (the
 *       user wants the bodybuilder app we're not building)
 *   - matches /add|wish|please|would love|missing/i → feature_request
 *   - else → unclassified
 */
export function heuristicCluster(review: RawReview): ReviewCluster {
  const text = `${review.title} ${review.body}`.toLowerCase();
  // Stem matches (no trailing \b) so "crashes" / "broken" / "freezing" all hit.
  if (review.rating <= 2 && /\b(crash|bug|broke|broken|error|freeze|fix)/.test(text)) {
    return 'bug';
  }
  if (review.rating >= 4 && /\b(love|amazing|great|delicious|perfect|fantastic|beautiful)/.test(text)) {
    return 'praise';
  }
  if (review.rating <= 3 && /\b(macro|cut|bulk|diet|skinny|calorie counter)/.test(text)) {
    return 'persona_complaint';
  }
  if (/\b(add|wish|please|would love|missing|need|want)/.test(text)) {
    return 'feature_request';
  }
  return 'unclassified';
}

export async function defaultClusterer(
  reviews: RawReview[],
): Promise<ClusteredReview[]> {
  return reviews.map((r) => ({ ...r, cluster: heuristicCluster(r) }));
}

export function renderReviewsMarkdown(
  reviews: ClusteredReview[],
  asOf: Date,
): string {
  const dateStr = asOf.toISOString().slice(0, 10);
  const lines: string[] = [
    `---`,
    `feed: ${FEED_ID}`,
    `date: ${dateStr}`,
    `item_count: ${reviews.length}`,
    `---`,
    ``,
    `# Reviews — ${dateStr}`,
    ``,
  ];

  if (reviews.length === 0) {
    lines.push('_No reviews pulled (AppFollow not configured or empty response)._');
    return lines.join('\n') + '\n';
  }

  const counts: Record<ReviewCluster, number> = {
    bug: 0,
    feature_request: 0,
    persona_complaint: 0,
    praise: 0,
    unclassified: 0,
  };
  for (const r of reviews) counts[r.cluster] += 1;
  lines.push('## Cluster counts', '');
  for (const c of CLUSTER_LABELS) {
    if (counts[c] > 0) lines.push(`- **${c}**: ${counts[c]}`);
  }
  lines.push('');

  // Group by cluster for legibility.
  for (const c of CLUSTER_LABELS) {
    const subset = reviews.filter((r) => r.cluster === c);
    if (subset.length === 0) continue;
    lines.push(`## ${c}`, '');
    for (const r of subset) {
      const headline = r.title || r.body.slice(0, 80);
      const stars = '★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))));
      lines.push(
        `- [${r.store}/${r.app}] ${stars} **${headline.replace(/\n+/g, ' ').slice(0, 120)}**`,
      );
      const trimmed = r.body.replace(/\n+/g, ' ').trim().slice(0, 280);
      if (trimmed && trimmed !== headline) lines.push(`  - ${trimmed}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export async function runReviewScannerFeed(
  apps: string[],
  deps: ReviewScannerDeps = {},
): Promise<FeedRunResult> {
  const fetchFn = deps.fetchFn ?? fetch;
  const now = deps.now ? deps.now() : new Date();
  const outputRoot =
    deps.outputRoot ?? path.resolve(process.cwd(), '../.context/observations');
  const clusterFn = deps.clusterFn ?? defaultClusterer;

  const raw = await fetchAppFollowReviews(apps, fetchFn);
  const clustered = raw.length > 0 ? await clusterFn(raw) : [];

  const dir = path.join(outputRoot, FEED_ID);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${now.toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(filePath, renderReviewsMarkdown(clustered, now), 'utf-8');

  return {
    feedId: FEED_ID,
    outputPath: filePath,
    itemCount: clustered.length,
    tokenCost: 0, // heuristic default; production caller logs Haiku cost
    status: clustered.length === 0 ? 'skipped' : 'ok',
    reason: clustered.length === 0 ? 'no_reviews_or_unconfigured' : undefined,
  };
}
