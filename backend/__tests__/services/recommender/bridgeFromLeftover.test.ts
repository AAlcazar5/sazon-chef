// ROADMAP 4.0 RD4.1 — bridgeFromLeftover service tests.

jest.mock('../../../src/lib/prisma', () => ({
  prisma: {
    leftoverInventory: { findMany: jest.fn() },
    cookingLog: { findMany: jest.fn() },
    recipe: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../../src/lib/prisma';
import { bridgeFromLeftover } from '../../../src/services/recommender/bridgeFromLeftover';

const leftoverFindMany = (prisma as any).leftoverInventory.findMany as jest.Mock;
const cookingLogFindMany = (prisma as any).cookingLog.findMany as jest.Mock;
const recipeFindMany = (prisma as any).recipe.findMany as jest.Mock;

const NOW = Date.parse('2026-05-06T12:00:00Z');

const lo = (
  componentName: string,
  daysAhead: number,
): any => ({
  id: `lo-${componentName}`,
  componentId: `c-${componentName}`,
  expiresAt: new Date(NOW + daysAhead * 24 * 60 * 60 * 1000),
  component: { name: componentName },
});

const recipe = (id: string, ingredients: string[]): any => ({
  id,
  title: `Recipe ${id}`,
  cuisine: 'Italian',
  cookTime: 25,
  imageUrl: null,
  ingredients: ingredients.map((text) => ({ text })),
});

beforeEach(() => {
  leftoverFindMany.mockReset();
  cookingLogFindMany.mockReset();
  recipeFindMany.mockReset();
  cookingLogFindMany.mockResolvedValue([]);
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  (Date.now as jest.Mock).mockRestore?.();
});

describe('bridgeFromLeftover (RD4.1)', () => {
  it('returns one row per leftover with up to k recipes', async () => {
    leftoverFindMany.mockResolvedValue([lo('cilantro', 1), lo('rice', 2)]);
    recipeFindMany.mockResolvedValue([
      recipe('r1', ['cilantro', 'lime']),
      recipe('r2', ['rice', 'soy']),
      recipe('r3', ['rice', 'cilantro']),
      recipe('r4', ['beef']),
    ]);

    const rows = await bridgeFromLeftover({ userId: 'u1', k: 3 });
    expect(rows).toHaveLength(2);

    const cilantroRow = rows.find((r) => r.leftoverIngredient === 'cilantro')!;
    expect(cilantroRow.expiringIn).toBe(1);
    expect(cilantroRow.recipes.map((r) => r.id).sort()).toEqual(['r1', 'r3']);

    const riceRow = rows.find((r) => r.leftoverIngredient === 'rice')!;
    expect(riceRow.recipes.map((r) => r.id).sort()).toEqual(['r2', 'r3']);
  });

  it('returns empty when there are no leftovers', async () => {
    leftoverFindMany.mockResolvedValue([]);
    const rows = await bridgeFromLeftover({ userId: 'u1' });
    expect(rows).toEqual([]);
    expect(recipeFindMany).not.toHaveBeenCalled();
  });

  it('drops leftovers that have no matching recipes', async () => {
    leftoverFindMany.mockResolvedValue([lo('truffle', 1), lo('rice', 2)]);
    recipeFindMany.mockResolvedValue([recipe('r1', ['rice', 'cilantro'])]);
    const rows = await bridgeFromLeftover({ userId: 'u1' });
    expect(rows.map((r) => r.leftoverIngredient)).toEqual(['rice']);
  });

  it('excludes recently cooked recipes (7-day window)', async () => {
    leftoverFindMany.mockResolvedValue([lo('cilantro', 1)]);
    recipeFindMany.mockResolvedValue([
      recipe('r1', ['cilantro']),
      recipe('r2', ['cilantro', 'lime']),
    ]);
    cookingLogFindMany.mockResolvedValue([{ recipeId: 'r1' }]);
    const rows = await bridgeFromLeftover({ userId: 'u1' });
    expect(rows[0].recipes.map((r) => r.id)).toEqual(['r2']);
  });

  it('caps recipes per row at k', async () => {
    leftoverFindMany.mockResolvedValue([lo('cilantro', 1)]);
    recipeFindMany.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => recipe(`r${i}`, ['cilantro'])),
    );
    const rows = await bridgeFromLeftover({ userId: 'u1', k: 3 });
    expect(rows[0].recipes.length).toBe(3);
  });
});
