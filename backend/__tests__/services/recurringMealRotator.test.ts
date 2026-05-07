// ROADMAP 4.0 WK10.1 — recurringMealRotator test.

import {
  pickRecurringRotation,
  simulateRecurringRotation,
  type RotationCandidate,
} from '../../src/services/recommender/recurringMealRotator';

const cand = (
  recipeId: string,
  cuisine: string,
  score = 0.8,
  lastUsedDate: string | null = null,
): RotationCandidate => ({ recipeId, cuisine, score, lastUsedDate });

describe('WK10.1 — pickRecurringRotation', () => {
  it("'fixed' strategy always returns the supplied fixedRecipeId", () => {
    const result = pickRecurringRotation({
      strategy: 'fixed',
      fixedRecipeId: 'recipe-A',
      candidates: [],
    });
    expect(result.recipeId).toBe('recipe-A');
    expect(result.reason).toBe('fixed');
  });

  it("'fixed' returns null when fixedRecipeId is omitted", () => {
    const result = pickRecurringRotation({
      strategy: 'fixed',
      candidates: [],
    });
    expect(result.recipeId).toBeNull();
  });

  it("'cuisine_variants' picks unused candidate first", () => {
    const result = pickRecurringRotation({
      strategy: 'cuisine_variants',
      candidates: [
        cand('detroit', 'pizza', 0.85, '2026-01-01'),
        cand('neapolitan', 'pizza', 0.80, null),
      ],
    });
    expect(result.recipeId).toBe('neapolitan');
    expect(result.reason).toBe('unused-candidate');
  });

  it("'cuisine_variants' picks least-recently-used when all candidates have been used", () => {
    const result = pickRecurringRotation({
      strategy: 'cuisine_variants',
      candidates: [
        cand('detroit', 'pizza', 0.85, '2026-04-01'),
        cand('neapolitan', 'pizza', 0.80, '2026-03-01'), // oldest
        cand('sicilian', 'pizza', 0.78, '2026-04-15'),
      ],
    });
    expect(result.recipeId).toBe('neapolitan');
    expect(result.reason).toBe('least-recently-used');
  });

  it('returns no-candidates when the candidate set is empty', () => {
    const result = pickRecurringRotation({
      strategy: 'cuisine_variants',
      candidates: [],
    });
    expect(result.recipeId).toBeNull();
    expect(result.reason).toBe('no-candidates');
  });

  it('breaks ties on lastUsedDate via score-desc', () => {
    const result = pickRecurringRotation({
      strategy: 'cuisine_variants',
      candidates: [
        cand('a', 'pizza', 0.7, '2026-03-01'),
        cand('b', 'pizza', 0.9, '2026-03-01'), // same date, higher score
      ],
    });
    expect(result.recipeId).toBe('b');
  });

  it('breaks ties on unused candidates via score-desc', () => {
    const result = pickRecurringRotation({
      strategy: 'cuisine_variants',
      candidates: [
        cand('a', 'pizza', 0.7, null),
        cand('b', 'pizza', 0.9, null),
      ],
    });
    expect(result.recipeId).toBe('b');
  });
});

describe("WK10.1 — simulateRecurringRotation ('cuisine_variants')", () => {
  it('four consecutive applications produce four DIFFERENT pizza variants', () => {
    const candidates: RotationCandidate[] = [
      cand('detroit', 'pizza', 0.9),
      cand('neapolitan', 'pizza', 0.85),
      cand('sicilian', 'pizza', 0.80),
      cand('ny-style', 'pizza', 0.75),
    ];
    const out = simulateRecurringRotation({
      strategy: 'cuisine_variants',
      candidates,
      iterations: 4,
      dateSequence: ['2026-05-01', '2026-05-08', '2026-05-15', '2026-05-22'],
    });
    expect(out).toHaveLength(4);
    expect(new Set(out).size).toBe(4); // all distinct
  });

  it('cycles back through the set in LRU order on iteration 5', () => {
    const candidates: RotationCandidate[] = [
      cand('detroit', 'pizza', 0.9),
      cand('neapolitan', 'pizza', 0.85),
      cand('sicilian', 'pizza', 0.80),
    ];
    const out = simulateRecurringRotation({
      strategy: 'cuisine_variants',
      candidates,
      iterations: 5,
      dateSequence: ['2026-05-01', '2026-05-08', '2026-05-15', '2026-05-22', '2026-05-29'],
    });
    // First 3 iterations consume each candidate once. Iteration 4 picks the
    // one used on 2026-05-01 (the oldest); iteration 5 picks the one used
    // on 2026-05-08.
    expect(out[3]).toBe(out[0]);
    expect(out[4]).toBe(out[1]);
  });
});

describe("WK10.1 — simulateRecurringRotation ('cluster')", () => {
  it("four applications with cluster strategy visit ≥ 3 distinct canonical cuisines within the cluster", () => {
    // Caller pre-filtered the candidate set to one cluster (Mediterranean).
    const candidates: RotationCandidate[] = [
      cand('pizza-marg', 'italian', 0.9),
      cand('fattoush', 'lebanese', 0.85),
      cand('orzo-bowl', 'greek', 0.8),
      cand('tagine', 'moroccan', 0.78),
    ];
    const out = simulateRecurringRotation({
      strategy: 'cluster',
      candidates,
      iterations: 4,
      dateSequence: ['2026-05-01', '2026-05-08', '2026-05-15', '2026-05-22'],
    });
    expect(out).toHaveLength(4);
    // Look up each picked recipe's cuisine.
    const cuisinesPicked = out.map(
      (id) => candidates.find((c) => c.recipeId === id)!.cuisine,
    );
    expect(new Set(cuisinesPicked).size).toBeGreaterThanOrEqual(3);
  });
});

describe("WK10.1 — 'fixed' simulation always returns the same recipeId", () => {
  it('simulation with fixed strategy yields N copies of the fixedRecipeId', () => {
    const out = simulateRecurringRotation({
      strategy: 'fixed',
      fixedRecipeId: 'always-same',
      candidates: [],
      iterations: 4,
      dateSequence: ['2026-05-01', '2026-05-08', '2026-05-15', '2026-05-22'],
    });
    expect(out).toEqual([
      'always-same',
      'always-same',
      'always-same',
      'always-same',
    ]);
  });
});
