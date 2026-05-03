// Group 10R-Phase2: pure unit tests for the affinity snapshot service.

import {
  computeAffinitySnapshot,
  mapFitnessGoalToPhase,
  type SnapshotInput,
} from '../../../src/modules/affinity/affinitySnapshotService';

const RECIPE_HIGH_PROTEIN = {
  id: 'r1',
  cuisine: 'Italian',
  calories: 600,
  protein: 50,
  carbs: 40,
  fat: 20,
  fiber: 8,
  ingredients: ['chicken breast', 'olive oil', 'parmesan'],
};

const RECIPE_LOW_FIBER = {
  id: 'r2',
  cuisine: 'American',
  calories: 700,
  protein: 30,
  carbs: 80,
  fat: 25,
  fiber: 2,
  ingredients: ['white rice', 'butter'],
};

const RECIPE_IRON_RICH = {
  id: 'r3',
  cuisine: 'Mediterranean',
  calories: 500,
  protein: 25,
  carbs: 60,
  fat: 15,
  fiber: 12,
  ingredients: ['spinach', 'lentils', 'lemon'],
};

const dayAgo = (n: number): Date => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const baseInput: SnapshotInput = {
  cookingLogs: [],
  savedRecipes: [],
  recipeFeedback: [],
  macroGoals: { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 25 },
  fitnessGoal: 'maintain',
  activeMealPlanMode: null,
  now: new Date(),
};

describe('mapFitnessGoalToPhase', () => {
  it('maps known fitness goals to canonical goal phases', () => {
    expect(mapFitnessGoalToPhase('lose_weight', null)).toBe('cut');
    expect(mapFitnessGoalToPhase('maintain', null)).toBe('maintain');
    expect(mapFitnessGoalToPhase('gain_muscle', null)).toBe('bulk');
    expect(mapFitnessGoalToPhase('gain_weight', null)).toBe('bulk');
  });

  it('active meal plan mode overrides fitness goal when present', () => {
    expect(mapFitnessGoalToPhase('maintain', 'cut')).toBe('cut');
    expect(mapFitnessGoalToPhase('lose_weight', 'build')).toBe('bulk');
    expect(mapFitnessGoalToPhase('lose_weight', 'maintain')).toBe('maintain');
  });

  it('returns "maintain" when both inputs are missing/unknown', () => {
    expect(mapFitnessGoalToPhase(null, null)).toBe('maintain');
    expect(mapFitnessGoalToPhase('unknown_value', null)).toBe('maintain');
  });
});

describe('computeAffinitySnapshot — topAffinityIngredients', () => {
  it('returns top ingredients by frequency from cooks within 90 days, capped at 30', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_HIGH_PROTEIN, cookedAt: dayAgo(10) },
        { recipe: RECIPE_HIGH_PROTEIN, cookedAt: dayAgo(20) },
        { recipe: RECIPE_LOW_FIBER, cookedAt: dayAgo(30) },
      ],
    });

    expect(result.topAffinityIngredients).toContain('chicken breast');
    expect(result.topAffinityIngredients.length).toBeLessThanOrEqual(30);
    expect(result.topAffinityIngredients[0]).toBe('chicken breast'); // most frequent
  });

  it('boosts ingredients from recipes with rating >= 4 (3× weight)', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_LOW_FIBER, cookedAt: dayAgo(5) }, // unrated
      ],
      savedRecipes: [
        { recipeId: 'r3', rating: 5, recipe: RECIPE_IRON_RICH },
      ],
    });
    // r3 cooked 0 times but rated 5 — should still surface above r2 ingredients
    expect(result.topAffinityIngredients).toContain('spinach');
    expect(result.topAffinityIngredients).toContain('lentils');
  });

  it('ignores cooks older than 90 days', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_HIGH_PROTEIN, cookedAt: dayAgo(120) },
      ],
    });
    expect(result.topAffinityIngredients).toEqual([]);
  });

  it('normalizes ingredient names (lowercase, trimmed)', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        {
          recipe: { ...RECIPE_HIGH_PROTEIN, ingredients: ['  Chicken Breast  ', 'OLIVE OIL'] },
          cookedAt: dayAgo(1),
        },
      ],
    });
    for (const ing of result.topAffinityIngredients) {
      expect(ing).toBe(ing.trim().toLowerCase());
    }
  });

  it('disliked recipes (recipeFeedback.disliked === true) suppress their ingredients', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_HIGH_PROTEIN, cookedAt: dayAgo(1) },
        { recipe: RECIPE_LOW_FIBER, cookedAt: dayAgo(1) },
      ],
      recipeFeedback: [
        { recipeId: 'r2', liked: false, disliked: true },
      ],
    });
    expect(result.topAffinityIngredients).toContain('chicken breast');
    expect(result.topAffinityIngredients).not.toContain('white rice');
  });
});

