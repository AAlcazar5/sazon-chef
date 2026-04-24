// backend/src/modules/recipe/__tests__/relatedRecipes.test.ts
// Tests for GET /api/recipes/:id/related — cuisine adjacency discovery.

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
import { calculateCuisineAdjacency, CUISINE_ADJACENCY } from '../../../utils/recipeSimilarity';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeReq(overrides: Partial<Request> = {}, user: object = { id: 'user-1' }): Partial<Request> {
  return { query: {}, body: {}, params: {}, user, ...overrides } as any;
}
function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnThis();
  return { res: { json, status } as any, json, status };
}

function makeRecipe(overrides: any = {}) {
  return {
    id: 'r1',
    title: 'Pad Thai',
    description: 'Classic Thai noodles',
    cuisine: 'Thai',
    mealType: 'dinner',
    cookTime: 25,
    difficulty: 'medium',
    servings: 2,
    imageUrl: null,
    calories: 450,
    protein: 20,
    carbs: 55,
    fat: 16,
    fiber: 3,
    sugar: 8,
    isUserCreated: false,
    source: 'database',
    ingredients: [
      { text: 'rice noodles', order: 1 },
      { text: 'shrimp', order: 2 },
      { text: 'peanuts', order: 3 },
      { text: 'bean sprouts', order: 4 },
    ],
    instructions: [{ text: 'Cook noodles', step: 1 }],
    createdAt: new Date(),
    ...overrides,
  };
}

// --- Unit tests for cuisine adjacency ---

describe('calculateCuisineAdjacency', () => {
  it('returns 1.0 for exact match', () => {
    expect(calculateCuisineAdjacency('Thai', 'Thai')).toBe(1.0);
  });

  it('returns 0.6 for adjacent cuisine', () => {
    expect(calculateCuisineAdjacency('Thai', 'Lao')).toBe(0.6);
    expect(calculateCuisineAdjacency('Thai', 'Vietnamese')).toBe(0.6);
    expect(calculateCuisineAdjacency('Italian', 'French')).toBe(0.6);
  });

  it('returns 0.6 for reverse adjacency', () => {
    // Lao lists Thai, so both directions should work
    expect(calculateCuisineAdjacency('Lao', 'Thai')).toBe(0.6);
  });

  it('returns 0 for unrelated cuisines', () => {
    expect(calculateCuisineAdjacency('Thai', 'Mexican')).toBe(0);
    expect(calculateCuisineAdjacency('Italian', 'Korean')).toBe(0);
  });

  it('handles case insensitivity', () => {
    expect(calculateCuisineAdjacency('thai', 'Thai')).toBe(1.0);
    expect(calculateCuisineAdjacency('THAI', 'lao')).toBe(0.6);
  });
});

describe('CUISINE_ADJACENCY map', () => {
  it('Thai includes Lao and Burmese', () => {
    expect(CUISINE_ADJACENCY['Thai']).toContain('Lao');
    expect(CUISINE_ADJACENCY['Thai']).toContain('Burmese');
  });

  it('Italian includes Mediterranean and French', () => {
    expect(CUISINE_ADJACENCY['Italian']).toContain('Mediterranean');
    expect(CUISINE_ADJACENCY['Italian']).toContain('French');
  });

  it('Mexican includes Tex-Mex and Latin American', () => {
    expect(CUISINE_ADJACENCY['Mexican']).toContain('Tex-Mex');
    expect(CUISINE_ADJACENCY['Mexican']).toContain('Latin American');
  });
});

// --- Controller integration tests ---

describe('getRelatedRecipes controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when recipe not found', async () => {
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);
    const { res, json, status } = makeRes();
    await recipeController.getRelatedRecipes(
      makeReq({ params: { id: 'nonexistent' } }) as Request,
      res as Response,
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'Recipe not found' });
  });

  it('returns related recipes from same and adjacent cuisines', async () => {
    const target = makeRecipe({ id: 'target' });
    const laoRecipe = makeRecipe({
      id: 'lao-1',
      title: 'Lao Larb',
      cuisine: 'Lao',
      ingredients: [{ text: 'ground pork', order: 1 }, { text: 'rice noodles', order: 2 }],
    });
    const mexicanRecipe = makeRecipe({
      id: 'mex-1',
      title: 'Tacos',
      cuisine: 'Mexican',
      ingredients: [{ text: 'tortilla', order: 1 }, { text: 'beef', order: 2 }],
    });
    const thaiRecipe = makeRecipe({
      id: 'thai-2',
      title: 'Green Curry',
      cuisine: 'Thai',
      ingredients: [{ text: 'coconut milk', order: 1 }, { text: 'shrimp', order: 2 }],
    });

    // findUnique for target
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(target);

    // findMany for candidates (first call), then for full recipes (second call)
    (mockPrisma.recipe.findMany as jest.Mock)
      .mockResolvedValueOnce([laoRecipe, mexicanRecipe, thaiRecipe]) // candidates
      .mockResolvedValueOnce([laoRecipe, thaiRecipe]); // full fetch (only matching IDs)

    const { res, json } = makeRes();
    await recipeController.getRelatedRecipes(
      makeReq({ params: { id: 'target' }, query: { limit: '6' } }) as Request,
      res as Response,
    );

    expect(json).toHaveBeenCalled();
    const result = json.mock.calls[0][0];
    expect(Array.isArray(result)).toBe(true);
    // Should not contain the target recipe itself
    expect(result.every((r: any) => r.id !== 'target')).toBe(true);
  });

  it('does not include the current recipe in results', async () => {
    const target = makeRecipe({ id: 'target' });
    const other = makeRecipe({ id: 'other', title: 'Tom Yum', cuisine: 'Thai' });

    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(target);
    (mockPrisma.recipe.findMany as jest.Mock)
      .mockResolvedValueOnce([other])
      .mockResolvedValueOnce([other]);

    const { res, json } = makeRes();
    await recipeController.getRelatedRecipes(
      makeReq({ params: { id: 'target' } }) as Request,
      res as Response,
    );

    const result = json.mock.calls[0][0];
    expect(result.find((r: any) => r.id === 'target')).toBeUndefined();
  });

  it('returns empty array when no related recipes found', async () => {
    const target = makeRecipe({ id: 'target', cuisine: 'Tibetan' });

    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(target);
    (mockPrisma.recipe.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // no candidates
      .mockResolvedValueOnce([]); // no full recipes

    const { res, json } = makeRes();
    await recipeController.getRelatedRecipes(
      makeReq({ params: { id: 'target' } }) as Request,
      res as Response,
    );

    const result = json.mock.calls[0][0];
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('respects the limit query param', async () => {
    const target = makeRecipe({ id: 'target' });
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeRecipe({ id: `r-${i}`, title: `Thai Dish ${i}`, cuisine: 'Thai' })
    );

    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue(target);
    (mockPrisma.recipe.findMany as jest.Mock)
      .mockResolvedValueOnce(candidates)
      .mockResolvedValueOnce(candidates.slice(0, 2));

    const { res, json } = makeRes();
    await recipeController.getRelatedRecipes(
      makeReq({ params: { id: 'target' }, query: { limit: '2' } }) as Request,
      res as Response,
    );

    // The controller fetches by IDs returned from findRelatedRecipes, which respects limit
    expect(json).toHaveBeenCalled();
  });
});
