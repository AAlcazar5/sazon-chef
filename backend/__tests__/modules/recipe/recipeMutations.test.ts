// backend/__tests__/modules/recipe/recipeMutations.test.ts
// Coverage push 2026-05-04 — modules/recipe was at 22.6% before this file.
// Targets the handler layer: collection ops + cooking-history ops + bulk ops.

import { Request, Response } from 'express';

jest.mock('../../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    generateRecipe: jest.fn(),
    getAvailableProviders: jest.fn().mockReturnValue(['mock']),
  })),
}));

jest.mock('../../../src/services/healthifyService', () => ({
  healthifyService: { healthifyRecipe: jest.fn() },
}));

jest.mock('../../../src/services/recipeImportService', () => ({
  importRecipeFromUrl: jest.fn(),
  RecipeImportError: class RecipeImportError extends Error {},
}));

jest.mock('../../../src/services/aiRecipeService', () => ({
  aiRecipeService: { generateFromDescription: jest.fn() },
}));

jest.mock('../../../src/utils/batchCookingRecommendations', () => ({
  generateBatchCookingRecommendations: jest.fn(),
}));

jest.mock('../../../src/utils/runtimeImageVariation', () => ({
  varyImageUrlsForPage: jest.fn().mockImplementation((r: any) => r),
}));

const mockInvalidateUserCache = jest.fn();
jest.mock('../../../src/utils/recommendationCache', () => ({
  recommendationCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(false),
    invalidateUserCache: (...args: unknown[]) => mockInvalidateUserCache(...args),
    getBehavioralData: jest.fn().mockResolvedValue({
      likedCuisines: [],
      dislikedIngredients: [],
      preferredCookTimes: [],
      likedRecipeIds: [],
      dislikedRecipeIds: [],
    }),
  },
}));

