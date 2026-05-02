// backend/tests/modules/shoppingListOrphanCleanup.test.ts
// TDD: Silent orphan cleanup — delete empty, stale, non-active lists

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    shoppingListItem: {
      count: jest.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';
import { cleanupOrphans } from '../../src/services/shoppingListLifecycleService';

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
    isActive: false,
    tier: 'archived',
    archivedAt: new Date('2026-01-01'),
    sourceRecipeIds: null,
    summaryStats: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: daysAgo(8),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('cleanupOrphans', () => {
  test('deletes 0-item list that is non-active and older than 7 days', async () => {
    const orphan = makeList({ id: 'orphan-1', isActive: false, updatedAt: daysAgo(8) });
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([orphan]);
    (mockPrisma.shoppingListItem.count as jest.Mock).mockResolvedValueOnce(0);
    (mockPrisma.shoppingList.delete as jest.Mock).mockResolvedValueOnce(orphan);

    const result = await cleanupOrphans('user-1');

    expect(result.deletedCount).toBe(1);
    expect(mockPrisma.shoppingList.delete).toHaveBeenCalledWith({
      where: { id: 'orphan-1' },
    });
  });

  test('preserves 0-item list that is non-active but only 6 days old', async () => {
    // The DB query (updatedAt < now - 7d) excludes this list, so findMany returns []
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    const result = await cleanupOrphans('user-1');

    expect(result.deletedCount).toBe(0);
    expect(mockPrisma.shoppingList.delete).not.toHaveBeenCalled();
  });

  test('preserves 5-item list even if 8 days old and non-active', async () => {
    const withItems = makeList({ id: 'has-items', isActive: false, updatedAt: daysAgo(8) });
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([withItems]);
    (mockPrisma.shoppingListItem.count as jest.Mock).mockResolvedValueOnce(5);

    const result = await cleanupOrphans('user-1');

    expect(result.deletedCount).toBe(0);
    expect(mockPrisma.shoppingList.delete).not.toHaveBeenCalled();
  });

  test('never deletes the active list even if empty and stale', async () => {
    // The query should only return isActive=false lists
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    await cleanupOrphans('user-1');

    expect(mockPrisma.shoppingList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: false }),
      }),
    );
    expect(mockPrisma.shoppingList.delete).not.toHaveBeenCalled();
  });

  test('handles multiple candidates correctly — deletes only eligible ones', async () => {
    const orphan1 = makeList({ id: 'orphan-1', isActive: false, updatedAt: daysAgo(10) });
    const orphan2 = makeList({ id: 'orphan-2', isActive: false, updatedAt: daysAgo(8) });
    // tooYoung (5 days) and active lists are excluded by the DB query (isActive=false + lt cutoff)
    const hasItems = makeList({ id: 'has-items', isActive: false, updatedAt: daysAgo(9) });

    // findMany only returns lists that pass the DB where clause (isActive=false, updatedAt < now-7d)
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([
      orphan1, orphan2, hasItems,
    ]);
    (mockPrisma.shoppingListItem.count as jest.Mock)
      .mockResolvedValueOnce(0) // orphan1 — 0 items → delete
      .mockResolvedValueOnce(0) // orphan2 — 0 items → delete
      .mockResolvedValueOnce(3); // hasItems — 3 items → preserve
    (mockPrisma.shoppingList.delete as jest.Mock)
      .mockResolvedValueOnce(orphan1)
      .mockResolvedValueOnce(orphan2);

    const result = await cleanupOrphans('user-1');

    expect(result.deletedCount).toBe(2);
    expect(mockPrisma.shoppingList.delete).toHaveBeenCalledTimes(2);
    expect(mockPrisma.shoppingList.delete).toHaveBeenCalledWith({ where: { id: 'orphan-1' } });
    expect(mockPrisma.shoppingList.delete).toHaveBeenCalledWith({ where: { id: 'orphan-2' } });
  });

  test('returns 0 when no candidates found', async () => {
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    const result = await cleanupOrphans('user-1');

    expect(result.deletedCount).toBe(0);
    expect(mockPrisma.shoppingList.delete).not.toHaveBeenCalled();
  });

  test('queries only for the given userId', async () => {
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    await cleanupOrphans('user-99');

    expect(mockPrisma.shoppingList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-99' }),
      }),
    );
  });

  test('exactly 7-day-old list is NOT deleted (boundary: strictly less than threshold)', async () => {
    // The DB query uses `updatedAt < now - 7d` (strictly less than).
    // A list updated exactly 7 days ago is NOT strictly less than the threshold,
    // so the DB returns no candidates.
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValueOnce([]);

    const result = await cleanupOrphans('user-1');

    expect(result.deletedCount).toBe(0);
    expect(mockPrisma.shoppingList.delete).not.toHaveBeenCalled();

    // Verify the cutoff uses `lt` (strictly less than)
    expect(mockPrisma.shoppingList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          updatedAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      }),
    );
  });
});
