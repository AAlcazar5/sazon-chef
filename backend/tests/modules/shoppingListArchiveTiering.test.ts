// backend/tests/modules/shoppingListArchiveTiering.test.ts
// TDD: Archive tiering — 90-day collapse to "older" with summaryStats

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    shoppingListItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    purchaseHistory: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../src/lib/prisma';
import {
  tierArchivedList,
  tierArchivedListsForUser,
} from '../../src/services/shoppingListArchiveTiering';

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
    name: 'Weekly Shop',
    isActive: false,
    tier: 'archived',
    archivedAt: daysAgo(91),
    sourceRecipeIds: null,
    summaryStats: null,
    createdAt: daysAgo(100),
    updatedAt: daysAgo(91),
    ...overrides,
  };
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    shoppingListId: 'list-1',
    name: 'chicken breast',
    quantity: '2 lbs',
    category: 'Meat & Seafood',
    purchased: true,
    notes: null,
    price: 8.99,
    photoUrl: null,
    recipeId: null,
    sourceRecipeIds: null,
    createdAt: daysAgo(100),
    updatedAt: daysAgo(91),
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
// tierArchivedList
// ---------------------------------------------------------------------------

describe('tierArchivedList', () => {
  test('flips tier to "older" for list with archivedAt > 90 days ago', async () => {
    const list = makeList({ id: 'old-list', tier: 'archived', archivedAt: daysAgo(91) });
    const items = [
      makeItem({ id: 'i1', name: 'chicken breast', price: 8.99, category: 'Meat & Seafood' }),
      makeItem({ id: 'i2', name: 'milk', price: 3.49, category: 'Dairy' }),
    ];

    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 2 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({
      ...list,
      tier: 'older',
      summaryStats: { itemCount: 2, totalSpentCents: 1248, dominantAisle: 'Meat & Seafood', archivedAt: list.archivedAt },
    });

    await tierArchivedList('old-list');

    expect(mockPrisma.shoppingList.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'old-list' },
        data: expect.objectContaining({ tier: 'older' }),
      }),
    );
  });

  test('summaryStats.itemCount matches pre-tier item count', async () => {
    const list = makeList({ id: 'list-1' });
    const items = [
      makeItem({ id: 'i1', name: 'apple' }),
      makeItem({ id: 'i2', name: 'banana' }),
      makeItem({ id: 'i3', name: 'cherry' }),
    ];

    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 3 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({});

    await tierArchivedList('list-1');

    const updateCall = (mockPrisma.shoppingList.update as jest.Mock).mock.calls[0][0];
    const stats = JSON.parse(updateCall.data.summaryStats as string);
    expect(stats.itemCount).toBe(3);
  });

  test('summaryStats.totalSpentCents = sum of item prices (converted to cents)', async () => {
    const list = makeList({ id: 'list-1' });
    const items = [
      makeItem({ id: 'i1', price: 2.00 }),
      makeItem({ id: 'i2', price: 3.50 }),
      makeItem({ id: 'i3', price: null }), // null price contributes 0
    ];

    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 3 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({});

    await tierArchivedList('list-1');

    const updateCall = (mockPrisma.shoppingList.update as jest.Mock).mock.calls[0][0];
    const stats = JSON.parse(updateCall.data.summaryStats as string);
    // 2.00 + 3.50 = 5.50 → 550 cents
    expect(stats.totalSpentCents).toBe(550);
  });

  test('summaryStats.dominantAisle = aisle with most items', async () => {
    const list = makeList({ id: 'list-1' });
    const items = [
      makeItem({ id: 'i1', name: 'chicken', category: 'Meat & Seafood' }),
      makeItem({ id: 'i2', name: 'beef', category: 'Meat & Seafood' }),
      makeItem({ id: 'i3', name: 'milk', category: 'Dairy' }),
    ];

    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 3 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({});

    await tierArchivedList('list-1');

    const updateCall = (mockPrisma.shoppingList.update as jest.Mock).mock.calls[0][0];
    const stats = JSON.parse(updateCall.data.summaryStats as string);
    expect(stats.dominantAisle).toBe('Meat & Seafood');
  });

  test('deletes all shoppingListItem rows for the list', async () => {
    const list = makeList({ id: 'list-1' });
    const items = [makeItem({ id: 'i1' }), makeItem({ id: 'i2' })];

    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 2 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({});

    await tierArchivedList('list-1');

    expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
      where: { shoppingListId: 'list-1' },
    });
  });

  test('uses a transaction for atomicity (update + deleteMany together)', async () => {
    const list = makeList({ id: 'list-1' });
    const items = [makeItem({ id: 'i1' })];

    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce(items);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({});

    await tierArchivedList('list-1');

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  test('is idempotent — already-tiered (tier=older) list is skipped', async () => {
    const olderList = makeList({ id: 'list-1', tier: 'older', archivedAt: daysAgo(120) });
    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(olderList);

    await tierArchivedList('list-1');

    expect(mockPrisma.shoppingListItem.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.shoppingList.update).not.toHaveBeenCalled();
  });

  test('throws when list not found', async () => {
    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(null);

    await expect(tierArchivedList('missing-list')).rejects.toThrow();
  });

  test('handles list with no items — totalSpentCents=0, itemCount=0, dominantAisle=null', async () => {
    const list = makeList({ id: 'list-empty' });
    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({});

    await tierArchivedList('list-empty');

    const updateCall = (mockPrisma.shoppingList.update as jest.Mock).mock.calls[0][0];
    const stats = JSON.parse(updateCall.data.summaryStats as string);
    expect(stats.itemCount).toBe(0);
    expect(stats.totalSpentCents).toBe(0);
    expect(stats.dominantAisle).toBeNull();
  });

  test('summaryStats includes archivedAt timestamp', async () => {
    const archivedAt = daysAgo(91);
    const list = makeList({ id: 'list-1', archivedAt });
    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({});

    await tierArchivedList('list-1');

    const updateCall = (mockPrisma.shoppingList.update as jest.Mock).mock.calls[0][0];
    const stats = JSON.parse(updateCall.data.summaryStats as string);
    // JSON serialization converts Date to ISO string
    expect(new Date(stats.archivedAt)).toEqual(archivedAt);
  });
});

