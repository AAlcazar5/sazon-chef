// backend/tests/modules/shoppingListDuplicateDetection.test.ts
// TDD: Duplicate list protection via Jaccard similarity on recipeIds within 7d

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: { findMany: jest.fn() },
    shoppingList: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    shoppingListItem: { create: jest.fn() },
    pantryItem: { findMany: jest.fn() },
    purchaseHistory: { upsert: jest.fn() },
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

const makeRecipe = (id: string) => ({
  id,
  title: `Recipe ${id}`,
  ingredients: [
    { id: `${id}-i1`, recipeId: id, text: '1 cup flour', order: 1 },
  ],
});

// Simulate a list created 3 days ago with sourceRecipeIds
const makeExistingList = (id: string, recipeIds: string[], daysAgo: number = 3) => {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  return {
    id,
    userId: 'user-1',
    name: `Existing List ${id}`,
    sourceRecipeIds: JSON.stringify(recipeIds),
    createdAt,
  };
};

describe('generateFromRecipes duplicate detection (Jaccard)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.shoppingListItem.create as jest.Mock).mockImplementation((args: any) =>
      Promise.resolve({ id: 'item-x', ...args.data })
    );
    (prisma.shoppingList.findUnique as jest.Mock).mockResolvedValue({
      id: 'list-new', userId: 'user-1', name: 'New List', items: [],
    });
  });

  test('returns duplicate signal when Jaccard >= 0.8 (identical sets)', async () => {
    const recipeIds = ['r1', 'r2', 'r3'];
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(recipeIds.map(makeRecipe));
    // Existing list within 7d with same recipes
    (prisma.shoppingList.findMany as jest.Mock).mockResolvedValue([
      makeExistingList('list-old', ['r1', 'r2', 'r3'], 2),
    ]);

    const req = mockReq({ recipeIds, name: 'My List' });
    const res = mockRes();
    await shoppingListController.generateFromRecipes(req as Request, res as Response);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.duplicateOf).toBe('list-old');
    expect(jsonArg.similarity).toBeCloseTo(1.0, 2);
    expect(jsonArg.existingListName).toBe('Existing List list-old');
    // Should NOT have created a new list
    expect(prisma.shoppingList.create).not.toHaveBeenCalled();
  });

  test('returns similarity=1 for exact match (signals "Open existing list")', async () => {
    const recipeIds = ['r1', 'r2'];
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(recipeIds.map(makeRecipe));
    (prisma.shoppingList.findMany as jest.Mock).mockResolvedValue([
      makeExistingList('list-exact', ['r1', 'r2'], 1),
    ]);

    const req = mockReq({ recipeIds });
    const res = mockRes();
    await shoppingListController.generateFromRecipes(req as Request, res as Response);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.duplicateOf).toBe('list-exact');
    expect(jsonArg.similarity).toBe(1);
  });

  test('returns duplicate when Jaccard is 0.8 (4 of 5 shared)', async () => {
    const recipeIds = ['r1', 'r2', 'r3', 'r4', 'r5'];
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(recipeIds.map(makeRecipe));
    // Existing list has r1-r4 (intersection=4, union=6) → J = 4/6 ≈ 0.667 < 0.8 — NOT a dup
    // To get ≥0.8: existing=[r1,r2,r3,r4], new=[r1,r2,r3,r4,r5] → J=4/5=0.8
    (prisma.shoppingList.findMany as jest.Mock).mockResolvedValue([
      makeExistingList('list-80', ['r1', 'r2', 'r3', 'r4'], 4),
    ]);
    (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
      id: 'list-new', userId: 'user-1', name: 'New List',
    });

    const req = mockReq({ recipeIds });
    const res = mockRes();
    await shoppingListController.generateFromRecipes(req as Request, res as Response);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.duplicateOf).toBe('list-80');
    expect(jsonArg.similarity).toBeCloseTo(0.8, 2);
  });

  test('does NOT flag duplicate when Jaccard < 0.8', async () => {
    const recipeIds = ['r1', 'r2', 'r3'];
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(recipeIds.map(makeRecipe));
    // Existing list has only r1 → J = 1/3 ≈ 0.33
    (prisma.shoppingList.findMany as jest.Mock).mockResolvedValue([
      makeExistingList('list-low', ['r1'], 2),
    ]);
    (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
      id: 'list-new', userId: 'user-1', name: 'New List',
    });
    (prisma.shoppingList.findUnique as jest.Mock).mockResolvedValue({
      id: 'list-new', items: [],
    });

    const req = mockReq({ recipeIds });
    const res = mockRes();
    await shoppingListController.generateFromRecipes(req as Request, res as Response);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    // Should NOT be a duplicate — a new list should have been created
    expect(jsonArg.duplicateOf).toBeUndefined();
    expect(prisma.shoppingList.create).toHaveBeenCalled();
  });

  test('ignores lists older than 7 days', async () => {
    const recipeIds = ['r1', 'r2'];
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(recipeIds.map(makeRecipe));
    // Existing list is 8 days old — should be excluded by query
    (prisma.shoppingList.findMany as jest.Mock).mockResolvedValue([]); // Controller queries last 7d only
    (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
      id: 'list-new', userId: 'user-1', name: 'New List',
    });
    (prisma.shoppingList.findUnique as jest.Mock).mockResolvedValue({
      id: 'list-new', items: [],
    });

    const req = mockReq({ recipeIds });
    const res = mockRes();
    await shoppingListController.generateFromRecipes(req as Request, res as Response);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.duplicateOf).toBeUndefined();
    expect(prisma.shoppingList.create).toHaveBeenCalled();
  });

  test('picks the most similar list when multiple candidates exist', async () => {
    const recipeIds = ['r1', 'r2', 'r3'];
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(recipeIds.map(makeRecipe));
    (prisma.shoppingList.findMany as jest.Mock).mockResolvedValue([
      // J(r1,r2,r3 vs r1) = 1/3
      makeExistingList('list-low', ['r1'], 1),
      // J(r1,r2,r3 vs r1,r2,r3) = 1.0
      makeExistingList('list-high', ['r1', 'r2', 'r3'], 2),
    ]);

    const req = mockReq({ recipeIds });
    const res = mockRes();
    await shoppingListController.generateFromRecipes(req as Request, res as Response);

    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.duplicateOf).toBe('list-high');
  });

  test('stores sourceRecipeIds JSON when creating a new list', async () => {
    const recipeIds = ['r1', 'r2'];
    (prisma.recipe.findMany as jest.Mock).mockResolvedValue(recipeIds.map(makeRecipe));
    (prisma.shoppingList.findMany as jest.Mock).mockResolvedValue([]); // No existing lists
    (prisma.shoppingList.create as jest.Mock).mockResolvedValue({
      id: 'list-new', userId: 'user-1', name: 'New List',
    });
    (prisma.shoppingList.findUnique as jest.Mock).mockResolvedValue({
      id: 'list-new', items: [],
    });

    const req = mockReq({ recipeIds });
    const res = mockRes();
    await shoppingListController.generateFromRecipes(req as Request, res as Response);

    const createCall = (prisma.shoppingList.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.sourceRecipeIds).toBe(JSON.stringify(recipeIds));
  });
});
