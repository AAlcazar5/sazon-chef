// ROADMAP 4.0 TB3.3 — Weekly accuracy dashboard.
//
// Computes acceptance, swap-then-accept, escape, fallback, and
// low-confidence rates for the last 7 days of RecommenderEvents.
// Writes `reports/recommender-weekly.md` (or posts to Slack if
// SLACK_RECOMMENDER_WEBHOOK is set). Same metrics gate T4.2's
// promotion decision.

import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../src/lib/prisma';

export interface WeeklyOptions {
  weekStart: Date;
  weekEnd: Date;
  outputDir?: string;
  slackWebhook?: string | null;
  lowConfidenceThreshold?: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalProposals: number;
  acceptanceRate: number;
  swapThenAcceptRate: number;
  escapeRate: number;
  abandonRate: number;
  fallbackRate: number;
  lowConfidenceRate: number;
  averageConfidence: number;
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return n / d;
}

interface EventRow {
  id: string;
  confidence: number;
  source: string;
  pickedRecipeId: string | null;
  outcome: { outcome: string } | null;
}

export async function weeklyRecommenderReport(
  opts: WeeklyOptions,
): Promise<WeeklyReport> {
  const events = (await (prisma as any).recommenderEvent.findMany({
    where: {
      createdAt: { gte: opts.weekStart, lt: opts.weekEnd },
    },
    select: {
      id: true,
      confidence: true,
      source: true,
      pickedRecipeId: true,
      outcome: { select: { outcome: true } },
    },
  })) as EventRow[];

  const total = events.length;
  let accepted = 0;
  let swapped = 0;
  let escaped = 0;
  let abandoned = 0;
  let fallback = 0;
  let lowConfidence = 0;
  let confidenceSum = 0;

  const lowConfThreshold = opts.lowConfidenceThreshold ?? 0.6;
  for (const e of events) {
    confidenceSum += e.confidence;
    if (e.source === 'retrieval_fallback') fallback++;
    if (e.pickedRecipeId === null || e.confidence < lowConfThreshold) {
      lowConfidence++;
    }
    const outcome = e.outcome?.outcome ?? null;
    if (outcome === 'accepted') accepted++;
    else if (outcome === 'swapped') swapped++;
    else if (outcome === 'escaped') escaped++;
    else if (outcome === 'abandoned') abandoned++;
  }

  const report: WeeklyReport = {
    weekStart: opts.weekStart.toISOString(),
    weekEnd: opts.weekEnd.toISOString(),
    totalProposals: total,
    acceptanceRate: pct(accepted, total),
    swapThenAcceptRate: pct(swapped, total),
    escapeRate: pct(escaped, total),
    abandonRate: pct(abandoned, total),
    fallbackRate: pct(fallback, total),
    lowConfidenceRate: pct(lowConfidence, total),
    averageConfidence: total > 0 ? confidenceSum / total : 0,
  };

  if (opts.outputDir) {
    fs.mkdirSync(opts.outputDir, { recursive: true });
    const md = formatWeeklyReport(report);
    fs.writeFileSync(
      path.join(opts.outputDir, 'recommender-weekly.md'),
      md,
    );
  }

  if (opts.slackWebhook) {
    try {
      const fetchFn = (globalThis as any).fetch as typeof fetch | undefined;
      if (fetchFn) {
        await fetchFn(opts.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: formatWeeklyReport(report) }),
        });
      }
    } catch {
      // best-effort
    }
  }

  return report;
}

export function formatWeeklyReport(r: WeeklyReport): string {
  const fmt = (n: number) => `${(n * 100).toFixed(1)}%`;
  return [
    `# Recommender weekly — ${r.weekStart.slice(0, 10)} → ${r.weekEnd.slice(0, 10)}`,
    '',
    `- Total proposals: ${r.totalProposals}`,
    `- Acceptance: ${fmt(r.acceptanceRate)}`,
    `- Swap-then-accept: ${fmt(r.swapThenAcceptRate)}`,
    `- Escape: ${fmt(r.escapeRate)}`,
    `- Abandoned: ${fmt(r.abandonRate)}`,
    `- Retrieval fallback: ${fmt(r.fallbackRate)}`,
    `- Low confidence (<threshold): ${fmt(r.lowConfidenceRate)}`,
    `- Avg confidence: ${r.averageConfidence.toFixed(3)}`,
  ].join('\n');
}

if (require.main === module) {
  const now = new Date();
  const weekEnd = new Date(now);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const outputDir =
    process.env.RECOMMENDER_REPORT_DIR ??
    path.join(__dirname, '../../../reports');
  const slackWebhook = process.env.SLACK_RECOMMENDER_WEBHOOK ?? null;
  weeklyRecommenderReport({ weekStart, weekEnd, outputDir, slackWebhook })
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(r, null, 2));
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[weeklyRecommenderReport] failed:', err);
      process.exit(1);
    });
}
