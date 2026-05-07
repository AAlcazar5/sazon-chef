// ROADMAP 4.0 WK6.1 — nutrientGapPlanner test.

import {
  identifyNutrientGaps,
  applyNutrientGapBoost,
  __INTERNALS,
  type CandidateForGap,
  type NutrientRollupEntry,
} from '../../../src/services/recommender/nutrientGapPlanner';

const cand = (
  recipeId: string,
  score: number,
  density: Record<string, number>,
): CandidateForGap => ({ recipeId, score, microDensity: density });

describe('WK6.1 — identifyNutrientGaps', () => {
  it('returns the bottom-K micros sorted by percent-of-DV ascending', () => {
    const rollup: NutrientRollupEntry[] = [
      { micro: 'iron', percentOfDV: 0.85 },
      { micro: 'magnesium', percentOfDV: 0.42 },
      { micro: 'omega-3', percentOfDV: 0.38 },
      { micro: 'fiber', percentOfDV: 0.95 },
    ];
    expect(identifyNutrientGaps({ rollup })).toEqual(['omega-3', 'magnesium']);
  });

  it('honors count override', () => {
    const rollup: NutrientRollupEntry[] = [
      { micro: 'iron', percentOfDV: 0.85 },
      { micro: 'magnesium', percentOfDV: 0.42 },
      { micro: 'omega-3', percentOfDV: 0.38 },
      { micro: 'fiber', percentOfDV: 0.95 },
    ];
    expect(identifyNutrientGaps({ rollup, count: 3 })).toEqual([
      'omega-3',
      'magnesium',
      'iron',
    ]);
  });

  it('excludes micros at or above DV', () => {
    const rollup: NutrientRollupEntry[] = [
      { micro: 'iron', percentOfDV: 1.1 },
      { micro: 'fiber', percentOfDV: 1.0 },
      { micro: 'magnesium', percentOfDV: 0.42 },
    ];
    expect(identifyNutrientGaps({ rollup })).toEqual(['magnesium']);
  });

  it('returns [] on empty rollup', () => {
    expect(identifyNutrientGaps({ rollup: [] })).toEqual([]);
  });
});

