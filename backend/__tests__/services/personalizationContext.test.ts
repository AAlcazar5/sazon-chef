// ROADMAP 4.0 N0.2 — personalizationContext builder test.

import { prisma } from '../../src/lib/prisma';
import {
  buildPersonalizationContext,
  signalCoverageForCookCount,
  clearPersonalizationContextCache,
} from '../../src/services/personalizationContext';

const userFindUnique = jest.fn();
const pantryFindMany = jest.fn();
const cookingLogFindMany = jest.fn();
const cookingLogCount = jest.fn();
const leftoverFindMany = jest.fn();
const mealPrepFindMany = jest.fn();

(prisma as any).user = {
  ...((prisma as any).user ?? {}),
  findUnique: userFindUnique,
};
(prisma as any).pantryItem = {
  ...((prisma as any).pantryItem ?? {}),
  findMany: pantryFindMany,
};
(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findMany: cookingLogFindMany,
  count: cookingLogCount,
};
(prisma as any).leftoverInventory = {
  ...((prisma as any).leftoverInventory ?? {}),
  findMany: leftoverFindMany,
};
(prisma as any).mealPrepPortion = {
  ...((prisma as any).mealPrepPortion ?? {}),
  findMany: mealPrepFindMany,
};

const NOW = new Date('2026-05-06T12:00:00Z');

beforeEach(() => {
  userFindUnique.mockReset();
  pantryFindMany.mockReset();
  cookingLogFindMany.mockReset();
  cookingLogCount.mockReset();
  leftoverFindMany.mockReset();
  mealPrepFindMany.mockReset();
  // Sensible defaults
  userFindUnique.mockResolvedValue({
    createdAt: new Date('2026-04-01T00:00:00Z'),
    preferences: {
      cookingSkillLevel: 'home_cook',
      goalPhase: null,
      cookTimePreference: 30,
    },
  });
  pantryFindMany.mockResolvedValue([]);
  cookingLogFindMany.mockResolvedValue([]);
  cookingLogCount.mockResolvedValue(0);
  leftoverFindMany.mockResolvedValue([]);
  mealPrepFindMany.mockResolvedValue([]);
  clearPersonalizationContextCache();
});

describe('N0.2 — signalCoverageForCookCount', () => {
  it('cold = 0–2 cooks', () => {
    expect(signalCoverageForCookCount(0)).toBe('cold');
    expect(signalCoverageForCookCount(1)).toBe('cold');
    expect(signalCoverageForCookCount(2)).toBe('cold');
  });
  it('mid = 3–6 cooks', () => {
    expect(signalCoverageForCookCount(3)).toBe('mid');
    expect(signalCoverageForCookCount(6)).toBe('mid');
  });
  it('high = 7+ cooks', () => {
    expect(signalCoverageForCookCount(7)).toBe('high');
    expect(signalCoverageForCookCount(99)).toBe('high');
  });
});

