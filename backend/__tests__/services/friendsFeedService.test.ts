// backend/__tests__/services/friendsFeedService.test.ts
// ROADMAP 4.0 F1 — friends feed scoring + queries.

const mockUserFollowUpsert = jest.fn();
const mockUserFollowDelete = jest.fn();
const mockUserFollowFindUnique = jest.fn();
const mockUserFollowFindMany = jest.fn();
const mockUserFollowCount = jest.fn();
const mockPlateShareFindMany = jest.fn();
const mockPantryItemFindMany = jest.fn();
const mockUserPreferencesFindUnique = jest.fn();
const mockSlotAffinityFindMany = jest.fn();
const mockMealComponentFindMany = jest.fn();
const mockUserFindMany = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    userFollow: {
      upsert: (...a: unknown[]) => mockUserFollowUpsert(...a),
      delete: (...a: unknown[]) => mockUserFollowDelete(...a),
      findUnique: (...a: unknown[]) => mockUserFollowFindUnique(...a),
      findMany: (...a: unknown[]) => mockUserFollowFindMany(...a),
      count: (...a: unknown[]) => mockUserFollowCount(...a),
    },
    plateShare: { findMany: (...a: unknown[]) => mockPlateShareFindMany(...a) },
    pantryItem: { findMany: (...a: unknown[]) => mockPantryItemFindMany(...a) },
    userPreferences: { findUnique: (...a: unknown[]) => mockUserPreferencesFindUnique(...a) },
    slotAffinity: { findMany: (...a: unknown[]) => mockSlotAffinityFindMany(...a) },
    mealComponent: { findMany: (...a: unknown[]) => mockMealComponentFindMany(...a) },
    user: { findMany: (...a: unknown[]) => mockUserFindMany(...a) },
  },
}));

import {
  follow,
  unfollow,
  isFollowing,
  getFollowing,
  getFollowSummary,
  scorePlate,
  computeFriendsFeed,
} from '../../src/services/friendsFeedService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('follow / unfollow', () => {
  it('follow upserts to enable retry-safety', async () => {
    mockUserFollowUpsert.mockResolvedValueOnce({});
    await follow('u1', 'u2');
    expect(mockUserFollowUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { followerId_followingId: { followerId: 'u1', followingId: 'u2' } },
      }),
    );
  });

  it('follow rejects self-follow', async () => {
    await expect(follow('u1', 'u1')).rejects.toThrow(/yourself/);
    expect(mockUserFollowUpsert).not.toHaveBeenCalled();
  });

  it('unfollow swallows already-not-following', async () => {
    mockUserFollowDelete.mockRejectedValueOnce(new Error('record not found'));
    await expect(unfollow('u1', 'u2')).resolves.toBeUndefined();
  });

  it('isFollowing returns true when row exists', async () => {
    mockUserFollowFindUnique.mockResolvedValueOnce({ id: '1' });
    expect(await isFollowing('u1', 'u2')).toBe(true);
  });

  it('isFollowing returns false when row missing', async () => {
    mockUserFollowFindUnique.mockResolvedValueOnce(null);
    expect(await isFollowing('u1', 'u2')).toBe(false);
  });

  it('getFollowing returns the list of followed userIds', async () => {
    mockUserFollowFindMany.mockResolvedValueOnce([
      { followingId: 'u2' },
      { followingId: 'u3' },
    ]);
    expect(await getFollowing('u1')).toEqual(['u2', 'u3']);
  });

  it('getFollowSummary parallels both counts', async () => {
    mockUserFollowCount
      .mockResolvedValueOnce(7)  // following
      .mockResolvedValueOnce(3); // followers
    const summary = await getFollowSummary('u1');
    expect(summary).toEqual({ userId: 'u1', followingCount: 7, followerCount: 3 });
  });
});

describe('scorePlate', () => {
  const allInPantry = new Set(['c1', 'c2', 'c3']);
  const empty = new Set<string>();
  const components = [
    { slot: 'protein', componentId: 'c1' },
    { slot: 'base', componentId: 'c2' },
    { slot: 'vegetable', componentId: 'c3' },
  ];

  it('full pantry coverage + no banned + full slot affinity → composite ≈ 1.0', () => {
    const slotAffinity = new Map([
      ['protein', new Set(['c1'])],
      ['base', new Set(['c2'])],
      ['vegetable', new Set(['c3'])],
    ]);
    const score = scorePlate({
      components,
      pantryComponentIds: allInPantry,
      bannedComponentIds: empty,
      userSlotAffinity: slotAffinity,
    });
    expect(score.pantryCoverage).toBe(1);
    expect(score.dietaryCompatibility).toBe(1);
    expect(score.slotAffinityOverlap).toBe(1);
    expect(score.composite).toBeCloseTo(1.0, 3);
  });

  it('banned ingredient zeroes dietary compatibility — composite drops', () => {
    const score = scorePlate({
      components,
      pantryComponentIds: allInPantry,
      bannedComponentIds: new Set(['c2']),
      userSlotAffinity: new Map(),
    });
    expect(score.dietaryCompatibility).toBe(0);
    expect(score.composite).toBeCloseTo(0.5, 3); // pantry only
  });

  it('partial pantry, no banned, no slot affinity', () => {
    const score = scorePlate({
      components,
      pantryComponentIds: new Set(['c1']),
      bannedComponentIds: empty,
      userSlotAffinity: new Map(),
    });
    expect(score.pantryCoverage).toBeCloseTo(1 / 3, 3);
    expect(score.dietaryCompatibility).toBe(1);
    expect(score.slotAffinityOverlap).toBe(0);
    expect(score.composite).toBeCloseTo(1 / 3 * 0.5 + 0.3, 3);
  });

  it('empty plate returns zero composite', () => {
    const score = scorePlate({
      components: [],
      pantryComponentIds: empty,
      bannedComponentIds: empty,
      userSlotAffinity: new Map(),
    });
    expect(score.composite).toBe(0);
  });

  it('weights: pantry=0.5, dietary=0.3, affinity=0.2 sum to 1.0', () => {
    const score = scorePlate({
      components: [{ slot: 'protein', componentId: 'c1' }],
      pantryComponentIds: new Set(['c1']),
      bannedComponentIds: empty,
      userSlotAffinity: new Map([['protein', new Set(['c1'])]]),
    });
    expect(score.composite).toBeCloseTo(1.0, 3);
  });
});

