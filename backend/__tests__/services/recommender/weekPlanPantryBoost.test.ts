// ROADMAP 4.0 WK1.1 + WK1.2 — pantry boost + use-it-up pinning test.

import {
  applyWeekPlanBoosts,
  pickUseItUpCandidate,
  sortByScoreDesc,
  __INTERNALS,
} from '../../../src/services/recommender/weekPlanPantryBoost';

const candidate = (
  recipeId: string,
  score: number,
  ingredientTexts: string[],
) => ({ recipeId, score, ingredientTexts });

describe('WK1.1 — applyWeekPlanBoosts (pantry coverage)', () => {
  it('zero boost when pantry + expiring are empty', () => {
    const out = applyWeekPlanBoosts({
      candidates: [candidate('r1', 0.5, ['rice', 'tofu'])],
      pantryNames: [],
      expiringNames: [],
    });
    expect(out[0].boost).toBe(0);
    expect(out[0].pantryMatched).toBe(0);
    expect(out[0].score).toBe(0.5);
  });

  it('boosts a candidate that matches pantry items', () => {
    const out = applyWeekPlanBoosts({
      candidates: [candidate('r1', 0.5, ['rice', 'tofu', 'sesame oil'])],
      pantryNames: ['rice', 'tofu'],
      expiringNames: [],
    });
    expect(out[0].pantryMatched).toBe(2);
    expect(out[0].boost).toBeGreaterThan(0);
    expect(out[0].score).toBeGreaterThan(0.5);
  });

  it('case-insensitive substring match', () => {
    const out = applyWeekPlanBoosts({
      candidates: [candidate('r1', 0.5, ['Rice (medium grain)', 'TOFU CUBES'])],
      pantryNames: ['rice', 'tofu'],
      expiringNames: [],
    });
    expect(out[0].pantryMatched).toBe(2);
  });

  it('caps pantry boost at MAX_PANTRY_BOOST', () => {
    const out = applyWeekPlanBoosts({
      candidates: [
        candidate('r1', 0.5, ['rice', 'tofu', 'soy', 'sesame', 'ginger', 'garlic', 'lime', 'cilantro']),
      ],
      pantryNames: ['rice', 'tofu', 'soy', 'sesame', 'ginger', 'garlic', 'lime', 'cilantro'],
      expiringNames: [],
    });
    expect(out[0].pantryMatched).toBe(8);
    // 8 × 0.04 = 0.32; cap is 0.16
    expect(out[0].boost).toBe(__INTERNALS.MAX_PANTRY_BOOST);
  });

  it('does not mutate the original candidate array', () => {
    const original = [candidate('r1', 0.5, ['rice'])];
    const snapshot = JSON.parse(JSON.stringify(original));
    applyWeekPlanBoosts({
      candidates: original,
      pantryNames: ['rice'],
      expiringNames: [],
    });
    expect(original).toEqual(snapshot);
  });

  it('reranks: pantry-heavy recipe beats slightly-higher recipe with no overlap', () => {
    const out = applyWeekPlanBoosts({
      candidates: [
        candidate('r1', 0.55, ['pasta', 'tomato', 'parmesan']), // no pantry match
        candidate('r2', 0.50, ['rice', 'tofu', 'soy', 'sesame']), // 4 pantry matches
      ],
      pantryNames: ['rice', 'tofu', 'soy', 'sesame'],
      expiringNames: [],
    });
    const sorted = sortByScoreDesc(out);
    expect(sorted[0].recipeId).toBe('r2'); // 0.50 + 0.16 = 0.66 > 0.55
  });

  it('high-quality recipe with 0 pantry coverage still beats low-quality recipe with full coverage (bounded)', () => {
    const out = applyWeekPlanBoosts({
      candidates: [
        candidate('r1', 0.95, ['pasta', 'tomato']),
        candidate('r2', 0.55, ['rice', 'tofu', 'soy', 'sesame']),
      ],
      pantryNames: ['rice', 'tofu', 'soy', 'sesame'],
      expiringNames: [],
    });
    const sorted = sortByScoreDesc(out);
    expect(sorted[0].recipeId).toBe('r1');
  });
});

