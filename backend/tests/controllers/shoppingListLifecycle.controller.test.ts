// backend/tests/controllers/shoppingListLifecycle.controller.test.ts
// Integration tests for shoppingListLifecycleController HTTP layer.

jest.mock('../../src/services/shoppingListLifecycleService', () => ({
  setActiveList: jest.fn(),
  archiveList: jest.fn(),
  archiveOnCompletion: jest.fn(),
  autoArchiveStale: jest.fn(),
  cleanupOrphans: jest.fn(),
}));

jest.mock('../../src/services/shoppingListArchiveTiering', () => ({
  tierArchivedListsForUser: jest.fn(),
}));

import { Request, Response } from 'express';
import { shoppingListLifecycleController } from '../../src/modules/shoppingList/shoppingListLifecycleController';
import * as lifecycleService from '../../src/services/shoppingListLifecycleService';
import * as tieringService from '../../src/services/shoppingListArchiveTiering';

function makeReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    user: { id: 'user-1', email: 'test@example.com' },
    params: { id: 'list-1' },
    body: {},
    ...overrides,
  };
}

function makeRes(): Partial<Response> & { json: jest.Mock; status: jest.Mock } {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('shoppingListLifecycleController.setActive', () => {
  test('returns 200 with result on success', async () => {
    (lifecycleService.setActiveList as jest.Mock).mockResolvedValueOnce({
      previousActiveId: 'old-list',
      newActiveId: 'list-1',
    });
    const req = makeReq();
    const res = makeRes();

    await shoppingListLifecycleController.setActive(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { previousActiveId: 'old-list', newActiveId: 'list-1' },
    });
    expect(lifecycleService.setActiveList).toHaveBeenCalledWith('user-1', 'list-1');
  });

  test('returns 400 on error', async () => {
    (lifecycleService.setActiveList as jest.Mock).mockRejectedValueOnce(
      new Error('List not found'),
    );
    const req = makeReq();
    const res = makeRes();

    await shoppingListLifecycleController.setActive(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'List not found' });
  });
});

describe('shoppingListLifecycleController.archive', () => {
  test('returns 200 on success', async () => {
    (lifecycleService.archiveList as jest.Mock).mockResolvedValueOnce(undefined);
    const req = makeReq();
    const res = makeRes();

    await shoppingListLifecycleController.archive(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(lifecycleService.archiveList).toHaveBeenCalledWith('user-1', 'list-1');
  });

  test('returns 400 on error', async () => {
    (lifecycleService.archiveList as jest.Mock).mockRejectedValueOnce(
      new Error('Not found'),
    );
    const req = makeReq();
    const res = makeRes();

    await shoppingListLifecycleController.archive(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('shoppingListLifecycleController.archiveOnCompletion', () => {
  test('returns 200 on success', async () => {
    (lifecycleService.archiveOnCompletion as jest.Mock).mockResolvedValueOnce(undefined);
    const req = makeReq();
    const res = makeRes();

    await shoppingListLifecycleController.archiveOnCompletion(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(lifecycleService.archiveOnCompletion).toHaveBeenCalledWith('user-1', 'list-1');
  });

  test('returns 400 when items not all purchased', async () => {
    (lifecycleService.archiveOnCompletion as jest.Mock).mockRejectedValueOnce(
      new Error('unpurchased items'),
    );
    const req = makeReq();
    const res = makeRes();

    await shoppingListLifecycleController.archiveOnCompletion(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('shoppingListLifecycleController.autoArchiveStale', () => {
  test('returns 200 with archivedIds', async () => {
    (lifecycleService.autoArchiveStale as jest.Mock).mockResolvedValueOnce({
      archivedIds: ['list-a', 'list-b'],
    });
    const req = makeReq({ params: {} });
    const res = makeRes();

    await shoppingListLifecycleController.autoArchiveStale(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { archivedIds: ['list-a', 'list-b'] },
    });
  });

  test('returns 500 on error', async () => {
    (lifecycleService.autoArchiveStale as jest.Mock).mockRejectedValueOnce(
      new Error('DB error'),
    );
    const req = makeReq({ params: {} });
    const res = makeRes();

    await shoppingListLifecycleController.autoArchiveStale(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('shoppingListLifecycleController.cleanupOrphans', () => {
  test('returns 200 with deletedCount', async () => {
    (lifecycleService.cleanupOrphans as jest.Mock).mockResolvedValueOnce({ deletedCount: 3 });
    const req = makeReq({ params: {} });
    const res = makeRes();

    await shoppingListLifecycleController.cleanupOrphans(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: { deletedCount: 3 } });
  });

  test('returns 500 on error', async () => {
    (lifecycleService.cleanupOrphans as jest.Mock).mockRejectedValueOnce(
      new Error('DB error'),
    );
    const req = makeReq({ params: {} });
    const res = makeRes();

    await shoppingListLifecycleController.cleanupOrphans(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('shoppingListLifecycleController.tierArchived', () => {
  test('returns 200 with tieredCount', async () => {
    (tieringService.tierArchivedListsForUser as jest.Mock).mockResolvedValueOnce({ tieredCount: 5 });
    const req = makeReq({ params: {} });
    const res = makeRes();

    await shoppingListLifecycleController.tierArchived(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: { tieredCount: 5 } });
    expect(tieringService.tierArchivedListsForUser).toHaveBeenCalledWith('user-1');
  });

  test('returns 500 on error', async () => {
    (tieringService.tierArchivedListsForUser as jest.Mock).mockRejectedValueOnce(
      new Error('DB error'),
    );
    const req = makeReq({ params: {} });
    const res = makeRes();

    await shoppingListLifecycleController.tierArchived(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