describe('N0.2 — buildPersonalizationContext', () => {
  it('returns a graceful empty context for empty userId', async () => {
    const ctx = await buildPersonalizationContext({ userId: '', now: NOW });
    expect(ctx.recentCookCount).toBe(0);
    expect(ctx.signalCoverage).toBe('cold');
    expect(ctx.pantry).toEqual([]);
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it('populates the full snapshot from existing models in one round-trip', async () => {
    pantryFindMany.mockResolvedValue([
      { name: 'rice' },
      { name: 'cilantro' },
    ]);
    cookingLogFindMany.mockResolvedValue([
      { cookedAt: new Date('2026-05-05T18:00:00Z'), recipe: { cuisine: 'Italian' } },
      { cookedAt: new Date('2026-05-04T18:00:00Z'), recipe: { cuisine: 'Italian' } },
      { cookedAt: new Date('2026-05-03T18:00:00Z'), recipe: { cuisine: 'Persian' } },
    ]);
    cookingLogCount.mockResolvedValue(20);

    const ctx = await buildPersonalizationContext({ userId: 'u1', now: NOW });
    expect(ctx.recentCookCount).toBe(3);
    expect(ctx.lifetimeCookCount).toBe(20);
    expect(ctx.signalCoverage).toBe('mid');
    expect(ctx.pantry).toEqual(['rice', 'cilantro']);
    expect(ctx.cuisineLean[0]).toEqual({ cuisine: 'Italian', cookCount: 2 });
    expect(ctx.cuisineLean[1]).toEqual({ cuisine: 'Persian', cookCount: 1 });
    expect(ctx.preferences.cookingSkillLevel).toBe('home_cook');
    expect(ctx.daysSinceSignup).toBe(35); // 2026-04-01 → 2026-05-06
  });

  it('respects the 30-day cook lookback window', async () => {
    await buildPersonalizationContext({ userId: 'u1', now: NOW });
    const call = cookingLogFindMany.mock.calls[0][0];
    expect(call.where.userId).toBe('u1');
    const sinceArg = call.where.cookedAt.gte as Date;
    const expectedSince = new Date(NOW.getTime() - 30 * 86400000);
    expect(sinceArg.getTime()).toBe(expectedSince.getTime());
  });

  it('caches per-(userId, asOf) so two callers in the same request hit identity-equal results', async () => {
    pantryFindMany.mockResolvedValue([{ name: 'rice' }]);
    const a = await buildPersonalizationContext({ userId: 'u1', now: NOW });
    const b = await buildPersonalizationContext({ userId: 'u1', now: NOW });
    expect(a).toBe(b); // identity equality, cache hit
    // userFindUnique is the canonical "did we re-do the work?" signal
    expect(userFindUnique).toHaveBeenCalledTimes(1);
  });

  it('separate userIds keep independent cache entries', async () => {
    await buildPersonalizationContext({ userId: 'u1', now: NOW });
    await buildPersonalizationContext({ userId: 'u2', now: NOW });
    expect(userFindUnique).toHaveBeenCalledTimes(2);
  });

  it('graceful when User row is missing (returns daysSinceSignup=0)', async () => {
    userFindUnique.mockResolvedValue(null);
    const ctx = await buildPersonalizationContext({ userId: 'u-ghost', now: NOW });
    expect(ctx.daysSinceSignup).toBe(0);
    expect(ctx.preferences.cookingSkillLevel).toBeNull();
  });

  it('cuisine ranking ties break alphabetically', async () => {
    cookingLogFindMany.mockResolvedValue([
      { cookedAt: NOW, recipe: { cuisine: 'Persian' } },
      { cookedAt: NOW, recipe: { cuisine: 'Italian' } },
      { cookedAt: NOW, recipe: { cuisine: 'Mexican' } },
    ]);
    const ctx = await buildPersonalizationContext({ userId: 'u1', now: NOW });
    expect(ctx.cuisineLean.map((c) => c.cuisine)).toEqual([
      'Italian',
      'Mexican',
      'Persian',
    ]);
  });

  it('drops null cuisines from the lean ranking', async () => {
    cookingLogFindMany.mockResolvedValue([
      { cookedAt: NOW, recipe: { cuisine: null } },
      { cookedAt: NOW, recipe: { cuisine: 'Italian' } },
      { cookedAt: NOW, recipe: null },
    ]);
    const ctx = await buildPersonalizationContext({ userId: 'u1', now: NOW });
    expect(ctx.cuisineLean).toHaveLength(1);
    expect(ctx.cuisineLean[0].cuisine).toBe('Italian');
  });

  it('integrates expiringInventoryService for expiring items', async () => {
    leftoverFindMany.mockResolvedValue([
      {
        id: 'l1',
        expiresAt: new Date(NOW.getTime() + 86400000),
        portionsRemaining: 2,
        component: { name: 'rice bowl' },
      },
    ]);
    const ctx = await buildPersonalizationContext({ userId: 'u1', now: NOW });
    expect(ctx.expiringItems).toHaveLength(1);
    expect(ctx.expiringItems[0].ingredientName).toBe('rice bowl');
  });
});
