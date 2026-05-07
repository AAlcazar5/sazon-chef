// ROADMAP 4.0 IG4.2 — useItUpBoost test.

import {
  applyUseItUpBoost,
  sortByScoreDesc,
  __BOOST_CONSTANTS,
} from '../../../src/services/recommender/useItUpBoost';

const candidate = (
  recipeId: string,
  score: number,
  ingredientTexts: string[],
) => ({ recipeId, score, ingredientTexts });

describe('IG4.2 — applyUseItUpBoost', () => {
  it('returns zero-boost candidates when expiring list is empty', () => {
    const out = applyUseItUpBoost({
      candidates: [
        candidate('r1', 0.5, ['rice', 'tofu']),
        candidate('r2', 0.4, ['pasta']),
      ],
      expiringIngredients: [],
    });
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.boost === 0)).toBe(true);
    expect(out.every((c) => c.matchedCount === 0)).toBe(true);
    // Scores unchanged
    expect(out[0].score).toBe(0.5);
  });

  it('returns empty list when candidates are empty', () => {
    expect(
      applyUseItUpBoost({
        candidates: [],
        expiringIngredients: ['cilantro', 'lime'],
      }),
    ).toEqual([]);
  });

  it('boosts a candidate that contains an expiring ingredient', () => {
    const out = applyUseItUpBoost({
      candidates: [candidate('r1', 0.5, ['cilantro', 'lime', 'rice'])],
      expiringIngredients: ['cilantro'],
    });
    expect(out[0].boost).toBeGreaterThan(0);
    expect(out[0].matchedCount).toBe(1);
    expect(out[0].score).toBeGreaterThan(0.5);
  });

  it('case-insensitive substring match', () => {
    const out = applyUseItUpBoost({
      candidates: [candidate('r1', 0.5, ['Fresh Cilantro Leaves'])],
      expiringIngredients: ['cilantro'],
    });
    expect(out[0].matchedCount).toBe(1);
  });

  it('multiple matched ingredients accumulate up to MAX_BOOST_WEIGHT', () => {
    const out = applyUseItUpBoost({
      candidates: [
        candidate('r1', 0.5, ['cilantro', 'lime', 'avocado', 'tomato']),
      ],
      expiringIngredients: ['cilantro', 'lime', 'avocado', 'tomato', 'onion'],
      perMatchBoost: 0.06,
      maxBoostWeight: 0.18,
    });
    expect(out[0].matchedCount).toBe(4);
    expect(out[0].boost).toBe(0.18); // capped (4 × 0.06 = 0.24, capped at 0.18)
  });

  it('the original candidate array is not mutated', () => {
    const candidates = [candidate('r1', 0.5, ['cilantro'])];
    const original = JSON.parse(JSON.stringify(candidates));
    applyUseItUpBoost({
      candidates,
      expiringIngredients: ['cilantro'],
    });
    expect(candidates).toEqual(original);
  });

  it('reranking moves a low-quality recipe with expiring matches above a slightly-higher recipe without', () => {
    const out = applyUseItUpBoost({
      candidates: [
        candidate('r1', 0.55, ['pasta', 'tomato']),
        candidate('r2', 0.5, ['cilantro', 'lime', 'rice']),
      ],
      expiringIngredients: ['cilantro', 'lime'],
    });
    const sorted = sortByScoreDesc(out);
    // r2 had 0.5 + 2*0.06 = 0.62; r1 stayed at 0.55
    expect(sorted[0].recipeId).toBe('r2');
    expect(sorted[1].recipeId).toBe('r1');
  });

  it('high-quality recipe without expiring items still beats low-quality with', () => {
    const out = applyUseItUpBoost({
      candidates: [
        candidate('r1', 0.95, ['pasta', 'tomato', 'parmesan']),
        candidate('r2', 0.5, ['cilantro', 'lime', 'rice']),
      ],
      expiringIngredients: ['cilantro', 'lime'],
    });
    const sorted = sortByScoreDesc(out);
    expect(sorted[0].recipeId).toBe('r1');
  });

  it('boosts independently for each candidate', () => {
    const out = applyUseItUpBoost({
      candidates: [
        candidate('r1', 0.5, ['cilantro']),
        candidate('r2', 0.5, []),
      ],
      expiringIngredients: ['cilantro'],
    });
    expect(out[0].boost).toBeGreaterThan(0);
    expect(out[1].boost).toBe(0);
  });

  it('honors caller-supplied perMatchBoost / maxBoostWeight overrides', () => {
    const out = applyUseItUpBoost({
      candidates: [candidate('r1', 0.5, ['cilantro', 'lime'])],
      expiringIngredients: ['cilantro', 'lime'],
      perMatchBoost: 0.1,
      maxBoostWeight: 1.0,
    });
    expect(out[0].boost).toBeCloseTo(0.2, 5); // 2 × 0.1 = 0.2 (under cap)
  });
});

describe('IG4.2 — magnitude constants', () => {
  it('publishes default per-match boost + cap', () => {
    expect(__BOOST_CONSTANTS.PER_MATCH_BOOST).toBe(0.06);
    expect(__BOOST_CONSTANTS.MAX_BOOST_WEIGHT).toBe(0.18);
  });

  it('cap is at most ~3 matches worth of boost (so ≤4 expiring ingredients sets the ceiling)', () => {
    const ratio =
      __BOOST_CONSTANTS.MAX_BOOST_WEIGHT / __BOOST_CONSTANTS.PER_MATCH_BOOST;
    expect(ratio).toBeGreaterThanOrEqual(2);
    expect(ratio).toBeLessThanOrEqual(5);
  });
});

describe('IG4.2 — sortByScoreDesc', () => {
  it('returns a new array sorted by score desc', () => {
    const input = [
      { recipeId: 'a', score: 0.3 },
      { recipeId: 'b', score: 0.7 },
      { recipeId: 'c', score: 0.5 },
    ];
    const out = sortByScoreDesc(input);
    expect(out.map((c) => c.recipeId)).toEqual(['b', 'c', 'a']);
    // Original not mutated
    expect(input.map((c) => c.recipeId)).toEqual(['a', 'b', 'c']);
  });
});
