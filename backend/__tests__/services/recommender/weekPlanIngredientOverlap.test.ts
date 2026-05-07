// ROADMAP 4.0 WK9.1 — applyIngredientOverlapBoost test.

import {
  applyIngredientOverlapBoost,
  __INTERNALS,
  type OverlapCandidate,
} from '../../../src/services/recommender/weekPlanIngredientOverlap';

const cand = (
  recipeId: string,
  score: number,
  ingredients: string[],
): OverlapCandidate => ({ recipeId, score, ingredients });

describe('WK9.1 — applyIngredientOverlapBoost', () => {
  it('boosts a candidate that shares ≥ 3 ingredients with planned meals', () => {
    const planned = ['ginger', 'garlic', 'soy sauce', 'rice'];
    const candidates = [
      cand('curry', 0.80, ['ginger', 'garlic', 'soy sauce', 'coconut milk']),
      cand('lasagna', 0.80, ['cheese', 'pasta', 'tomato']),
    ];
    const out = applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: planned,
    });
    const curry = out.find((c) => c.recipeId === 'curry')!;
    const lasagna = out.find((c) => c.recipeId === 'lasagna')!;
    expect(curry.boost).toBeGreaterThan(0);
    expect(lasagna.boost).toBe(0);
    expect(curry.score).toBeGreaterThan(lasagna.score);
  });

  it('does not boost when overlap < MIN_OVERLAP (3)', () => {
    const planned = ['ginger', 'garlic'];
    const candidates = [
      cand('curry', 0.80, ['ginger', 'garlic', 'coconut milk']), // 2 matches — below floor
    ];
    const out = applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: planned,
    });
    expect(out[0].boost).toBe(0);
    expect(out[0].overlapCount).toBe(2);
  });

  it('boost is capped at MAX_OVERLAP_BOOST regardless of overlap count', () => {
    const planned = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const candidates = [cand('many', 0.5, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])];
    const out = applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: planned,
    });
    expect(out[0].boost).toBeLessThanOrEqual(__INTERNALS.MAX_OVERLAP_BOOST);
  });

  it('does not crowd out a high-quality non-overlapping recipe', () => {
    // 0.95-quality with no overlap vs 0.78-quality with maximum overlap.
    // After boost, 0.95 should still be above 0.78 + 0.10 = 0.88.
    const planned = ['ginger', 'garlic', 'soy sauce', 'rice', 'sesame'];
    const candidates = [
      cand('top', 0.95, ['butter', 'sage', 'pasta']),
      cand('overlapper', 0.78, ['ginger', 'garlic', 'soy sauce', 'rice', 'sesame']),
    ];
    const out = applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: planned,
    });
    const sorted = [...out].sort((a, b) => b.score - a.score);
    expect(sorted[0].recipeId).toBe('top');
  });

  it('case-insensitive ingredient match', () => {
    const planned = ['Ginger', 'Garlic', 'SOY SAUCE'];
    const candidates = [cand('curry', 0.5, ['ginger', 'GARLIC', 'soy sauce'])];
    const out = applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: planned,
    });
    expect(out[0].overlapCount).toBe(3);
    expect(out[0].boost).toBeGreaterThan(0);
  });

  it('does not double-count repeated ingredients within a candidate', () => {
    const planned = ['ginger', 'garlic', 'soy sauce'];
    const candidates = [
      cand('curry', 0.5, ['ginger', 'ginger', 'garlic', 'soy sauce', 'soy sauce']),
    ];
    const out = applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: planned,
    });
    expect(out[0].overlapCount).toBe(3);
  });

  it('overlapMatched lists the matched ingredient names', () => {
    const planned = ['ginger', 'garlic', 'soy sauce'];
    const candidates = [cand('curry', 0.5, ['ginger', 'garlic', 'soy sauce', 'coconut milk'])];
    const out = applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: planned,
    });
    expect(out[0].overlapMatched.sort()).toEqual(['garlic', 'ginger', 'soy sauce']);
  });

  it('zero planned ingredients → zero boost on every candidate', () => {
    const candidates = [cand('curry', 0.5, ['ginger', 'garlic', 'soy sauce'])];
    const out = applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: [],
    });
    expect(out[0].boost).toBe(0);
  });

  it('does not mutate inputs', () => {
    const planned = ['ginger', 'garlic', 'soy sauce'];
    const candidates = [cand('curry', 0.5, ['ginger', 'garlic', 'soy sauce'])];
    const beforeP = JSON.stringify(planned);
    const beforeC = JSON.stringify(candidates);
    applyIngredientOverlapBoost({
      candidates,
      alreadyPlannedIngredients: planned,
    });
    expect(JSON.stringify(planned)).toBe(beforeP);
    expect(JSON.stringify(candidates)).toBe(beforeC);
  });

  it('publishes constants for cap-test inspection', () => {
    expect(__INTERNALS.MIN_OVERLAP).toBe(3);
    expect(__INTERNALS.PER_OVERLAP_BOOST).toBe(0.03);
    expect(__INTERNALS.MAX_OVERLAP_BOOST).toBe(0.10);
  });
});
