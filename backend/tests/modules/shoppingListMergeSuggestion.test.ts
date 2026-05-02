// backend/tests/modules/shoppingListMergeSuggestion.test.ts
// TDD: GET /api/shopping-lists/active/merge-suggestion
//      POST /api/shopping-lists/active/dismiss-merge-suggestion
// RED phase — written before implementation

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    shoppingListItem: {
      findMany: jest.fn(),
    },
    mergeDismissal: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/authHelper', () => ({
  getUserId: jest.fn().mockReturnValue('user-1'),
}));

import { Request, Response } from 'express';
import { prisma } from '../../src/lib/prisma';
import { shoppingListController } from '../../src/modules/shoppingList/shoppingListController';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
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

function hoursAgo(h: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}

function makeList(overrides: Record<string, unknown> = {}) {
  return {
    id: 'list-active',
    userId: 'user-1',
    name: 'Current List',
    isActive: true,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeArchivedList(id: string, archivedAt: Date) {
  return {
    id,
    userId: 'user-1',
    name: `Archived ${id}`,
    isActive: false,
    archivedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeItem(listId: string, name: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `item-${Math.random()}`,
    shoppingListId: listId,
    name,
    quantity: '1',
    category: null,
    purchased: false,
    ...overrides,
  };
}

// Active list: 10 items. Archived list: 8 of those 10 = 80% Jaccard overlap.
const ACTIVE_ITEMS = ['milk', 'eggs', 'bread', 'butter', 'cheese', 'chicken', 'apples', 'rice', 'pasta', 'olive oil'];
const ARCHIVED_ITEMS_HIGH_OVERLAP = ['milk', 'eggs', 'bread', 'butter', 'cheese', 'chicken', 'apples', 'rice', 'yogurt', 'bananas']; // 8/12 = 0.667 Jaccard... let's use simpler calc
// Jaccard: intersection/union — 8 shared / (10+10-8) = 8/12 ≈ 0.667 — use a cleaner set:
// Actually use exact match for >=70%: 10 active, 10 archived, 8 shared → 8/12=0.667, not >= 0.7
// For >=70%: need 8/11+... let's use 7 items each with 7 shared → 7/7=1.0
// Simpler: 10 active, 7 archived (all matching) → 7/10 = 0.7 exactly

const ACTIVE_10 = ['milk', 'eggs', 'bread', 'butter', 'cheese', 'chicken', 'apples', 'rice', 'pasta', 'olive oil'];
const ARCHIVED_7_OVERLAP = ['milk', 'eggs', 'bread', 'butter', 'cheese', 'chicken', 'apples']; // 7/10 = 0.7
const ARCHIVED_6_OVERLAP = ['milk', 'eggs', 'bread', 'butter', 'cheese', 'chicken']; // 6/10 = 0.6

describe('GET /api/shopping-lists/active/merge-suggestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.mergeDismissal.findFirst as jest.Mock).mockResolvedValue(null);
  });

  it('returns suggestion when recent archived list has >= 70% overlap', async () => {
    const activeList = makeList({ id: 'list-active' });
    const archivedList = makeArchivedList('list-arch', hoursAgo(24));

    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(activeList);
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([archivedList]);
    (mockPrisma.shoppingListItem.findMany as jest.Mock)
      .mockResolvedValueOnce(ACTIVE_10.map(n => makeItem('list-active', n)))
      .mockResolvedValueOnce(ARCHIVED_7_OVERLAP.map(n => makeItem('list-arch', n)));

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.getMergeSuggestion(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestionId: 'list-arch',
        overlap: expect.any(Number),
      })
    );

    const call = (res.json as jest.Mock).mock.calls[0][0];
    expect(call.overlap).toBeGreaterThanOrEqual(0.7);
  });

  it('returns null when overlap < 70%', async () => {
    const activeList = makeList({ id: 'list-active' });
    const archivedList = makeArchivedList('list-arch', hoursAgo(24));

    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(activeList);
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([archivedList]);
    (mockPrisma.shoppingListItem.findMany as jest.Mock)
      .mockResolvedValueOnce(ACTIVE_10.map(n => makeItem('list-active', n)))
      .mockResolvedValueOnce(ARCHIVED_6_OVERLAP.map(n => makeItem('list-arch', n)));

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.getMergeSuggestion(req, res);

    expect(res.json).toHaveBeenCalledWith(null);
  });

  it('returns null when archived list is older than 48 hours', async () => {
    const activeList = makeList({ id: 'list-active' });
    // DB-level filter (archivedAt >= cutoff) means findMany returns [] for old lists
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(activeList);
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([]); // DB filter excludes old list
    (mockPrisma.shoppingListItem.findMany as jest.Mock)
      .mockResolvedValueOnce(ACTIVE_10.map(n => makeItem('list-active', n)));

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.getMergeSuggestion(req, res);

    expect(res.json).toHaveBeenCalledWith(null);
  });

  it('returns null when no archived lists exist', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.shoppingListItem.findMany as jest.Mock)
      .mockResolvedValueOnce(ACTIVE_10.map(n => makeItem('list-active', n)));

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.getMergeSuggestion(req, res);

    expect(res.json).toHaveBeenCalledWith(null);
  });

  it('returns null when there is no active list', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.getMergeSuggestion(req, res);

    expect(res.json).toHaveBeenCalledWith(null);
  });

  it('respects MergeDismissal — does not re-suggest dismissed pair', async () => {
    const activeList = makeList({ id: 'list-active' });
    const archivedList = makeArchivedList('list-arch', hoursAgo(24));

    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(activeList);
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([archivedList]);
    (mockPrisma.shoppingListItem.findMany as jest.Mock)
      .mockResolvedValueOnce(ACTIVE_10.map(n => makeItem('list-active', n)))
      .mockResolvedValueOnce(ARCHIVED_7_OVERLAP.map(n => makeItem('list-arch', n)));
    // Dismissal exists for this pair
    (mockPrisma.mergeDismissal.findFirst as jest.Mock).mockResolvedValue({
      id: 'dismissal-1',
      userId: 'user-1',
      sourceListId: 'list-arch',
      targetListId: 'list-active',
    });

    const req = makeReq();
    const res = makeRes();

    await shoppingListController.getMergeSuggestion(req, res);

    expect(res.json).toHaveBeenCalledWith(null);
  });
});

