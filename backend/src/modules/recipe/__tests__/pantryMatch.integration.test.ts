// backend/src/modules/recipe/__tests__/pantryMatch.integration.test.ts
// Integration tests for pantryMatch + leftoverIdeas controller methods.

jest.mock('../../../services/healthifyService', () => ({
  healthifyService: {
    healthifyRecipe: jest.fn().mockResolvedValue({}),
    generateHealthMetrics: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('../../../services/flavorBoostService', () => ({
  flavorBoostService: { boost: jest.fn().mockResolvedValue({}) },
}));
jest.mock('../../../services/substitutionService', () => ({
  substitutionService: {
    getSubstitutions: jest.fn().mockResolvedValue([]),
    applySubstitution: jest.fn().mockResolvedValue({}),
  },
}));

import { Request, Response } from 'express';
import { prisma } from '@/lib/prisma';
import { recipeController } from '../recipeController';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeReq(overrides: Partial<Request> = {}, user: object = { id: 'user-1' }): Partial<Request> {
  return { query: {}, body: {}, params: {}, user, ...overrides } as any;
}
function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  const res = { json, status } as any;
  return { res, json, status };
}
function makeRecipe(overrides: any = {}) {
  return {
    id: 'r1',
    title: 'Chicken Rice Bowl',
    description: 'Simple protein bowl',
    cuisine: 'American',
    cookTime: 20,
    imageUrl: null,
    calories: 500,
    protein: 35,
    carbs: 50,
    fat: 12,
    isUserCreated: false,
    ingredients: [{ text: 'chicken breast' }, { text: 'white rice' }, { text: 'broccoli' }],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('pantryMatch controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty list when pantry is empty', async () => {
    (mockPrisma.pantryItem.findMany as jest.Mock).mockResolvedValue([]);
    const { res, json } = makeRes();
    await recipeController.pantryMatch(makeReq() as Request, res as Response);
    expect(json).toHaveBeenCalledWith({ recipes: [], pantrySize: 0 });
  });

  it('returns only recipes meeting the default 70% threshold', async () => {
    (mockPrisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { name: 'chicken breast' },
      { name: 'white rice' },
      { name: 'broccoli' },
    ]);
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r1' }), // 3/3 = 100%
      makeRecipe({
        id: 'r2',
        title: 'Random Curry',
        ingredients: [
          { text: 'tofu' },
          { text: 'coconut milk' },
          { text: 'curry paste' },
          { text: 'rice' },
        ],
      }), // 1/4 = 25% — excluded
    ]);

    const { res, json } = makeRes();
    await recipeController.pantryMatch(makeReq() as Request, res as Response);

    const payload = json.mock.calls[0][0];
    expect(payload.pantrySize).toBe(3);
    expect(payload.recipes).toHaveLength(1);
    expect(payload.recipes[0].id).toBe('r1');
    expect(payload.recipes[0].matchPercentage).toBe(100);
    expect(payload.recipes[0].missingIngredients).toEqual([]);
  });

  it('respects custom minMatch query param', async () => {
    (mockPrisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { name: 'chicken breast' },
    ]);
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({ id: 'r1' }), // 1/3 = 33%
    ]);
    const { res, json } = makeRes();
    await recipeController.pantryMatch(
      makeReq({ query: { minMatch: '30' } as any }) as Request,
      res as Response,
    );
    const payload = json.mock.calls[0][0];
    expect(payload.recipes).toHaveLength(1);
    expect(payload.recipes[0].matchPercentage).toBeGreaterThanOrEqual(30);
  });

  it('maxMissing filter returns only recipes missing at most N items', async () => {
    (mockPrisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { name: 'chicken breast' },
      { name: 'white rice' },
    ]);
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({
        id: 'r-missing-1',
        ingredients: [{ text: 'chicken' }, { text: 'rice' }, { text: 'scallions' }],
      }), // missing 1
      makeRecipe({
        id: 'r-missing-3',
        ingredients: [
          { text: 'chicken' },
          { text: 'rice' },
          { text: 'lemongrass' },
          { text: 'galangal' },
          { text: 'fish sauce' },
        ],
      }), // missing 3
    ]);

    const { res, json } = makeRes();
    await recipeController.pantryMatch(
      makeReq({ query: { minMatch: '30', maxMissing: '1' } as any }) as Request,
      res as Response,
    );
    const payload = json.mock.calls[0][0];
    const ids = payload.recipes.map((r: any) => r.id);
    expect(ids).toContain('r-missing-1');
    expect(ids).not.toContain('r-missing-3');
  });

  it('sorts results by match percentage DESC', async () => {
    (mockPrisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { name: 'chicken breast' },
      { name: 'white rice' },
      { name: 'broccoli' },
      { name: 'soy sauce' },
    ]);
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({
        id: 'r-75',
        ingredients: [
          { text: 'chicken' },
          { text: 'rice' },
          { text: 'broccoli' },
          { text: 'kimchi' },
        ],
      }),
      makeRecipe({
        id: 'r-100',
        ingredients: [{ text: 'chicken' }, { text: 'rice' }, { text: 'broccoli' }],
      }),
    ]);

    const { res, json } = makeRes();
    await recipeController.pantryMatch(makeReq() as Request, res as Response);
    const payload = json.mock.calls[0][0];
    expect(payload.recipes[0].id).toBe('r-100');
    expect(payload.recipes[1].id).toBe('r-75');
  });

  it('user with [chicken, rice, soy sauce, garlic] matches stir-fry recipes at >=70%', async () => {
    (mockPrisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { name: 'chicken' },
      { name: 'rice' },
      { name: 'soy sauce' },
      { name: 'garlic' },
    ]);
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({
        id: 'r-stirfry',
        title: 'Chicken Stir-Fry',
        ingredients: [
          { text: 'chicken breast' },
          { text: 'white rice' },
          { text: 'soy sauce' },
          { text: 'garlic' },
          { text: 'bell pepper' },
        ],
      }),
    ]);

    const { res, json } = makeRes();
    await recipeController.pantryMatch(makeReq() as Request, res as Response);

    const payload = json.mock.calls[0][0];
    expect(payload.recipes).toHaveLength(1);
    expect(payload.recipes[0].matchPercentage).toBeGreaterThanOrEqual(70);
    expect(payload.recipes[0].title).toContain('Stir-Fry');
  });

  it('returns 500 on prisma error', async () => {
    (mockPrisma.pantryItem.findMany as jest.Mock).mockRejectedValue(new Error('db down'));
    const { res, status, json } = makeRes();
    await recipeController.pantryMatch(makeReq() as Request, res as Response);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ error: 'Failed to match pantry' });
  });
});

