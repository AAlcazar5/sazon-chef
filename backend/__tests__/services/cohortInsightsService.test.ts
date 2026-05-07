// ROADMAP 4.0 N7.3 — cohortInsightsService test.

import { prisma } from '../../src/lib/prisma';
import {
  getFriendCohort,
  getCookedNext,
  __INTERNALS,
} from '../../src/services/cohortInsightsService';
import * as privacy from '../../src/services/userPrivacyService';

jest.mock('../../src/services/userPrivacyService');

const userFollowFindMany = jest.fn();
const cookingLogFindMany = jest.fn();
const cookingLogFindFirst = jest.fn();

(prisma as any).userFollow = {
  ...((prisma as any).userFollow ?? {}),
  findMany: userFollowFindMany,
};
(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findMany: cookingLogFindMany,
  findFirst: cookingLogFindFirst,
};

const NOW = new Date('2026-05-06T12:00:00Z');
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

beforeEach(() => {
  jest.clearAllMocks();
  userFollowFindMany.mockResolvedValue([]);
  cookingLogFindMany.mockResolvedValue([]);
  cookingLogFindFirst.mockResolvedValue(null);
  (privacy.canSurfaceFriends as jest.Mock).mockResolvedValue(true);
  (privacy.canShareCrossUserData as jest.Mock).mockResolvedValue(true);
});

