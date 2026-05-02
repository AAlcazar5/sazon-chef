// backend/tests/modules/shoppingListStaleArchive.test.ts
// TDD: Auto-archive on completion + Stale auto-archive

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    shoppingListItem: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    purchaseHistory: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../src/lib/prisma';
import {
  archiveOnCompletion,
  autoArchiveStale,
} from '../../src/services/shoppingListLifecycleService';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function makeList(overrides: Record<string, unknown> = {}) {
  return {
    id: 'list-1',
    userId: 'user-1',
    name: 'Shopping List',
    isActive: true,
    tier: 'active',
    archivedAt: null,
    sourceRecipeIds: null,
    summaryStats: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    shoppingListId: 'list-1',
    name: 'milk',
    quantity: '1 gallon',
    category: 'Dairy',
    purchased: true,
    notes: null,
    price: 3.99,
    photoUrl: null,
    recipeId: null,
    sourceRecipeIds: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => unknown) => {
    return fn(mockPrisma);
  });
});

// ---------------------------------------------------------------------------
// archiveOnCompletion
// ---------------------------------------------------------------------------

describe('archiveOnCompletion', () => {
  test('archives list when all items are purchased', async () => {
    const list = makeList({ id: 'list-done', isActive: true });
    const items = [
      makeItem({ id: 'i1', purchased: true, name: 'milk', price: 2.5 }),
      makeItem({ id: 'i2', purchased: true, name: 'eggs', price: 4.0 }),
    ];
    const newList = makeList({ id: 'list-fresh', isActive: true });

    (mockPrisma.shoppingList.findFirst as jest.Mock)
      .mockResolvedValueOnce(list)   // find list by id+userId
      .mockResolvedValueOnce(null);  // no existing active for new list creation
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({
      ...list,
      isActive: false,
      tier: 'archived',
      archivedAt: new Date(),
    });
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValueOnce(newList);
    (mockPrisma.purchaseHistory.upsert as jest.Mock).mockResolvedValue({});

    await archiveOnCompletion('user-1', 'list-done');

    expect(mockPrisma.shoppingList.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'list-done' },
        data: expect.objectContaining({
          isActive: false,
          tier: 'archived',
          archivedAt: expect.any(Date),
        }),
      }),
    );
  });

  test('rejects when not all items are purchased', async () => {
    const list = makeList({ id: 'list-partial', isActive: true });
    const items = [
      makeItem({ id: 'i1', purchased: true }),
      makeItem({ id: 'i2', purchased: false }), // still pending
    ];

    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);

    await expect(archiveOnCompletion('user-1', 'list-partial')).rejects.toThrow();
    expect(mockPrisma.shoppingList.update).not.toHaveBeenCalled();
  });

  test('creates fresh active list after archiving completed list', async () => {
    const list = makeList({ id: 'list-done', isActive: true });
    const items = [makeItem({ purchased: true })];
    const freshList = makeList({ id: 'list-fresh', isActive: true, name: 'Shopping List' });

    (mockPrisma.shoppingList.findFirst as jest.Mock)
      .mockResolvedValueOnce(list)
      .mockResolvedValueOnce(null); // no current active for new list
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({
      ...list,
      isActive: false,
      tier: 'archived',
    });
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValueOnce(freshList);
    (mockPrisma.purchaseHistory.upsert as jest.Mock).mockResolvedValue({});

    await archiveOnCompletion('user-1', 'list-done');

    expect(mockPrisma.shoppingList.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          isActive: true,
          tier: 'active',
        }),
      }),
    );
  });

  test('throws when list not found for user', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(null);

    await expect(archiveOnCompletion('user-1', 'list-missing')).rejects.toThrow();
  });

  test('rejects completion of a list with no items', async () => {
    const list = makeList({ id: 'list-empty', isActive: true });
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce([]);

    await expect(archiveOnCompletion('user-1', 'list-empty')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// autoArchiveStale
// ---------------------------------------------------------------------------

describe('autoArchiveStale', () => {
  test('archives lists with tier=active, isActive=false, updatedAt older than 14 days', async () => {
    const staleLists = [
      makeList({ id: 'stale-1', isActive: false, tier: 'active', updatedAt: daysAgo(15) }),
      makeList({ id: 'stale-2', isActive: false, tier: 'active', updatedAt: daysAgo(20) }),
    ];
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce(staleLists);
    (mockPrisma.shoppingList.updateMany as jest.Mock).mockResolvedValueOnce({ count: 2 });

    const result = await autoArchiveStale('user-1');

    expect(result.archivedIds).toEqual(['stale-1', 'stale-2']);
    expect(mockPrisma.shoppingList.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['stale-1', 'stale-2'] },
        }),
        data: expect.objectContaining({
          tier: 'archived',
          archivedAt: expect.any(Date),
        }),
      }),
    );
  });

  test('does not archive lists newer than 14 days', async () => {
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]); // no stale lists
    const result = await autoArchiveStale('user-1');

    expect(result.archivedIds).toEqual([]);
    expect(mockPrisma.shoppingList.updateMany).not.toHaveBeenCalled();
  });

  test('never archives the active list (isActive=true) regardless of age', async () => {
    // The query should filter out isActive=true lists — verify the where clause
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    await autoArchiveStale('user-1');

    expect(mockPrisma.shoppingList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: false,
        }),
      }),
    );
  });

  test('is idempotent — second call returns empty archivedIds for same lists', async () => {
    // Already-archived lists have tier='archived', so query with tier != 'archived' excludes them
    (mockPrisma.shoppingList.findMany as jest.Mock)
      .mockResolvedValueOnce([makeList({ id: 'stale', isActive: false, tier: 'active', updatedAt: daysAgo(20) })])
      .mockResolvedValueOnce([]); // second call finds nothing (already archived)
    (mockPrisma.shoppingList.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });

    const first = await autoArchiveStale('user-1');
    const second = await autoArchiveStale('user-1');

    expect(first.archivedIds).toHaveLength(1);
    expect(second.archivedIds).toHaveLength(0);
  });

  test('queries only for the given userId', async () => {
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    await autoArchiveStale('user-42');

    expect(mockPrisma.shoppingList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-42' }),
      }),
    );
  });
});