describe('leftoverIdeas controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 on missing ingredients array', async () => {
    const { res, status, json } = makeRes();
    await recipeController.leftoverIdeas(makeReq({ body: {} }) as Request, res as Response);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'ingredients array is required' });
  });

  it('400 when all ingredient strings are empty', async () => {
    const { res, status, json } = makeRes();
    await recipeController.leftoverIdeas(
      makeReq({ body: { ingredients: ['', '   ', null as any] } }) as Request,
      res as Response,
    );
    expect(status).toHaveBeenCalledWith(400);
  });

  it('returns recipes reusing at least 2 leftover ingredients', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([
      makeRecipe({
        id: 'good',
        title: 'Fried Rice',
        cuisine: 'Chinese',
        ingredients: [
          { text: 'cooked rice' },
          { text: 'chicken' },
          { text: 'soy sauce' },
          { text: 'scallions' },
        ],
      }),
      makeRecipe({
        id: 'bad',
        title: 'Pasta Carbonara',
        cuisine: 'Italian',
        ingredients: [{ text: 'pasta' }, { text: 'egg' }, { text: 'pancetta' }],
      }),
    ]);

    const { res, json } = makeRes();
    await recipeController.leftoverIdeas(
      makeReq({ body: { ingredients: ['rice', 'chicken'] } }) as Request,
      res as Response,
    );
    const payload = json.mock.calls[0][0];
    const ids = payload.recipes.map((r: any) => r.id);
    expect(ids).toContain('good');
    expect(ids).not.toContain('bad');
    expect(payload.recipes[0].reuseCount).toBeGreaterThanOrEqual(2);
  });

  it('excludeCuisine + excludeRecipeId passed to prisma where clause', async () => {
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue([]);
    const { res } = makeRes();
    await recipeController.leftoverIdeas(
      makeReq({
        body: {
          ingredients: ['rice', 'chicken'],
          excludeCuisine: 'Thai',
          excludeRecipeId: 'r-source',
        },
      }) as Request,
      res as Response,
    );
    const where = (mockPrisma.recipe.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.cuisine).toEqual({ not: 'Thai' });
    expect(where.id).toEqual({ not: 'r-source' });
  });

  it('leftover transformer with [rice, chicken] returns >=3 different recipe ideas', async () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        title: 'Fried Rice',
        cuisine: 'Chinese',
        ingredients: [{ text: 'cooked rice' }, { text: 'chicken' }, { text: 'egg' }],
      }),
      makeRecipe({
        id: 'r2',
        title: 'Chicken Rice Bowl',
        cuisine: 'Japanese',
        ingredients: [{ text: 'rice' }, { text: 'chicken breast' }, { text: 'teriyaki sauce' }],
      }),
      makeRecipe({
        id: 'r3',
        title: 'Chicken Burrito Bowl',
        cuisine: 'Mexican',
        ingredients: [{ text: 'rice' }, { text: 'chicken' }, { text: 'black beans' }],
      }),
    ];
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue(recipes);

    const { res, json } = makeRes();
    await recipeController.leftoverIdeas(
      makeReq({ body: { ingredients: ['rice', 'chicken'] } }) as Request,
      res as Response,
    );

    const payload = json.mock.calls[0][0];
    expect(payload.recipes.length).toBeGreaterThanOrEqual(3);
    const ids = payload.recipes.map((r: any) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // all distinct
  });

  it('respects limit param (clamped 1-20)', async () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeRecipe({
        id: `r${i}`,
        ingredients: [{ text: 'rice' }, { text: 'chicken' }, { text: 'scallion' }],
      }),
    );
    (mockPrisma.recipe.findMany as jest.Mock).mockResolvedValue(many);

    const { res, json } = makeRes();
    await recipeController.leftoverIdeas(
      makeReq({ body: { ingredients: ['rice', 'chicken'], limit: 3 } }) as Request,
      res as Response,
    );
    expect(json.mock.calls[0][0].recipes).toHaveLength(3);
  });
});