describe('N7.3 — getFriendCohort', () => {
  it('returns empty for missing inputs', async () => {
    expect((await getFriendCohort({ userId: '', recipeId: 'r1' })).members).toEqual([]);
    expect((await getFriendCohort({ userId: 'u1', recipeId: '' })).members).toEqual([]);
  });

  it('returns empty when caller has no follows', async () => {
    userFollowFindMany.mockResolvedValue([]);
    const result = await getFriendCohort({ userId: 'u1', recipeId: 'r1' });
    expect(result.members).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('returns empty when no friends cooked the recipe in the window', async () => {
    userFollowFindMany.mockResolvedValue([
      { followingId: 'friend-a' },
      { followingId: 'friend-b' },
    ]);
    cookingLogFindMany.mockResolvedValue([]);
    const result = await getFriendCohort({ userId: 'u1', recipeId: 'r1' });
    expect(result.members).toEqual([]);
  });

  it('returns named friends when socialOptIn is true', async () => {
    userFollowFindMany.mockResolvedValue([
      { followingId: 'friend-a' },
      { followingId: 'friend-b' },
    ]);
    cookingLogFindMany.mockResolvedValue([
      {
        userId: 'friend-a',
        cookedAt: dayOffset(-2),
        user: { name: 'Marcus Chen' },
      },
      {
        userId: 'friend-b',
        cookedAt: dayOffset(-3),
        user: { name: 'Priya Patel' },
      },
    ]);
    const result = await getFriendCohort({ userId: 'u1', recipeId: 'r1' });
    expect(result.members).toHaveLength(2);
    expect(result.members[0].firstName).toBe('Marcus'); // first name only
    expect(result.members[1].firstName).toBe('Priya');
    expect(result.identityRedacted).toBe(false);
  });

  it('redacts identity when socialOptIn is false', async () => {
    (privacy.canSurfaceFriends as jest.Mock).mockResolvedValue(false);
    userFollowFindMany.mockResolvedValue([{ followingId: 'friend-a' }]);
    cookingLogFindMany.mockResolvedValue([
      {
        userId: 'friend-a',
        cookedAt: dayOffset(-1),
        user: { name: 'Marcus Chen' },
      },
    ]);
    const result = await getFriendCohort({ userId: 'u1', recipeId: 'r1' });
    expect(result.members).toHaveLength(1);
    expect(result.members[0].firstName).toBe(''); // redacted
    expect(result.identityRedacted).toBe(true);
  });

  it('dedups by userId (a friend who cooked twice counts once)', async () => {
    userFollowFindMany.mockResolvedValue([{ followingId: 'friend-a' }]);
    cookingLogFindMany.mockResolvedValue([
      {
        userId: 'friend-a',
        cookedAt: dayOffset(-1),
        user: { name: 'Marcus Chen' },
      },
      {
        userId: 'friend-a',
        cookedAt: dayOffset(-3),
        user: { name: 'Marcus Chen' },
      },
    ]);
    const result = await getFriendCohort({ userId: 'u1', recipeId: 'r1' });
    expect(result.members).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it('respects the windowDays param', async () => {
    userFollowFindMany.mockResolvedValue([{ followingId: 'friend-a' }]);
    cookingLogFindMany.mockResolvedValue([]);
    await getFriendCohort({
      userId: 'u1',
      recipeId: 'r1',
      windowDays: 7,
    });
    const where = cookingLogFindMany.mock.calls[0][0].where;
    const since = where.cookedAt.gte as Date;
    expect(Date.now() - since.getTime()).toBeCloseTo(7 * 86400000, -3);
  });

  it('handles a friend with no name (firstName empty)', async () => {
    userFollowFindMany.mockResolvedValue([{ followingId: 'friend-a' }]);
    cookingLogFindMany.mockResolvedValue([
      {
        userId: 'friend-a',
        cookedAt: dayOffset(-1),
        user: { name: null },
      },
    ]);
    const result = await getFriendCohort({ userId: 'u1', recipeId: 'r1' });
    expect(result.members[0].firstName).toBe('');
  });
});

describe('N7.3 — getCookedNext', () => {
  it('returns empty for missing recipeId', async () => {
    expect((await getCookedNext({ recipeId: '' })).recipes).toEqual([]);
  });

  it('returns privacyOptOut when caller has shareOptIn off', async () => {
    (privacy.canShareCrossUserData as jest.Mock).mockResolvedValue(false);
    const result = await getCookedNext({
      recipeId: 'r-anchor',
      excludeUserId: 'u1',
    });
    expect(result.recipes).toEqual([]);
    expect(result.privacyOptOut).toBe(true);
  });

  it('returns belowKAnonFloor when fewer than 30 distinct cookers', async () => {
    cookingLogFindMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        userId: `u-${i}`,
        cookedAt: dayOffset(-2),
      })),
    );
    const result = await getCookedNext({
      recipeId: 'r-anchor',
      excludeUserId: 'me',
    });
    expect(result.recipes).toEqual([]);
    expect(result.belowKAnonFloor).toBe(true);
  });

  it('aggregates next-cooks above the k-anon floor', async () => {
    // 35 distinct cookers of the anchor → above the 30 floor
    const anchorCooks = Array.from({ length: 35 }, (_, i) => ({
      userId: `u-${i}`,
      cookedAt: dayOffset(-3),
    }));
    cookingLogFindMany.mockResolvedValue(anchorCooks);
    // For each, the "next" cook — split: 25 cooked r-A, 10 cooked r-B
    cookingLogFindFirst.mockImplementation((arg: any) => {
      const u = arg.where.userId as string;
      const idx = parseInt(u.replace('u-', ''), 10);
      const recipeId = idx < 25 ? 'r-A' : 'r-B';
      return Promise.resolve({ recipeId, userId: u });
    });
    const result = await getCookedNext({
      recipeId: 'r-anchor',
      excludeUserId: 'me',
    });
    expect(result.recipes[0].recipeId).toBe('r-A');
    expect(result.recipes[0].cookCount).toBe(25);
    expect(result.recipes[1].recipeId).toBe('r-B');
    expect(result.recipes[1].cookCount).toBe(10);
    expect(result.belowKAnonFloor).toBe(false);
  });

  it('caps at k', async () => {
    cookingLogFindMany.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) => ({
        userId: `u-${i}`,
        cookedAt: dayOffset(-2),
      })),
    );
    cookingLogFindFirst.mockImplementation((arg: any) => {
      const u = arg.where.userId as string;
      const idx = parseInt(u.replace('u-', ''), 10);
      // 10 distinct follow-up recipes
      return Promise.resolve({ recipeId: `r-${idx % 10}`, userId: u });
    });
    const result = await getCookedNext({
      recipeId: 'r-anchor',
      excludeUserId: 'me',
      k: 3,
    });
    expect(result.recipes.length).toBeLessThanOrEqual(3);
  });

  it('excludes the caller from the cohort query', async () => {
    cookingLogFindMany.mockResolvedValue([]);
    await getCookedNext({
      recipeId: 'r-anchor',
      excludeUserId: 'me',
    });
    const where = cookingLogFindMany.mock.calls[0][0].where;
    expect(where.userId).toEqual({ not: 'me' });
  });
});

describe('N7.3 — internals', () => {
  it('publishes cohort + k-anon constants', () => {
    expect(__INTERNALS.COHORT_KANON_FLOOR).toBe(30);
    expect(__INTERNALS.FRIEND_COHORT_DEFAULT_WINDOW_DAYS).toBe(14);
    expect(__INTERNALS.COOKEDNEXT_DEFAULT_K).toBe(5);
  });
});