describe('POST /api/shopping-lists/active/dismiss-merge-suggestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(makeList());
    (mockPrisma.mergeDismissal.create as jest.Mock).mockResolvedValue({
      id: 'dismissal-1',
      userId: 'user-1',
      sourceListId: 'list-arch',
      targetListId: 'list-active',
      dismissedAt: new Date(),
    });
  });

  it('creates a MergeDismissal record', async () => {
    const req = makeReq({
      body: { suggestionId: 'list-arch' },
    });
    const res = makeRes();

    await shoppingListController.dismissMergeSuggestion(req, res);

    expect(mockPrisma.mergeDismissal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          sourceListId: 'list-arch',
          targetListId: 'list-active',
        }),
      })
    );
  });

  it('returns 400 when suggestionId is missing', async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();

    await shoppingListController.dismissMergeSuggestion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when active list not found', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeReq({ body: { suggestionId: 'list-arch' } });
    const res = makeRes();

    await shoppingListController.dismissMergeSuggestion(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns success after creating dismissal', async () => {
    const req = makeReq({ body: { suggestionId: 'list-arch' } });
    const res = makeRes();

    await shoppingListController.dismissMergeSuggestion(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('is idempotent — succeeds if dismissal already exists', async () => {
    // On duplicate create, upsert or graceful handle
    (mockPrisma.mergeDismissal.create as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Unique constraint'), { code: 'P2002' })
    );

    const req = makeReq({ body: { suggestionId: 'list-arch' } });
    const res = makeRes();

    await shoppingListController.dismissMergeSuggestion(req, res);

    // Should still return success (idempotent)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});
