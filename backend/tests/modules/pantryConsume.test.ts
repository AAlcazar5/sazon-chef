// backend/tests/modules/pantryConsume.test.ts
import { Request, Response } from 'express';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    pantryItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';
import { pantryController } from '../../src/modules/pantry/pantryController';

describe('POST /api/pantry/consume', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, user: { id: 'user-1', email: 't@e.com' } };
    res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  });

  test('returns 400 on empty ingredients array', async () => {
    req.body = { ingredients: [] };
    await pantryController.consume(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when ingredients is missing', async () => {
    req.body = {};
    await pantryController.consume(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('removes exact-match pantry items and returns consumed list', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'tomatoes', userId: 'user-1' },
      { id: 'p2', name: 'onions', userId: 'user-1' },
    ]);
    (prisma.pantryItem.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

    req.body = { ingredients: ['tomatoes', 'onions'] };
    await pantryController.consume(req as Request, res as Response);

    expect(prisma.pantryItem.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: expect.arrayContaining(['p1', 'p2']) }, userId: 'user-1' } }),
    );
    expect(res.json).toHaveBeenCalledWith({ consumed: ['tomatoes', 'onions'], unmatched: [] });
  });

  test('fuzzy token match: "2 cups chopped onions" matches pantry "onions"', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'onions', userId: 'user-1' },
    ]);
    (prisma.pantryItem.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    req.body = { ingredients: ['2 cups chopped onions'] };
    await pantryController.consume(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({ consumed: ['2 cups chopped onions'], unmatched: [] });
    expect(prisma.pantryItem.deleteMany).toHaveBeenCalled();
  });

  test('returns unmatched list for ingredients not in pantry', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'tomatoes', userId: 'user-1' },
    ]);
    (prisma.pantryItem.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    req.body = { ingredients: ['tomatoes', 'fresh basil'] };
    await pantryController.consume(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      consumed: ['tomatoes'],
      unmatched: ['fresh basil'],
    });
  });

  test('does not double-consume the same pantry item for duplicate ingredients', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'p1', name: 'onions', userId: 'user-1' },
    ]);
    (prisma.pantryItem.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    req.body = { ingredients: ['onions', 'diced onions'] };
    await pantryController.consume(req as Request, res as Response);

    const call = (res.json as jest.Mock).mock.calls[0][0];
    expect(call.consumed).toHaveLength(1);
    expect(call.unmatched).toHaveLength(1);
  });

  test('empty pantry → all ingredients unmatched, no delete', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValue([]);

    req.body = { ingredients: ['tomatoes'] };
    await pantryController.consume(req as Request, res as Response);

    expect(prisma.pantryItem.deleteMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ consumed: [], unmatched: ['tomatoes'] });
  });

  test('returns 500 on database error', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockRejectedValue(new Error('db down'));
    req.body = { ingredients: ['tomatoes'] };
    await pantryController.consume(req as Request, res as Response);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
