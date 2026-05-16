// backend/scripts/voiceRewrite.ts
// Tier U voice rewrite pass — pure helpers (no I/O, fully unit-tested).

import type { VoiceGradeSummary } from './voiceGrade';

export interface RewriteAttempt {
  description: string;
  score: number;
}

/**
 * Best attempt that *strictly* beats the original score. Equal is rejected
 * (same flatness — not worth a write + the churn). null ⇒ keep original.
 */
export function pickBestAttempt(
  attempts: readonly RewriteAttempt[],
  oldScore: number,
): RewriteAttempt | null {
  let best: RewriteAttempt | null = null;
  for (const a of attempts) {
    if (a.score > oldScore && (best === null || a.score > best.score)) {
      best = a;
    }
  }
  return best;
}

export interface RewriteReportInput {
  before: VoiceGradeSummary;
  after: VoiceGradeSummary;
  updated: number;
  skippedRegression: number;
  failed: number;
  discarded: number;
}

function bar(p: number): string {
  const filled = Math.round((p / 100) * 20);
  return '█'.repeat(filled) + '░'.repeat(20 - filled);
}

export function formatRewriteReport(input: RewriteReportInput): string {
  const { before, after } = input;
  const delta = Math.round((after.shipPct - before.shipPct) * 10) / 10;
  const lines: string[] = [];
  lines.push('Tier U — Voice Rewrite Pass');
  lines.push('━'.repeat(62));
  lines.push(
    `Ship  before  ${bar(before.shipPct)} ${before.shipPct}% ` +
      `(${before.ship}/${before.total})`,
  );
  lines.push(
    `      after   ${bar(after.shipPct)} ${after.shipPct}% ` +
      `(${after.ship}/${after.total})   Δ ${delta >= 0 ? '+' : ''}${delta}pp`,
  );
  lines.push('');
  lines.push(
    `Actions  updated ${input.updated} · regression-skipped ` +
      `${input.skippedRegression} · failed ${input.failed} · ` +
      `discarded ${input.discarded}`,
  );
  return lines.join('\n');
}
