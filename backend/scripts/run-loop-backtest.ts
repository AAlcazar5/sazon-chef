// backend/scripts/run-loop-backtest.ts
//
// W-A4 runner — `npm run loop:backtest`. Prints the per-persona table +
// the pass/fail verdict against the PRE-REGISTERED thresholds. This is
// Phase-1 (mechanism only — never human value; see
// plans/office-hours/loop-value-measurement.md). A FAIL routes to the S
// fallback per that doc's decision table; it does NOT silently proceed.

import * as fs from 'fs';
import * as path from 'path';
import {
  synthesizePersonas,
  runBacktest,
  type BacktestThresholds,
} from './loopBacktest';

const fixturePath = path.resolve(
  __dirname,
  '../__tests__/fixtures/loopBacktestThresholds.json',
);
const f = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const thresholds: BacktestThresholds = {
  topN: f.topN,
  trainCooks: f.trainCooks,
  minPersonaPassRate: f.minPersonaPassRate,
  minMeanLift: f.minMeanLift,
};

const result = runBacktest(synthesizePersonas(), thresholds);

console.log('▶ W-A4 loop-value backtest (Phase 1 — mechanism only)');
console.log(
  `  thresholds: topN=${thresholds.topN} trainCooks=${thresholds.trainCooks} ` +
    `minPassRate=${thresholds.minPersonaPassRate} minMeanLift=${thresholds.minMeanLift}`,
);
console.log('  persona            onHit  offHit   lift  pass');
for (const p of result.perPersona) {
  console.log(
    `  ${p.id.padEnd(16)} ${p.onHitRate.toFixed(2)}   ${p.offHitRate.toFixed(2)}   ` +
      `${p.lift.toFixed(2)}  ${p.pass ? '✓' : '✗'}`,
  );
}
console.log(
  `  passRate=${result.passRate.toFixed(2)} meanLift=${result.meanLift.toFixed(3)}`,
);
console.log(`\n${result.verdict.pass ? '✅' : '❌'} ${result.verdict.reason}`);
console.log(
  '\nReminder: Phase 1 proves the mechanism only. R full-scale needs Phase 2 ' +
    '(beta A/B). A FAIL here → S fallback, not W-D.',
);

process.exit(result.verdict.pass ? 0 : 1);
