// backend/tests/modules/budgetPreviewService.test.ts
// TDD: Budget preview endpoint

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: { findMany: jest.fn() },
    purchaseHistory: { findMany: jest.fn() },
    shoppingList: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    shoppingListItem: { create: jest.fn() },
    pantryItem: { findMany: jest.fn() },
  },
}));

jest.mock('../../src/utils/packageSizeCalculator', () => ({
  calculatePurchaseQuantity: jest.fn((aggregated: any) => ({
    displayText: `${aggregated.totalAmount} ${aggregated.totalUnit}`,
    buyAmount: aggregated.totalAmount,
    buyUnit: aggregated.totalUnit,
    packageSize: null,
  })),
}));

import { Request, Response } from 'express';
import { prisma } from '../../src/lib/prisma';
import { shoppingListGenerationController as shoppingListController } from '../../src/modules/shoppingList/shoppingListGenerationController';

const mockReq = (body: object): Partial<Request> => ({
  body,
  user: { id: 'user-1', email: 'test@example.com' },
  params: {},
  query: {},
});

const mockRes = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const ninetyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d;
};

describe('POST /api/shopping-lists/budget-preview', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: one recipe with a couple ingredients
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r1',
        title: 'Pasta',
        ingredients: [
          { id: 'i1', recipeId: 'r1', text: '2 cups flour', order: 1 },
          { id: 'i2', recipeId: 'r1', text: '1 lb chicken', order: 2 },
          { id: 'i3', recipeId: 'r1', text: '1 cup milk', order: 3 },
        ],
      },
    ]);
  });

  test('returns items array and totalCents', async () => {
    (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([]);

    const req = mockReq({ recipeIds: ['r1'] });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    const json = (res.json as jest.Mock).mock.calls[0][0];
    expect(json).toHaveProperty('items');
    expect(json).toHaveProperty('totalCents');
    expect(Array.isArray(json.items)).toBe(true);
  });

  test('uses user purchase history (median priceCents) and sets hasUserHistory=true', async () => {
    // User has bought flour before at various prices
    // lastPrice is stored in dollars; controller converts to cents (×100)
    (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([
      { id: 'ph1', userId: 'user-1', itemName: 'flour', category: 'Pantry', lastPrice: 2.00, lastPurchasedAt: new Date() },
      { id: 'ph2', userId: 'user-1', itemName: 'flour', category: 'Pantry', lastPrice: 2.50, lastPurchasedAt: new Date() },
      { id: 'ph3', userId: 'user-1', itemName: 'flour', category: 'Pantry', lastPrice: 3.00, lastPurchasedAt: new Date() },
    ]);

    const req = mockReq({ recipeIds: ['r1'] });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    const json = (res.json as jest.Mock).mock.calls[0][0];
    const flourItem = json.items.find((i: any) => i.name === 'flour');
    // Median of 200, 250, 300 = 250
    expect(flourItem).toBeDefined();
    expect(flourItem.hasUserHistory).toBe(true);
    expect(flourItem.estimatedCents).toBe(250);
  });

  test('falls back to DEFAULT_AISLE_PRICE_CENTS when no user history and no aisle history', async () => {
    (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([]);

    // Only recipe with flour (Pantry aisle default = 350)
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r1',
        title: 'Bread',
        ingredients: [
          { id: 'i1', recipeId: 'r1', text: '2 cups flour', order: 1 },
        ],
      },
    ]);

    const req = mockReq({ recipeIds: ['r1'] });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    const json = (res.json as jest.Mock).mock.calls[0][0];
    const flourItem = json.items.find((i: any) => i.name === 'flour');
    expect(flourItem).toBeDefined();
    expect(flourItem.hasUserHistory).toBe(false);
    // Flour → Pantry aisle → DEFAULT_AISLE_PRICE_CENTS.Pantry = 350
    expect(flourItem.estimatedCents).toBe(350);
  });

  test('user history takes precedence over aisle fallback', async () => {
    // User has history for chicken at $5.00 = 500 cents, default Meat = 800
    (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([
      { id: 'ph1', userId: 'user-1', itemName: 'chicken', category: 'Meat', lastPrice: 5.00, lastPurchasedAt: new Date() },
    ]);

    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r2',
        title: 'Chicken Dish',
        ingredients: [
          { id: 'i1', recipeId: 'r2', text: '1 lb chicken', order: 1 },
        ],
      },
    ]);

    const req = mockReq({ recipeIds: ['r2'] });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    const json = (res.json as jest.Mock).mock.calls[0][0];
    const chickenItem = json.items.find((i: any) => i.name === 'chicken');
    expect(chickenItem.hasUserHistory).toBe(true);
    expect(chickenItem.estimatedCents).toBe(500); // user history, NOT 800 (default Meat)
  });

  test('hasUserHistory=false when item has no purchase history', async () => {
    (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([]);

    const req = mockReq({ recipeIds: ['r1'] });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    const json = (res.json as jest.Mock).mock.calls[0][0];
    json.items.forEach((item: any) => {
      expect(item.hasUserHistory).toBe(false);
    });
  });

  test('totalCents is sum of all item estimatedCents', async () => {
    (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([]);

    const req = mockReq({ recipeIds: ['r1'] });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    const json = (res.json as jest.Mock).mock.calls[0][0];
    const computedTotal = json.items.reduce((sum: number, i: any) => sum + i.estimatedCents, 0);
    expect(json.totalCents).toBe(computedTotal);
  });

  test('returns 400 when recipeIds is missing', async () => {
    const req = mockReq({});
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
  });

  test('returns 400 when recipeIds is empty array', async () => {
    const req = mockReq({ recipeIds: [] });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    expect((res.status as jest.Mock)).toHaveBeenCalledWith(400);
  });

  test('respects servingsMultiplier when computing items', async () => {
    (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([]);

    // Recipe has 1 cup flour, servingsMultiplier doubles it
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r3',
        title: 'Double Batch',
        ingredients: [
          { id: 'i1', recipeId: 'r3', text: '1 cup flour', order: 1 },
        ],
      },
    ]);

    const req = mockReq({ recipeIds: ['r3'], servingsMultiplier: { r3: 2 } });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    const json = (res.json as jest.Mock).mock.calls[0][0];
    const flourItem = json.items.find((i: any) => i.name === 'flour');
    // With 2x multiplier, quantity should be 2 cups
    expect(flourItem).toBeDefined();
    expect(flourItem.quantity).toBe(2);
  });

  test('each item has name, quantity, unit, estimatedCents, hasUserHistory', async () => {
    (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([]);

    const req = mockReq({ recipeIds: ['r1'] });
    const res = mockRes();
    await shoppingListController.getBudgetPreview(req as Request, res as Response);

    const json = (res.json as jest.Mock).mock.calls[0][0];
    json.items.forEach((item: any) => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('quantity');
      expect(item).toHaveProperty('unit');
      expect(item).toHaveProperty('estimatedCents');
      expect(item).toHaveProperty('hasUserHistory');
    });
  });
});