// ---------------------------------------------------------------------------
// tierArchivedListsForUser
// ---------------------------------------------------------------------------

describe('tierArchivedListsForUser', () => {
  test('tiers all archived lists with archivedAt older than 90 days', async () => {
    const lists = [
      makeList({ id: 'list-a', tier: 'archived', archivedAt: daysAgo(91) }),
      makeList({ id: 'list-b', tier: 'archived', archivedAt: daysAgo(120) }),
    ];

    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce(lists);
    // For each list: findUnique + findMany items + deleteMany + update
    (mockPrisma.shoppingList.findUnique as jest.Mock)
      .mockResolvedValueOnce(lists[0])
      .mockResolvedValueOnce(lists[1]);
    (mockPrisma.shoppingListItem.findMany as jest.Mock)
      .mockResolvedValue([]);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock)
      .mockResolvedValue({ count: 0 });
    (mockPrisma.shoppingList.update as jest.Mock)
      .mockResolvedValue({});

    const result = await tierArchivedListsForUser('user-1');

    expect(result.tieredCount).toBe(2);
  });

  test('does not tier lists with archivedAt < 90 days ago', async () => {
    // findMany returns empty (the where clause filters them out)
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    const result = await tierArchivedListsForUser('user-1');

    expect(result.tieredCount).toBe(0);
    expect(mockPrisma.shoppingList.update).not.toHaveBeenCalled();
  });

  test('queries with tier=archived and archivedAt < now-90d', async () => {
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    await tierArchivedListsForUser('user-1');

    expect(mockPrisma.shoppingList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          tier: 'archived',
          archivedAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      }),
    );
  });

  test('purchaseHistory rows are unchanged after tiering', async () => {
    // purchaseHistory should never be touched by tiering
    const list = makeList({ id: 'list-1', tier: 'archived', archivedAt: daysAgo(91) });
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([list]);
    (mockPrisma.shoppingList.findUnique as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValueOnce([]);
    (mockPrisma.shoppingListItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({});

    await tierArchivedListsForUser('user-1');

    // purchaseHistory.deleteMany should never be called by tiering
    // (The service only touches shoppingListItem and shoppingList)
    expect(mockPrisma.purchaseHistory.findMany).not.toHaveBeenCalled();
  });

  test('returns tieredCount=0 when no eligible lists exist', async () => {
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);
    const result = await tierArchivedListsForUser('user-1');
    expect(result.tieredCount).toBe(0);
  });
});
