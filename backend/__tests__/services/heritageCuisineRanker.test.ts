// backend/__tests__/services/heritageCuisineRanker.test.ts
// ROADMAP 4.0 Tier J18.2 — Heritage-cuisine ranker (TDD).
//
// Logic: if a user has cooked cuisine X ≥3 times in the last 30 days OR has
// X in `UserPreferences.likedCuisines` (heritage-flag proxy), candidates of
// that cuisine — especially `lighter` siblings and regional sub-cuisines —
// receive a positive boost.
//
// Cold start (no signal) returns no boosts. Onboarding flag overrides the
// cook-history threshold.

import { getHeritageBoost } from '../../src/services/heritageCuisineRanker';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

const now = new Date('2026-05-06T12:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.cookingLog = mockPrisma.cookingLog ?? { findMany: jest.fn() };
  mockPrisma.cookingLog.findMany = jest.fn();
  mockPrisma.userPreferences = mockPrisma.userPreferences ?? { findUnique: jest.fn() };
  mockPrisma.userPreferences.findUnique = jest.fn();
});

describe('getHeritageBoost', () => {
  it('boosts Mexican candidates when user has ≥3 Mexican cooks in 30 days', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-02T12:00:00Z') },
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-03T12:00:00Z') },
    ]);
    mockPrisma.userPreferences.findUnique.mockResolvedValue({ likedCuisines: [] });

    const candidates = [
      { recipeId: 'r1', cuisine: 'Mexican' },
      { recipeId: 'r2', cuisine: 'Greek' },
      { recipeId: 'r3', cuisine: 'Mexican' },
    ];

    const boosts = await getHeritageBoost({
      userId: 'u1',
      asOfDate: now,
      candidates,
    });

    const byId = new Map(boosts.map((b) => [b.recipeId, b.boost]));
    expect(byId.get('r1')!).toBeGreaterThan(0);
    expect(byId.get('r3')!).toBeGreaterThan(0);
    expect(byId.get('r2')!).toBe(0);
    // Mexican-deepened candidates should rank above the cross-cuisine swap.
    expect(byId.get('r1')!).toBeGreaterThan(byId.get('r2')!);
  });

  it('returns all-zero boosts on cold start (no signal)', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([]);
    mockPrisma.userPreferences.findUnique.mockResolvedValue(null);

    const candidates = [
      { recipeId: 'r1', cuisine: 'Mexican' },
      { recipeId: 'r2', cuisine: 'Greek' },
    ];

    const boosts = await getHeritageBoost({
      userId: 'u1',
      asOfDate: now,
      candidates,
    });

    expect(boosts.every((b) => b.boost === 0)).toBe(true);
  });

  it('applies the explicit heritage flag even when cook-history is below threshold', async () => {
    // Only 1 Mexican cook in 30 days — below the 3-cook threshold.
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
    ]);
    // But the user explicitly likes Mexican — flag overrides.
    mockPrisma.userPreferences.findUnique.mockResolvedValue({
      likedCuisines: [{ name: 'Mexican' }],
    });

    const candidates = [
      { recipeId: 'r1', cuisine: 'Mexican' },
      { recipeId: 'r2', cuisine: 'Greek' },
    ];

    const boosts = await getHeritageBoost({
      userId: 'u1',
      asOfDate: now,
      candidates,
    });

    const byId = new Map(boosts.map((b) => [b.recipeId, b.boost]));
    expect(byId.get('r1')!).toBeGreaterThan(0);
    expect(byId.get('r2')!).toBe(0);
  });

  it('boosts lighter-tagged candidates more than standard heritage candidates', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-02T12:00:00Z') },
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-03T12:00:00Z') },
    ]);
    mockPrisma.userPreferences.findUnique.mockResolvedValue({ likedCuisines: [] });

    const candidates = [
      { recipeId: 'r1', cuisine: 'Mexican', isLighterVariant: false },
      { recipeId: 'r2', cuisine: 'Mexican', isLighterVariant: true },
    ];

    const boosts = await getHeritageBoost({
      userId: 'u1',
      asOfDate: now,
      candidates,
    });

    const byId = new Map(boosts.map((b) => [b.recipeId, b.boost]));
    expect(byId.get('r2')!).toBeGreaterThan(byId.get('r1')!);
  });

  it('handles missing userId gracefully (returns all zeros)', async () => {
    const candidates = [{ recipeId: 'r1', cuisine: 'Mexican' }];
    const boosts = await getHeritageBoost({
      userId: '',
      asOfDate: now,
      candidates,
    });
    expect(boosts).toEqual([{ recipeId: 'r1', boost: 0 }]);
  });

  it('matches case-insensitively across cuisine sources', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'mexican' }, cookedAt: new Date('2026-05-01T12:00:00Z') },
      { recipe: { cuisine: 'Mexican' }, cookedAt: new Date('2026-05-02T12:00:00Z') },
      { recipe: { cuisine: 'MEXICAN' }, cookedAt: new Date('2026-05-03T12:00:00Z') },
    ]);
    mockPrisma.userPreferences.findUnique.mockResolvedValue({ likedCuisines: [] });

    const candidates = [{ recipeId: 'r1', cuisine: 'Mexican' }];
    const boosts = await getHeritageBoost({
      userId: 'u1',
      asOfDate: now,
      candidates,
    });
    expect(boosts[0].boost).toBeGreaterThan(0);
  });
});
