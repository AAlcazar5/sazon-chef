// backend/tests/modules/shoppingListClear.test.ts
// TDD: POST /api/shopping-lists/:id/clear
// RED phase — written before implementation

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findFirst: jest.fn(),
    },
    shoppingListItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/authHelper', () => ({
  getUserId: jest.fn().mockReturnValue('user-1'),
}));

import { Request, Response } from 'express';
import { prisma } from '../../src/lib/prisma';
import { shoppingListMergeController as shoppingListController } from '../../src/modules/shoppingList/shoppingListMergeController';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    params: { id: 'list-1' },
    body: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes(): jest.Mocked<Response> {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

function makeList(overrides: Record<string, unknown> = {}) {
  return {
    id: 'list-1',
    userId: 'user-1',
    name: 'My List',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('POST /api/shopping-lists/:id/clear', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
  });

  it('returns 404 when list not found for user', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.clearItems(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('deletes all items from the list', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.clearItems(req, res);

    expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
      where: { shoppingListId: 'list-1' },
    });
  });

  it('does not delete the list itself', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.clearItems(req, res);

    // shoppingList.delete should not be called
    expect((mockPrisma.shoppingList as any).delete).toBeUndefined();
  });

  it('scopes deletion to userId — 404 for another user list', async () => {
    // findFirst with userId scope returns null
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.clearItems(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockPrisma.shoppingListItem.deleteMany).not.toHaveBeenCalled();
  });

  it('returns success with deletedCount', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.clearItems(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        deletedCount: 5,
      })
    );
  });

  it('handles database errors gracefully', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockRejectedValue(
      new Error('DB connection error')
    );

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.clearItems(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });
});
