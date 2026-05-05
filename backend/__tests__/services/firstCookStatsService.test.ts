// backend/__tests__/services/firstCookStatsService.test.ts
// ROADMAP 4.0 Tier J2 — First-cook stats (TDD).

import { computeFirstCookStats } from '../../src/services/firstCookStatsService';
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
});

describe('computeFirstCookStats', () => {
  it('throws on empty userId', async () => {
    await expect(
      computeFirstCookStats({
        userId: '',
        cuisine: 'persian',
        asOfDate: new Date(),
      }),
    ).rejects.toThrow();
  });

  it('returns isFirstCook=true when no prior cook of that cuisine', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.cookingLog.findMany.mockResolvedValue([]);
    const result = await computeFirstCookStats({
      userId: 'u1',
      cuisine: 'persian',
      asOfDate: new Date(),
    });
    expect(result.isFirstCook).toBe(true);
  });

  it('returns isFirstCook=false when there is a prior cook of that cuisine', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(2);
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' } },
    ]);
    const result = await computeFirstCookStats({
      userId: 'u1',
      cuisine: 'persian',
      asOfDate: new Date(),
    });
    expect(result.isFirstCook).toBe(false);
  });

  it('counts DISTINCT cuisines (case-insensitive)', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' } },
      { recipe: { cuisine: 'persian' } }, // dupe by case
      { recipe: { cuisine: 'Lebanese' } },
      { recipe: { cuisine: 'Thai' } },
      { recipe: { cuisine: null } },      // ignored
    ]);
    const result = await computeFirstCookStats({
      userId: 'u1',
      cuisine: 'persian',
      asOfDate: new Date(),
    });
    expect(result.cuisinesCookedCount).toBe(3);
  });

  it('defaults totalCuisinesAvailable to 134', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.cookingLog.findMany.mockResolvedValue([]);
    const result = await computeFirstCookStats({
      userId: 'u1',
      cuisine: 'persian',
      asOfDate: new Date(),
    });
    expect(result.totalCuisinesAvailable).toBe(134);
  });

  it('honors caller-supplied totalCuisinesAvailable', async () => {
    mockPrisma.cookingLog.count.mockResolvedValue(0);
    mockPrisma.cookingLog.findMany.mockResolvedValue([]);
    const result = await computeFirstCookStats({
      userId: 'u1',
      cuisine: 'persian',
      asOfDate: new Date(),
      totalCuisinesAvailable: 200,
    });
    expect(result.totalCuisinesAvailable).toBe(200);
  });

  it('handles empty cuisine — isFirstCook=false, still returns count', async () => {
    mockPrisma.cookingLog.findMany.mockResolvedValue([
      { recipe: { cuisine: 'Persian' } },
    ]);
    const result = await computeFirstCookStats({
      userId: 'u1',
      cuisine: '',
      asOfDate: new Date(),
    });
    expect(result.isFirstCook).toBe(false);
    expect(result.cuisinesCookedCount).toBe(1);
  });
});
