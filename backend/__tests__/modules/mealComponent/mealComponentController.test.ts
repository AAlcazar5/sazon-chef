// backend/__tests__/modules/mealComponent/mealComponentController.test.ts
// Group 10X Phase 1 — Build-a-Plate controller tests.

import { Request, Response } from 'express';

const mockListComponents = jest.fn();
const mockSaveComposedPlate = jest.fn();

jest.mock('../../../src/services/mealComponentService', () => ({
  listComponents: (...args: unknown[]) => mockListComponents(...args),
  saveComposedPlate: (...args: unknown[]) => mockSaveComposedPlate(...args),
}));

const mockGetUserId = jest.fn();
const mockIsAuthenticated = jest.fn();
jest.mock('../../../src/utils/authHelper', () => ({
  getUserId: (...args: unknown[]) => mockGetUserId(...args),
  isAuthenticated: (...args: unknown[]) => mockIsAuthenticated(...args),
}));

import { mealComponentController } from '../../../src/modules/mealComponent/mealComponentController';

const buildRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserId.mockReturnValue('user-1');
  mockIsAuthenticated.mockReturnValue(true);
});

describe('GET /api/meal-components', () => {
  it('returns components from the service with the parsed query', async () => {
    mockListComponents.mockResolvedValueOnce([{ id: 'c1', slot: 'protein' }]);
    const req = {
      query: { slot: 'protein', dietary: 'vegan', cuisine: 'Asian', q: 'tofu' },
    } as unknown as Request;
    const res = buildRes();

    await mealComponentController.list(req, res);

    expect(mockListComponents).toHaveBeenCalledWith({
      userId: 'user-1',
      slot: 'protein',
      dietary: 'vegan',
      cuisine: 'Asian',
      q: 'tofu',
    });
    expect(res.json).toHaveBeenCalledWith({ components: [{ id: 'c1', slot: 'protein' }] });
  });

  it('returns 401 when not authenticated', async () => {
    mockIsAuthenticated.mockReturnValueOnce(false);
    const req = { query: {} } as unknown as Request;
    const res = buildRes();

    await mealComponentController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockListComponents).not.toHaveBeenCalled();
  });

  it('rejects invalid slot value with 400', async () => {
    const req = { query: { slot: 'dessert' } } as unknown as Request;
    const res = buildRes();

    await mealComponentController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 when the service throws', async () => {
    mockListComponents.mockRejectedValueOnce(new Error('boom'));
    const req = { query: {} } as unknown as Request;
    const res = buildRes();

    await mealComponentController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('POST /api/composed-plates', () => {
  it('persists a plate and returns it', async () => {
    const plate = { id: 'plate-1', totalCalories: 500 };
    mockSaveComposedPlate.mockResolvedValueOnce({ plate });
    const req = {
      body: {
        components: [{ slot: 'protein', componentId: 'p1', portionMultiplier: 1 }],
        saveAsRecipe: false,
      },
    } as unknown as Request;
    const res = buildRes();

    await mealComponentController.createPlate(req, res);

    expect(mockSaveComposedPlate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        saveAsRecipe: false,
        components: [{ slot: 'protein', componentId: 'p1', portionMultiplier: 1 }],
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ plate, recipe: undefined });
  });

  it('returns plate + recipe when saveAsRecipe: true', async () => {
    const plate = { id: 'plate-1' };
    const recipe = { id: 'recipe-1' };
    mockSaveComposedPlate.mockResolvedValueOnce({ plate, recipe });
    const req = {
      body: {
        components: [{ slot: 'protein', componentId: 'p1', portionMultiplier: 1 }],
        saveAsRecipe: true,
      },
    } as unknown as Request;
    const res = buildRes();

    await mealComponentController.createPlate(req, res);

    expect(res.json).toHaveBeenCalledWith({ plate, recipe });
  });

  it('returns 401 when not authenticated', async () => {
    mockIsAuthenticated.mockReturnValueOnce(false);
    const req = { body: {} } as unknown as Request;
    const res = buildRes();

    await mealComponentController.createPlate(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockSaveComposedPlate).not.toHaveBeenCalled();
  });

  it('rejects empty components array with 400', async () => {
    const req = {
      body: { components: [], saveAsRecipe: false },
    } as unknown as Request;
    const res = buildRes();

    await mealComponentController.createPlate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockSaveComposedPlate).not.toHaveBeenCalled();
  });

  it('rejects invalid slot in component with 400', async () => {
    const req = {
      body: {
        components: [{ slot: 'dessert', componentId: 'p1', portionMultiplier: 1 }],
      },
    } as unknown as Request;
    const res = buildRes();

    await mealComponentController.createPlate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects negative portion multiplier with 400', async () => {
    const req = {
      body: {
        components: [{ slot: 'protein', componentId: 'p1', portionMultiplier: -1 }],
      },
    } as unknown as Request;
    const res = buildRes();

    await mealComponentController.createPlate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 when the service throws unexpectedly', async () => {
    mockSaveComposedPlate.mockRejectedValueOnce(new Error('db down'));
    const req = {
      body: {
        components: [{ slot: 'protein', componentId: 'p1', portionMultiplier: 1 }],
        saveAsRecipe: false,
      },
    } as unknown as Request;
    const res = buildRes();

    await mealComponentController.createPlate(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
