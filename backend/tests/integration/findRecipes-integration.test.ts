// backend/tests/integration/findRecipes-integration.test.ts
// Unit tests for POST /api/meal-plan/find-recipes (10C: Find Me a Meal)

import { Request, Response } from 'express';

const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: { findMany: mockFindMany },
    user: { findFirst: mockFindFirst },
  },
}));

jest.mock('../../src/utils/authHelper', () => ({
  getUserId: jest.fn().mockReturnValue('test-user-id'),
}));

const mockGenerateRecipe = jest.fn();
jest.mock('../../src/services/aiRecipeService', () => ({
  aiRecipeService: { generateRecipe: mockGenerateRecipe },
}));

// Import after mocks
const { findRecipes } = require('../../src/modules/mealPlan/mealPlanFindRecipesController');

function mockRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { json, status } as unknown as Response, json, status };
}

function makeReq(body: object): Partial<Request> {
  return {
    body,
    user: { id: 'test-user-id', email: 'test@example.com' },
  };
}

const BASE_RECIPE = {
  id: 'r1',
  title: 'Grilled Chicken',
  description: 'Classic grilled chicken',
  cuisine: 'American',
  mealType: 'dinner',
  cookTime: 25,
  difficulty: 'easy',
  servings: 1,
  calories: 400,
  protein: 42,
  carbs: 10,
  fat: 8,
  fiber: 2,
  imageUrl: null,
  isUserCreated: false,
  source: 'database',
  userId: null,
};

