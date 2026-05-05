// backend/__tests__/services/cohortDistanceService.test.ts
// ROADMAP 4.0 Tier B2 — Cohort distance metric (TDD).

import {
  jaccardDistance,
  computeCohortDistance,
  pairwiseDistances,
  median,
} from '../../src/services/cohortDistanceService';
import { prisma } from '../../src/lib/prisma';

const mockPrisma = prisma as any;

beforeEach(() => {
  jest.clearAllMocks();
  if (!mockPrisma.recipeView) {
    mockPrisma.recipeView = { findMany: jest.fn() };
  } else {
    mockPrisma.recipeView.findMany = jest.fn();
  }
  if (!mockPrisma.cohortDistanceSnapshot) {
    mockPrisma.cohortDistanceSnapshot = { upsert: jest.fn() };
  } else {
    mockPrisma.cohortDistanceSnapshot.upsert = jest.fn();
  }
});

describe('jaccardDistance', () => {
  it('returns 0 for identical non-empty sets', () => {
    expect(jaccardDistance(new Set(['a', 'b', 'c']), new Set(['a', 'b', 'c']))).toBe(0);
  });

  it('returns 1 for fully disjoint sets', () => {
    expect(jaccardDistance(new Set(['a', 'b']), new Set(['c', 'd']))).toBe(1);
  });

  it('returns 0.5 when overlap is half the union', () => {
    // {a,b} ∩ {b,c} = {b}; ∪ = {a,b,c}; jaccard = 1/3; distance = 2/3
    const d = jaccardDistance(new Set(['a', 'b']), new Set(['b', 'c']));
    expect(d).toBeCloseTo(2 / 3, 5);
  });

  it('returns 0 for two empty sets (degenerate — treat as identical)', () => {
    expect(jaccardDistance(new Set(), new Set())).toBe(0);
  });

  it('returns 1 when one set is empty and the other is not', () => {
    expect(jaccardDistance(new Set(['a']), new Set())).toBe(1);
  });
});

describe('median', () => {
  it('returns the middle value for odd-length arrays', () => {
    expect(median([1, 3, 5])).toBe(3);
  });

  it('returns the average of the middle two for even-length arrays', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('throws on empty input', () => {
    expect(() => median([])).toThrow();
  });
});

describe('pairwiseDistances', () => {
  it('returns n*(n-1)/2 distances for n users', () => {
    const userSets = new Map<string, Set<string>>([
      ['u1', new Set(['a', 'b'])],
      ['u2', new Set(['b', 'c'])],
      ['u3', new Set(['a', 'c', 'd'])],
    ]);
    const distances = pairwiseDistances(userSets);
    // 3*2/2 = 3 pairs
    expect(distances).toHaveLength(3);
    distances.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    });
  });

  it('returns empty array for fewer than 2 users', () => {
    expect(pairwiseDistances(new Map([['u1', new Set(['a'])]]))).toEqual([]);
    expect(pairwiseDistances(new Map())).toEqual([]);
  });

  it('returns 0-only when all users have identical sets', () => {
    const sameSet = new Set(['x', 'y']);
    const userSets = new Map<string, Set<string>>([
      ['u1', sameSet],
      ['u2', sameSet],
      ['u3', sameSet],
    ]);
    expect(pairwiseDistances(userSets)).toEqual([0, 0, 0]);
  });

  it('returns 1-only when all users have fully disjoint sets', () => {
    const userSets = new Map<string, Set<string>>([
      ['u1', new Set(['a'])],
      ['u2', new Set(['b'])],
      ['u3', new Set(['c'])],
    ]);
    expect(pairwiseDistances(userSets)).toEqual([1, 1, 1]);
  });
});

