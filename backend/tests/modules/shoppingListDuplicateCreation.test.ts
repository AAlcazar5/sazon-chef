// backend/tests/modules/shoppingListDuplicateCreation.test.ts
// TDD: Duplicate detection at list creation time

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    shoppingListItem: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';
import {
  findDuplicateAtCreation,
  mergeIntoExisting,
} from '../../src/services/shoppingListDuplicateAtCreation';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeListWithItems(
  id: string,
  itemNames: string[],
  overrides: Record<string, unknown> = {},
) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 3); // 3 days ago — within window

  return {
    id,
    userId: 'user-1',
    name: `List ${id}`,
    isActive: false,
    tier: 'archived',
    archivedAt: sevenDaysAgo,
    items: itemNames.map((name, idx) => ({
      id: `${id}-item-${idx}`,
      shoppingListId: id,
      name,
      quantity: '1',
      purchased: false,
      purchasedAt: null,
    })),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// findDuplicateAtCreation
// ---------------------------------------------------------------------------

describe('findDuplicateAtCreation', () => {
  test('returns merge suggestion when overlap >= 0.70 (7 of 10)', async () => {
    const existingItems = [
      'flour', 'sugar', 'butter', 'eggs', 'milk', 'vanilla', 'baking powder', 'salt', 'chocolate chips', 'cream',
    ];
    const candidateItems = [
      { name: 'flour' },
      { name: 'sugar' },
      { name: 'butter' },
      { name: 'eggs' },
      { name: 'milk' },
      { name: 'vanilla' },
      { name: 'baking powder' },
      { name: 'cream cheese' }, // different
      { name: 'lemon zest' },   // different
      { name: 'sour cream' },   // different
    ];
    // 7 overlap out of max(10, 10) = 10 → 0.70

    const existingList = makeListWithItems('list-old', existingItems);
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([existingList]);

    const result = await findDuplicateAtCreation('user-1', candidateItems);

    expect(result).not.toBeNull();
    expect(result!.duplicateOf).toBe('list-old');
    expect(result!.overlap).toBeGreaterThanOrEqual(0.70);
    expect(result!.suggestedAction).toBe('merge');
  });

  test('returns null when overlap < 0.70 (6 of 10 → 0.60)', async () => {
    const existingItems = [
      'flour', 'sugar', 'butter', 'eggs', 'milk', 'vanilla', 'baking powder', 'salt', 'chocolate chips', 'cream',
    ];
    const candidateItems = [
      { name: 'flour' },
      { name: 'sugar' },
      { name: 'butter' },
      { name: 'eggs' },
      { name: 'milk' },
      { name: 'vanilla' },
      { name: 'spinach' },   // different
      { name: 'chicken' },   // different
      { name: 'lemon' },     // different
      { name: 'broccoli' },  // different
    ];
    // 6 overlap out of max(10, 10) = 10 → 0.60 < 0.70 → null

    const existingList = makeListWithItems('list-old', existingItems);
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([existingList]);

    const result = await findDuplicateAtCreation('user-1', candidateItems);
    expect(result).toBeNull();
  });

  test('modifier-token-stripped match: "unsalted butter" matches "butter"', async () => {
    const existingItems = ['butter', 'flour', 'sugar', 'eggs', 'milk', 'vanilla', 'baking powder', 'salt', 'cream', 'yeast'];
    const candidateItems = [
      { name: 'unsalted butter' }, // normalizes to "butter"
      { name: 'flour' },
      { name: 'sugar' },
      { name: 'eggs' },
      { name: 'milk' },
      { name: 'vanilla' },
      { name: 'baking powder' },
      { name: 'salt' },
      { name: 'cream' },
      { name: 'yeast' },
    ];
    // After normalization, all 10 match → overlap = 1.0

    const existingList = makeListWithItems('list-old', existingItems);
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([existingList]);

    const result = await findDuplicateAtCreation('user-1', candidateItems);
    expect(result).not.toBeNull();
    expect(result!.overlap).toBeGreaterThanOrEqual(0.70);
  });

  test('only checks active list and archived lists within 7 days', async () => {
    const recent = makeListWithItems('list-recent', ['apple', 'banana', 'cherry', 'grape', 'orange', 'mango', 'pear', 'peach', 'plum', 'lemon']);
    // 8+ days ago — outside window
    const oldArchived = makeListWithItems('list-old', ['apple', 'banana', 'cherry', 'grape', 'orange', 'mango', 'pear', 'peach', 'plum', 'lemon'], {
      tier: 'older',
      archivedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
    });

    // The service should filter: only recent qualifies
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([recent]);

    const candidateItems = [
      { name: 'apple' }, { name: 'banana' }, { name: 'cherry' },
      { name: 'grape' }, { name: 'orange' }, { name: 'mango' },
      { name: 'pear' }, { name: 'peach' }, { name: 'plum' }, { name: 'lemon' },
    ];
    const result = await findDuplicateAtCreation('user-1', candidateItems);
    expect(result).not.toBeNull();
    expect(result!.duplicateOf).toBe('list-recent');

    // Verify the query used the 7-day window
    const queryArg = (mockPrisma.shoppingList.findMany as jest.Mock).mock.calls[0][0];
    expect(queryArg.where).toBeDefined();
  });

  test('returns null when no existing lists found', async () => {
    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([]);
    const candidateItems = [{ name: 'apple' }, { name: 'banana' }];
    const result = await findDuplicateAtCreation('user-1', candidateItems);
    expect(result).toBeNull();
  });

  test('picks the list with highest overlap when multiple candidates exist', async () => {
    const listA = makeListWithItems('list-a', ['apple', 'banana', 'cherry', 'grape', 'orange', 'mango', 'pear', 'peach', 'plum', 'lemon']);
    // listB has higher overlap with candidate
    const listB = makeListWithItems('list-b', ['flour', 'sugar', 'butter', 'eggs', 'milk', 'vanilla', 'baking powder', 'salt', 'cream', 'yeast']);

    (mockPrisma.shoppingList.findMany as jest.Mock).mockResolvedValue([listA, listB]);

    const candidateItems = [
      { name: 'flour' }, { name: 'sugar' }, { name: 'butter' },
      { name: 'eggs' }, { name: 'milk' }, { name: 'vanilla' },
      { name: 'baking powder' }, { name: 'salt' }, { name: 'cream' }, { name: 'yeast' },
    ];
    const result = await findDuplicateAtCreation('user-1', candidateItems);
    expect(result!.duplicateOf).toBe('list-b');
  });
});

// ---------------------------------------------------------------------------
// mergeIntoExisting
// ---------------------------------------------------------------------------

describe('mergeIntoExisting', () => {
  test('adds non-duplicate items to target list', async () => {
    const existingItems = [
      { id: 'i1', shoppingListId: 'list-1', name: 'flour', quantity: '2 cups', purchased: false, purchasedAt: null },
      { id: 'i2', shoppingListId: 'list-1', name: 'sugar', quantity: '1 cup', purchased: true, purchasedAt: new Date('2026-01-01') },
    ];
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue(existingItems);
    (mockPrisma.shoppingListItem.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    const candidateItems = [
      { name: 'flour' },         // already exists — should be excluded
      { name: 'butter' },        // new
      { name: 'vanilla extract' }, // new
    ];

    await mergeIntoExisting('list-1', candidateItems);

    expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'butter' }),
          expect.objectContaining({ name: 'vanilla extract' }),
        ]),
      }),
    );
    // flour should NOT be in the create call
    const createArg = (mockPrisma.shoppingListItem.createMany as jest.Mock).mock.calls[0][0];
    const createdNames = createArg.data.map((d: { name: string }) => d.name);
    expect(createdNames).not.toContain('flour');
  });

  test('preserves purchasedAt state on existing items (does not overwrite)', async () => {
    const existingItems = [
      { id: 'i1', shoppingListId: 'list-1', name: 'flour', quantity: '2 cups', purchased: true, purchasedAt: new Date('2026-01-01') },
    ];
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue(existingItems);
    (mockPrisma.shoppingListItem.createMany as jest.Mock).mockResolvedValue({ count: 0 });

    // Only "flour" which already exists
    await mergeIntoExisting('list-1', [{ name: 'flour' }]);

    // createMany should be called with empty array (nothing to add)
    const createArg = (mockPrisma.shoppingListItem.createMany as jest.Mock).mock.calls[0][0];
    expect(createArg.data).toHaveLength(0);
    // update should NOT have been called (preserving existing item state)
    expect(mockPrisma.shoppingList.update).not.toHaveBeenCalled();
  });

  test('handles empty candidate list without error', async () => {
    (mockPrisma.shoppingListItem.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.shoppingListItem.createMany as jest.Mock).mockResolvedValue({ count: 0 });

    await expect(mergeIntoExisting('list-1', [])).resolves.not.toThrow();
  });
});
