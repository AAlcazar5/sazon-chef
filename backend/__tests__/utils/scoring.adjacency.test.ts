// backend/__tests__/utils/scoring.adjacency.test.ts
// Group 11 Phase 1 — adjacency-aware taste scoring tests.

import { calculateRecipeScore } from '../../src/utils/scoring';

const baseRecipe = {
  calories: 500,
  protein: 35,
  carbs: 50,
  fat: 18,
  cookTime: 30,
  ingredients: [{ name: 'salmon' }, { name: 'rice' }, { name: 'broccoli' }],
};

const baseGoals = { calories: 500, protein: 35, carbs: 50, fat: 18 };
const basePrefs = {
  likedCuisines: [{ name: 'Thai' }],
  spiceLevel: 'medium',
  cookTimePreference: 30,
  bannedIngredients: [],
  preferredSuperfoods: [],
  dietaryRestrictions: [],
};

describe('Adjacency boost in calculateTasteMatch', () => {
  it('user who likes Thai gets a non-zero boost on a Burmese recipe', () => {
    const burmese = calculateRecipeScore(
      { ...baseRecipe, cuisine: 'Burmese' } as any,
      basePrefs as any,
      baseGoals as any
    );
    const unrelated = calculateRecipeScore(
      { ...baseRecipe, cuisine: 'Swedish' } as any,
      basePrefs as any,
      baseGoals as any
    );
    expect(burmese.tasteScore).toBeGreaterThan(unrelated.tasteScore);
  });

  it('exact-match cuisine outscores adjacent cuisine (no overshoot)', () => {
    const exact = calculateRecipeScore(
      { ...baseRecipe, cuisine: 'Thai' } as any,
      basePrefs as any,
      baseGoals as any
    );
    const adjacent = calculateRecipeScore(
      { ...baseRecipe, cuisine: 'Burmese' } as any,
      basePrefs as any,
      baseGoals as any
    );
    expect(exact.tasteScore).toBeGreaterThan(adjacent.tasteScore);
  });

  it('cuisines with no adjacency data still score normally (graceful fallback)', () => {
    const result = calculateRecipeScore(
      { ...baseRecipe, cuisine: 'Atlantean' } as any,
      basePrefs as any,
      baseGoals as any
    );
    expect(result.tasteScore).toBeGreaterThan(0);
    expect(result.tasteScore).toBeLessThanOrEqual(100);
  });

  it('multiple liked cuisines stack — Thai+Indian both adjacent to Burmese, takes the strongest', () => {
    const onePref = { ...basePrefs, likedCuisines: [{ name: 'Indian' }] };
    const bothPrefs = { ...basePrefs, likedCuisines: [{ name: 'Thai' }, { name: 'Indian' }] };
    const onePrefResult = calculateRecipeScore(
      { ...baseRecipe, cuisine: 'Burmese' } as any,
      onePref as any,
      baseGoals as any
    );
    const bothPrefsResult = calculateRecipeScore(
      { ...baseRecipe, cuisine: 'Burmese' } as any,
      bothPrefs as any,
      baseGoals as any
    );
    expect(bothPrefsResult.tasteScore).toBeGreaterThanOrEqual(onePrefResult.tasteScore);
  });
});