jest.mock('../../../src/utils/cacheService', () => ({
  cacheService: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

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

jest.mock('../../../src/utils/externalScoring', () => ({
  calculateExternalScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/healthMetricsScoring', () => ({
  calculateHealthMetricsScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/utils/predictiveScoring', () => ({
  calculatePredictiveScore: jest.fn().mockReturnValue(0),
}));

jest.mock('../../../src/services/recipeGenerationService', () => ({
  recipeGenerationService: { generateRecipe: jest.fn() },
}));

jest.mock('../../../src/services/spoonacularService', () => ({
  spoonacularService: { searchRecipes: jest.fn() },
}));

jest.mock('../../../src/services/aiEnrichmentService', () => ({
  aiEnrichmentService: { enrichRecipe: jest.fn() },
}));

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
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    savedRecipe: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    collection: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    recipeCollection: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    recipeView: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    cookingLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    composedPlate: {
      findFirst: jest.fn(),
    },
    userPreferences: { findFirst: jest.fn(), findUnique: jest.fn() },
    macroGoals: { findFirst: jest.fn(), findUnique: jest.fn() },
    userPhysicalProfile: { findFirst: jest.fn(), findUnique: jest.fn() },
    recipeIngredient: { deleteMany: jest.fn(), createMany: jest.fn() },
    recipeInstruction: { deleteMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    recipeFeedback: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
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

describe('bulkUnsaveRecipes', () => {
  it('returns 400 when recipeIds is missing or not an array', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.bulkUnsaveRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(p.savedRecipe.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 400 when recipeIds is empty', async () => {
    const req = buildReq({ body: { recipeIds: [] } });
    const res = buildRes();
    await recipeController.bulkUnsaveRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('deletes saved recipes scoped to userId and invalidates cache', async () => {
    p.savedRecipe.deleteMany.mockResolvedValueOnce({ count: 3 });
    const req = buildReq({ body: { recipeIds: ['r1', 'r2', 'r3'] } });
    const res = buildRes();
    await recipeController.bulkUnsaveRecipes(req, res);
    expect(p.savedRecipe.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', recipeId: { in: ['r1', 'r2', 'r3'] } },
    });
    expect(mockInvalidateUserCache).toHaveBeenCalledWith('u1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 3 }));
  });

  it('returns 500 when prisma throws', async () => {
    p.savedRecipe.deleteMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ body: { recipeIds: ['r1'] } });
    const res = buildRes();
    await recipeController.bulkUnsaveRecipes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('bulkMoveToCollection', () => {
  it('returns 400 when recipeIds missing', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.bulkMoveToCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('clears existing collection associations and creates new ones', async () => {
    p.savedRecipe.findMany.mockResolvedValueOnce([
      { id: 's1', recipeId: 'r1' },
      { id: 's2', recipeId: 'r2' },
    ]);
    p.recipeCollection.deleteMany.mockResolvedValue({ count: 2 });
    p.recipeCollection.create.mockResolvedValue({});
    const req = buildReq({ body: { recipeIds: ['r1', 'r2'], collectionIds: ['c1'] } });
    const res = buildRes();
    await recipeController.bulkMoveToCollection(req, res);
    expect(p.recipeCollection.deleteMany).toHaveBeenCalledTimes(2);
    expect(p.recipeCollection.create).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({ success: true, count: 2 });
  });

  it('swallows P2002 unique-constraint errors during move', async () => {
    p.savedRecipe.findMany.mockResolvedValueOnce([{ id: 's1', recipeId: 'r1' }]);
    p.recipeCollection.deleteMany.mockResolvedValue({ count: 0 });
    const dup = Object.assign(new Error('dup'), { code: 'P2002' });
    p.recipeCollection.create.mockRejectedValueOnce(dup);
    const req = buildReq({ body: { recipeIds: ['r1'], collectionIds: ['c1'] } });
    const res = buildRes();
    await recipeController.bulkMoveToCollection(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, count: 1 });
  });
});

describe('togglePinCollection', () => {
  it('returns 404 when collection does not belong to user', async () => {
    p.collection.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeController.togglePinCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(p.collection.update).not.toHaveBeenCalled();
  });

  it('flips isPinned when the collection exists', async () => {
    p.collection.findFirst.mockResolvedValueOnce({ id: 'c1', userId: 'u1', isPinned: false });
    p.collection.update.mockResolvedValueOnce({ id: 'c1', isPinned: true });
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeController.togglePinCollection(req, res);
    expect(p.collection.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { isPinned: true },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });
});

describe('reorderCollections', () => {
  it('returns 400 when order is missing or not an array', async () => {
    const req = buildReq({ body: {} });
    const res = buildRes();
    await recipeController.reorderCollections(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(p.collection.updateMany).not.toHaveBeenCalled();
  });

  it('updates sortOrder for every entry, scoped to userId', async () => {
    p.collection.updateMany.mockResolvedValue({ count: 1 });
    const req = buildReq({ body: { order: [{ id: 'c1', sortOrder: 0 }, { id: 'c2', sortOrder: 1 }] } });
    const res = buildRes();
    await recipeController.reorderCollections(req, res);
    expect(p.collection.updateMany).toHaveBeenCalledTimes(2);
    expect(p.collection.updateMany.mock.calls[0][0].where.userId).toBe('u1');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('duplicateCollection', () => {
  it('returns 404 when source not owned by user', async () => {
    p.collection.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeController.duplicateCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('creates a copy with " (Copy)" suffix and copies recipe associations', async () => {
    p.collection.findFirst.mockResolvedValueOnce({
      id: 'c1',
      userId: 'u1',
      name: 'Faves',
      description: 'My faves',
      coverImageUrl: null,
      recipeCollections: [{ savedRecipeId: 's1' }, { savedRecipeId: 's2' }],
    });
    p.collection.create.mockResolvedValueOnce({ id: 'c2', userId: 'u1', name: 'Faves (Copy)' });
    p.recipeCollection.createMany.mockResolvedValue({ count: 2 });
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeController.duplicateCollection(req, res);
    expect(p.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'Faves (Copy)' }) }),
    );
    expect(p.recipeCollection.createMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ recipeCount: 2 }),
      }),
    );
  });

  it('returns 409 on P2002 unique-constraint violation', async () => {
    p.collection.findFirst.mockResolvedValueOnce({
      id: 'c1',
      userId: 'u1',
      name: 'Faves',
      recipeCollections: [],
    });
    const dup = Object.assign(new Error('dup'), { code: 'P2002' });
    p.collection.create.mockRejectedValueOnce(dup);
    const req = buildReq({ params: { id: 'c1' } });
    const res = buildRes();
    await recipeController.duplicateCollection(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('mergeCollections', () => {
  it('returns 400 when sourceIds is missing', async () => {
    const req = buildReq({ body: { targetId: 't1' } });
    const res = buildRes();
    await recipeController.mergeCollections(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when target is also a source', async () => {
    const req = buildReq({ body: { sourceIds: ['t1'], targetId: 't1' } });
    const res = buildRes();
    await recipeController.mergeCollections(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when not all collections belong to user', async () => {
    p.collection.findMany.mockResolvedValueOnce([{ id: 's1' }]); // missing one
    const req = buildReq({ body: { sourceIds: ['s1', 's2'], targetId: 't1' } });
    const res = buildRes();
    await recipeController.mergeCollections(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('moves associations to target and deletes source collections', async () => {
    p.collection.findMany.mockResolvedValueOnce([
      { id: 's1' },
      { id: 's2' },
      { id: 't1' },
    ]);
    p.recipeCollection.findMany.mockResolvedValueOnce([
      { savedRecipeId: 'sr1' },
      { savedRecipeId: 'sr2' },
    ]);
    p.recipeCollection.create.mockResolvedValue({});
    p.recipeCollection.deleteMany.mockResolvedValue({ count: 2 });
    p.collection.deleteMany.mockResolvedValue({ count: 2 });
    p.collection.findUnique.mockResolvedValueOnce({
      id: 't1',
      _count: { recipeCollections: 5 },
    });
    const req = buildReq({ body: { sourceIds: ['s1', 's2'], targetId: 't1' } });
    const res = buildRes();
    await recipeController.mergeCollections(req, res);
    expect(p.collection.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['s1', 's2'] }, userId: 'u1' },
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ recipeCount: 5 }) }),
    );
  });
});

describe('moveSavedRecipe', () => {
  it('returns 404 when the recipe is not saved by this user', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'r1' }, body: { collectionIds: ['c1'] } });
    const res = buildRes();
    await recipeController.moveSavedRecipe(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('clears associations when collectionIds is empty', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.recipeCollection.deleteMany.mockResolvedValue({ count: 2 });
    const req = buildReq({ params: { id: 'r1' }, body: { collectionIds: [] } });
    const res = buildRes();
    await recipeController.moveSavedRecipe(req, res);
    expect(p.recipeCollection.deleteMany).toHaveBeenCalledWith({
      where: { savedRecipeId: 's1' },
    });
    expect(p.recipeCollection.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('creates one association per collectionId', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.recipeCollection.deleteMany.mockResolvedValue({ count: 0 });
    p.recipeCollection.create.mockResolvedValue({});
    const req = buildReq({ params: { id: 'r1' }, body: { collectionIds: ['c1', 'c2', 'c3'] } });
    const res = buildRes();
    await recipeController.moveSavedRecipe(req, res);
    expect(p.recipeCollection.create).toHaveBeenCalledTimes(3);
  });
});

describe('recordView', () => {
  it('upserts a recipeView and returns 200', async () => {
    p.recipeView.upsert.mockResolvedValueOnce({});
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.recordView(req, res);
    expect(p.recipeView.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipeId_userId: { recipeId: 'r1', userId: 'u1' } },
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'View recorded' });
  });

  it('returns 500 on prisma error', async () => {
    p.recipeView.upsert.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.recordView(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getRecentlyViewed', () => {
  it('clamps limit at 50 and returns the recipes flat', async () => {
    p.recipeView.findMany.mockResolvedValueOnce([
      { viewedAt: new Date(), recipe: { id: 'r1', title: 'A' } },
      { viewedAt: new Date(), recipe: { id: 'r2', title: 'B' } },
    ]);
    const req = buildReq({ query: { limit: '999' } });
    const res = buildRes();
    await recipeController.getRecentlyViewed(req, res);
    const callArgs = p.recipeView.findMany.mock.calls[0][0];
    expect(callArgs.take).toBe(50);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'r1' }),
        expect.objectContaining({ id: 'r2' }),
      ]),
    );
  });

  it('uses a 30-day cutoff', async () => {
    p.recipeView.findMany.mockResolvedValueOnce([]);
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeController.getRecentlyViewed(req, res);
    const callArgs = p.recipeView.findMany.mock.calls[0][0];
    const cutoff = callArgs.where.viewedAt.gte as Date;
    const daysAgo = (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysAgo).toBeGreaterThan(29);
    expect(daysAgo).toBeLessThan(31);
  });
});

describe('recordCook', () => {
  it('creates a cookingLog and invalidates cache', async () => {
    p.cookingLog.create.mockResolvedValueOnce({});
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'system' });
    const req = buildReq({ params: { id: 'r1' }, body: { notes: 'great' } });
    const res = buildRes();
    await recipeController.recordCook(req, res);
    expect(p.cookingLog.create).toHaveBeenCalledWith({
      data: { recipeId: 'r1', userId: 'u1', notes: 'great' },
    });
    expect(mockInvalidateUserCache).toHaveBeenCalledWith('u1');
    expect(res.json).toHaveBeenCalledWith({ message: 'Cook recorded' });
  });

  it('fires plate_cooked affinity event for user-composed recipes', async () => {
    p.cookingLog.create.mockResolvedValueOnce({});
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'user-composed' });
    p.composedPlate.findFirst.mockResolvedValueOnce({
      componentIds: JSON.stringify([{ slot: 'protein', componentId: 'comp-1' }, { slot: 'protein', componentId: 'comp-2' }]),
    });
    const req = buildReq({ params: { id: 'r1' }, body: {} });
    const res = buildRes();
    await recipeController.recordCook(req, res);
    expect(mockRecordAffinityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'plate_cooked',
        userId: 'u1',
        componentIds: ['comp-1', 'comp-2'],
      }),
    );
  });

  it('skips affinity event silently when componentIds JSON is malformed', async () => {
    p.cookingLog.create.mockResolvedValueOnce({});
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'user-composed' });
    p.composedPlate.findFirst.mockResolvedValueOnce({ componentIds: 'not-json' });
    const req = buildReq({ params: { id: 'r1' }, body: {} });
    const res = buildRes();
    await recipeController.recordCook(req, res);
    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Cook recorded' });
  });

  it('returns 500 when cookingLog.create throws', async () => {
    p.cookingLog.create.mockRejectedValueOnce(new Error('db'));
    const req = buildReq({ params: { id: 'r1' }, body: {} });
    const res = buildRes();
    await recipeController.recordCook(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getCookingHistory', () => {
  it('returns empty history when there are no logs', async () => {
    p.cookingLog.findMany.mockResolvedValueOnce([]);
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.getCookingHistory(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId: 'r1',
        cookCount: 0,
        lastCooked: null,
        history: [],
      }),
    );
  });

  it('returns logs ordered desc and surfaces lastCooked from first row', async () => {
    const newer = new Date('2026-05-01T00:00:00Z');
    const older = new Date('2026-04-01T00:00:00Z');
    p.cookingLog.findMany.mockResolvedValueOnce([
      { id: 'l1', cookedAt: newer, notes: null },
      { id: 'l2', cookedAt: older, notes: 'first cook' },
    ]);
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeController.getCookingHistory(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId: 'r1',
        cookCount: 2,
        lastCooked: newer.toISOString(),
        history: [
          expect.objectContaining({ id: 'l1' }),
          expect.objectContaining({ id: 'l2', notes: 'first cook' }),
        ],
      }),
    );
  });
});
