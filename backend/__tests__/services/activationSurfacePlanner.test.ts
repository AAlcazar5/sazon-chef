// ROADMAP 4.0 N12.1 + N12.2 — activationSurfacePlanner test.

import { prisma } from '../../src/lib/prisma';
import {
  pickActivationSurface,
  __INTERNALS,
} from '../../src/services/activationSurfacePlanner';

const userFindUnique = jest.fn();
const cookCount = jest.fn();
const recipeFindMany = jest.fn();

(prisma as any).user = {
  ...((prisma as any).user ?? {}),
  findUnique: userFindUnique,
};
(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  count: cookCount,
};
(prisma as any).recipe = {
  ...((prisma as any).recipe ?? {}),
  findMany: recipeFindMany,
};

const NOW = new Date('2026-05-06T12:00:00Z');
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

const userSnapshot = (over: any = {}) => ({
  createdAt: dayOffset(-4), // signed up 4 days ago by default
  preferences: {
    likedCuisines: [{ name: 'Italian' }, { name: 'Persian' }],
    seededCuisines: null,
  },
  ...over,
});

beforeEach(() => {
  userFindUnique.mockReset();
  cookCount.mockReset();
  recipeFindMany.mockReset();
  userFindUnique.mockResolvedValue(userSnapshot());
  cookCount.mockResolvedValue(0);
  recipeFindMany.mockResolvedValue([
    { id: 'r1', title: 'Carbonara', cuisine: 'Italian', cookTime: 25, imageUrl: null },
    { id: 'r2', title: 'Saffron rice', cuisine: 'Persian', cookTime: 30, imageUrl: null },
    { id: 'r3', title: 'Quick puttanesca', cuisine: 'Italian', cookTime: 20, imageUrl: null },
  ]);
});

describe('N12 — input guards', () => {
  it('returns null for empty userId', async () => {
    expect(await pickActivationSurface({ userId: '' })).toBeNull();
    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it('returns null when user not found', async () => {
    userFindUnique.mockResolvedValue(null);
    expect(
      await pickActivationSurface({ userId: 'ghost', now: NOW }),
    ).toBeNull();
  });
});

describe('N12 — Day 0–2 settling-in window (no surface)', () => {
  it('returns null at day 0', async () => {
    userFindUnique.mockResolvedValue(userSnapshot({ createdAt: NOW }));
    expect(
      await pickActivationSurface({ userId: 'u1', now: NOW }),
    ).toBeNull();
  });

  it('returns null at day 2', async () => {
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-2) }),
    );
    expect(
      await pickActivationSurface({ userId: 'u1', now: NOW }),
    ).toBeNull();
  });
});

