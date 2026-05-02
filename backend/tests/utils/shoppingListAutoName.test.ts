// backend/tests/utils/shoppingListAutoName.test.ts
// TDD: auto-naming logic for shopping lists

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '../../src/lib/prisma';
import { deriveListName } from '../../src/utils/shoppingListAutoName';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Recipe-sourced naming
// ---------------------------------------------------------------------------

describe('deriveListName — recipe-sourced', () => {
  test('single recipe: returns title capped at 30 chars', async () => {
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      title: 'Chicken Parmesan',
    });

    const result = await deriveListName({ sourceRecipeIds: ['r1'] });
    expect(result).toBe('Chicken Parmesan');
  });

  test('single recipe: caps title at 30 chars with ellipsis', async () => {
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      title: 'Super Delicious Spicy Thai Green Curry With Extra Lime',
    });

    const result = await deriveListName({ sourceRecipeIds: ['r1'] });
    expect(result.length).toBeLessThanOrEqual(33); // 30 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  test('two recipes: returns "Title + 1 more"', async () => {
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      title: 'Chicken Parmesan',
    });

    const result = await deriveListName({ sourceRecipeIds: ['r1', 'r2'] });
    expect(result).toBe('Chicken Parmesan + 1 more');
  });

  test('three recipes: returns "Title + 2 more"', async () => {
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      title: 'Salmon Teriyaki',
    });

    const result = await deriveListName({ sourceRecipeIds: ['r1', 'r2', 'r3'] });
    expect(result).toBe('Salmon Teriyaki + 2 more');
  });

  test('multi-recipe: caps first title at 30 chars before joining', async () => {
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      title: 'Super Delicious Spicy Thai Green Curry With Extra Lime',
    });

    const result = await deriveListName({ sourceRecipeIds: ['r1', 'r2'] });
    // Title portion is capped; full result = `{title capped}… + 1 more`
    expect(result).toMatch(/…\s*\+ 1 more$/);
    const titlePart = result.replace(/ \+ 1 more$/, '');
    expect(titlePart.length).toBeLessThanOrEqual(31); // 30 + ellipsis
  });

  test('empty sourceRecipeIds falls through to manual branch', async () => {
    // No items either → returns default
    const result = await deriveListName({ sourceRecipeIds: [] });
    expect(result).toBe('Shopping List');
  });
});

// ---------------------------------------------------------------------------
// Week-range naming (meal-plan-sourced)
// ---------------------------------------------------------------------------

describe('deriveListName — meal-plan-sourced', () => {
  function mondayOfCurrentWeek(): Date {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, …
    const diff = (day === 0 ? -6 : 1 - day);
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }

  function sundayOfCurrentWeek(): Date {
    const mon = mondayOfCurrentWeek();
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return sun;
  }

  test('returns "This week" when range is Mon-Sun of the current week', async () => {
    const start = mondayOfCurrentWeek();
    const end = sundayOfCurrentWeek();
    const result = await deriveListName({ weekRange: { start, end } });
    expect(result).toBe('This week');
  });

  test('returns "Week of <Month Day>" for a past week', async () => {
    const start = new Date('2025-03-03'); // A Monday in the past
    const end = new Date('2025-03-09');
    const result = await deriveListName({ weekRange: { start, end } });
    expect(result).toBe('Week of Mar 3');
  });

  test('returns "Week of <Month Day>" for a future week', async () => {
    const start = new Date('2028-07-10');
    const end = new Date('2028-07-16');
    const result = await deriveListName({ weekRange: { start, end } });
    expect(result).toBe('Week of Jul 10');
  });
});

// ---------------------------------------------------------------------------
// Manual (items-only) naming
// ---------------------------------------------------------------------------

describe('deriveListName — manual (items)', () => {
  test('single top aisle: returns "<Aisle> run"', async () => {
    const items = [
      { name: 'apple' },
      { name: 'banana' },
      { name: 'spinach' },
    ];
    const result = await deriveListName({ items });
    expect(result).toBe('Produce run');
  });

  test('top two aisles: returns "<Aisle1> + <Aisle2> run"', async () => {
    const items = [
      { name: 'apple' },
      { name: 'banana' },
      { name: 'chicken' },
      { name: 'salmon' },
      { name: 'tuna' },
    ];
    const result = await deriveListName({ items });
    // Top 2: Meat & Seafood (3), Produce (2)
    expect(result).toBe('Meat & Seafood + Produce run');
  });

  test('empty items: returns "Shopping List"', async () => {
    const result = await deriveListName({ items: [] });
    expect(result).toBe('Shopping List');
  });

  test('no input at all: returns "Shopping List"', async () => {
    const result = await deriveListName({});
    expect(result).toBe('Shopping List');
  });

  test('uncategorized items: returns "Shopping List"', async () => {
    const items = [{ name: 'xyzzyquux' }, { name: 'frobnicator' }];
    const result = await deriveListName({ items });
    expect(result).toBe('Shopping List');
  });

  test('tie-breaking: stable top-2 selection when counts are equal', async () => {
    const items = [
      { name: 'apple' },    // Produce
      { name: 'chicken' },  // Meat & Seafood
    ];
    const result = await deriveListName({ items });
    // Should have two aisles joined with +
    expect(result).toMatch(/ \+ /);
    expect(result.endsWith(' run')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Priority: sourceRecipeIds > weekRange > items
// ---------------------------------------------------------------------------

describe('deriveListName — input priority', () => {
  test('sourceRecipeIds takes priority over weekRange and items', async () => {
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      title: 'Pasta',
    });
    const start = new Date('2025-03-03');
    const end = new Date('2025-03-09');
    const result = await deriveListName({
      sourceRecipeIds: ['r1'],
      weekRange: { start, end },
      items: [{ name: 'apple' }],
    });
    expect(result).toBe('Pasta');
  });

  test('weekRange takes priority over items when no sourceRecipeIds', async () => {
    const start = new Date('2025-03-03');
    const end = new Date('2025-03-09');
    const result = await deriveListName({
      weekRange: { start, end },
      items: [{ name: 'apple' }],
    });
    expect(result).toBe('Week of Mar 3');
  });
});
