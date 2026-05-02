// backend/tests/controllers/shoppingListRestore.test.ts
// TDD: POST /api/shopping-lists/:id/restore

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/services/shoppingListLifecycleService', () => ({
  setActiveList: jest.fn(),
}));

import { Request, Response } from 'express';
import { prisma } from '../../src/lib/prisma';
import { setActiveList } from '../../src/services/shoppingListLifecycleService';
import { shoppingListController } from '../../src/modules/shoppingList/shoppingListController';

const mockSetActiveList = setActiveList as jest.Mock;

function mockReq(params: Record<string, string> = {}, body: Record<string, unknown> = {}, userId = 'user-1'): Partial<Request> {
  return {
    params,
    body,
    user: { id: userId, email: 'test@example.com' },
    query: {},
  } as any;
}

function mockRes(): Partial<Response> {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/shopping-lists/:id/restore', () => {
  test('returns 200 with previousActiveId and newActiveId on success', async () => {
    mockSetActiveList.mockResolvedValue({
      previousActiveId: 'list-old',
      newActiveId: 'list-archived',
    });

    const req = mockReq({ id: 'list-archived' });
    const res = mockRes();
    await shoppingListController.restoreList(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      previousActiveId: 'list-old',
      newActiveId: 'list-archived',
    });
    expect(mockSetActiveList).toHaveBeenCalledWith('user-1', 'list-archived');
  });

  test('returns 404 when setActiveList throws a "not found" error', async () => {
    mockSetActiveList.mockRejectedValue(new Error('Shopping list not found'));

    const req = mockReq({ id: 'list-missing' });
    const res = mockRes();
    await shoppingListController.restoreList(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  test('is scoped to userId — cannot restore another user\'s list', async () => {
    mockSetActiveList.mockRejectedValue(new Error('Shopping list not found'));

    // userId is 'user-1' but list belongs to 'user-2'
    const req = mockReq({ id: 'user2-list' }, {}, 'user-1');
    const res = mockRes();
    await shoppingListController.restoreList(req as Request, res as Response);

    expect(mockSetActiveList).toHaveBeenCalledWith('user-1', 'user2-list');
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 500 on unexpected error', async () => {
    mockSetActiveList.mockRejectedValue(new Error('DB connection lost'));

    const req = mockReq({ id: 'list-x' });
    const res = mockRes();
    await shoppingListController.restoreList(req as Request, res as Response);

    // Generic DB error should be 500
    const statusCall = (res.status as jest.Mock).mock.calls[0][0];
    expect(statusCall).toBeGreaterThanOrEqual(500);
  });

  test('previousActiveId is null when there was no prior active list', async () => {
    mockSetActiveList.mockResolvedValue({
      previousActiveId: null,
      newActiveId: 'list-archived',
    });

    const req = mockReq({ id: 'list-archived' });
    const res = mockRes();
    await shoppingListController.restoreList(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      previousActiveId: null,
      newActiveId: 'list-archived',
    });
  });
});
