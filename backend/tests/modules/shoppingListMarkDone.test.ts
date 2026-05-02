// backend/tests/modules/shoppingListMarkDone.test.ts
// TDD: POST /api/shopping-lists/:id/done
// RED phase — written before implementation

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    shoppingListItem: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/services/shoppingListLifecycleService', () => ({
  archiveList: jest.fn(),
  setActiveList: jest.fn(),
}));

jest.mock('../../src/utils/authHelper', () => ({
  getUserId: jest.fn().mockReturnValue('user-1'),
}));

import { Request, Response } from 'express';
import { prisma } from '../../src/lib/prisma';
import { archiveList, setActiveList } from '../../src/services/shoppingListLifecycleService';
import { shoppingListController } from '../../src/modules/shoppingList/shoppingListController';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockArchiveList = archiveList as jest.Mock;
const mockSetActiveList = setActiveList as jest.Mock;

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
    archivedAt: null,
    createdAt: new Date('2026-04-30T10:00:00Z'),
    updatedAt: new Date('2026-04-30T10:00:00Z'),
    ...overrides,
  };
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    shoppingListId: 'list-1',
    name: 'Milk',
    quantity: '1 gallon',
    category: 'Dairy',
    purchased: false,
    notes: null,
    price: null,
    photoUrl: null,
    recipeId: null,
    sourceRecipeIds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('POST /api/shopping-lists/:id/done', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // archiveList returns void in the lifecycle service
    mockArchiveList.mockResolvedValue(undefined);
    mockSetActiveList.mockResolvedValue({
      previousActiveId: 'list-1',
      newActiveId: 'list-new',
    });
    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => unknown) => fn(mockPrisma)
    );
  });

  it('returns 404 when list not found for user', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('archives the current list', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([
      makeItem({ purchased: true }),
    ]);
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValue(
      makeList({ id: 'list-new', name: 'Unfinished from Apr 30' })
    );

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(mockArchiveList).toHaveBeenCalledWith('user-1', 'list-1');
  });

  it('creates new list with un-purchased items named "Unfinished from MMM d"', async () => {
    mockArchiveList.mockResolvedValue(undefined);

    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([
      makeItem({ id: 'item-1', purchased: false }),
      makeItem({ id: 'item-2', name: 'Eggs', purchased: true }),
    ]);
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValue(
      makeList({ id: 'list-new', name: 'Unfinished from Apr 30' })
    );

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(mockPrisma.shoppingList.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: expect.stringMatching(/^Unfinished from /),
          userId: 'user-1',
        }),
      })
    );
  });

  it('sets new list as active', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([
      makeItem({ purchased: false }),
    ]);
    const newList = makeList({ id: 'list-new', isActive: false });
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValue(newList);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(mockSetActiveList).toHaveBeenCalledWith('user-1', 'list-new');
  });

  it('returns correct payload with rolledOverItemCount', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([
      makeItem({ id: 'item-1', purchased: false }),
      makeItem({ id: 'item-2', name: 'Eggs', purchased: false }),
      makeItem({ id: 'item-3', name: 'Bread', purchased: true }),
    ]);
    const newList = makeList({ id: 'list-new' });
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValue(newList);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        archivedListId: 'list-1',
        newActiveListId: 'list-new',
        rolledOverItemCount: 2,
      })
    );
  });

  it('returns rolledOverItemCount: 0 and no newActiveListId when all items purchased', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([
      makeItem({ purchased: true }),
      makeItem({ id: 'item-2', name: 'Eggs', purchased: true }),
    ]);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        archivedListId: 'list-1',
        rolledOverItemCount: 0,
      })
    );
    // No new list created
    expect(mockPrisma.shoppingList.create).not.toHaveBeenCalled();
  });

  it('does not create new list when all items are purchased', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([
      makeItem({ purchased: true }),
    ]);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(mockPrisma.shoppingList.create).not.toHaveBeenCalled();
    expect(mockSetActiveList).not.toHaveBeenCalled();
  });

  it('returns 403 when list does not belong to user', async () => {
    // findFirst with userId filter returns null (not found for this user)
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('includes items in new list with correct fields', async () => {
    mockArchiveList.mockResolvedValue(undefined);

    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    const unpurchasedItem = makeItem({ id: 'item-1', name: 'Chicken', quantity: '2 lbs', category: 'Meat & Seafood', purchased: false });
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([unpurchasedItem]);
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValue(
      makeList({ id: 'list-new' })
    );

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.markListDone(req, res);

    expect(mockPrisma.shoppingList.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                name: 'Chicken',
                quantity: '2 lbs',
                category: 'Meat & Seafood',
                purchased: false,
              }),
            ]),
          }),
        }),
      })
    );
  });
});
