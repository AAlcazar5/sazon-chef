// backend/scripts/selfImprovement/runMeasurement.ts
// Tier M5 — monthly measurement cron entry. Reads accepted decisions from
// the last 30 days, fetches each proposal's target metric, appends to the
// outcomes ledger and writes a monthly digest. The metric provider here is
// a placeholder; it will be replaced with a PostHog/RevenueCat adapter once
// those SDKs land in the backend (post-launch infra work).

import fs from 'fs';
import path from 'path';
import { logger } from '../../src/utils/logger';
import {
  MetricProvider,
  ShippedProposal,
  runMonthlyMeasurement,
} from '../../src/services/selfImprovement/measurementService';

const CONTEXT_ROOT = path.resolve(__dirname, '../../../.context');

function loadShippedProposals(now: Date): ShippedProposal[] {
  const acceptedDir = path.join(CONTEXT_ROOT, 'decisions', 'accepted');
  if (!fs.existsSync(acceptedDir)) return [];
  const cutoff = now.getTime() - 30 * 86_400_000;
  const out: ShippedProposal[] = [];
  for (const file of fs.readdirSync(acceptedDir)) {
    if (!file.endsWith('.md')) continue;
    const fp = path.join(acceptedDir, file);
    const stat = fs.statSync(fp);
    if (stat.mtimeMs < cutoff) continue;
    const body = fs.readFileSync(fp, 'utf-8');
    const id = body.match(/proposal_id:\s*([\w-]+)/)?.[1];
    const slug = body.match(/slug:\s*([\w-]+)/)?.[1];
    const targetMatch = body.match(/target metric `([^`]+)`/i);
    if (!id || !slug || !targetMatch) continue;
    out.push({
      proposalId: id,
      slug,
      sourceFeed: body.match(/Source:\*\*\s*observations\/([\w-]+)/)?.[1] ?? 'manual',
      targetMetric: targetMatch[1],
      shippedAt: stat.birthtime,
    });
  }
  return out;
}

// PLACEHOLDER provider — returns null until PostHog/RevenueCat adapter ships.
const placeholderProvider: MetricProvider = {
  async fetch() {
    return null;
  },
};

async function main(): Promise<void> {
  const now = new Date();
  const result = await runMonthlyMeasurement({
    metricProvider: placeholderProvider,
    shippedProposals: loadShippedProposals(now),
    contextRoot: CONTEXT_ROOT,
    now: () => now,
  });
  logger.info({ result }, 'selfImprovement.measurement.complete');
}

main().catch((err) => {
  logger.error({ err }, 'selfImprovement.measurement.fatal');
  process.exit(1);
});