describe('computeCohortDistance', () => {
  const buildView = (userId: string, recipeId: string, daysAgo: number) => ({
    userId,
    recipeId,
    viewedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  });

  it('throws when sample size is below the minimum (10)', async () => {
    // 9 users, all distinct -> Below threshold for any window
    const views = Array.from({ length: 9 }, (_, i) => buildView(`u${i}`, 'r-shared', 1));
    mockPrisma.recipeView.findMany.mockResolvedValue(views);

    await expect(
      computeCohortDistance({ cohortId: 'all', asOfDate: new Date(), persist: false })
    ).rejects.toThrow(/sample/i);
  });

  it('returns d7/d30/d90 medians + sampleSize when ≥10 users present', async () => {
    // 10 distinct users; 7-day window has overlap, 30/90 broader
    const views = [];
    for (let i = 0; i < 10; i++) {
      views.push(buildView(`u${i}`, `recipe-${i % 3}`, 1)); // 7d window
      views.push(buildView(`u${i}`, `recipe-${i % 5}`, 20)); // 30d window
      views.push(buildView(`u${i}`, `recipe-${i % 7}`, 60)); // 90d window
    }
    mockPrisma.recipeView.findMany.mockResolvedValue(views);
    mockPrisma.cohortDistanceSnapshot.upsert.mockResolvedValue({});

    const snap = await computeCohortDistance({
      cohortId: 'all',
      asOfDate: new Date(),
      persist: false,
    });

    expect(snap.sampleSize).toBe(10);
    expect(snap.d7Median).toBeGreaterThanOrEqual(0);
    expect(snap.d7Median).toBeLessThanOrEqual(1);
    expect(snap.d30Median).toBeGreaterThanOrEqual(0);
    expect(snap.d90Median).toBeGreaterThanOrEqual(0);
  });

  it('returns d*Median = 0 when all users have identical recipe sets', async () => {
    // 10 users, all viewing the same 3 recipes — fully convergent
    const views = [];
    for (let i = 0; i < 10; i++) {
      views.push(buildView(`u${i}`, 'r-a', 1));
      views.push(buildView(`u${i}`, 'r-b', 1));
      views.push(buildView(`u${i}`, 'r-c', 1));
    }
    mockPrisma.recipeView.findMany.mockResolvedValue(views);
    mockPrisma.cohortDistanceSnapshot.upsert.mockResolvedValue({});

    const snap = await computeCohortDistance({
      cohortId: 'all',
      asOfDate: new Date(),
      persist: false,
    });

    expect(snap.d7Median).toBe(0);
  });

  it('returns d*Median = 1 when all users have disjoint recipe sets', async () => {
    // 10 users, each viewing a unique recipe — fully diverse
    const views = Array.from({ length: 10 }, (_, i) => buildView(`u${i}`, `r-${i}`, 1));
    mockPrisma.recipeView.findMany.mockResolvedValue(views);
    mockPrisma.cohortDistanceSnapshot.upsert.mockResolvedValue({});

    const snap = await computeCohortDistance({
      cohortId: 'all',
      asOfDate: new Date(),
      persist: false,
    });

    expect(snap.d7Median).toBe(1);
  });

  it('persists when persist=true', async () => {
    const views = Array.from({ length: 10 }, (_, i) => buildView(`u${i}`, `r-${i % 2}`, 1));
    mockPrisma.recipeView.findMany.mockResolvedValue(views);
    mockPrisma.cohortDistanceSnapshot.upsert.mockResolvedValue({});

    await computeCohortDistance({
      cohortId: 'lifestyle',
      asOfDate: new Date('2026-05-04'),
      persist: true,
    });

    expect(mockPrisma.cohortDistanceSnapshot.upsert).toHaveBeenCalledTimes(1);
    const args = mockPrisma.cohortDistanceSnapshot.upsert.mock.calls[0][0];
    expect(args.create.cohortId).toBe('lifestyle');
  });

  it('does NOT persist when persist=false', async () => {
    const views = Array.from({ length: 10 }, (_, i) => buildView(`u${i}`, `r-${i}`, 1));
    mockPrisma.recipeView.findMany.mockResolvedValue(views);

    await computeCohortDistance({
      cohortId: 'all',
      asOfDate: new Date(),
      persist: false,
    });

    expect(mockPrisma.cohortDistanceSnapshot.upsert).not.toHaveBeenCalled();
  });
});
