// W-A4 — Phase-1 backtest harness tests. Proves: (a) deterministic,
// (b) the loop MECHANISM works directionally (ON surfaces held-out cooks the
// no-personalization baseline buries), (c) the control is honest (no train
// signal ⇒ no lift), (d) the verdict is driven by the PRE-REGISTERED
// threshold fixture, not hardcoded, (e) the harness is faithful to the real
// deltaForEvent (ties to slotAffinity.deltaCharacterization.test.ts).

import {
  synthesizePersonas,
  runBacktest,
  replayAffinity,
  rankTopN,
  backtestPersona,
  type BacktestThresholds,
} from '../../scripts/loopBacktest';
import fixture from '../fixtures/loopBacktestThresholds.json';

const THR: BacktestThresholds = {
  topN: fixture.topN,
  trainCooks: fixture.trainCooks,
  minPersonaPassRate: fixture.minPersonaPassRate,
  minMeanLift: fixture.minMeanLift,
};

describe('loop backtest — determinism', () => {
  it('same input → byte-identical result', () => {
    const a = runBacktest(synthesizePersonas(), THR);
    const b = runBacktest(synthesizePersonas(), THR);
    expect(a).toEqual(b);
  });
});

describe('loop backtest — mechanism works (clears pre-registered threshold)', () => {
  it('ON surfaces held-out cooks the no-learning baseline buries', () => {
    const r = runBacktest(synthesizePersonas(), THR);
    expect(r.passRate).toBeGreaterThanOrEqual(THR.minPersonaPassRate);
    expect(r.meanLift).toBeGreaterThanOrEqual(THR.minMeanLift);
    expect(r.verdict.pass).toBe(true);
    // Every synthetic persona should win — the loop is the only thing that
    // can re-surface preferred components out of the distractor sea.
    for (const p of r.perPersona) {
      expect(p.offHitRate).toBe(0); // baseline buries preferred
      expect(p.onHitRate).toBeGreaterThan(0); // loop recovers it
      expect(p.pass).toBe(true);
    }
  });
});

describe('loop backtest — honest control (no signal ⇒ no lift)', () => {
  it('with zero train cooks, ON cannot beat OFF and the verdict FAILS', () => {
    const r = runBacktest(synthesizePersonas(), { ...THR, trainCooks: 0 });
    expect(r.meanLift).toBe(0);
    expect(r.passRate).toBe(0);
    expect(r.verdict.pass).toBe(false);
    expect(r.verdict.reason).toMatch(/S fallback/);
  });
});

describe('loop backtest — verdict is threshold-driven, not hardcoded', () => {
  it('an unreachable minMeanLift flips the same data to FAIL', () => {
    const r = runBacktest(synthesizePersonas(), { ...THR, minMeanLift: 1.01 });
    expect(r.verdict.pass).toBe(false);
  });
  it('thresholds come from the pre-registered fixture', () => {
    expect(fixture.minPersonaPassRate).toBe(0.7);
    expect(fixture.minMeanLift).toBe(0.1);
    expect(typeof fixture._comment).toBe('string'); // the no-goalpost-moving note
  });
});

describe('loop backtest — faithful to production delta math', () => {
  it('replayAffinity moves a cooked component by exactly the real plate_cooked delta (0.2)', () => {
    const table = replayAffinity('u', [['c'], ['c'], ['c']]);
    const acc = table.get('c')!;
    // 0.2+0.2+0.2 === 0.6000000000000001 in IEEE754 — production's
    // slotAffinity accumulates the same way; faithful, not a bug.
    expect(acc.score).toBeCloseTo(0.6, 10);
    expect(acc.sampleCount).toBe(3);
  });
  it('rankTopN honors the sampleCount>=3 floor + score-desc + top-N', () => {
    const t = new Map([
      ['hi', { score: 0.8, sampleCount: 5 }],
      ['mid', { score: 0.4, sampleCount: 9 }],
      ['thin', { score: 9, sampleCount: 2 }], // below floor → excluded
    ]);
    expect(rankTopN(t, 10)).toEqual(['hi', 'mid']);
    expect(rankTopN(t, 1)).toEqual(['hi']);
  });
  it('backtestPersona is leave-one-out (train k, hold out the rest)', () => {
    const [p] = synthesizePersonas(1);
    const res = backtestPersona(p, THR);
    expect(res.id).toBe('persona_0');
    expect(res.lift).toBeGreaterThan(0);
  });
});