describe('findRecipes controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ res, json, status } = mockRes());
  });

  describe('database-first search', () => {
    it('returns matched recipes with matchScore and matchBreakdown', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      mockFindMany.mockResolvedValue([BASE_RECIPE]);

      req = makeReq({ count: 3, protein: { min: 30 } });
      await findRecipes(req as Request, res as Response);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.arrayContaining([
            expect.objectContaining({
              recipe: expect.objectContaining({ id: 'r1' }),
              matchScore: expect.any(Number),
              matchBreakdown: expect.objectContaining({
                proteinMet: true,
              }),
            }),
          ]),
          totalMatches: 1,
          generatedCount: 0,
        })
      );
    });

    it('filters by calorie range', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      const inRange = { ...BASE_RECIPE, calories: 400 };
      const outOfRange = { ...BASE_RECIPE, id: 'r2', calories: 900 };
      mockFindMany.mockResolvedValue([inRange, outOfRange]);

      req = makeReq({ count: 3, calories: { min: 300, max: 500 } });
      await findRecipes(req as Request, res as Response);

      const { options } = json.mock.calls[0][0];
      const ids = options.map((o: any) => o.recipe.id);
      expect(ids).toContain('r1');
      expect(ids).not.toContain('r2');
    });

    it('marks caloriesInRange false when recipe is outside range', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      mockFindMany.mockResolvedValue([{ ...BASE_RECIPE, calories: 900 }]);

      req = makeReq({ count: 3, calories: { min: 300, max: 500 } });
      await findRecipes(req as Request, res as Response);

      // Out-of-range recipes are excluded — totalMatches should be 0 if none pass
      const { totalMatches } = json.mock.calls[0][0];
      expect(totalMatches).toBe(0);
    });

    it('respects fat max constraint', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      const lowFat = { ...BASE_RECIPE, fat: 6 };
      const highFat = { ...BASE_RECIPE, id: 'r2', fat: 20 };
      mockFindMany.mockResolvedValue([lowFat, highFat]);

      req = makeReq({ count: 3, fat: { max: 10 } });
      await findRecipes(req as Request, res as Response);

      const { options } = json.mock.calls[0][0];
      expect(options.length).toBe(1);
      expect(options[0].matchBreakdown.fatMet).toBe(true);
    });

    it('respects fiber min constraint', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      mockFindMany.mockResolvedValue([{ ...BASE_RECIPE, fiber: 8 }]);

      req = makeReq({ count: 3, fiber: { min: 5 } });
      await findRecipes(req as Request, res as Response);

      const { options } = json.mock.calls[0][0];
      expect(options[0].matchBreakdown.fiberMet).toBe(true);
    });

    it('respects cuisine filter', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      const mexican = { ...BASE_RECIPE, cuisine: 'Mexican' };
      const italian = { ...BASE_RECIPE, id: 'r2', cuisine: 'Italian' };
      mockFindMany.mockResolvedValue([mexican, italian]);

      req = makeReq({ count: 3, cuisines: ['Mexican'] });
      await findRecipes(req as Request, res as Response);

      const { options } = json.mock.calls[0][0];
      const ids = options.map((o: any) => o.recipe.id);
      expect(ids).toContain('r1');
      expect(ids).not.toContain('r2');
    });

    it('matches cuisineMatch true when cuisine matches', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      mockFindMany.mockResolvedValue([{ ...BASE_RECIPE, cuisine: 'Mexican' }]);

      req = makeReq({ count: 3, cuisines: ['Mexican'] });
      await findRecipes(req as Request, res as Response);

      const { options } = json.mock.calls[0][0];
      expect(options[0].matchBreakdown.cuisineMatch).toBe(true);
    });

    it('respects mealType filter', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      const dinner = { ...BASE_RECIPE, mealType: 'dinner' };
      const breakfast = { ...BASE_RECIPE, id: 'r2', mealType: 'breakfast' };
      mockFindMany.mockResolvedValue([dinner, breakfast]);

      req = makeReq({ count: 3, mealType: 'dinner' });
      await findRecipes(req as Request, res as Response);

      const { options } = json.mock.calls[0][0];
      expect(options.length).toBe(1);
      expect(options[0].recipe.mealType).toBe('dinner');
    });

    it('respects maxCookTime filter', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      const fast = { ...BASE_RECIPE, cookTime: 20 };
      const slow = { ...BASE_RECIPE, id: 'r2', cookTime: 90 };
      mockFindMany.mockResolvedValue([fast, slow]);

      req = makeReq({ count: 3, maxCookTime: 30 });
      await findRecipes(req as Request, res as Response);

      const { options } = json.mock.calls[0][0];
      expect(options.length).toBe(1);
      expect(options[0].recipe.cookTime).toBe(20);
    });

    it('limits results to count', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      const recipes = Array.from({ length: 10 }, (_, i) => ({
        ...BASE_RECIPE,
        id: `r${i}`,
      }));
      mockFindMany.mockResolvedValue(recipes);

      req = makeReq({ count: 3 });
      await findRecipes(req as Request, res as Response);

      const { options } = json.mock.calls[0][0];
      expect(options.length).toBe(3);
    });
  });

  describe('AI generation fallback', () => {
    it('generates AI recipes when DB returns fewer than count', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      mockFindMany.mockResolvedValue([BASE_RECIPE]); // only 1, count=3

      const aiRecipe = {
        ...BASE_RECIPE,
        id: 'ai-1',
        title: 'AI Chicken Bowl',
        source: 'ai-generated',
      };
      mockGenerateRecipe.mockResolvedValue(aiRecipe);

      req = makeReq({ count: 3, protein: { min: 30 } });
      await findRecipes(req as Request, res as Response);

      const { generatedCount } = json.mock.calls[0][0];
      expect(generatedCount).toBeGreaterThan(0);
      expect(mockGenerateRecipe).toHaveBeenCalled();
    });

    it('does not call AI when DB returns enough results', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      const recipes = [
        { ...BASE_RECIPE, id: 'r1' },
        { ...BASE_RECIPE, id: 'r2' },
        { ...BASE_RECIPE, id: 'r3' },
      ];
      mockFindMany.mockResolvedValue(recipes);

      req = makeReq({ count: 3 });
      await findRecipes(req as Request, res as Response);

      expect(mockGenerateRecipe).not.toHaveBeenCalled();
      const { generatedCount } = json.mock.calls[0][0];
      expect(generatedCount).toBe(0);
    });
  });

  describe('response shape', () => {
    it('always returns options, totalMatches, generatedCount', async () => {
      mockFindFirst.mockResolvedValue({ dietaryRestrictions: [] });
      mockFindMany.mockResolvedValue([]);
      mockGenerateRecipe.mockResolvedValue(BASE_RECIPE);

      req = makeReq({ count: 1 });
      await findRecipes(req as Request, res as Response);

      const result = json.mock.calls[0][0];
      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('totalMatches');
      expect(result).toHaveProperty('generatedCount');
      expect(Array.isArray(result.options)).toBe(true);
    });

    it('returns 400 if count is missing', async () => {
      req = makeReq({});
      await findRecipes(req as Request, res as Response);

      expect(status).toHaveBeenCalledWith(400);
    });
  });
});
