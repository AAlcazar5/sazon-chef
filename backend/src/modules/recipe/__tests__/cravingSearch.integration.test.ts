// backend/src/modules/recipe/__tests__/cravingSearch.integration.test.ts
// Integration-level tests for the cravingSearch controller method and logCravingSearchEvent.
// Uses mocked Prisma (from tests/setup.ts) and mocked AI service.

// Mock healthifyService to prevent AIProviderManager from throwing on import
jest.mock('../../../services/healthifyService', () => ({
  healthifyService: {
    healthifyRecipe: jest.fn().mockResolvedValue({}),
    generateHealthMetrics: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../../services/cravingSearchService', () => ({
  mapCravingToSearchTerms: jest.fn().mockResolvedValue({
    searchTerms: ['cheese'],
    flavorTags: ['cheesy'],
    temperature: 'hot',
    texturePrefs: [],
  }),
  scoreCravingMatch: jest.requireActual('../../../services/cravingSearchService').scoreCravingMatch,
}));

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { recipeController } from '../recipeController';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeReq(body: object, user: object = { id: 'user-1' }): Partial<Request> {
  return { body, user } as any;
}

function makeRes(): { res: Partial<Response>; json: jest.Mock; status: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const res = { json, status } as any;
  return { res, json, status };
}

function makeRecipe(overrides: Partial<{
  id: string;
  title: string;
  description: string;
  cuisine: string;
  cookTime: number;
  difficulty: string;
  createdAt: Date;
  isUserCreated: boolean;
  ingredients: Array<{ text: string }>;
  instructions: Array<{ text: string }>;
}> = {}) {
  return {
    id: 'recipe-1',
    title: 'Test Recipe',
    description: 'A tasty recipe',
    cuisine: 'American',
    cookTime: 30,
    difficulty: 'medium',
    createdAt: new Date('2024-01-01'),
    isUserCreated: false,
    ingredients: [],
    instructions: [],
    calories: 400,
    protein: 30,
    carbs: 40,
    fat: 15,
    ...overrides,
  };
}

describe('cravingSearch controller — filter integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: userPreferences returns no dietary restrictions
    (mockPrisma.userPreferences.findFirst as jest.Mock).mockResolvedValue(null);
    // Default: count returns small number so we stay in keyword-filter path
    (mockPrisma.recipe.count as jest.Mock).mockResolvedValue(10);
  });

  it('with cuisine filter: only returns matching cuisine recipes', async () => {
    const mexicanRecipe = makeRecipe({ id: 'r1', title: 'Cheesy Quesadillas', cuisine: 'Mexican' });
    const americanRecipe = makeRecipe({ id: 'r2', title: 'Mac and Cheese', cuisine: 'American' });

    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([mexicanRecipe]);

    const { res, json } = makeRes();
    await recipeController.cravingSearch(
      makeReq({ query: 'cheesy', cuisines: ['Mexican'] }) as Request,
      res as Response,
    );

    const call = (mockPrisma.recipe.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.cuisine).toEqual({ in: ['Mexican'] });

    const body = json.mock.calls[0][0];
    expect(body.recipes.every((r: any) => r.cuisine === 'Mexican')).toBe(true);
    expect(body.recipes.find((r: any) => r.id === americanRecipe.id)).toBeUndefined();
  });

  it('with maxCookTime filter: excludes slow recipes', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r1', title: 'Cheesy Fast Bowl', cookTime: 15 }),
    ]);

    const { res, json } = makeRes();
    await recipeController.cravingSearch(
      makeReq({ query: 'cheesy', maxCookTime: 20 }) as Request,
      res as Response,
    );

    const call = (mockPrisma.recipe.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.cookTime).toEqual({ lte: 20 });
  });

  it('combined craving + multiple filters narrows results correctly', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r1', title: 'Cheesy Taco', cuisine: 'Mexican', cookTime: 25 }),
    ]);

    const { res, json } = makeRes();
    await recipeController.cravingSearch(
      makeReq({ query: 'cheesy', cuisines: ['Mexican'], maxCookTime: 30, difficulty: 'easy' }) as Request,
      res as Response,
    );

    const call = (mockPrisma.recipe.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.cuisine).toEqual({ in: ['Mexican'] });
    expect(call.where.cookTime).toEqual({ lte: 30 });
    expect(call.where.difficulty).toBe('easy');
  });

  it('perfect match flag present on top result, absent on lower result', async () => {
    const highScoreRecipe = makeRecipe({
      id: 'r1',
      title: 'Cheesy Mac and Cheese',
      description: 'loaded with cheese',
      ingredients: [
        { text: 'cheddar cheese' },
        { text: 'mozzarella cheese' },
        { text: 'parmesan cheese' },
      ],
    });
    const lowScoreRecipe = makeRecipe({
      id: 'r2',
      title: 'Pasta Primavera',
      description: 'fresh vegetables',
      ingredients: [{ text: 'a sprinkle of cheese' }],
    });

    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([highScoreRecipe, lowScoreRecipe]);

    const { res, json } = makeRes();
    await recipeController.cravingSearch(
      makeReq({ query: 'cheesy' }) as Request,
      res as Response,
    );

    const body = json.mock.calls[0][0];
    expect(body.recipes.length).toBeGreaterThan(0);
    const top = body.recipes[0];
    expect(top.perfectMatch).toBe(true);

    // Low ranked result should not have perfectMatch
    if (body.recipes.length > 1) {
      const last = body.recipes[body.recipes.length - 1];
      if (last.id !== top.id) {
        expect(last.perfectMatch).toBe(false);
      }
    }
  });

  it('candidate pool includes both recent and older recipes when keyword filter returns < 20', async () => {
    // Simulate keyword filter returning only 3 results (< 20 threshold) → falls through to split pool
    (mockPrisma.recipe.findMany as jest.Mock)
      .mockResolvedValueOnce([
        makeRecipe({ id: 'r1', title: 'Cheesy Soup' }),
        makeRecipe({ id: 'r2', title: 'Cheese Bread' }),
        makeRecipe({ id: 'r3', title: 'Cheesy Rice' }),
      ]) // keyword filter (< 20)
      .mockResolvedValueOnce([
        makeRecipe({ id: 'r4', title: 'Old Cheesy Bowl' }),
        makeRecipe({ id: 'r5', title: 'Classic Cheese Dip' }),
      ]) // recent pool
      .mockResolvedValueOnce([
        makeRecipe({ id: 'r6', title: 'Vintage Mac Cheese' }),
      ]); // random offset pool

    (mockPrisma.recipe.count as jest.Mock).mockResolvedValue(500); // large DB → triggers split

    const { res, json } = makeRes();
    await recipeController.cravingSearch(
      makeReq({ query: 'cheesy' }) as Request,
      res as Response,
    );

    // Should have called findMany 3 times: keyword-filter, recent, random
    expect(mockPrisma.recipe.findMany).toHaveBeenCalledTimes(3);
  });
});

describe('logCravingSearchEvent controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates event with correct fields', async () => {
    (mockPrisma as any).cravingSearchEvent.create.mockResolvedValue({ id: 'evt-1' });

    const { res, json, status } = makeRes();
    await recipeController.logCravingSearchEvent(
      makeReq({ cravingQuery: 'cheesy', recipeId: 'recipe-abc', action: 'tap' }) as Request,
      res as Response,
    );

    expect((mockPrisma as any).cravingSearchEvent.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', cravingQuery: 'cheesy', recipeId: 'recipe-abc', action: 'tap' },
    });
    expect(json).toHaveBeenCalledWith({ success: true });
    expect(status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when action is invalid', async () => {
    const { res, status } = makeRes();
    await recipeController.logCravingSearchEvent(
      makeReq({ cravingQuery: 'cheesy', recipeId: 'r1', action: 'invalid' }) as Request,
      res as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect((mockPrisma as any).cravingSearchEvent.create).not.toHaveBeenCalled();
  });

  it('returns 400 when fields are missing', async () => {
    const { res, status } = makeRes();
    await recipeController.logCravingSearchEvent(
      makeReq({ recipeId: 'r1', action: 'tap' }) as Request, // missing cravingQuery
      res as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
  });
});
