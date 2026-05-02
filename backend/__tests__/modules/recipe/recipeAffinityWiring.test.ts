// backend/__tests__/modules/recipe/recipeAffinityWiring.test.ts
// Group 10X Phase 4 — verify affinity events are fired from cook and rating flows.

import { Request, Response } from 'express';

const mockRecordAffinityEvent = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/services/slotAffinityService', () => ({
  recordAffinityEvent: (...args: unknown[]) => mockRecordAffinityEvent(...args),
  getTopComponentsForSlot: jest.fn().mockResolvedValue([]),
  getPairAffinity: jest.fn().mockResolvedValue(null),
  getSlotAffinity: jest.fn().mockResolvedValue(null),
}));

// Minimal prisma mock — only the tables the controller touches in these paths
const mockCookingLogCreate = jest.fn();
const mockRecipeFindUnique = jest.fn();
const mockComposedPlateFindFirst = jest.fn();
const mockSavedRecipeFindFirst = jest.fn();
const mockSavedRecipeUpdate = jest.fn();

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    cookingLog: { create: (...a: unknown[]) => mockCookingLogCreate(...a) },
    recipe: { findUnique: (...a: unknown[]) => mockRecipeFindUnique(...a) },
    composedPlate: { findFirst: (...a: unknown[]) => mockComposedPlateFindFirst(...a) },
    savedRecipe: {
      findFirst: (...a: unknown[]) => mockSavedRecipeFindFirst(...a),
      update: (...a: unknown[]) => mockSavedRecipeUpdate(...a),
    },
  },
}));

// Stub all other service imports the controller pulls in
jest.mock('../../../src/services/healthifyService', () => ({ healthifyService: {} }));
jest.mock('../../../src/services/ingredientSwapService', () => ({ getIngredientSwaps: jest.fn() }));
jest.mock('../../../src/services/flavorBoostService', () => ({ flavorBoostService: {} }));
jest.mock('../../../src/services/substitutionService', () => ({ substitutionService: {} }));
jest.mock('../../../src/services/recipeImportService', () => ({ importRecipeFromUrl: jest.fn() }));
jest.mock('../../../src/services/smartCollectionsService', () => ({
  SMART_COLLECTION_DEFINITIONS: [],
  WEATHER_COLLECTION_DEFINITION: null,
  buildRecipeFilter: jest.fn(),
  buildWeatherFilter: jest.fn(),
  recipeMatchesSmartCollection: jest.fn(),
  getSmartCollectionById: jest.fn(),
}));
jest.mock('../../../src/utils/batchCookingRecommendations', () => ({
  generateBatchCookingRecommendations: jest.fn(),
}));
jest.mock('../../../src/utils/runtimeImageVariation', () => ({
  varyImageUrlsForPage: jest.fn(),
}));
jest.mock('../../../src/utils/recommendationCache', () => ({
  recommendationCache: { invalidateUserCache: jest.fn() },
}));
jest.mock('../../../src/utils/cacheService', () => ({
  cacheService: { get: jest.fn(), set: jest.fn() },
}));

const mockGetUserId = jest.fn().mockReturnValue('user-1');
jest.mock('../../../src/utils/authHelper', () => ({
  getUserId: (...a: unknown[]) => mockGetUserId(...a),
  isAuthenticated: jest.fn().mockReturnValue(true),
}));

import { recipeController } from '../../../src/modules/recipe/recipeController';

const buildRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserId.mockReturnValue('user-1');
});

// ─── recordCook → plate_cooked ───────────────────────────────────────────────

