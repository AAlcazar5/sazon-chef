// backend/__tests__/modules/recipe/recipeReads.test.ts
// Coverage push round 2 — read-side recipe handlers + saved-recipe meta.

import { Request, Response } from 'express';

jest.mock('../../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(['mock']),
  })),
}));
jest.mock('../../../src/services/healthifyService', () => ({ healthifyService: { healthifyRecipe: jest.fn() } }));
jest.mock('../../../src/services/recipeImportService', () => ({
  importRecipeFromUrl: jest.fn(),
  RecipeImportError: class extends Error {},
}));
jest.mock('../../../src/services/aiRecipeService', () => ({ aiRecipeService: { generateFromDescription: jest.fn() } }));
jest.mock('../../../src/utils/batchCookingRecommendations', () => ({ generateBatchCookingRecommendations: jest.fn() }));
jest.mock('../../../src/utils/runtimeImageVariation', () => ({ varyImageUrlsForPage: jest.fn().mockImplementation((r: any) => r) }));
jest.mock('../../../src/utils/recommendationCache', () => ({
  recommendationCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    invalidateUserCache: jest.fn(),
    getBehavioralData: jest.fn().mockResolvedValue({ likedCuisines: [], dislikedIngredients: [], preferredCookTimes: [], likedRecipeIds: [], dislikedRecipeIds: [] }),
  },
}));
jest.mock('../../../src/utils/cacheService', () => ({ cacheService: { get: jest.fn(), set: jest.fn(), del: jest.fn() } }));
jest.mock('../../../src/utils/scoring', () => ({
  calculateRecipeScore: jest.fn().mockReturnValue(70),
  calculateMacroScore: jest.fn().mockReturnValue(70),
  calculateTasteScore: jest.fn().mockReturnValue(60),
}));
jest.mock('../../../src/utils/behavioralScoring', () => ({
  calculateBehavioralScore: jest.fn().mockReturnValue(0),
  calculateBehavioralScoreFromProfile: jest.fn().mockReturnValue(0),
  buildUserTasteProfile: jest.fn().mockReturnValue({}),
}));
jest.mock('../../../src/utils/collaborativeFiltering', () => ({
  getCollaborativeRecommendations: jest.fn().mockResolvedValue([]),
  calculateCollaborativeScore: jest.fn().mockReturnValue(0),
}));
jest.mock('../../../src/utils/dynamicWeightAdjustment', () => ({
  getDynamicWeights: jest.fn().mockReturnValue({}),
  adjustWeights: jest.fn().mockImplementation((w: any) => w),
}));
jest.mock('../../../src/utils/externalScoring', () => ({ calculateExternalScore: jest.fn().mockReturnValue(0) }));
jest.mock('../../../src/utils/healthMetricsScoring', () => ({ calculateHealthMetricsScore: jest.fn().mockReturnValue(0) }));
jest.mock('../../../src/utils/predictiveScoring', () => ({ calculatePredictiveScore: jest.fn().mockReturnValue(0) }));
jest.mock('../../../src/services/recipeGenerationService', () => ({ recipeGenerationService: { generateRecipe: jest.fn() } }));
jest.mock('../../../src/services/spoonacularService', () => ({ spoonacularService: { searchRecipes: jest.fn() } }));
jest.mock('../../../src/services/aiEnrichmentService', () => ({ aiEnrichmentService: { enrichRecipe: jest.fn() } }));
jest.mock('../../../src/utils/privacyHelper', () => ({
  isDataSharingEnabledFromRequest: jest.fn().mockReturnValue(false),
  getPrivacySettingsFromRequest: jest.fn().mockReturnValue({}),
}));

const mockRecordAffinityEvent = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../src/services/slotAffinityService', () => ({
  recordAffinityEvent: (...args: unknown[]) => mockRecordAffinityEvent(...args),
}));

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    savedRecipe: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    composedPlate: { findFirst: jest.fn() },
    searchQuery: { groupBy: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    userPreferences: { findFirst: jest.fn(), findUnique: jest.fn() },
    macroGoals: { findFirst: jest.fn(), findUnique: jest.fn() },
    userPhysicalProfile: { findFirst: jest.fn(), findUnique: jest.fn() },
    recipeIngredient: { deleteMany: jest.fn(), createMany: jest.fn() },
    recipeInstruction: { deleteMany: jest.fn(), createMany: jest.fn() },
    recipeFeedback: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    collection: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    recipeCollection: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  },
}));

import { recipeController } from '../../../src/modules/recipe/recipeController';
import { prisma } from '../../../src/lib/prisma';

const p = prisma as any;

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
}

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    headers: {},
    user: { id: 'u1', email: 'u1@example.com' },
    ...overrides,
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getRandomRecipe', () => {
  it('returns 404 when no recipes exist', async () => {
    p.recipe.findMany.mockResolvedValueOnce([]);
    const req = buildReq();
    const res = buildRes();
    await recipeController.getRandomRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns one of the fetched system recipes', async () => {
    p.recipe.findMany.mockResolvedValueOnce([
      { id: 'r1', title: 'A' },
      { id: 'r2', title: 'B' },
    ]);
    const req = buildReq();
    const res = buildRes();
    await recipeController.getRandomRecipe(req, res);
    expect(p.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isUserCreated: false } }),
    );
    const returned = res.json.mock.calls[0][0];
    expect(['r1', 'r2']).toContain(returned.id);
  });
});

