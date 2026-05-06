// backend/src/services/selfImprovement/measurementService.ts
// Tier M5 — monthly measurement loop. For each shipped proposal in the last
// 30 days, query its target metric, append a row to learnings/proposals-
// outcomes.md, generate a digest-<month>.md summary.
//
// The metric provider is dependency-injected so tests can pass a stub. In
// production it will read from PostHog / RevenueCat — that adapter ships
// when their SDKs land.

import fs from 'fs';
import path from 'path';

export type OutcomeTag = 'win' | 'null' | 'regression' | 'inconclusive';

export interface ShippedProposal {
  proposalId: string;
  slug: string;
  sourceFeed: string;
  targetMetric: string;
  shippedAt: Date;
}

export interface MetricObservation {
  baseline: number;
  result: number;
  windowDays: number;
  guardrailRegressed?: boolean;
  sampleSize?: number; // used to detect inconclusive
}

export interface MetricProvider {
  fetch(proposal: ShippedProposal, asOf: Date): Promise<MetricObservation | null>;
}

export interface MeasurementDeps {
  metricProvider: MetricProvider;
  shippedProposals: ShippedProposal[];
  contextRoot?: string;
  now?: () => Date;
}

export interface MeasurementResult {
  status: 'ok' | 'no-shipped';
  appended: number;
  digestPath: string | null;
  ledgerPath: string | null;
}

export function classifyOutcome(obs: MetricObservation): OutcomeTag {
  if (typeof obs.sampleSize === 'number' && obs.sampleSize < 30) {
    return 'inconclusive';
  }
  if (obs.guardrailRegressed) return 'regression';
  if (obs.baseline === 0) {
    return obs.result > 0 ? 'win' : 'null';
  }
  const delta = (obs.result - obs.baseline) / Math.abs(obs.baseline);
  if (delta <= -0.05) return 'regression';
  if (delta >= 0.1) return 'win';
  if (delta >= -0.05 && delta <= 0.05) return 'null';
  return 'inconclusive';
}

export function formatDelta(obs: MetricObservation): string {
  if (obs.baseline === 0) {
    return obs.result === 0 ? '0%' : '+∞';
  }
  const pct = ((obs.result - obs.baseline) / Math.abs(obs.baseline)) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function appendLedgerRow(
  ledgerPath: string,
  proposal: ShippedProposal,
  obs: MetricObservation,
  tag: OutcomeTag,
  notes = '',
): void {
  const row = `| ${proposal.shippedAt.toISOString().slice(0, 10)} | ${proposal.proposalId} | ${proposal.slug} | ${proposal.sourceFeed} | ${proposal.targetMetric} | ${obs.baseline} | ${obs.result} | ${formatDelta(obs)} | ${tag} | ${notes} |`;
  if (!fs.existsSync(ledgerPath)) {
    const header = [
      '# Proposals — Outcomes Ledger',
      '',
      '| Date shipped | Proposal ID | Slug | Source feed | Target metric | Baseline | Result | Delta | Tag | Notes |',
      '|---|---|---|---|---|---|---|---|---|---|',
      '',
    ].join('\n');
    fs.writeFileSync(ledgerPath, header);
  }
  fs.appendFileSync(ledgerPath, row + '\n');
}

export function renderDigest(
  rows: Array<{ proposal: ShippedProposal; tag: OutcomeTag; obs: MetricObservation }>,
  monthLabel: string,
): string {
  const counts = { win: 0, null: 0, regression: 0, inconclusive: 0 };
  for (const r of rows) counts[r.tag] += 1;
  const lines = [
    `---`,
    `month: ${monthLabel}`,
    `proposals_measured: ${rows.length}`,
    `wins: ${counts.win}`,
    `nulls: ${counts.null}`,
    `regressions: ${counts.regression}`,
    `inconclusive: ${counts.inconclusive}`,
    `---`,
    ``,
    `# Self-improvement digest — ${monthLabel}`,
    ``,
    `**${rows.length} shipped proposals measured. ${counts.win} wins, ${counts.regression} regressions, ${counts.null} flat, ${counts.inconclusive} inconclusive.**`,
    ``,
  ];
  for (const r of rows) {
    lines.push(
      `- **${r.proposal.proposalId} — ${r.proposal.slug}** [${r.tag}] — ${r.proposal.targetMetric}: ${formatDelta(r.obs)} (baseline ${r.obs.baseline}, result ${r.obs.result})`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

export async function runMonthlyMeasurement(
  deps: MeasurementDeps,
): Promise<MeasurementResult> {
  if (process.env.SELF_IMPROVEMENT_ENGINE_ENABLED === 'false') {
    return { status: 'no-shipped', appended: 0, digestPath: null, ledgerPath: null };
  }

  const now = deps.now ? deps.now() : new Date();
  const contextRoot =
    deps.contextRoot ?? path.resolve(process.cwd(), '../.context');
  const learningsRoot = path.join(contextRoot, 'learnings');
  fs.mkdirSync(learningsRoot, { recursive: true });
  const ledgerPath = path.join(learningsRoot, 'proposals-outcomes.md');

  if (deps.shippedProposals.length === 0) {
    return { status: 'no-shipped', appended: 0, digestPath: null, ledgerPath };
  }

  const rows: Array<{
    proposal: ShippedProposal;
    tag: OutcomeTag;
    obs: MetricObservation;
  }> = [];
  let appended = 0;
  for (const proposal of deps.shippedProposals) {
    const obs = await deps.metricProvider.fetch(proposal, now);
    if (!obs) continue;
    const tag = classifyOutcome(obs);
    appendLedgerRow(ledgerPath, proposal, obs, tag);
    rows.push({ proposal, tag, obs });
    appended += 1;
  }

  const monthLabel = now.toISOString().slice(0, 7);
  const digestPath = path.join(learningsRoot, `digest-${monthLabel}.md`);
  fs.writeFileSync(digestPath, renderDigest(rows, monthLabel));

  return { status: 'ok', appended, digestPath, ledgerPath };
}