describe('computeFriendsFeed', () => {
  function defaultMocks() {
    mockUserFollowFindMany.mockResolvedValue([{ followingId: 'friend1' }]);
    mockPlateShareFindMany.mockResolvedValue([
      {
        slug: 'plate-1-share',
        createdBy: 'friend1',
        plate: {
          id: 'plate-1',
          userId: 'friend1',
          componentIds: JSON.stringify([
            { slot: 'protein', componentId: 'c1' },
            { slot: 'base', componentId: 'c2' },
          ]),
          name: "Friend's farro bowl",
          createdAt: new Date('2026-05-01T00:00:00Z'),
        },
      },
    ]);
    mockPantryItemFindMany.mockResolvedValue([{ name: 'Salmon' }, { name: 'Farro' }]);
    mockUserPreferencesFindUnique.mockResolvedValue({ bannedIngredients: [] });
    mockSlotAffinityFindMany.mockResolvedValue([]);
    mockMealComponentFindMany.mockResolvedValue([
      { id: 'c1', name: 'Salmon', slot: 'protein' },
      { id: 'c2', name: 'Farro', slot: 'base' },
    ]);
    mockUserFindMany.mockResolvedValue([{ id: 'friend1', name: 'Maya' }]);
  }

  it('returns empty array when no follows', async () => {
    mockUserFollowFindMany.mockResolvedValueOnce([]);
    const feed = await computeFriendsFeed('me');
    expect(feed).toEqual([]);
    expect(mockPlateShareFindMany).not.toHaveBeenCalled();
  });

  it('returns empty when followed users have not shared anything', async () => {
    mockUserFollowFindMany.mockResolvedValueOnce([{ followingId: 'friend1' }]);
    mockPlateShareFindMany.mockResolvedValueOnce([]);
    const feed = await computeFriendsFeed('me');
    expect(feed).toEqual([]);
  });

  it('scores + ranks plates and includes friend display name', async () => {
    defaultMocks();
    const feed = await computeFriendsFeed('me');
    expect(feed).toHaveLength(1);
    expect(feed[0].plateId).toBe('plate-1');
    expect(feed[0].ownerName).toBe('Maya');
    expect(feed[0].shareSlug).toBe('plate-1-share');
    expect(feed[0].score.pantryCoverage).toBe(1); // both components in pantry
    expect(feed[0].score.dietaryCompatibility).toBe(1);
  });

  it('filters out plates that contain banned ingredients', async () => {
    defaultMocks();
    mockUserPreferencesFindUnique.mockResolvedValueOnce({
      bannedIngredients: [{ name: 'Salmon' }],
    });
    const feed = await computeFriendsFeed('me');
    expect(feed).toHaveLength(0);
  });

  it('sorts results by composite score descending', async () => {
    mockUserFollowFindMany.mockResolvedValueOnce([{ followingId: 'friend1' }]);
    mockPlateShareFindMany.mockResolvedValueOnce([
      {
        slug: 's1',
        createdBy: 'friend1',
        plate: {
          id: 'p1',
          userId: 'friend1',
          componentIds: JSON.stringify([{ slot: 'protein', componentId: 'cA' }]),
          name: 'Low coverage',
          createdAt: new Date('2026-05-01T00:00:00Z'),
        },
      },
      {
        slug: 's2',
        createdBy: 'friend1',
        plate: {
          id: 'p2',
          userId: 'friend1',
          componentIds: JSON.stringify([{ slot: 'protein', componentId: 'cB' }]),
          name: 'High coverage',
          createdAt: new Date('2026-05-01T00:00:00Z'),
        },
      },
    ]);
    mockPantryItemFindMany.mockResolvedValueOnce([{ name: 'High Match' }]);
    mockUserPreferencesFindUnique.mockResolvedValueOnce({ bannedIngredients: [] });
    mockSlotAffinityFindMany.mockResolvedValueOnce([]);
    mockMealComponentFindMany.mockResolvedValueOnce([
      { id: 'cA', name: 'Low Match', slot: 'protein' },
      { id: 'cB', name: 'High Match', slot: 'protein' }, // matches pantry
    ]);
    mockUserFindMany.mockResolvedValueOnce([{ id: 'friend1', name: 'Maya' }]);

    const feed = await computeFriendsFeed('me');
    expect(feed).toHaveLength(2);
    expect(feed[0].plateId).toBe('p2'); // higher pantry coverage first
    expect(feed[1].plateId).toBe('p1');
  });
});