describe('N12.1 — Day 3-6 + 0 cooks', () => {
  it('returns the day-3 surface with 3 starter recipes', async () => {
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-3) }),
    );
    const out = await pickActivationSurface({ userId: 'u1', now: NOW });
    expect(out).not.toBeNull();
    expect(out!.phase).toBe('day-3');
    expect(out!.daysSinceSignup).toBe(3);
    expect(out!.recipes).toHaveLength(3);
    expect(out!.headline).toBe('Ready for the first cook?');
  });

  it('starter recipes are filtered to cookTime ≤ STARTER_COOK_TIME_MAX', async () => {
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-4) }),
    );
    await pickActivationSurface({ userId: 'u1', now: NOW });
    const where = recipeFindMany.mock.calls[0][0].where;
    expect(where.cookTime.lte).toBe(__INTERNALS.STARTER_COOK_TIME_MAX);
  });

  it('passes onboarding-stated cuisines to the recipe query', async () => {
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-4) }),
    );
    await pickActivationSurface({ userId: 'u1', now: NOW });
    const where = recipeFindMany.mock.calls[0][0].where;
    expect(where.cuisine.in).toEqual(['Italian', 'Persian']);
  });

  it('falls back to any beginner recipe when user has no onboarding cuisines', async () => {
    userFindUnique.mockResolvedValue({
      createdAt: dayOffset(-4),
      preferences: { likedCuisines: [], seededCuisines: null },
    });
    await pickActivationSurface({ userId: 'u1', now: NOW });
    const where = recipeFindMany.mock.calls[0][0].where;
    expect(where.cuisine).toBeUndefined();
  });

  it('reads cuisines from likedCuisines + seededCuisines (deduped)', async () => {
    userFindUnique.mockResolvedValue({
      createdAt: dayOffset(-4),
      preferences: {
        likedCuisines: [{ name: 'Italian' }, { name: 'persian' }],
        seededCuisines: JSON.stringify(['Persian', 'Thai']),
      },
    });
    const out = await pickActivationSurface({ userId: 'u1', now: NOW });
    expect(out!.onboardingCuisines).toEqual(['Italian', 'persian', 'Thai']);
  });

  it('returns null when cookCount > 0 (user has cooked at least once)', async () => {
    cookCount.mockResolvedValue(1);
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-4) }),
    );
    expect(
      await pickActivationSurface({ userId: 'u1', now: NOW }),
    ).toBeNull();
  });

  it('headline is invitational, not punitive', async () => {
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-4) }),
    );
    const out = await pickActivationSurface({ userId: 'u1', now: NOW });
    expect(out!.headline.toLowerCase()).not.toMatch(/missed|behind|should/);
  });
});

describe('N12.2 — Day 7+ graceful degradation', () => {
  it('returns the day-7 surface with no recipe trio', async () => {
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-7) }),
    );
    const out = await pickActivationSurface({ userId: 'u1', now: NOW });
    expect(out).not.toBeNull();
    expect(out!.phase).toBe('day-7');
    expect(out!.daysSinceSignup).toBe(7);
    expect(out!.recipes).toEqual([]);
  });

  it('does not query recipes for day-7 (saves the round-trip)', async () => {
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-10) }),
    );
    await pickActivationSurface({ userId: 'u1', now: NOW });
    expect(recipeFindMany).not.toHaveBeenCalled();
  });

  it('day-7 copy is soft, never punitive', async () => {
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-7) }),
    );
    const out = await pickActivationSurface({ userId: 'u1', now: NOW });
    expect(out!.headline.toLowerCase()).toContain('no rush');
    expect(out!.body.toLowerCase()).not.toMatch(/missed|behind|failed/);
  });

  it('returns null at day-7 when user has cooked at least once', async () => {
    cookCount.mockResolvedValue(1);
    userFindUnique.mockResolvedValue(
      userSnapshot({ createdAt: dayOffset(-10) }),
    );
    expect(
      await pickActivationSurface({ userId: 'u1', now: NOW }),
    ).toBeNull();
  });
});

describe('N12 — internals', () => {
  it('publishes the day floors + starter constraints', () => {
    expect(__INTERNALS.DAY_3_FLOOR).toBe(3);
    expect(__INTERNALS.DAY_7_FLOOR).toBe(7);
    expect(__INTERNALS.STARTER_RECIPE_COUNT).toBe(3);
    expect(__INTERNALS.STARTER_COOK_TIME_MAX).toBe(30);
  });
});

describe('N12 — edge cases', () => {
  it('handles malformed seededCuisines JSON gracefully', async () => {
    userFindUnique.mockResolvedValue({
      createdAt: dayOffset(-4),
      preferences: {
        likedCuisines: [{ name: 'Italian' }],
        seededCuisines: 'not-json',
      },
    });
    const out = await pickActivationSurface({ userId: 'u1', now: NOW });
    expect(out).not.toBeNull();
    expect(out!.onboardingCuisines).toEqual(['Italian']);
  });

  it('handles missing preferences relation', async () => {
    userFindUnique.mockResolvedValue({
      createdAt: dayOffset(-4),
      preferences: null,
    });
    const out = await pickActivationSurface({ userId: 'u1', now: NOW });
    expect(out).not.toBeNull();
    expect(out!.onboardingCuisines).toEqual([]);
  });
});
