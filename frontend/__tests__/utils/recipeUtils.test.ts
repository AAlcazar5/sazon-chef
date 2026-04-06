// frontend/__tests__/utils/recipeUtils.test.ts

jest.mock('../../constants/Colors', () => ({
  Colors: {
    primary: '#FF6B35',
    tertiaryGreen: '#22C55E',
    secondaryRed: '#EF4444',
  },
  DarkColors: {
    primary: '#FF8A5C',
    tertiaryGreen: '#4ADE80',
    secondaryRed: '#F87171',
  },
}));

import {
  parseRecipeResponse,
  initializeFeedbackState,
  deduplicateRecipes,
  groupRecipesIntoSections,
  getScoreColor,
  truncateDescription,
} from '../../utils/recipeUtils';
import type { SuggestedRecipe } from '../../types';

const makeRecipe = (overrides: Partial<SuggestedRecipe> = {}): SuggestedRecipe => ({
  id: `recipe-${Math.random().toString(36).slice(2, 7)}`,
  title: 'Test Recipe',
  description: 'A test recipe',
  cuisineType: 'Italian',
  cookTime: 30,
  prepTime: 10,
  servings: 4,
  calories: 400,
  imageUrl: null,
  ...overrides,
} as SuggestedRecipe);

describe('recipeUtils', () => {
  // ── parseRecipeResponse ────────────────────────────────────────────

  describe('parseRecipeResponse', () => {
    it('should parse paginated response', () => {
      const recipes = [makeRecipe()];
      const result = parseRecipeResponse({ recipes, pagination: { total: 50 } });
      expect(result.recipes).toEqual(recipes);
      expect(result.total).toBe(50);
    });

    it('should parse flat array response', () => {
      const recipes = [makeRecipe(), makeRecipe()];
      const result = parseRecipeResponse(recipes);
      expect(result.recipes).toEqual(recipes);
      expect(result.total).toBe(2);
    });

    it('should return empty for null input', () => {
      expect(parseRecipeResponse(null)).toEqual({ recipes: [], total: 0 });
    });

    it('should return empty for undefined input', () => {
      expect(parseRecipeResponse(undefined)).toEqual({ recipes: [], total: 0 });
    });

    it('should return empty for empty object', () => {
      expect(parseRecipeResponse({})).toEqual({ recipes: [], total: 0 });
    });
  });

  // ── initializeFeedbackState ────────────────────────────────────────

  describe('initializeFeedbackState', () => {
    it('should create feedback entries for each recipe', () => {
      const recipes = [makeRecipe({ id: 'r1' }), makeRecipe({ id: 'r2' })];
      const feedback = initializeFeedbackState(recipes);
      expect(feedback['r1']).toEqual({ liked: false, disliked: false });
      expect(feedback['r2']).toEqual({ liked: false, disliked: false });
    });

    it('should return empty object for empty array', () => {
      expect(initializeFeedbackState([])).toEqual({});
    });

    it('should skip recipes without ID', () => {
      const recipes = [makeRecipe({ id: 'r1' }), { title: 'No ID' } as any];
      const feedback = initializeFeedbackState(recipes);
      expect(Object.keys(feedback)).toHaveLength(1);
      expect(feedback['r1']).toBeDefined();
    });
  });

  // ── deduplicateRecipes ─────────────────────────────────────────────

  describe('deduplicateRecipes', () => {
    it('should remove duplicate recipes by ID', () => {
      const r1 = makeRecipe({ id: 'r1', title: 'First' });
      const r1dup = makeRecipe({ id: 'r1', title: 'Duplicate' });
      const r2 = makeRecipe({ id: 'r2' });
      const result = deduplicateRecipes([r1, r1dup, r2]);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('First');
    });

    it('should return empty array for empty input', () => {
      expect(deduplicateRecipes([])).toEqual([]);
    });

    it('should filter out recipes without ID', () => {
      const r1 = makeRecipe({ id: 'r1' });
      const noId = { title: 'No ID' } as any;
      const result = deduplicateRecipes([r1, noId]);
      expect(result).toHaveLength(1);
    });

    it('should keep all unique recipes', () => {
      const recipes = [makeRecipe({ id: 'a' }), makeRecipe({ id: 'b' }), makeRecipe({ id: 'c' })];
      expect(deduplicateRecipes(recipes)).toHaveLength(3);
    });
  });

  // ── groupRecipesIntoSections ───────────────────────────────────────

  describe('groupRecipesIntoSections', () => {
    const baseOptions = {
      quickMealsRecipes: [] as SuggestedRecipe[],
      mealPrepMode: false,
      searchQuery: '',
    };

    it('should return empty for 1 or fewer recipes', () => {
      expect(groupRecipesIntoSections([makeRecipe()], baseOptions)).toEqual([]);
      expect(groupRecipesIntoSections([], baseOptions)).toEqual([]);
    });

    it('should create Quick Meals section from quickMealsRecipes', () => {
      const recipes = Array.from({ length: 5 }, (_, i) => makeRecipe({ id: `r${i}` }));
      const quickMeals = [makeRecipe({ id: 'qm1' }), makeRecipe({ id: 'qm2' })];
      const sections = groupRecipesIntoSections(recipes, { ...baseOptions, quickMealsRecipes: quickMeals });
      const quickSection = sections.find(s => s.key === 'quick-meals');
      expect(quickSection).toBeDefined();
      expect(quickSection!.recipes).toHaveLength(2);
    });

    it('should skip Quick Meals section during search', () => {
      const recipes = Array.from({ length: 5 }, (_, i) => makeRecipe({ id: `r${i}` }));
      const quickMeals = [makeRecipe({ id: 'qm1' })];
      const sections = groupRecipesIntoSections(recipes, {
        ...baseOptions,
        quickMealsRecipes: quickMeals,
        searchQuery: 'chicken',
      });
      expect(sections.find(s => s.key === 'quick-meals')).toBeUndefined();
    });

    it('should create Meal Prep section when not in mealPrepMode', () => {
      const recipes = [
        makeRecipe({ id: 'r0' }),
        makeRecipe({ id: 'mp1', mealPrepSuitable: true } as any),
        makeRecipe({ id: 'mp2', freezable: true } as any),
      ];
      const sections = groupRecipesIntoSections(recipes, baseOptions);
      const mealPrepSection = sections.find(s => s.key === 'meal-prep');
      expect(mealPrepSection).toBeDefined();
    });

    it('should skip Meal Prep section when in mealPrepMode', () => {
      const recipes = [
        makeRecipe({ id: 'r0' }),
        makeRecipe({ id: 'mp1', mealPrepSuitable: true } as any),
      ];
      const sections = groupRecipesIntoSections(recipes, { ...baseOptions, mealPrepMode: true });
      expect(sections.find(s => s.key === 'meal-prep')).toBeUndefined();
    });

    it('should create Macro Optimized section for high protein-to-calorie ratio recipes', () => {
      const recipes = [
        makeRecipe({ id: 'r0' }),
        // 40g protein / 400 cal = 0.10 ratio (qualifies)
        makeRecipe({ id: 'mo1', protein: 40, calories: 400 }),
        // 30g protein / 300 cal = 0.10 ratio (qualifies)
        makeRecipe({ id: 'mo2', protein: 30, calories: 300 }),
        // 10g protein / 500 cal = 0.02 ratio (does NOT qualify — too low protein)
        makeRecipe({ id: 'lo1', protein: 10, calories: 500 }),
      ];
      const sections = groupRecipesIntoSections(recipes, baseOptions);
      const macroSection = sections.find(s => s.key === 'macro-optimized');
      expect(macroSection).toBeDefined();
      expect(macroSection!.title).toBe('Macro Optimized');
      expect(macroSection!.recipes.map(r => r.id)).toEqual(expect.arrayContaining(['mo1', 'mo2']));
      expect(macroSection!.recipes.map(r => r.id)).not.toContain('lo1');
    });

    it('should sort Macro Optimized recipes by protein-to-calorie ratio descending', () => {
      const recipes = [
        makeRecipe({ id: 'r0' }),
        makeRecipe({ id: 'low', protein: 25, calories: 300 }),   // ratio 0.083
        makeRecipe({ id: 'high', protein: 45, calories: 350 }),  // ratio 0.128
        makeRecipe({ id: 'mid', protein: 35, calories: 350 }),   // ratio 0.100
      ];
      const sections = groupRecipesIntoSections(recipes, baseOptions);
      const macroSection = sections.find(s => s.key === 'macro-optimized');
      expect(macroSection).toBeDefined();
      expect(macroSection!.recipes.map(r => r.id)).toEqual(['high', 'mid', 'low']);
    });

    it('should not create Macro Optimized section when no recipes qualify', () => {
      const recipes = [
        makeRecipe({ id: 'r0' }),
        makeRecipe({ id: 'lo1', protein: 5, calories: 500 }),
        makeRecipe({ id: 'lo2', protein: 8, calories: 600 }),
      ];
      const sections = groupRecipesIntoSections(recipes, baseOptions);
      expect(sections.find(s => s.key === 'macro-optimized')).toBeUndefined();
    });

    it('should no longer create the legacy Superfoods section', () => {
      const recipes = [
        makeRecipe({ id: 'r0' }),
        makeRecipe({ id: 'sf1', healthGrade: 'A' } as any),
      ];
      const sections = groupRecipesIntoSections(recipes, baseOptions);
      expect(sections.find(s => s.key === 'superfoods')).toBeUndefined();
    });

    it('should always create For You section with remaining recipes', () => {
      const recipes = Array.from({ length: 3 }, (_, i) => makeRecipe({ id: `r${i}` }));
      const sections = groupRecipesIntoSections(recipes, baseOptions);
      const forYouSection = sections.find(s => s.key === 'quick-easy');
      expect(forYouSection).toBeDefined();
    });
  });

  // ── getScoreColor ──────────────────────────────────────────────────

  describe('getScoreColor', () => {
    it('should return green for score >= 80', () => {
      expect(getScoreColor(80, false).color).toBe('#22C55E');
      expect(getScoreColor(95, false).color).toBe('#22C55E');
    });

    it('should return primary for score >= 60 and < 80', () => {
      expect(getScoreColor(60, false).color).toBe('#FF6B35');
      expect(getScoreColor(79, false).color).toBe('#FF6B35');
    });

    it('should return red for score < 60', () => {
      expect(getScoreColor(59, false).color).toBe('#EF4444');
      expect(getScoreColor(0, false).color).toBe('#EF4444');
    });

    it('should use dark colors when isDark is true', () => {
      expect(getScoreColor(90, true).color).toBe('#4ADE80');
      expect(getScoreColor(70, true).color).toBe('#FF8A5C');
      expect(getScoreColor(30, true).color).toBe('#F87171');
    });
  });

  // ── truncateDescription ────────────────────────────────────────────

  describe('truncateDescription', () => {
    it('should return short text unchanged', () => {
      expect(truncateDescription('Hello')).toBe('Hello');
    });

    it('should truncate long text with ellipsis', () => {
      const longText = 'A'.repeat(200);
      const result = truncateDescription(longText, 120);
      expect(result.length).toBeLessThanOrEqual(123); // 120 + "..."
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle empty string', () => {
      expect(truncateDescription('')).toBe('');
    });

    it('should handle text exactly at maxLength', () => {
      const text = 'A'.repeat(120);
      expect(truncateDescription(text, 120)).toBe(text);
    });

    it('should use default maxLength of 120', () => {
      const text = 'A'.repeat(121);
      const result = truncateDescription(text);
      expect(result.endsWith('...')).toBe(true);
    });
  });
});