describe('WK6.1 — applyNutrientGapBoost', () => {
  it('boosts top-quartile candidates for each gap micro', () => {
    // 8 candidates with varying magnesium density. Top quartile = top 2.
    const candidates: CandidateForGap[] = [
      cand('r1', 0.80, { magnesium: 0.10 }),
      cand('r2', 0.78, { magnesium: 0.15 }),
      cand('r3', 0.76, { magnesium: 0.20 }),
      cand('r4', 0.74, { magnesium: 0.25 }),
      cand('r5', 0.72, { magnesium: 0.30 }),
      cand('r6', 0.70, { magnesium: 0.40 }),
      cand('r7', 0.68, { magnesium: 0.50 }), // top
      cand('r8', 0.66, { magnesium: 0.60 }), // top
    ];
    const out = applyNutrientGapBoost({
      candidates,
      gapMicros: ['magnesium'],
    });
    const boosted = out.filter((c) => c.boost > 0);
    expect(boosted.map((c) => c.recipeId).sort()).toEqual(['r7', 'r8']);
  });

  it('does not block a great recipe (cap-bounded soft signal)', () => {
    // r1 has the best base score but low magnesium density;
    // r2 has lower base score but high magnesium. After boost, r1 should
    // STILL be ahead (gap is < base-score gap).
    const candidates: CandidateForGap[] = [
      cand('r1', 0.95, { magnesium: 0.05 }),
      cand('r2', 0.80, { magnesium: 0.50 }),
      cand('r3', 0.75, { magnesium: 0.40 }),
      cand('r4', 0.70, { magnesium: 0.30 }),
    ];
    const out = applyNutrientGapBoost({
      candidates,
      gapMicros: ['magnesium'],
    });
    const sorted = [...out].sort((a, b) => b.score - a.score);
    expect(sorted[0].recipeId).toBe('r1');
  });

  it('boost is capped at MAX_GAP_BOOST regardless of how many gaps a recipe addresses', () => {
    const candidates: CandidateForGap[] = [
      cand('r1', 0.5, { magnesium: 1.0, 'omega-3': 1.0, iron: 1.0, calcium: 1.0 }),
      cand('r2', 0.5, { magnesium: 0, 'omega-3': 0, iron: 0, calcium: 0 }),
    ];
    const out = applyNutrientGapBoost({
      candidates,
      gapMicros: ['magnesium', 'omega-3', 'iron', 'calcium'], // 4 gaps
    });
    const r1 = out.find((c) => c.recipeId === 'r1')!;
    expect(r1.boost).toBeLessThanOrEqual(__INTERNALS.MAX_GAP_BOOST);
  });

  it('PER_GAP_BOOST applied per addressed gap (linear up to cap)', () => {
    // r1 hits 1 gap → boost = PER_GAP_BOOST = 0.05
    const candidates: CandidateForGap[] = [
      cand('r1', 0.5, { magnesium: 1.0, 'omega-3': 0 }),
      cand('r2', 0.5, { magnesium: 0, 'omega-3': 0 }),
    ];
    const out = applyNutrientGapBoost({
      candidates,
      gapMicros: ['magnesium'],
    });
    const r1 = out.find((c) => c.recipeId === 'r1')!;
    expect(r1.boost).toBeCloseTo(__INTERNALS.PER_GAP_BOOST, 5);
  });

  it('addressesGaps lists the matched micro names for UI rendering', () => {
    const candidates: CandidateForGap[] = [
      cand('r1', 0.5, { magnesium: 1.0, 'omega-3': 1.0 }),
      cand('r2', 0.5, { magnesium: 0.1, 'omega-3': 0.1 }),
    ];
    const out = applyNutrientGapBoost({
      candidates,
      gapMicros: ['magnesium', 'omega-3'],
    });
    const r1 = out.find((c) => c.recipeId === 'r1')!;
    expect(r1.addressesGaps).toEqual(expect.arrayContaining(['magnesium', 'omega-3']));
  });

  it('zero gap micros → zero boost on every candidate', () => {
    const candidates: CandidateForGap[] = [
      cand('r1', 0.5, { magnesium: 1.0 }),
    ];
    const out = applyNutrientGapBoost({
      candidates,
      gapMicros: [],
    });
    expect(out[0].boost).toBe(0);
    expect(out[0].score).toBe(0.5);
  });

  it('candidates with zero density for a micro are not in that micro\'s top quartile', () => {
    const candidates: CandidateForGap[] = [
      cand('r1', 0.5, { magnesium: 0 }),
      cand('r2', 0.5, { magnesium: 0 }),
      cand('r3', 0.5, { magnesium: 0 }),
      cand('r4', 0.5, { magnesium: 0.5 }),
    ];
    const out = applyNutrientGapBoost({
      candidates,
      gapMicros: ['magnesium'],
    });
    const r4 = out.find((c) => c.recipeId === 'r4')!;
    expect(r4.boost).toBeGreaterThan(0);
    const others = out.filter((c) => c.recipeId !== 'r4');
    for (const o of others) expect(o.boost).toBe(0);
  });

  it('does not mutate input candidates', () => {
    const candidates: CandidateForGap[] = [
      cand('r1', 0.5, { magnesium: 1.0 }),
    ];
    const before = JSON.stringify(candidates);
    applyNutrientGapBoost({
      candidates,
      gapMicros: ['magnesium'],
    });
    expect(JSON.stringify(candidates)).toBe(before);
  });

  it('publishes constants for cap-test inspection', () => {
    expect(__INTERNALS.PER_GAP_BOOST).toBe(0.05);
    expect(__INTERNALS.MAX_GAP_BOOST).toBe(0.12);
    expect(__INTERNALS.DEFAULT_GAP_COUNT).toBe(2);
    expect(__INTERNALS.TOP_QUARTILE_FRACTION).toBe(0.25);
  });
});
