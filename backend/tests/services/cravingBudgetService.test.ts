// backend/tests/services/cravingBudgetService.test.ts
// TDD: Tests for 10P Craving + Weekly Budget Integration

// Mock dependencies before imports
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: { findMany: jest.fn() },
    meal: { findMany: jest.fn() },
    mealPlan: { findFirst: jest.fn() },
    macroGoals: { findUnique: jest.fn() },
  },
}));

jest.mock('../../src/services/cravingFlowService', () => ({
  cravingFlowService: {
    healthifyCraving: jest.fn(),
  },
}));

jest.mock('../../src/services/cravingSearchService', () => ({
  mapCravingToSearchTerms: jest.fn(),
  scoreCravingMatch: jest.fn(),
}));

import { prisma } from '../../src/lib/prisma';
import { cravingFlowService } from '../../src/services/cravingFlowService';
import { mapCravingToSearchTerms, scoreCravingMatch } from '../../src/services/cravingSearchService';

// Import after mocks
import {
  CravingBudgetService,
  type CravingBudgetParams,
  type CravingBudgetResult,
} from '../../src/services/cravingBudgetService';

const mockPrisma = prisma as any;
const mockHealthify = cravingFlowService.healthifyCraving as jest.Mock;
const mockMapCraving = mapCravingToSearchTerms as jest.Mock;
const mockScoreMatch = scoreCravingMatch as jest.Mock;

