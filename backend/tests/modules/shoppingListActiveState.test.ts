// backend/tests/modules/shoppingListActiveState.test.ts
// TDD: Singleton active list invariant — setActiveList, getActiveList, archiveList

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import { prisma } from '../../src/lib/prisma';
import {
  setActiveList,
  getActiveList,
  archiveList,
} from '../../src/services/shoppingListLifecycleService';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

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

beforeEach(() => {
  jest.clearAllMocks();
  // Default: $transaction executes the callback with a tx client
  (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: unknown) => unknown) => {
    return fn(mockPrisma);
  });
});

// ---------------------------------------------------------------------------
// setActiveList
// ---------------------------------------------------------------------------

describe('setActiveList', () => {
  test('deactivates previous active list and activates target list', async () => {
    const prevActive = makeList({ id: 'list-old', isActive: true, tier: 'active' });
    const target = makeList({ id: 'list-new', isActive: false, tier: 'archived' });

    (mockPrisma.shoppingList.findFirst as jest.Mock)
      .mockResolvedValueOnce(prevActive) // find current active
      .mockResolvedValueOnce(target);    // find target list
    (mockPrisma.shoppingList.update as jest.Mock)
      .mockResolvedValueOnce({ ...prevActive, isActive: false, tier: 'archived' })
      .mockResolvedValueOnce({ ...target, isActive: true, tier: 'active', archivedAt: null });

    const result = await setActiveList('user-1', 'list-new');

    expect(result.previousActiveId).toBe('list-old');
    expect(result.newActiveId).toBe('list-new');

    // Previous list must be deactivated
    expect(mockPrisma.shoppingList.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'list-old' },
        data: expect.objectContaining({
          isActive: false,
          tier: 'archived',
        }),
      }),
    );

    // Target list must be activated
    expect(mockPrisma.shoppingList.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'list-new' },
        data: expect.objectContaining({
          isActive: true,
          tier: 'active',
          archivedAt: null,
        }),
      }),
    );
  });

  test('returns previousActiveId as null when no current active list exists', async () => {
    const target = makeList({ id: 'list-new', isActive: false, tier: 'archived' });

    (mockPrisma.shoppingList.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)   // no current active
      .mockResolvedValueOnce(target);
    (mockPrisma.shoppingList.update as jest.Mock)
      .mockResolvedValueOnce({ ...target, isActive: true, tier: 'active', archivedAt: null });

    const result = await setActiveList('user-1', 'list-new');

    expect(result.previousActiveId).toBeNull();
    expect(result.newActiveId).toBe('list-new');
    // Only one update call (no previous to deactivate)
    expect(mockPrisma.shoppingList.update).toHaveBeenCalledTimes(1);
  });

  test('throws when target list not found for the user', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)  // no current active
      .mockResolvedValueOnce(null); // target not found

    await expect(setActiveList('user-1', 'list-missing')).rejects.toThrow();
  });

  test('only one list has isActive=true per user after swap', async () => {
    const prev = makeList({ id: 'list-a', isActive: true });
    const target = makeList({ id: 'list-b', isActive: false, tier: 'archived' });

    (mockPrisma.shoppingList.findFirst as jest.Mock)
      .mockResolvedValueOnce(prev)
      .mockResolvedValueOnce(target);

    const deactivated = { ...prev, isActive: false, tier: 'archived' };
    const activated = { ...target, isActive: true, tier: 'active', archivedAt: null };

    (mockPrisma.shoppingList.update as jest.Mock)
      .mockResolvedValueOnce(deactivated)
      .mockResolvedValueOnce(activated);

    const result = await setActiveList('user-1', 'list-b');

    // Verify transaction was used for atomicity
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(result.previousActiveId).toBe('list-a');
    expect(result.newActiveId).toBe('list-b');
  });

  test('transaction rollback on error leaves DB unchanged', async () => {
    (mockPrisma.$transaction as jest.Mock).mockRejectedValueOnce(
      new Error('DB error'),
    );

    await expect(setActiveList('user-1', 'list-x')).rejects.toThrow('DB error');
    // update should never have been called outside transaction
    expect(mockPrisma.shoppingList.update).not.toHaveBeenCalled();
  });

  test('skips deactivating previous when it is the same as target', async () => {
    const same = makeList({ id: 'list-same', isActive: true, tier: 'active' });

    (mockPrisma.shoppingList.findFirst as jest.Mock)
      .mockResolvedValueOnce(same)  // current active
      .mockResolvedValueOnce(same); // target is same list

    (mockPrisma.shoppingList.update as jest.Mock)
      .mockResolvedValueOnce(same);

    const result = await setActiveList('user-1', 'list-same');

    expect(result.previousActiveId).toBe('list-same');
    expect(result.newActiveId).toBe('list-same');
    // Only one update (activate target; no need to deactivate itself)
    expect(mockPrisma.shoppingList.update).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// getActiveList
// ---------------------------------------------------------------------------

describe('getActiveList', () => {
  test('returns existing active list', async () => {
    const active = makeList({ id: 'list-active', isActive: true, tier: 'active' });
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(active);

    const result = await getActiveList('user-1');

    expect(result.id).toBe('list-active');
    expect(result.isActive).toBe(true);
    expect(mockPrisma.shoppingList.create).not.toHaveBeenCalled();
  });

  test('auto-creates a fresh empty list when none exists', async () => {
    const created = makeList({ id: 'list-new', isActive: true, tier: 'active', name: 'Shopping List' });
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValueOnce(created);

    const result = await getActiveList('user-1');

    expect(result.id).toBe('list-new');
    expect(result.isActive).toBe(true);
    expect(mockPrisma.shoppingList.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          isActive: true,
          tier: 'active',
          name: 'Shopping List',
        }),
      }),
    );
  });

  test('auto-created list has tier=active and archivedAt=null', async () => {
    const created = makeList({ id: 'new-list', isActive: true, tier: 'active', archivedAt: null });
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (mockPrisma.shoppingList.create as jest.Mock).mockResolvedValueOnce(created);

    const result = await getActiveList('user-2');

    expect(mockPrisma.shoppingList.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: true,
          tier: 'active',
          archivedAt: null,
        }),
      }),
    );
    expect(result.tier).toBe('active');
    expect(result.archivedAt).toBeNull();
  });

  test('queries by userId to avoid cross-user data leak', async () => {
    const active = makeList({ id: 'list-u2', userId: 'user-2' });
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(active);

    await getActiveList('user-2');

    expect(mockPrisma.shoppingList.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-2', isActive: true }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// archiveList
// ---------------------------------------------------------------------------

describe('archiveList', () => {
  test('sets isActive=false, tier=archived, archivedAt=now', async () => {
    const list = makeList({ id: 'list-1', isActive: true });
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(list);
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce({
      ...list,
      isActive: false,
      tier: 'archived',
      archivedAt: new Date(),
    });

    await archiveList('user-1', 'list-1');

    expect(mockPrisma.shoppingList.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'list-1' },
        data: expect.objectContaining({
          isActive: false,
          tier: 'archived',
          archivedAt: expect.any(Date),
        }),
      }),
    );
  });

  test('throws when list not found or not owned by user', async () => {
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(null);

    await expect(archiveList('user-1', 'list-other')).rejects.toThrow();
  });

  test('is idempotent — archiving an already-archived list succeeds', async () => {
    const alreadyArchived = makeList({ id: 'list-1', isActive: false, tier: 'archived', archivedAt: new Date() });
    (mockPrisma.shoppingList.findFirst as jest.Mock).mockResolvedValueOnce(alreadyArchived);
    (mockPrisma.shoppingList.update as jest.Mock).mockResolvedValueOnce(alreadyArchived);

    await expect(archiveList('user-1', 'list-1')).resolves.not.toThrow();
  });
});
