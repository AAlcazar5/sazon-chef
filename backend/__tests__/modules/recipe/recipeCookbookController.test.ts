// backend/__tests__/modules/recipe/recipeCookbookController.test.ts
// Targeted tests for the extracted cookbook controller — covers the
// branches that aren't reached by the recipeController-routed tests.

import { Request, Response } from 'express';

const mockInvalidateUserCache = jest.fn();
jest.mock('../../../src/utils/recommendationCache', () => ({
  recommendationCache: {
    invalidateUserCache: (...a: unknown[]) => mockInvalidateUserCache(...a),
  },
}));

const mockRecordAffinityEvent = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../src/services/slotAffinityService', () => ({
  recordAffinityEvent: (...a: unknown[]) => mockRecordAffinityEvent(...a),
}));

jest.mock('../../../src/utils/authHelper', () => ({
  getUserId: jest.fn(() => 'u1'),
}));

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    savedRecipe: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    recipe: { findUnique: jest.fn() },
    composedPlate: { findFirst: jest.fn() },
    recipeView: { upsert: jest.fn(), findMany: jest.fn() },
    cookingLog: { create: jest.fn(), findMany: jest.fn() },
  },
}));

import { recipeCookbookController } from '../../../src/modules/recipe/recipeCookbookController';
import { prisma } from '../../../src/lib/prisma';

const p = prisma as any;

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
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

describe('getSavedMeta — error path', () => {
  it('returns 500 on prisma error', async () => {
    p.savedRecipe.findFirst.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeCookbookController.getSavedMeta(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updateSavedMeta — error paths', () => {
  it('returns 500 when prisma update throws', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.savedRecipe.update.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 5 } });
    const res = buildRes();
    await recipeCookbookController.updateSavedMeta(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('does not fire affinity event for non-user-composed recipes with rating 5', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.savedRecipe.update.mockResolvedValueOnce({ id: 's1', notes: null, rating: 5 });
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'system' });
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 5 } });
    const res = buildRes();
    await recipeCookbookController.updateSavedMeta(req, res);
    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
  });

  it('skips affinity event when no composedPlate exists', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.savedRecipe.update.mockResolvedValueOnce({ id: 's1', notes: null, rating: 5 });
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'user-composed' });
    p.composedPlate.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 5 } });
    const res = buildRes();
    await recipeCookbookController.updateSavedMeta(req, res);
    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
  });

  it('handles malformed componentIds JSON gracefully (no event fires)', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.savedRecipe.update.mockResolvedValueOnce({ id: 's1', notes: null, rating: 5 });
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'user-composed' });
    p.composedPlate.findFirst.mockResolvedValueOnce({ componentIds: 'not-json' });
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 5 } });
    const res = buildRes();
    await recipeCookbookController.updateSavedMeta(req, res);
    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
  });

  it('fires plate_rated for low ratings (≤2) on user-composed', async () => {
    p.savedRecipe.findFirst.mockResolvedValueOnce({ id: 's1', userId: 'u1', recipeId: 'r1' });
    p.savedRecipe.update.mockResolvedValueOnce({ id: 's1', notes: null, rating: 1 });
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'user-composed' });
    p.composedPlate.findFirst.mockResolvedValueOnce({
      componentIds: JSON.stringify([{ slot: 'protein', componentId: 'comp-1' }]),
    });
    const req = buildReq({ params: { id: 'r1' }, body: { rating: 1 } });
    const res = buildRes();
    await recipeCookbookController.updateSavedMeta(req, res);
    expect(mockRecordAffinityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ stars: 1 }),
    );
  });
});

describe('recordView — happy path verification', () => {
  it('uses upsert with composite key', async () => {
    p.recipeView.upsert.mockResolvedValueOnce({});
    const req = buildReq({ params: { id: 'r1' } });
    const res = buildRes();
    await recipeCookbookController.recordView(req, res);
    expect(p.recipeView.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipeId_userId: { recipeId: 'r1', userId: 'u1' } },
      }),
    );
  });
});

describe('getRecentlyViewed — error path', () => {
  it('returns 500 when prisma throws', async () => {
    p.recipeView.findMany.mockRejectedValueOnce(new Error('boom'));
    const req = buildReq({ query: {} });
    const res = buildRes();
    await recipeCookbookController.getRecentlyViewed(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('recordCook — non-user-composed path skips affinity', () => {
  it('skips affinity event when recipe source is "system"', async () => {
    p.cookingLog.create.mockResolvedValueOnce({});
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'system' });
    const req = buildReq({ params: { id: 'r1' }, body: {} });
    const res = buildRes();
    await recipeCookbookController.recordCook(req, res);
    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
    expect(mockInvalidateUserCache).toHaveBeenCalledWith('u1');
  });

  it('skips affinity event when no composedPlate exists', async () => {
    p.cookingLog.create.mockResolvedValueOnce({});
    p.recipe.findUnique.mockResolvedValueOnce({ source: 'user-composed' });
    p.composedPlate.findFirst.mockResolvedValueOnce(null);
    const req = buildReq({ params: { id: 'r1' }, body: {} });
    const res = buildRes();
    await recipeCookbookController.recordCook(req, res);
    expect(mockRecordAffinityEvent).not.toHaveBeenCalled();
  });
});
