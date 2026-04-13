// backend/tests/modules/shoppingPantrySync.test.ts
// Verifies that toggling a shopping item auto-syncs a PantryItem with source='shopping',
// and that untoggling removes it only when source='shopping' (never a manual entry).
import { Request, Response } from 'express';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: { findFirst: jest.fn() },
    shoppingListItem: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    pantryItem: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    purchaseHistory: { upsert: jest.fn() },
  },
}));

import { prisma } from '../../src/lib/prisma';
import { shoppingListController } from '../../src/modules/shoppingList/shoppingListController';

const flushAsync = () => new Promise((r) => setImmediate(r));

describe('Shopping → Pantry auto-sync', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { listId: 'list-1', itemId: 'item-1' },
      body: {},
      user: { id: 'user-1', email: 't@e.com' },
    };
    res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    (prisma.shoppingList.findFirst as jest.Mock).mockResolvedValue({ id: 'list-1', userId: 'user-1' });
  });

  test('toggling item to purchased upserts a PantryItem with source="shopping"', async () => {
    (prisma.shoppingListItem.findFirst as jest.Mock).mockResolvedValue({
      id: 'item-1', shoppingListId: 'list-1', name: 'Tomatoes', quantity: '2 lb', category: 'Produce', purchased: false, price: null,
    });
    (prisma.shoppingListItem.update as jest.Mock).mockResolvedValue({ id: 'item-1', purchased: true });
    (prisma.pantryItem.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.pantryItem.upsert as jest.Mock).mockResolvedValue({});

    req.params = { listId: 'list-1', itemId: 'item-1' };
    req.body = { purchased: true };
    await shoppingListController.updateItem(req as Request, res as Response);
    await flushAsync();

    expect(prisma.pantryItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_name: { userId: 'user-1', name: 'tomatoes' } },
      create: expect.objectContaining({ userId: 'user-1', name: 'tomatoes', category: 'Produce', source: 'shopping' }),
    }));
  });

  test('toggling item back to unpurchased removes auto-stocked pantry item', async () => {
    (prisma.shoppingListItem.findFirst as jest.Mock).mockResolvedValue({
      id: 'item-1', shoppingListId: 'list-1', name: 'Tomatoes', quantity: '2 lb', category: 'Produce', purchased: true, price: null,
    });
    (prisma.shoppingListItem.update as jest.Mock).mockResolvedValue({ id: 'item-1', purchased: false });
    (prisma.pantryItem.findUnique as jest.Mock).mockResolvedValue({ id: 'p-1', userId: 'user-1', name: 'tomatoes', source: 'shopping' });
    (prisma.pantryItem.delete as jest.Mock).mockResolvedValue({});

    req.body = { purchased: false };
    await shoppingListController.updateItem(req as Request, res as Response);
    await flushAsync();

    expect(prisma.pantryItem.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
  });

  test('toggling a manual pantry entry to unpurchased does NOT delete it', async () => {
    (prisma.shoppingListItem.findFirst as jest.Mock).mockResolvedValue({
      id: 'item-1', shoppingListId: 'list-1', name: 'Salt', quantity: '1', category: 'Pantry', purchased: true, price: null,
    });
    (prisma.shoppingListItem.update as jest.Mock).mockResolvedValue({ id: 'item-1', purchased: false });
    (prisma.pantryItem.findUnique as jest.Mock).mockResolvedValue({ id: 'p-2', userId: 'user-1', name: 'salt', source: 'manual' });

    req.body = { purchased: false };
    await shoppingListController.updateItem(req as Request, res as Response);
    await flushAsync();

    expect(prisma.pantryItem.delete).not.toHaveBeenCalled();
  });

  test('toggling a manual pantry entry to purchased does NOT overwrite source', async () => {
    (prisma.shoppingListItem.findFirst as jest.Mock).mockResolvedValue({
      id: 'item-1', shoppingListId: 'list-1', name: 'Salt', quantity: '1', category: 'Pantry', purchased: false, price: null,
    });
    (prisma.shoppingListItem.update as jest.Mock).mockResolvedValue({ id: 'item-1', purchased: true });
    (prisma.pantryItem.findUnique as jest.Mock).mockResolvedValue({ id: 'p-2', userId: 'user-1', name: 'salt', source: 'manual' });

    req.body = { purchased: true };
    await shoppingListController.updateItem(req as Request, res as Response);
    await flushAsync();

    expect(prisma.pantryItem.upsert).not.toHaveBeenCalled();
  });

  test('batch update stocks multiple pantry items in one call', async () => {
    (prisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'i1', name: 'Onion', quantity: '1', category: 'Produce', purchased: false, price: null },
      { id: 'i2', name: 'Garlic', quantity: '1', category: 'Produce', purchased: false, price: null },
    ]);
    (prisma.shoppingListItem.update as jest.Mock).mockImplementation(({ where }: any) => Promise.resolve({ id: where.id, purchased: true }));
    (prisma.pantryItem.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.pantryItem.upsert as jest.Mock).mockResolvedValue({});

    req.params = { listId: 'list-1' };
    req.body = { updates: [{ itemId: 'i1', purchased: true }, { itemId: 'i2', purchased: true }] };
    await shoppingListController.batchUpdateItems(req as Request, res as Response);
    await flushAsync();

    expect(prisma.pantryItem.upsert).toHaveBeenCalledTimes(2);
    const calls = (prisma.pantryItem.upsert as jest.Mock).mock.calls.map((c) => c[0].create.name);
    expect(calls).toEqual(expect.arrayContaining(['onion', 'garlic']));
  });
});