describe('WK1.2 — applyWeekPlanBoosts (expiring overlay)', () => {
  it('expiring boost stacks on top of pantry boost', () => {
    const out = applyWeekPlanBoosts({
      candidates: [candidate('r1', 0.5, ['rice', 'cilantro'])],
      pantryNames: ['rice', 'cilantro'],
      expiringNames: ['cilantro'],
    });
    expect(out[0].pantryMatched).toBe(2);
    expect(out[0].expiringMatched).toBe(1);
    expect(out[0].useItUpHint).toEqual(['cilantro']);
    // Pantry: 2 × 0.04 = 0.08; Expiring: 1 × 0.10 = 0.10; total: 0.18
    expect(out[0].boost).toBeCloseTo(0.18, 3);
  });

  it('caps expiring boost at MAX_EXPIRING_BOOST', () => {
    const out = applyWeekPlanBoosts({
      candidates: [
        candidate('r1', 0.5, ['cilantro', 'lime', 'avocado', 'tomato', 'spinach']),
      ],
      pantryNames: [],
      expiringNames: ['cilantro', 'lime', 'avocado', 'tomato', 'spinach'],
    });
    // 5 × 0.10 = 0.50; cap at 0.30
    expect(out[0].boost).toBe(__INTERNALS.MAX_EXPIRING_BOOST);
  });
});

describe('WK1.2 — pickUseItUpCandidate', () => {
  it('returns null when no expiring items', () => {
    const out = pickUseItUpCandidate({
      candidates: [candidate('r1', 0.5, ['rice'])],
      pantryNames: ['rice'],
      expiringNames: [],
    });
    expect(out).toBeNull();
  });

  it('returns null when no candidate matches an expiring item', () => {
    const out = pickUseItUpCandidate({
      candidates: [
        candidate('r1', 0.7, ['pasta', 'tomato']),
        candidate('r2', 0.5, ['rice', 'tofu']),
      ],
      pantryNames: ['rice', 'tofu'],
      expiringNames: ['cilantro'],
    });
    expect(out).toBeNull();
  });

  it('returns the highest-scoring candidate that uses an expiring item', () => {
    const out = pickUseItUpCandidate({
      candidates: [
        candidate('r1', 0.55, ['pasta', 'tomato']), // no expiring
        candidate('r2', 0.50, ['cilantro', 'lime', 'rice']), // 2 expiring matches
        candidate('r3', 0.40, ['cilantro']), // 1 expiring match
      ],
      pantryNames: ['rice'],
      expiringNames: ['cilantro', 'lime'],
    });
    expect(out).not.toBeNull();
    expect(out!.recipeId).toBe('r2');
    expect(out!.useItUpHint).toEqual(['cilantro', 'lime']);
  });

  it('useItUpHint lists exactly the matched expiring names (case-preserved)', () => {
    const out = pickUseItUpCandidate({
      candidates: [candidate('r1', 0.5, ['fresh CILANTRO leaves'])],
      pantryNames: [],
      expiringNames: ['cilantro'],
    });
    expect(out!.useItUpHint).toEqual(['cilantro']);
  });
});

describe('WK1 — internals', () => {
  it('publishes per-match + cap constants', () => {
    expect(__INTERNALS.PER_PANTRY_MATCH_BOOST).toBe(0.04);
    expect(__INTERNALS.MAX_PANTRY_BOOST).toBe(0.16);
    expect(__INTERNALS.PER_EXPIRING_MATCH_BOOST).toBe(0.10);
    expect(__INTERNALS.MAX_EXPIRING_BOOST).toBe(0.30);
  });
  it('expiring boost > pantry boost (per-match) — expiring is the more urgent signal', () => {
    expect(__INTERNALS.PER_EXPIRING_MATCH_BOOST).toBeGreaterThan(
      __INTERNALS.PER_PANTRY_MATCH_BOOST,
    );
  });
});
