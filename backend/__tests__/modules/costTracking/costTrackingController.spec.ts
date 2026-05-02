// backend/__tests__/modules/costTracking/costTrackingController.spec.ts
// 10W: API surface includes the disclaimer + per-meal costSource.

import { Request, Response } from 'express';
import { costTrackingController } from '../../../src/modules/costTracking/costTrackingController';
import { prisma } from '../../../src/lib/prisma';
import { COST_DISCLAIMER, FALLBACK_REASONS } from '../../../src/services/costEstimationService';

jest.mock('../../../src/utils/authHelper', () => ({
  getUserId: jest.fn(() => 'user-1'),
}));

const mockPrisma = prisma as any;

const buildRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('costTrackingController.getRecipeCost', () => {
  beforeAll(() => {
    // Global setup mock doesn't include ingredientCost — wire it lazily.
    if (!mockPrisma.ingredientCost) {
      mockPrisma.ingredientCost = { findMany: jest.fn().mockResolvedValue([]) };
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.ingredientCost.findMany = jest.fn().mockResolvedValue([]);
  });

  it('returns the disclaimer and a costSource field on the payload', async () => {
    mockPrisma.recipe.findUnique.mockResolvedValueOnce({
      id: 'r1',
      servings: 2,
      pricePerServing: null,
      estimatedCost: null,
      estimatedCostPerServing: null,
      difficulty: 'easy',
      ingredients: [
        { text: '1 lb chicken breast', order: 0 },
        { text: '2 cups rice', order: 1 },
      ],
    });
    mockPrisma.recipe.update.mockResolvedValueOnce({});

    const req = { params: { id: 'r1' } } as unknown as Request;
    const res = buildRes();
    await costTrackingController.getRecipeCost(req, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.disclaimer).toBe(COST_DISCLAIMER);
    expect(payload.costSource).toBeDefined();
    expect(Object.values(FALLBACK_REASONS)).toContain(payload.costSource);
    // Per-meal: real number, not the legacy flat $7
    expect(payload.estimatedCostPerServing).toBeGreaterThan(0);
  });

  it('uses cached estimatedCostPerServing without recomputing when present', async () => {
    mockPrisma.recipe.findUnique.mockResolvedValueOnce({
      id: 'r2',
      servings: 4,
      pricePerServing: null,
      estimatedCost: 12,
      estimatedCostPerServing: 3,
      costSource: FALLBACK_REASONS.PRICED,
      difficulty: 'easy',
      ingredients: [],
    });

    const req = { params: { id: 'r2' } } as unknown as Request;
    const res = buildRes();
    await costTrackingController.getRecipeCost(req, res);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.estimatedCost).toBe(12);
    expect(payload.estimatedCostPerServing).toBe(3);
    expect(payload.disclaimer).toBe(COST_DISCLAIMER);
  });
});