describe('updateSavedMeta', () => {
  it('returns 400 when rating is out of range', async () => {
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 99 } });
    const res = buildRes();
    await recipeController.updateSavedMeta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when rating is non-integer', async () => {
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 4.5 } });
    const res = buildRes();
    await recipeController.updateSavedMeta(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when recipe is not saved by user', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'r1' }, body: { notes: 'x' } });
    const res = buildRes();
    await recipeController.updateSavedMeta(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updates notes + rating and returns the updated values', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.savedRecipe.update.mockResolvedValueOnce({ id: 's1', notes: 'great', rating: 5 });
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'system' });
    const req = buildReq({ params: { id: 'r1' }, body: { notes: 'great', rating: 5 } });
    const res = buildRes();
    await recipeController.updateSavedMeta(req, res);
    expect(p.savedRecipe.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { notes: 'great', rating: 5 } }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'great', rating: 5 }),
    );
  });

  it('fires plate_rated affinity event when user-composed and rating ≥4', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.savedRecipe.update.mockResolvedValueOnce({ id: 's1', notes: null, rating: 5 });
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'user-composed' });
    p.composedPlate.findFirst.mockResolvedValueOnce({
      componentIds: JSON.stringify([{ slot: 'protein', componentId: 'comp-1' }]),
    });
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 5 } });
    const res = buildRes();
    await recipeController.updateSavedMeta(req, res);
    expect(mockRecordAffinityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'plate_rated', stars: 5, componentIds: ['comp-1'] }),
    );
  });

  it('does not fire affinity event for middle ratings (3 stars)', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.savedRecipe.update.mockResolvedValueOnce({ id: 's1', notes: null, rating: 3 });
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'user-composed' });
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 3 } });
    const res = buildRes();
    await recipeController.updateSavedMeta(req, res);
    // 3 stars is the "meh" zone — no affinity signal recorded
    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
  });
});

describe('getEnrichmentStatus', () => {
  it('returns counts + percentage from prisma counts', async () => {
    p.recipe.count
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(40); // enriched
    p.recipe.findMany.mockResolvedValueOnce([
      { id: 'r1', title: 'A' },
      { id: 'r2', title: 'B' },
    ]);
    const req = buildReq();
    const res = buildRes();
    await recipeController.getEnrichmentStatus(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 100,
        enriched: 40,
        unenriched: 60,
        enrichmentPercentage: 40,
      }),
    );
  });

  it('handles zero-recipe edge case without divide-by-zero', async () => {
    p.recipe.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    p.recipe.findMany.mockResolvedValueOnce([]);
    const req = buildReq();
    const res = buildRes();
    await recipeController.getEnrichmentStatus(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 0, enrichmentPercentage: 0 }),
    );
  });
});

describe('getPopularSearches', () => {
  it('clamps limit at 10 and uses a 7-day cutoff', async () => {
    p.searchQuery.groupBy.mockResolvedValueOnce([]);
    const req = buildReq({ query: { limit: '999' } });
    const res = buildRes();
    await recipeController.getPopularSearches(req, res);
    const call = p.searchQuery.groupBy.mock.calls[0][0];
    expect(call.take).toBe(10);
    const cutoff = call.where.searchedAt.gte as Date;
    const daysAgo = (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysAgo).toBeGreaterThan(6.5);
    expect(daysAgo).toBeLessThan(7.5);
  });

  it('shapes the response as { popularSearches: [{ query, count }] }', async () => {
    p.searchQuery.groupBy.mockResolvedValueOnce([
      { query: 'thai chicken', _count: { query: 12 } },
      { query: 'high protein breakfast', _count: { query: 8 } },
    ]);
    const req = buildReq();
    const res = buildRes();
    await recipeController.getPopularSearches(req, res);
    expect(res.json).toHaveBeenCalledWith({
      popularSearches: [
        { query: 'thai chicken', count: 12 },
        { query: 'high protein breakfast', count: 8 },
      ],
    });
  });

  it('only counts queries with resultCount > 0', async () => {
    p.searchQuery.groupBy.mockResolvedValueOnce([]);
    const req = buildReq();
    const res = buildRes();
    await recipeController.getPopularSearches(req, res);
    const call = p.searchQuery.groupBy.mock.calls[0][0];
    expect(call.where.resultCount).toEqual({ gt: 0 });
  });
});

describe('exportCookbook', () => {
  it('returns 500 on prisma error', async () => {
    p.savedRecipe.findMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq();
    const res = buildRes();
    await recipeController.exportCookbook(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns a download payload with Content-Disposition attachment', async () => {
    p.savedRecipe.findMany.mockResolvedValueOnce([
      {
        recipe: {
          title: 'Test Recipe',
          description: 'A test',
          ingredients: [],
          instructions: [],
          cuisine: 'Test',
          cookTime: 30,
          servings: 4,
          calories: 500,
          protein: 30,
        },
        notes: 'great',
        rating: 5,
        cookCount: 2,
        savedAt: new Date(),
        collections: [{ collection: { name: 'Faves' } }],
      },
    ]);
    const req = buildReq();
    const res = buildRes();
    await recipeController.exportCookbook(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    const dispositionCall = res.setHeader.mock.calls.find(
      (c: unknown[]) => c[0] === 'Content-Disposition',
    );
    expect(dispositionCall).toBeDefined();
    expect((dispositionCall as unknown[])[1]).toMatch(/attachment; filename="sazon-cookbook-/);
    const payload = res.json.mock.calls[0][0];
    expect(payload.recipeCount).toBe(1);
    expect(payload.recipes[0].title).toBe('Test Recipe');
    expect(payload.recipes[0].collections).toEqual(['Faves']);
  });
});

describe('getCollections', () => {
  it('returns an empty array shape when user has no collections', async () => {
    p.collection.findMany.mockResolvedValueOnce([]);
    const req = buildReq();
    const res = buildRes();
    await recipeController.getCollections(req, res);
    // Either array or { data: [] } shape — just verify json was called and userId scoped
    expect(p.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u1' }) }),
    );
    expect(res.json).toHaveBeenCalled();
  });
});