describe('recipeController.recordCook — affinity wiring', () => {
  it('fires plate_cooked event when recipe source is user-composed', async () => {
    mockCookingLogCreate.mockResolvedValue({});
    mockRecipeFindUnique.mockResolvedValue({ source: 'user-composed' });
    mockComposedPlateFindFirst.mockResolvedValue({
      componentIds: JSON.stringify([
        { slot: 'protein', componentId: 'c1', portionMultiplier: 1 },
        { slot: 'base', componentId: 'c2', portionMultiplier: 1 },
      ]),
    });
    mockRecordAffinityEvent.mockResolvedValue(undefined);

    const req = { params: { id: 'recipe-1' }, body: {} } as unknown as Request;
    const res = buildRes();

    await recipeController.recordCook(req, res);

    // Give the fire-and-forget promise a tick to settle
    await new Promise((r) => setImmediate(r));

    expect(mockRecordAffinityEvent).toHaveBeenCalledWith({
      type: 'plate_cooked',
      userId: 'user-1',
      componentIds: ['c1', 'c2'],
    });
    expect(res.json).toHaveBeenCalledWith({ message: 'Cook recorded' });
  });

  it('does NOT fire an affinity event for non-composed recipes', async () => {
    mockCookingLogCreate.mockResolvedValue({});
    mockRecipeFindUnique.mockResolvedValue({ source: 'database' });

    const req = { params: { id: 'recipe-2' }, body: {} } as unknown as Request;
    const res = buildRes();

    await recipeController.recordCook(req, res);
    await new Promise((r) => setImmediate(r));

    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
  });

  it('still returns 200 even if affinity lookup fails', async () => {
    mockCookingLogCreate.mockResolvedValue({});
    mockRecipeFindUnique.mockResolvedValue({ source: 'user-composed' });
    mockComposedPlateFindFirst.mockResolvedValue({
      componentIds: JSON.stringify([{ slot: 'protein', componentId: 'c1', portionMultiplier: 1 }]),
    });
    mockRecordAffinityEvent.mockRejectedValue(new Error('DB error'));

    const req = { params: { id: 'recipe-3' }, body: {} } as unknown as Request;
    const res = buildRes();

    await recipeController.recordCook(req, res);
    await new Promise((r) => setImmediate(r));

    expect(res.json).toHaveBeenCalledWith({ message: 'Cook recorded' });
  });
});

// ─── updateSavedMeta → plate_rated ──────────────────────────────────────────

describe('recipeController.updateSavedMeta — affinity wiring', () => {
  it('fires plate_rated with stars=5 for a user-composed 5-star rating', async () => {
    mockSavedRecipeFindFirst.mockResolvedValue({ id: 'sr-1' });
    mockSavedRecipeUpdate.mockResolvedValue({ notes: null, rating: 5 });
    mockRecipeFindUnique.mockResolvedValue({ source: 'user-composed' });
    mockComposedPlateFindFirst.mockResolvedValue({
      componentIds: JSON.stringify([
        { slot: 'protein', componentId: 'c1', portionMultiplier: 1 },
        { slot: 'base', componentId: 'c2', portionMultiplier: 1 },
      ]),
    });
    mockRecordAffinityEvent.mockResolvedValue(undefined);

    const req = {
      params: { id: 'recipe-1' },
      body: { rating: 5 },
    } as unknown as Request;
    const res = buildRes();

    await recipeController.updateSavedMeta(req, res);
    await new Promise((r) => setImmediate(r));

    expect(mockRecordAffinityEvent).toHaveBeenCalledWith({
      type: 'plate_rated',
      userId: 'user-1',
      componentIds: ['c1', 'c2'],
      stars: 5,
    });
  });

  it('fires plate_rated with stars=1 for a user-composed 1-star rating', async () => {
    mockSavedRecipeFindFirst.mockResolvedValue({ id: 'sr-1' });
    mockSavedRecipeUpdate.mockResolvedValue({ notes: null, rating: 1 });
    mockRecipeFindUnique.mockResolvedValue({ source: 'user-composed' });
    mockComposedPlateFindFirst.mockResolvedValue({
      componentIds: JSON.stringify([
        { slot: 'protein', componentId: 'c1', portionMultiplier: 1 },
      ]),
    });
    mockRecordAffinityEvent.mockResolvedValue(undefined);

    const req = {
      params: { id: 'recipe-1' },
      body: { rating: 1 },
    } as unknown as Request;
    const res = buildRes();

    await recipeController.updateSavedMeta(req, res);
    await new Promise((r) => setImmediate(r));

    expect(mockRecordAffinityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'plate_rated', stars: 1 })
    );
  });

  it('does NOT fire affinity for a 3-star rating (neutral)', async () => {
    mockSavedRecipeFindFirst.mockResolvedValue({ id: 'sr-1' });
    mockSavedRecipeUpdate.mockResolvedValue({ notes: null, rating: 3 });
    mockRecipeFindUnique.mockResolvedValue({ source: 'user-composed' });

    const req = {
      params: { id: 'recipe-1' },
      body: { rating: 3 },
    } as unknown as Request;
    const res = buildRes();

    await recipeController.updateSavedMeta(req, res);
    await new Promise((r) => setImmediate(r));

    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
  });

  it('does NOT fire affinity for a non-composed recipe rating', async () => {
    mockSavedRecipeFindFirst.mockResolvedValue({ id: 'sr-1' });
    mockSavedRecipeUpdate.mockResolvedValue({ notes: null, rating: 5 });
    mockRecipeFindUnique.mockResolvedValue({ source: 'database' });

    const req = {
      params: { id: 'recipe-1' },
      body: { rating: 5 },
    } as unknown as Request;
    const res = buildRes();

    await recipeController.updateSavedMeta(req, res);
    await new Promise((r) => setImmediate(r));

    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
  });
});
