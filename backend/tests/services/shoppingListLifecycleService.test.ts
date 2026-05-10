// backend/tests/services/shoppingListLifecycleService.test.ts
//
// Tier L M23 — shoppingListLifecycleService coverage. The service enforces
// a singleton-active-list invariant, auto-archives completed lists, and
// runs stale + orphan cleanup sweeps. We assert the contract for each
// exported function:
//   - setActiveList: deactivates the previously-active list and activates the target
//   - setActiveList throws when the target doesn't exist or doesn't belong to the user
//   - getActiveList returns the existing active list, or creates one when none exists
//   - archiveList marks tier=archived + isActive=false
//   - archiveOnCompletion: requires items, requires all-purchased, archives + creates fresh
//   - autoArchiveStale: ignores active + already-archived; updates the rest
//   - cleanupOrphans: deletes empty non-active lists older than threshold

import {
  setActiveList,
  getActiveList,
  archiveList,
  archiveOnCompletion,
  autoArchiveStale,
  cleanupOrphans,
} from '../../src/services/shoppingListLifecycleService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  // Extend the global mock with the methods this service needs.
  mockPrisma.shoppingList.updateMany = mockPrisma.shoppingList.updateMany ?? jest.fn();
  mockPrisma.shoppingListItem.count = mockPrisma.shoppingListItem.count ?? jest.fn();
  mockPrisma.purchaseHistory = mockPrisma.purchaseHistory ?? { upsert: jest.fn() };
});

describe('setActiveList', () => {
  it('deactivates the prior active list and activates the target', async () => {
    mockPrisma.shoppingList.findFirst
      .mockResolvedValueOnce({ id: 'old-active', userId: 'u1' }) // currentActive
      .mockResolvedValueOnce({ id: 'target', userId: 'u1' });    // target lookup

    const r = await setActiveList('u1', 'target');

    expect(r).toEqual({ previousActiveId: 'old-active', newActiveId: 'target' });
    // Two updates: the old one off, the target on
    expect(mockPrisma.shoppingList.update).toHaveBeenCalledTimes(2);
    const calls = mockPrisma.shoppingList.update.mock.calls;
    expect(calls[0][0]).toEqual(
      expect.objectContaining({ where: { id: 'old-active' }, data: expect.objectContaining({ isActive: false, tier: 'archived' }) }),
    );
    expect(calls[1][0]).toEqual(
      expect.objectContaining({ where: { id: 'target' }, data: expect.objectContaining({ isActive: true, tier: 'active' }) }),
    );
  });

  it('skips the deactivation when the target IS already the active list', async () => {
    mockPrisma.shoppingList.findFirst
      .mockResolvedValueOnce({ id: 'same', userId: 'u1' })
      .mockResolvedValueOnce({ id: 'same', userId: 'u1' });

    await setActiveList('u1', 'same');

    expect(mockPrisma.shoppingList.update).toHaveBeenCalledTimes(1); // only the activate
    expect(mockPrisma.shoppingList.update.mock.calls[0][0].where).toEqual({ id: 'same' });
  });

  it('throws when the target list does not belong to the user', async () => {
    mockPrisma.shoppingList.findFirst
      .mockResolvedValueOnce(null) // no current active
      .mockResolvedValueOnce(null); // target not found

    await expect(setActiveList('u1', 'mystery')).rejects.toThrow(/not found/);
    expect(mockPrisma.shoppingList.update).not.toHaveBeenCalled();
  });
});

describe('getActiveList', () => {
  it('returns the existing active list when one exists', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValueOnce({ id: 'existing', userId: 'u1', isActive: true });
    const r = await getActiveList('u1');
    expect(r.id).toBe('existing');
    expect(mockPrisma.shoppingList.create).not.toHaveBeenCalled();
  });

  it('creates a new active list when none exists', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValueOnce(null);
    mockPrisma.shoppingList.create.mockResolvedValueOnce({ id: 'fresh', userId: 'u1', isActive: true });

    const r = await getActiveList('u1');
    expect(r.id).toBe('fresh');
    expect(mockPrisma.shoppingList.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', isActive: true, tier: 'active' }),
      }),
    );
  });
});

describe('archiveList', () => {
  it('marks tier=archived + isActive=false on the user-owned list', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValueOnce({ id: 'L1', userId: 'u1' });

    await archiveList('u1', 'L1');

    expect(mockPrisma.shoppingList.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'L1' },
        data: expect.objectContaining({ isActive: false, tier: 'archived' }),
      }),
    );
  });

  it('throws when the list is not owned by the user', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValueOnce(null);
    await expect(archiveList('u1', 'L1')).rejects.toThrow(/not found/);
    expect(mockPrisma.shoppingList.update).not.toHaveBeenCalled();
  });
});

