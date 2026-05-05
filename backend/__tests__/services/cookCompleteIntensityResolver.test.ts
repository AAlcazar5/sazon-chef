// backend/__tests__/services/cookCompleteIntensityResolver.test.ts
// ROADMAP 4.0 Tier J14 — Variable-reward cook-complete tiers (TDD).
// Sourced from .context/decisions/accepted/P-002-variable-reward-cook-complete.md.

import { resolveCookCompleteIntensity } from '../../src/services/cookCompleteIntensityResolver';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.cookingLog) {
    mockPrisma.cookingLog = { count: jest.fn(), findMany: jest.fn() };
  } else {
    mockPrisma.cookingLog.count = jest.fn();
    mockPrisma.cookingLog.findMany = jest.fn();
  }
  if (!mockPrisma.savedRecipe) {
    mockPrisma.savedRecipe = { count: jest.fn() };
  } else {
    mockPrisma.savedRecipe.count = jest.fn();
  }
});

describe('resolveCookCompleteIntensity', () => {
  it('returns "big" on first-cook of a cuisine', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.cookingLog.findMany.mockResolvedValue([]);

    const result = await resolveCookCompleteIntensity({
      userId: 'u1',
      cuisine: 'persian',
      recipeId: 'r1',
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    expect(result).toBe('big');
  });

  it('returns "quiet" when the same cuisine was cooked already this week', async () => {
    // Prior-cuisine prior cook exists and falls within the same ISO week.
    mockPrisma.cookingLog.count.mockResolvedValue(2);
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-05-04T12:00:00Z') },
    ]);

    const result = await resolveCookCompleteIntensity({
      userId: 'u1',
      cuisine: 'persian',
      recipeId: 'r1',
      // No rating provided → must not promote to medium
      asOfDate: new Date('2026-05-06T12:00:00Z'),
    });

    expect(result).toBe('quiet');
  });

  it('returns "big" when the recipe was saved beforehand and this is its first cook', async () => {
    // Cuisine not first (we already cooked Persian) but recipe is saved AND never cooked before.
    mockPrisma.cookingLog.count
      .mockResolvedValueOnce(2) // isFirstCookOfCuisine — already cooked persian before
      .mockResolvedValueOnce(0); // first-cook-of-this-recipe
    mockPrisma.savedRecipe.count.mockResolvedValue(1); // recipe is in user's saved
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      // Place the prior persian cook outside of this week so the
      // same-cuisine-this-week quiet path does not pre-empt the big tier.
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-04-10T12:00:00Z') },
    ]);

    const result = await resolveCookCompleteIntensity({
      userId: 'u1',
      cuisine: 'persian',
      recipeId: 'r-saved',
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    expect(result).toBe('big');
  });

  it('returns "medium" when rating ≥ 4 with no novelty signal', async () => {
    // Cuisine cooked before, recipe not saved, rating is 5.
    mockPrisma.cookingLog.count
      .mockResolvedValueOnce(2) // already cooked this cuisine
      .mockResolvedValueOnce(2); // already cooked this recipe (no first-saved-cook)
    mockPrisma.savedRecipe.count.mockResolvedValue(0);
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      // Place the prior cook outside of this week so the same-week-quiet path
      // does not pre-empt the medium tier.
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-04-10T12:00:00Z') },
    ]);

    const result = await resolveCookCompleteIntensity({
      userId: 'u1',
      cuisine: 'persian',
      recipeId: 'r1',
      rating: 5,
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    expect(result).toBe('medium');
  });

  it('returns "quiet" on missing userId (safe default)', async () => {
    const result = await resolveCookCompleteIntensity({
      userId: '',
      cuisine: 'persian',
      asOfDate: new Date(),
    });

    expect(result).toBe('quiet');
  });

  it('returns "quiet" on empty cuisine when rating is below threshold', async () => {
    const result = await resolveCookCompleteIntensity({
      userId: 'u1',
      cuisine: '',
      asOfDate: new Date(),
    });

    expect(result).toBe('quiet');
  });

  it('returns "medium" on empty cuisine when rating ≥ 4', async () => {
    const result = await resolveCookCompleteIntensity({
      userId: 'u1',
      cuisine: '',
      rating: 4,
      asOfDate: new Date(),
    });

    expect(result).toBe('medium');
  });

  it('returns "quiet" when rating is provided but below 4 and no novelty', async () => {
    mockPrisma.cookingLog.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);
    mockPrisma.savedRecipe.count.mockResolvedValue(0);
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' }, cookedAt: new Date('2026-04-10T12:00:00Z') },
    ]);

    const result = await resolveCookCompleteIntensity({
      userId: 'u1',
      cuisine: 'persian',
      recipeId: 'r1',
      rating: 3,
      asOfDate: new Date('2026-05-05T12:00:00Z'),
    });

    expect(result).toBe('quiet');
  });
});
