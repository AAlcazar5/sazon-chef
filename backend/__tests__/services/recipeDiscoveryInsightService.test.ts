// ROADMAP 4.0 RD6.1 — recipeDiscoveryInsightService tests.

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: { findUnique: jest.fn() },
    cookingLog: { findMany: jest.fn() },
  },
}));

import { prisma } from '../../src/lib/prisma';
import { compute } from '../../src/services/recipeDiscoveryInsightService';

const recipeFindUnique = (prisma as any).recipe.findUnique as jest.Mock;
const cookingLogFindMany = (prisma as any).cookingLog.findMany as jest.Mock;

const ASOF = new Date('2026-05-06T12:00:00Z');

beforeEach(() => {
  recipeFindUnique.mockReset();
  cookingLogFindMany.mockReset();
});

describe('recipeDiscoveryInsightService.compute (RD6.1)', () => {
  it('returns null when no rule fires', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r1', cuisine: 'Italian', iron: 1, ingredients: [{ text: 'tomato' }],
    });
    // user has cooked tomato before — rule 1 doesn't fire
    cookingLogFindMany.mockImplementation((arg: any) => {
      if (arg?.include?.recipe?.select?.ingredients) {
        return Promise.resolve([{ recipe: { ingredients: [{ text: 'tomato' }] } }]);
      }
      // empty for cuisine-cadence + iron lookups
      return Promise.resolve([]);
    });
    const result = await compute({ userId: 'u1', recipeId: 'r1', asOf: ASOF });
    expect(result).toBeNull();
  });

  it('first-with-ingredient wins over micro-standout when both fire', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r1', cuisine: 'Italian', iron: 99, // would trigger micro-standout
      ingredients: [{ text: 'sumac' }],
    });
    cookingLogFindMany.mockImplementation((arg: any) => {
      // user history doesn't include sumac
      if (arg?.include?.recipe?.select?.ingredients) {
        return Promise.resolve([{ recipe: { ingredients: [{ text: 'tomato' }, { text: 'basil' }] } }]);
      }
      return Promise.resolve([]);
    });
    const result = await compute({ userId: 'u1', recipeId: 'r1', asOf: ASOF });
    expect(result?.rule).toBe('first_with_ingredient');
    expect(result?.line.toLowerCase()).toContain('sumac');
  });

  it('micro-standout fires only at ≥1.5× threshold', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r1', cuisine: 'Italian', iron: 6,
      ingredients: [{ text: 'tomato' }], // user has cooked tomato
    });
    cookingLogFindMany.mockImplementation((arg: any) => {
      if (arg?.include?.recipe?.select?.ingredients) {
        return Promise.resolve([{ recipe: { ingredients: [{ text: 'tomato' }] } }]);
      }
      if (arg?.include?.recipe?.select?.iron) {
        // user's 30d avg = 4 → 1.5× = 6 → recipe.iron=6 just clears.
        return Promise.resolve([
          { recipe: { iron: 4 } },
          { recipe: { iron: 4 } },
        ]);
      }
      return Promise.resolve([]);
    });
    const result = await compute({ userId: 'u1', recipeId: 'r1', asOf: ASOF });
    expect(result?.rule).toBe('micro_standout');
    expect(result?.line.toLowerCase()).toContain('iron');
    expect(result?.line.toLowerCase()).toContain('italian');
  });

  it('micro-standout does NOT fire below 1.5× threshold', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r1', cuisine: 'Italian', iron: 5, ingredients: [{ text: 'tomato' }],
    });
    cookingLogFindMany.mockImplementation((arg: any) => {
      if (arg?.include?.recipe?.select?.ingredients) {
        return Promise.resolve([{ recipe: { ingredients: [{ text: 'tomato' }] } }]);
      }
      if (arg?.include?.recipe?.select?.iron) {
        return Promise.resolve([{ recipe: { iron: 4 } }, { recipe: { iron: 4 } }]); // avg=4 → 1.5×=6
      }
      return Promise.resolve([]);
    });
    const result = await compute({ userId: 'u1', recipeId: 'r1', asOf: ASOF });
    expect(result?.rule).not.toBe('micro_standout');
  });

  it('cuisine-cadence requires prior cook + ≥21 day gap', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r1', cuisine: 'Persian', iron: null, ingredients: [{ text: 'tomato' }],
    });
    const lastCookedAt = new Date(ASOF.getTime() - 22 * 24 * 60 * 60 * 1000);
    cookingLogFindMany.mockImplementation((arg: any) => {
      if (arg?.include?.recipe?.select?.ingredients) {
        return Promise.resolve([{ recipe: { ingredients: [{ text: 'tomato' }] } }]);
      }
      if (arg?.select?.cookedAt) {
        return Promise.resolve([{ cookedAt: lastCookedAt }]);
      }
      return Promise.resolve([]);
    });
    const result = await compute({ userId: 'u1', recipeId: 'r1', asOf: ASOF });
    expect(result?.rule).toBe('cuisine_cadence');
    expect(result?.line.toLowerCase()).toContain('persian');
  });

  it('cuisine-cadence does not fire below 21 days', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r1', cuisine: 'Persian', iron: null, ingredients: [{ text: 'tomato' }],
    });
    const recent = new Date(ASOF.getTime() - 5 * 24 * 60 * 60 * 1000);
    cookingLogFindMany.mockImplementation((arg: any) => {
      if (arg?.include?.recipe?.select?.ingredients) {
        return Promise.resolve([{ recipe: { ingredients: [{ text: 'tomato' }] } }]);
      }
      if (arg?.select?.cookedAt) {
        return Promise.resolve([{ cookedAt: recent }]);
      }
      return Promise.resolve([]);
    });
    const result = await compute({ userId: 'u1', recipeId: 'r1', asOf: ASOF });
    expect(result).toBeNull();
  });

  it('returns null when anchor recipe is missing', async () => {
    recipeFindUnique.mockResolvedValue(null);
    const result = await compute({ userId: 'u1', recipeId: 'missing', asOf: ASOF });
    expect(result).toBeNull();
  });

  it('emitted prose contains no banned vocabulary', async () => {
    recipeFindUnique.mockResolvedValue({
      id: 'r1', cuisine: 'Italian', iron: 99, ingredients: [{ text: 'sumac' }],
    });
    cookingLogFindMany.mockImplementation((arg: any) => {
      if (arg?.include?.recipe?.select?.ingredients) {
        return Promise.resolve([{ recipe: { ingredients: [{ text: 'tomato' }] } }]);
      }
      return Promise.resolve([]);
    });
    const result = await compute({ userId: 'u1', recipeId: 'r1', asOf: ASOF });
    expect(result?.line).not.toMatch(/should/i);
    expect(result?.line).not.toMatch(/deficient/i);
    expect(result?.line).not.toMatch(/low in/i);
  });
});