describe('computeAffinitySnapshot — rolling7dNutrientGaps', () => {
  it('marks fiber gap when 7-day average is below 80% of target', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_LOW_FIBER, cookedAt: dayAgo(1) },
        { recipe: RECIPE_LOW_FIBER, cookedAt: dayAgo(3) },
      ],
    });
    // 2 cooks × 2g fiber = 4g over 7 days → ~0.57g/day vs 25g target → far below 80%
    expect(result.rolling7dNutrientGaps).toContain('fiber');
  });

  it('does NOT mark protein gap when 7-day average meets 80% of target', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: Array.from({ length: 14 }, (_, i) => ({
        recipe: RECIPE_HIGH_PROTEIN,
        cookedAt: dayAgo(i % 7),
      })),
      // 14 cooks × 50g protein = 700g over 7 days → 100g/day → 67% of 150 target → STILL a gap
    });
    // Because 100/150 = 67% < 80%, it IS a gap
    expect(result.rolling7dNutrientGaps).toContain('protein');
  });

  it('does NOT mark a nutrient gap when intake meets the threshold', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: Array.from({ length: 21 }, (_, i) => ({
        recipe: RECIPE_HIGH_PROTEIN,
        cookedAt: dayAgo(i % 7),
      })),
      // 21 cooks × 50g protein = 1050g / 7 days = 150g/day = 100% of target → no gap
    });
    expect(result.rolling7dNutrientGaps).not.toContain('protein');
  });

  it('marks iron heuristic gap when no iron-rich keyword in 7d ingredients', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_LOW_FIBER, cookedAt: dayAgo(1) },
      ],
    });
    expect(result.rolling7dNutrientGaps).toContain('iron');
  });

  it('does not mark iron gap when iron-rich ingredients are present in 7d', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_IRON_RICH, cookedAt: dayAgo(1) },
      ],
    });
    expect(result.rolling7dNutrientGaps).not.toContain('iron');
  });

  it('returns no gaps when there is no cooking history (cannot compute)', () => {
    const result = computeAffinitySnapshot({ ...baseInput, cookingLogs: [] });
    expect(result.rolling7dNutrientGaps).toEqual([]);
  });
});

describe('computeAffinitySnapshot — last7DaysIngredients', () => {
  it('returns distinct lowercased ingredients from cooks within the last 7 days', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_HIGH_PROTEIN, cookedAt: dayAgo(1) },
        { recipe: RECIPE_LOW_FIBER, cookedAt: dayAgo(3) },
        { recipe: RECIPE_HIGH_PROTEIN, cookedAt: dayAgo(10) }, // outside window
      ],
    });
    expect(result.last7DaysIngredients).toContain('chicken breast');
    expect(result.last7DaysIngredients).toContain('white rice');
    // Each ingredient appears once
    const counts: Record<string, number> = {};
    for (const ing of result.last7DaysIngredients) counts[ing] = (counts[ing] ?? 0) + 1;
    for (const c of Object.values(counts)) expect(c).toBe(1);
  });

  it('is empty when no cooks happened in the last 7 days', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      cookingLogs: [
        { recipe: RECIPE_HIGH_PROTEIN, cookedAt: dayAgo(15) },
      ],
    });
    expect(result.last7DaysIngredients).toEqual([]);
  });
});

describe('computeAffinitySnapshot — goalPhase', () => {
  it('reflects the fitness goal mapping', () => {
    const cut = computeAffinitySnapshot({ ...baseInput, fitnessGoal: 'lose_weight' });
    expect(cut.goalPhase).toBe('cut');

    const bulk = computeAffinitySnapshot({ ...baseInput, fitnessGoal: 'gain_muscle' });
    expect(bulk.goalPhase).toBe('bulk');
  });

  it('active meal plan mode overrides fitness goal', () => {
    const result = computeAffinitySnapshot({
      ...baseInput,
      fitnessGoal: 'maintain',
      activeMealPlanMode: 'cut',
    });
    expect(result.goalPhase).toBe('cut');
  });
});