describe('archiveOnCompletion', () => {
  it('throws when the list has zero items', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValueOnce({ id: 'L1', userId: 'u1' });
    mockPrisma.shoppingListItem.findMany.mockResolvedValueOnce([]);

    await expect(archiveOnCompletion('u1', 'L1')).rejects.toThrow(/empty/);
  });

  it('throws when at least one item is unpurchased', async () => {
    mockPrisma.shoppingList.findFirst.mockResolvedValueOnce({ id: 'L1', userId: 'u1' });
    mockPrisma.shoppingListItem.findMany.mockResolvedValueOnce([
      { name: 'milk', quantity: '1', price: null, category: 'dairy', purchased: true },
      { name: 'eggs', quantity: '12', price: null, category: 'dairy', purchased: false },
    ]);

    await expect(archiveOnCompletion('u1', 'L1')).rejects.toThrow(/unpurchased/);
    expect(mockPrisma.shoppingList.update).not.toHaveBeenCalled();
  });

  it('archives the list and auto-creates a fresh active list when none exists', async () => {
    mockPrisma.shoppingList.findFirst
      .mockResolvedValueOnce({ id: 'L1', userId: 'u1' }) // initial fetch
      .mockResolvedValueOnce(null); // hasOtherActive check
    mockPrisma.shoppingListItem.findMany.mockResolvedValueOnce([
      { name: 'milk', quantity: '1', price: null, category: 'dairy', purchased: true },
    ]);
    mockPrisma.purchaseHistory.upsert.mockResolvedValue({});
    mockPrisma.shoppingList.create.mockResolvedValueOnce({ id: 'fresh', userId: 'u1' });

    const r = await archiveOnCompletion('u1', 'L1');

    expect(r).toEqual({ archivedListId: 'L1', freshListId: 'fresh' });
    expect(mockPrisma.shoppingList.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'L1' } }),
    );
    expect(mockPrisma.shoppingList.create).toHaveBeenCalled();
  });

  it('does NOT create a fresh list when another active one already exists', async () => {
    mockPrisma.shoppingList.findFirst
      .mockResolvedValueOnce({ id: 'L1', userId: 'u1' })
      .mockResolvedValueOnce({ id: 'L2', userId: 'u1', isActive: true });
    mockPrisma.shoppingListItem.findMany.mockResolvedValueOnce([
      { name: 'milk', quantity: '1', price: null, category: 'dairy', purchased: true },
    ]);
    mockPrisma.purchaseHistory.upsert.mockResolvedValue({});

    const r = await archiveOnCompletion('u1', 'L1');
    expect(r.freshListId).toBeNull();
    expect(mockPrisma.shoppingList.create).not.toHaveBeenCalled();
  });

  it('purchase-history failure does not abort archiving (best-effort)', async () => {
    mockPrisma.shoppingList.findFirst
      .mockResolvedValueOnce({ id: 'L1', userId: 'u1' })
      .mockResolvedValueOnce(null);
    mockPrisma.shoppingListItem.findMany.mockResolvedValueOnce([
      { name: 'milk', quantity: '1', price: null, category: 'dairy', purchased: true },
    ]);
    mockPrisma.purchaseHistory.upsert.mockRejectedValueOnce(new Error('db blip'));
    mockPrisma.shoppingList.create.mockResolvedValueOnce({ id: 'fresh', userId: 'u1' });

    const r = await archiveOnCompletion('u1', 'L1');
    expect(r.archivedListId).toBe('L1'); // archive still ran
  });
});

describe('autoArchiveStale', () => {
  it('returns empty when there are no stale lists', async () => {
    mockPrisma.shoppingList.findMany.mockResolvedValueOnce([]);
    const r = await autoArchiveStale('u1');
    expect(r).toEqual({ archivedIds: [] });
    expect(mockPrisma.shoppingList.updateMany).not.toHaveBeenCalled();
  });

  it('archives every stale list returned by the query', async () => {
    mockPrisma.shoppingList.findMany.mockResolvedValueOnce([{ id: 'A' }, { id: 'B' }]);
    mockPrisma.shoppingList.updateMany.mockResolvedValueOnce({ count: 2 });

    const r = await autoArchiveStale('u1');

    expect(r.archivedIds).toEqual(['A', 'B']);
    expect(mockPrisma.shoppingList.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['A', 'B'] } },
        data: expect.objectContaining({ tier: 'archived' }),
      }),
    );
  });

  it('only targets non-active, non-already-archived, stale-by-updatedAt lists', async () => {
    mockPrisma.shoppingList.findMany.mockResolvedValueOnce([]);
    await autoArchiveStale('u1');
    const where = mockPrisma.shoppingList.findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        userId: 'u1',
        isActive: false,
        tier: { not: 'archived' },
        updatedAt: expect.objectContaining({ lt: expect.any(Date) }),
      }),
    );
  });
});

describe('cleanupOrphans', () => {
  it('deletes empty non-active lists older than the threshold', async () => {
    mockPrisma.shoppingList.findMany.mockResolvedValueOnce([{ id: 'L1' }, { id: 'L2' }, { id: 'L3' }]);
    mockPrisma.shoppingListItem.count
      .mockResolvedValueOnce(0) // L1 empty → delete
      .mockResolvedValueOnce(3) // L2 has items → skip
      .mockResolvedValueOnce(0); // L3 empty → delete

    const r = await cleanupOrphans('u1');

    expect(r.deletedCount).toBe(2);
    expect(mockPrisma.shoppingList.delete).toHaveBeenCalledTimes(2);
    expect(mockPrisma.shoppingList.delete).toHaveBeenNthCalledWith(1, { where: { id: 'L1' } });
    expect(mockPrisma.shoppingList.delete).toHaveBeenNthCalledWith(2, { where: { id: 'L3' } });
  });

  it('returns 0 when no orphan candidates exist', async () => {
    mockPrisma.shoppingList.findMany.mockResolvedValueOnce([]);
    const r = await cleanupOrphans('u1');
    expect(r.deletedCount).toBe(0);
    expect(mockPrisma.shoppingList.delete).not.toHaveBeenCalled();
  });
});
