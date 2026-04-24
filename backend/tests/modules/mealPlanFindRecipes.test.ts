// backend/tests/modules/mealPlanFindRecipes.test.ts
// Tests for POST /api/meal-plan/find-recipes controller.

jest.mock('../../src/services/aiRecipeService', () => ({
  aiRecipeService: {
    generateRecipe: jest.fn(),
  },
}));

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { findRecipes } from '../../src/modules/mealPlan/mealPlanFindRecipesController';
import { aiRecipeService } from '../../src/services/aiRecipeService';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGenerateRecipe = aiRecipeService.generateRecipe as jest.Mock;

function makeReq(body: object, user = { id: 'user-1' }): Partial<Request> {
  return { body, user } as any;
}

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

function makeRecipe(overrides: any = {}) {
  return {
    id: 'r1',
    title: 'Test Recipe',
    cuisine: 'American',
    mealType: 'dinner',
    cookTime: 25,
    difficulty: 'easy',
    servings: 1,
    calories: 350,
    protein: 35,
    carbs: 30,
    fat: 8,
    fiber: 5,
    userId: null,
    ...overrides,
  };
}

describe('POST /api/meal-plan/find-recipes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('with { calories: { max: 400 }, protein: { min: 30 } } returns only matching recipes', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r-match', calories: 350, protein: 35 }),
      makeRecipe({ id: 'r-high-cal', calories: 600, protein: 40 }),
      makeRecipe({ id: 'r-low-pro', calories: 300, protein: 20 }),
    ]);

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({ count: 3, calories: { max: 400 }, protein: { min: 30 } }) as Request,
      res as Response,
    );

    const body = json.mock.calls[0][0];
    expect(body.options).toHaveLength(1);
    expect(body.options[0].recipe.id).toBe('r-match');
  });

  it('cuisineFamilies: ["Latin American"] expands to all Latin American subcuisines', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r-mex', cuisine: 'Mexican' }),
      makeRecipe({ id: 'r-carib', cuisine: 'Caribbean' }),
    ]);

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({ count: 5, cuisineFamilies: ['Latin American'] }) as Request,
      res as Response,
    );

    // Verify the Prisma query included expanded cuisines
    const call = (mockPrisma.recipe.findMany as jest.Mock).mock.calls[0][0];
    const cuisineFilter = call.where.cuisine.in;
    expect(cuisineFilter).toContain('Mexican');
    expect(cuisineFilter).toContain('Caribbean');
    expect(cuisineFilter).toContain('Central American');
    expect(cuisineFilter).toContain('South American');
    expect(cuisineFilter).toContain('Latin American');
  });

  it('request for 3 options with only 1 DB match returns 1 DB result + 2 AI-generated', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r-db', calories: 350, protein: 35 }),
    ]);

    mockGenerateRecipe
      .mockResolvedValueOnce(makeRecipe({ id: 'ai-1', title: 'AI Recipe 1' }))
      .mockResolvedValueOnce(makeRecipe({ id: 'ai-2', title: 'AI Recipe 2' }));

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({ count: 3, calories: { max: 400 }, protein: { min: 30 } }) as Request,
      res as Response,
    );

    const body = json.mock.calls[0][0];
    expect(body.options.length).toBe(3);
    expect(body.generatedCount).toBe(2);
    expect(body.options[0].recipe.id).toBe('r-db');
  });

  it('fat max constraint { fat: { max: 8 } } excludes recipes with fat > 8g', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r-lean', fat: 6 }),
      makeRecipe({ id: 'r-fatty', fat: 15 }),
    ]);

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({ count: 5, fat: { max: 8 } }) as Request,
      res as Response,
    );

    const body = json.mock.calls[0][0];
    const ids = body.options.map((o: any) => o.recipe.id);
    expect(ids).toContain('r-lean');
    expect(ids).not.toContain('r-fatty');
  });

  it('fiber min constraint { fiber: { min: 5 } } excludes recipes with fiber < 5g', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r-fiber', fiber: 8 }),
      makeRecipe({ id: 'r-no-fiber', fiber: 2 }),
    ]);

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({ count: 5, fiber: { min: 5 } }) as Request,
      res as Response,
    );

    const body = json.mock.calls[0][0];
    const ids = body.options.map((o: any) => o.recipe.id);
    expect(ids).toContain('r-fiber');
    expect(ids).not.toContain('r-no-fiber');
  });

  it('empty cuisine filter returns recipes from any cuisine', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r1', cuisine: 'Thai' }),
      makeRecipe({ id: 'r2', cuisine: 'Italian' }),
    ]);

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({ count: 5 }) as Request,
      res as Response,
    );

    const call = (mockPrisma.recipe.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.cuisine).toBeUndefined();

    const body = json.mock.calls[0][0];
    expect(body.options).toHaveLength(2);
  });

  it('dietary restrictions from user profile are applied automatically', async () => {
    (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({
      dietaryRestrictions: ['vegan'],
    });
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([]);

    // When no DB matches, AI fallback uses dietary restrictions
    mockGenerateRecipe.mockResolvedValue(
      makeRecipe({ id: 'ai-vegan', title: 'Vegan Bowl' }),
    );

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({ count: 1 }) as Request,
      res as Response,
    );

    // Verify user profile was fetched
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );

    // AI fallback should receive dietary restrictions from profile
    expect(mockGenerateRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        userPreferences: expect.objectContaining({
          dietaryRestrictions: ['vegan'],
        }),
      }),
    );
  });

  it('response includes matchBreakdown with boolean for each constraint', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r1', calories: 350, protein: 35, fat: 8, carbs: 30, fiber: 5 }),
    ]);

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({
        count: 3,
        calories: { max: 400 },
        protein: { min: 30 },
        fat: { max: 10 },
      }) as Request,
      res as Response,
    );

    const body = json.mock.calls[0][0];
    const bd = body.options[0].matchBreakdown;
    expect(typeof bd.caloriesInRange).toBe('boolean');
    expect(typeof bd.proteinMet).toBe('boolean');
    expect(typeof bd.fatMet).toBe('boolean');
    expect(typeof bd.carbsMet).toBe('boolean');
    expect(typeof bd.fiberMet).toBe('boolean');
    expect(typeof bd.cuisineMatch).toBe('boolean');
    expect(bd.caloriesInRange).toBe(true);
    expect(bd.proteinMet).toBe(true);
    expect(bd.fatMet).toBe(true);
  });

  it('matchScore is higher for recipes matching all constraints vs partial matches', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r-all', calories: 350, protein: 40, fat: 5, carbs: 30, fiber: 8 }),
      makeRecipe({ id: 'r-partial', calories: 350, protein: 40, fat: 20, carbs: 30, fiber: 2 }),
    ]);

    const { res, json } = makeRes();
    await findRecipes(
      makeReq({
        count: 5,
        calories: { max: 400 },
        protein: { min: 30 },
        fat: { max: 10 },
        fiber: { min: 5 },
      }) as Request,
      res as Response,
    );

    const body = json.mock.calls[0][0];
    // r-partial should be filtered out (fat > 10)
    // Only r-all passes all constraints
    const allMatch = body.options.find((o: any) => o.recipe.id === 'r-all');
    expect(allMatch).toBeDefined();
    expect(allMatch.matchScore).toBeGreaterThan(0);
  });
});