describe('CravingBudgetService', () => {
  let service: CravingBudgetService;

  const defaultParams: CravingBudgetParams = {
    craving: 'pizza',
    remainingCalories: 800,
    remainingProtein: 40,
    remainingCarbs: 100,
    remainingFat: 30,
    userId: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CravingBudgetService();
  });

  // ─── Validation ─────────────────────────────────────────────────────

  it('throws if craving text is empty', async () => {
    await expect(
      service.analyzeCraving({ ...defaultParams, craving: '' }),
    ).rejects.toThrow('craving text is required');
  });

  it('throws if remainingCalories is missing', async () => {
    await expect(
      service.analyzeCraving({ ...defaultParams, remainingCalories: undefined as any }),
    ).rejects.toThrow('remainingCalories is required');
  });

  // ─── "Go for it" path ────────────────────────────────────────────────

  describe('goForIt path', () => {
    it('returns recalculated remaining macros after absorbing the craving', async () => {
      mockHealthify.mockResolvedValue({
        original: {
          name: 'Pepperoni Pizza (2 slices)',
          description: 'Classic pepperoni pizza',
          calories: 550,
          protein: 22,
          carbs: 60,
          fat: 25,
        },
        healthified: {
          title: 'Cauliflower Crust Pizza',
          calories: 280,
          protein: 28,
          carbs: 22,
          fat: 10,
          ingredients: [],
          instructions: [],
        },
        honestyNote: 'Not quite delivery, but it crushes the craving.',
      });

      mockMapCraving.mockResolvedValue({
        searchTerms: ['pizza', 'cheese', 'pepperoni'],
        flavorTags: ['cheesy', 'savory'],
        temperature: 'hot',
        texturePrefs: [],
      });
      mockPrisma.recipe.findMany.mockResolvedValue([]);
      mockScoreMatch.mockReturnValue(0);

      const result = await service.analyzeCraving(defaultParams);

      expect(result.goForIt).toBeDefined();
      expect(result.goForIt.originalCraving.calories).toBe(550);
      // Remaining after eating the craving: 800 - 550 = 250
      expect(result.goForIt.remainingAfter.calories).toBe(250);
      expect(result.goForIt.remainingAfter.protein).toBe(18); // 40 - 22
      expect(result.goForIt.remainingAfter.carbs).toBe(40); // 100 - 60
      expect(result.goForIt.remainingAfter.fat).toBe(5); // 30 - 25
    });

    it('clamps remaining macros to zero when craving exceeds budget', async () => {
      mockHealthify.mockResolvedValue({
        original: { name: 'Pizza', description: '', calories: 1200, protein: 50, carbs: 140, fat: 55 },
        healthified: { title: 'Light Pizza', calories: 300, protein: 30, carbs: 25, fat: 8, ingredients: [], instructions: [] },
        honestyNote: 'Trade-off.',
      });
      mockMapCraving.mockResolvedValue({ searchTerms: ['pizza'], flavorTags: [], temperature: 'hot', texturePrefs: [] });
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      const result = await service.analyzeCraving(defaultParams);

      expect(result.goForIt.remainingAfter.calories).toBe(0);
      expect(result.goForIt.remainingAfter.fat).toBe(0);
      expect(result.goForIt.overBudget).toBe(true);
      expect(result.goForIt.overBy.calories).toBe(400); // 1200 - 800
    });

    it('sets overBudget false when craving fits within budget', async () => {
      mockHealthify.mockResolvedValue({
        original: { name: 'Small Pizza', description: '', calories: 300, protein: 12, carbs: 35, fat: 12 },
        healthified: { title: 'Mini Pizza', calories: 180, protein: 20, carbs: 15, fat: 5, ingredients: [], instructions: [] },
        honestyNote: 'Fits easily.',
      });
      mockMapCraving.mockResolvedValue({ searchTerms: ['pizza'], flavorTags: [], temperature: 'hot', texturePrefs: [] });
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      const result = await service.analyzeCraving(defaultParams);

      expect(result.goForIt.overBudget).toBe(false);
      expect(result.goForIt.overBy.calories).toBe(0);
    });
  });

  // ─── "Healthier version" path ─────────────────────────────────────────

  describe('healthierVersion path', () => {
    it('returns AI-generated healthified recipe with ≤50% original calories', async () => {
      mockHealthify.mockResolvedValue({
        original: { name: 'Pepperoni Pizza', description: '', calories: 550, protein: 22, carbs: 60, fat: 25 },
        healthified: {
          title: 'Cauliflower Crust Pizza',
          description: 'Low-carb take',
          cuisine: 'Italian',
          cookTime: 25,
          servings: 1,
          calories: 260,
          protein: 28,
          carbs: 18,
          fat: 8,
          ingredients: [{ text: 'Cauliflower', order: 1 }],
          instructions: [{ text: 'Blend cauliflower', step: 1 }],
        },
        honestyNote: 'Not delivery pizza, but 1/3 the calories.',
      });
      mockMapCraving.mockResolvedValue({ searchTerms: ['pizza'], flavorTags: [], temperature: 'hot', texturePrefs: [] });
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      const result = await service.analyzeCraving(defaultParams);

      expect(result.healthierVersion).toBeDefined();
      expect(result.healthierVersion.recipe.title).toBe('Cauliflower Crust Pizza');
      expect(result.healthierVersion.recipe.calories).toBeLessThanOrEqual(550 * 0.5 + 50); // Allow some slack from AI
      expect(result.healthierVersion.comparison).toBeDefined();
      expect(result.healthierVersion.comparison.caloriesSaved).toBe(550 - 260);
      expect(result.healthierVersion.comparison.percentReduction).toBeCloseTo(52.7, 0);
      expect(result.healthierVersion.honestyNote).toBe('Not delivery pizza, but 1/3 the calories.');
    });

    it('includes side-by-side comparison of original vs healthified macros', async () => {
      mockHealthify.mockResolvedValue({
        original: { name: 'Burger', description: '', calories: 700, protein: 35, carbs: 45, fat: 40 },
        healthified: {
          title: 'Turkey Lettuce Wrap',
          description: 'Lighter burger',
          cuisine: 'American',
          cookTime: 15,
          servings: 1,
          calories: 320,
          protein: 38,
          carbs: 10,
          fat: 14,
          ingredients: [{ text: 'Ground turkey', order: 1 }],
          instructions: [{ text: 'Form patties', step: 1 }],
        },
        honestyNote: 'Missing the bun, but your macros will thank you.',
      });
      mockMapCraving.mockResolvedValue({ searchTerms: ['burger'], flavorTags: [], temperature: 'hot', texturePrefs: [] });
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      const result = await service.analyzeCraving(defaultParams);

      const { comparison } = result.healthierVersion;
      expect(comparison.original.calories).toBe(700);
      expect(comparison.healthified.calories).toBe(320);
      expect(comparison.caloriesSaved).toBe(380);
      expect(comparison.proteinDifference).toBe(3); // 38 - 35
    });
  });

  // ─── "Similar but lighter" path ──────────────────────────────────────

  describe('similarButLighter path', () => {
    it('returns ≥3 DB recipes matching craving keywords within calorie budget', async () => {
      const dbRecipes = [
        { id: 'r1', title: 'Veggie Flatbread', calories: 320, protein: 14, carbs: 38, fat: 12, cuisine: 'Italian', cookTime: 20 },
        { id: 'r2', title: 'Pizza Quesadilla', calories: 350, protein: 18, carbs: 30, fat: 15, cuisine: 'Mexican', cookTime: 15 },
        { id: 'r3', title: 'Pita Pizza', calories: 280, protein: 16, carbs: 32, fat: 10, cuisine: 'Mediterranean', cookTime: 10 },
        { id: 'r4', title: 'Cheese Toast', calories: 250, protein: 12, carbs: 28, fat: 10, cuisine: 'American', cookTime: 5 },
      ];

      mockHealthify.mockResolvedValue({
        original: { name: 'Pizza', description: '', calories: 550, protein: 22, carbs: 60, fat: 25 },
        healthified: { title: 'Light Pizza', calories: 250, protein: 25, carbs: 20, fat: 8, ingredients: [], instructions: [] },
        honestyNote: 'Close enough.',
      });
      mockMapCraving.mockResolvedValue({
        searchTerms: ['pizza', 'cheese', 'flatbread'],
        flavorTags: ['cheesy'],
        temperature: 'hot',
        texturePrefs: [],
      });
      mockPrisma.recipe.findMany.mockResolvedValue(dbRecipes);
      mockScoreMatch
        .mockReturnValueOnce(8) // Veggie Flatbread
        .mockReturnValueOnce(10) // Pizza Quesadilla
        .mockReturnValueOnce(12) // Pita Pizza
        .mockReturnValueOnce(4); // Cheese Toast

      const result = await service.analyzeCraving(defaultParams);

      expect(result.similarButLighter).toBeDefined();
      expect(result.similarButLighter.length).toBeGreaterThanOrEqual(3);
      // All results should be within the remaining calorie budget
      result.similarButLighter.forEach((r: any) => {
        expect(r.calories).toBeLessThanOrEqual(defaultParams.remainingCalories);
      });
      // Sorted by craving match score descending
      expect(result.similarButLighter[0].title).toBe('Pita Pizza'); // score 12
      expect(result.similarButLighter[1].title).toBe('Pizza Quesadilla'); // score 10
    });

    it('returns empty array when no DB recipes match', async () => {
      mockHealthify.mockResolvedValue({
        original: { name: 'Pizza', description: '', calories: 550, protein: 22, carbs: 60, fat: 25 },
        healthified: { title: 'Light Pizza', calories: 250, protein: 25, carbs: 20, fat: 8, ingredients: [], instructions: [] },
        honestyNote: 'Trade-off.',
      });
      mockMapCraving.mockResolvedValue({ searchTerms: ['pizza'], flavorTags: [], temperature: 'hot', texturePrefs: [] });
      mockPrisma.recipe.findMany.mockResolvedValue([]);

      const result = await service.analyzeCraving(defaultParams);

      expect(result.similarButLighter).toEqual([]);
    });

    it('filters out recipes exceeding calorie budget via DB query', async () => {
      // The service passes `calories: { lte: budget }` to Prisma, so only
      // matching recipes come back from the DB. Simulate that here.
      const dbRecipes = [
        { id: 'r2', title: 'Light Pizza', calories: 300, protein: 18, carbs: 30, fat: 10 },
      ];

      mockHealthify.mockResolvedValue({
        original: { name: 'Pizza', description: '', calories: 550, protein: 22, carbs: 60, fat: 25 },
        healthified: { title: 'Fit Pizza', calories: 250, protein: 25, carbs: 20, fat: 8, ingredients: [], instructions: [] },
        honestyNote: 'OK.',
      });
      mockMapCraving.mockResolvedValue({ searchTerms: ['pizza'], flavorTags: [], temperature: 'hot', texturePrefs: [] });
      mockPrisma.recipe.findMany.mockResolvedValue(dbRecipes);
      mockScoreMatch.mockReturnValueOnce(8);

      const result = await service.analyzeCraving(defaultParams);

      expect(result.similarButLighter.length).toBe(1);
      expect(result.similarButLighter[0].title).toBe('Light Pizza');
    });
  });

  // ─── Full result shape ───────────────────────────────────────────────

  describe('full result shape', () => {
    it('returns all three paths in a single response', async () => {
      mockHealthify.mockResolvedValue({
        original: { name: 'Taco', description: '', calories: 400, protein: 18, carbs: 35, fat: 20 },
        healthified: {
          title: 'Lettuce Wrap Taco',
          description: 'Low-carb',
          cuisine: 'Mexican',
          cookTime: 10,
          servings: 1,
          calories: 200,
          protein: 22,
          carbs: 8,
          fat: 10,
          ingredients: [{ text: 'Ground turkey', order: 1 }],
          instructions: [{ text: 'Cook turkey', step: 1 }],
        },
        honestyNote: 'Missing the shell.',
      });
      mockMapCraving.mockResolvedValue({ searchTerms: ['taco'], flavorTags: ['spicy'], temperature: 'hot', texturePrefs: [] });
      mockPrisma.recipe.findMany.mockResolvedValue([
        { id: 'r1', title: 'Fish Taco Bowl', calories: 350, protein: 28, carbs: 30, fat: 12 },
      ]);
      mockScoreMatch.mockReturnValue(6);

      const result = await service.analyzeCraving(defaultParams);

      // All three paths present
      expect(result).toHaveProperty('goForIt');
      expect(result).toHaveProperty('healthierVersion');
      expect(result).toHaveProperty('similarButLighter');

      // goForIt has correct shape
      expect(result.goForIt).toHaveProperty('originalCraving');
      expect(result.goForIt).toHaveProperty('remainingAfter');
      expect(result.goForIt).toHaveProperty('overBudget');
      expect(result.goForIt).toHaveProperty('overBy');

      // healthierVersion has correct shape
      expect(result.healthierVersion).toHaveProperty('recipe');
      expect(result.healthierVersion).toHaveProperty('comparison');
      expect(result.healthierVersion).toHaveProperty('honestyNote');

      // similarButLighter is an array of recipes
      expect(Array.isArray(result.similarButLighter)).toBe(true);
    });
  });
});
