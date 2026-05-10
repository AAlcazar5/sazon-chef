// Tier P P8 — guard against unbounded findMany on user-facing list endpoints.
//
// The unpaginated branches of getSavedRecipes / getLikedRecipes /
// getDislikedRecipes / getCollections previously ran prisma.findMany without a
// `take:`, so a user with 10K saved recipes could pull the entire table on a
// single request. P8 caps the unpaginated path at MAX_UNPAGINATED_LIST_SIZE
// (500). Real callers still have the paginated `?page=N&limit=L` path for
// arbitrary-size lists.
//
// Tests use a stub prisma client that captures the args of every findMany
// call. We never go to a real DB.

import { Request, Response } from 'express';
import { MAX_UNPAGINATED_LIST_SIZE } from '../../src/utils/listLimits';

// Capture the args every findMany sees.
const findManyArgs: Record<string, any[]> = {};

const recordFindMany = (model: string) =>
  jest.fn((args: any) => {
    findManyArgs[model] = findManyArgs[model] || [];
    findManyArgs[model].push(args);
    return Promise.resolve([]);
  });

const fakePrisma: any = {
  savedRecipe: { findMany: recordFindMany('savedRecipe'), count: jest.fn().mockResolvedValue(0) },
  recipeFeedback: {
    findMany: recordFindMany('recipeFeedback'),
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn(),
  },
  collection: { findMany: recordFindMany('collection') },
  recipeCollection: { findMany: jest.fn().mockResolvedValue([]) },
  userPreferences: { findUnique: jest.fn().mockResolvedValue(null) },
  macroGoals: { findUnique: jest.fn().mockResolvedValue(null) },
  physicalProfile: { findUnique: jest.fn().mockResolvedValue(null) },
  searchQuery: { create: jest.fn().mockResolvedValue({}) },
};

jest.mock('@/lib/prisma', () => ({ prisma: fakePrisma }));
jest.mock('../../src/lib/prisma', () => ({ prisma: fakePrisma }));

// Block side-effect imports that try to wire AI providers / external SDKs at module load.
jest.mock('../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(['mock']),
  })),
}));
jest.mock('../../src/services/healthifyService', () => ({
  healthifyService: { healthifyRecipe: jest.fn() },
}));
jest.mock('../../src/services/recipeGenerationService', () => ({
  recipeGenerationService: { generateRecipe: jest.fn() },
}));
jest.mock('../../src/services/aiRecipeService', () => ({
  aiRecipeService: { generateFromDescription: jest.fn() },
}));
jest.mock('../../src/services/flavorBoostService', () => ({
  flavorBoostService: { getFlavorBoosts: jest.fn() },
}));
jest.mock('../../src/services/ingredientSwapService', () => ({
  getIngredientSwaps: jest.fn().mockReturnValue([]),
}));
jest.mock('../../src/services/substitutionService', () => ({
  substitutionService: { suggestSubstitutions: jest.fn() },
}));
jest.mock('../../src/services/recipeImportService', () => ({
  importRecipeFromUrl: jest.fn(),
  RecipeImportError: class RecipeImportError extends Error {},
}));
jest.mock('../../src/services/slotAffinityService', () => ({
  recordAffinityEvent: jest.fn(),
}));

// Light mocks for incidental imports.
jest.mock('@/utils/scoring', () => ({ calculateRecipeScore: () => ({ totalScore: 0 }) }));
jest.mock('@/utils/healthGrade', () => ({ calculateHealthGrade: () => 'B' }));
jest.mock('@/utils/healthGoalScoring', () => ({ calculateHealthGoalMatch: () => ({ score: 0 }) }));
jest.mock('@/utils/discriminatoryScoring', () => ({
  calculateDiscriminatoryScore: () => 0,
  getUserPreferencesForScoring: () => null,
}));

const buildReq = (query: Record<string, string> = {}): Request =>
  ({
    query,
    user: { id: 'u-1' },
  } as unknown as Request);

const buildRes = (): Response => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  for (const k of Object.keys(findManyArgs)) delete findManyArgs[k];
});

describe('P8: unpaginated list endpoints cap findMany at MAX_UNPAGINATED_LIST_SIZE', () => {
  it('exports the constant and it is a finite, sane positive integer', () => {
    expect(typeof MAX_UNPAGINATED_LIST_SIZE).toBe('number');
    expect(Number.isFinite(MAX_UNPAGINATED_LIST_SIZE)).toBe(true);
    expect(MAX_UNPAGINATED_LIST_SIZE).toBeGreaterThan(0);
    expect(MAX_UNPAGINATED_LIST_SIZE).toBeLessThanOrEqual(1000);
  });

  it('getSavedRecipes (unpaginated, no collectionId) caps savedRecipe.findMany at the limit', async () => {
    const { recipeController } = require('../../src/modules/recipe/recipeController');
    await recipeController.getSavedRecipes(buildReq({}), buildRes());
    const calls = findManyArgs.savedRecipe || [];
    expect(calls.length).toBeGreaterThan(0);
    for (const args of calls) {
      expect(args.take).toBe(MAX_UNPAGINATED_LIST_SIZE);
    }
  });

  it('getSavedRecipes (unpaginated, collectionId path) caps savedRecipe.findMany at the limit', async () => {
    const { recipeController } = require('../../src/modules/recipe/recipeController');
    await recipeController.getSavedRecipes(buildReq({ collectionId: 'c-1' }), buildRes());
    const calls = findManyArgs.savedRecipe || [];
    expect(calls.length).toBeGreaterThan(0);
    for (const args of calls) {
      expect(args.take).toBe(MAX_UNPAGINATED_LIST_SIZE);
    }
  });

  it('getSavedRecipes (paginated) honors the per-page limit (≤100), not the unpaginated cap', async () => {
    const { recipeController } = require('../../src/modules/recipe/recipeController');
    await recipeController.getSavedRecipes(buildReq({ page: '0', limit: '20' }), buildRes());
    const calls = findManyArgs.savedRecipe || [];
    expect(calls.length).toBeGreaterThan(0);
    for (const args of calls) {
      expect(args.take).toBe(20);
    }
  });

  it('getLikedRecipes (unpaginated) caps recipeFeedback.findMany at the limit', async () => {
    const { recipeController } = require('../../src/modules/recipe/recipeController');
    await recipeController.getLikedRecipes(buildReq({}), buildRes());
    const calls = findManyArgs.recipeFeedback || [];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].take).toBe(MAX_UNPAGINATED_LIST_SIZE);
  });

  it('getDislikedRecipes (unpaginated) caps recipeFeedback.findMany at the limit', async () => {
    const { recipeController } = require('../../src/modules/recipe/recipeController');
    await recipeController.getDislikedRecipes(buildReq({}), buildRes());
    const calls = findManyArgs.recipeFeedback || [];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].take).toBe(MAX_UNPAGINATED_LIST_SIZE);
  });

  it('getCollections caps collection.findMany at the limit', async () => {
    const { recipeCollectionsController } = require('../../src/modules/recipe/recipeCollectionsController');
    await recipeCollectionsController.getCollections(buildReq({}), buildRes());
    const calls = findManyArgs.collection || [];
    expect(calls.length).toBe(1);
    expect(calls[0].take).toBe(MAX_UNPAGINATED_LIST_SIZE);
  });
});
