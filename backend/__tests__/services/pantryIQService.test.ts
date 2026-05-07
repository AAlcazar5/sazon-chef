// ROADMAP 4.0 IG10.1 — pantryIQService test.

import { prisma } from '../../src/lib/prisma';
import {
  computePantryIQ,
  __INTERNALS,
} from '../../src/services/pantryIQService';

const cookFindMany = jest.fn();
const eventFindMany = jest.fn();
const pantryFindMany = jest.fn();

(prisma as any).cookingLog = {
  ...((prisma as any).cookingLog ?? {}),
  findMany: cookFindMany,
};
(prisma as any).ingredientEvent = {
  ...((prisma as any).ingredientEvent ?? {}),
  findMany: eventFindMany,
};
(prisma as any).pantryItem = {
  ...((prisma as any).pantryItem ?? {}),
  findMany: pantryFindMany,
};

beforeEach(() => {
  cookFindMany.mockReset();
  eventFindMany.mockReset();
  pantryFindMany.mockReset();
  cookFindMany.mockResolvedValue([]);
  eventFindMany.mockResolvedValue([]);
  pantryFindMany.mockResolvedValue([]);
});

const NOW = new Date('2026-05-06T12:00:00Z');
const dayOffset = (d: number) => new Date(NOW.getTime() + d * 86400000);

const mkCook = (cuisine: string, daysAgo = 0) => ({
  recipe: { cuisine },
  cookedAt: dayOffset(-daysAgo),
});

const mkEvent = (ingredientName: string, daysAgo = 0) => ({
  ingredientName,
  occurredAt: dayOffset(-daysAgo),
});

const mkPantryItem = (name: string, daysAgoCreated = 7, lastConsumed?: Date | null) => ({
  name,
  createdAt: dayOffset(-daysAgoCreated),
  lastConsumedAt: lastConsumed === undefined ? null : lastConsumed,
});

describe('IG10.1 — input guards', () => {
  it('returns null for empty userId', async () => {
    expect(await computePantryIQ({ userId: '' })).toBeNull();
  });

  it('returns null for cold-start (< MIN_COOK_COUNT)', async () => {
    cookFindMany.mockResolvedValue([
      mkCook('Italian', 1),
      mkCook('Italian', 2),
    ]);
    expect(await computePantryIQ({ userId: 'u1', now: NOW })).toBeNull();
  });
});

describe('IG10.1 — topCuisine ("lean")', () => {
  it('picks the dominant cuisine when ratio ≥ MIN_DOMINANT_RATIO', async () => {
    cookFindMany.mockResolvedValue([
      mkCook('Italian', 1),
      mkCook('Italian', 2),
      mkCook('Italian', 3),
      mkCook('Italian', 4),
      mkCook('Persian', 5),
      mkCook('Mexican', 6),
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq).not.toBeNull();
    expect(iq!.topCuisine!.cuisine).toBe('Italian');
    expect(iq!.topCuisine!.cookCount).toBe(4);
    expect(iq!.topCuisine!.perWeek).toBeGreaterThan(0);
  });

  it('returns null topCuisine when no cuisine dominates (top < 40%)', async () => {
    cookFindMany.mockResolvedValue([
      mkCook('Italian', 1),
      mkCook('Persian', 2),
      mkCook('Mexican', 3),
      mkCook('Japanese', 4),
      mkCook('Thai', 5),
      mkCook('Indian', 6),
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.topCuisine).toBeNull();
  });

  it('returns null topCuisine on ties at the top (no card per spec)', async () => {
    cookFindMany.mockResolvedValue([
      mkCook('Italian', 1),
      mkCook('Italian', 2),
      mkCook('Italian', 3),
      mkCook('Persian', 4),
      mkCook('Persian', 5),
      mkCook('Persian', 6),
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.topCuisine).toBeNull();
  });

  it('skips null cuisines from the count', async () => {
    cookFindMany.mockResolvedValue([
      mkCook('Italian', 1),
      mkCook('Italian', 2),
      mkCook('Italian', 3),
      mkCook('Italian', 4),
      mkCook('Italian', 5),
      { recipe: { cuisine: null }, cookedAt: dayOffset(-6) },
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.topCuisine!.cuisine).toBe('Italian');
  });
});

describe('IG10.1 — mostUsed', () => {
  it('picks the most-consumed ingredient with cook count', async () => {
    cookFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => mkCook('Italian', i)),
    );
    eventFindMany.mockResolvedValue([
      mkEvent('lemon', 1),
      mkEvent('lemon', 2),
      mkEvent('lemon', 3),
      mkEvent('garlic', 4),
      mkEvent('garlic', 5),
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.mostUsed!.ingredientName).toBe('lemon');
    expect(iq!.mostUsed!.cookCount).toBe(3);
  });

  it('returns null mostUsed when there are no consumed events', async () => {
    cookFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => mkCook('Italian', i)),
    );
    eventFindMany.mockResolvedValue([]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.mostUsed).toBeNull();
  });

  it('returns null mostUsed on top-tie (no card per spec)', async () => {
    cookFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => mkCook('Italian', i)),
    );
    eventFindMany.mockResolvedValue([
      mkEvent('lemon', 1),
      mkEvent('lemon', 2),
      mkEvent('garlic', 3),
      mkEvent('garlic', 4),
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.mostUsed).toBeNull();
  });
});

describe('IG10.1 — underused', () => {
  it('flags pantry item with no consumed event in 14+ days as underused', async () => {
    cookFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => mkCook('Italian', i)),
    );
    pantryFindMany.mockResolvedValue([
      mkPantryItem('chickpeas', 23), // never consumed → 23 days since createdAt
      mkPantryItem('olive oil', 5), // recent — within window
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.underused!.ingredientName).toBe('chickpeas');
    expect(iq!.underused!.daysSinceLastUse).toBe(23);
  });

  it('uses lastConsumedAt column when fresher than event log', async () => {
    cookFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => mkCook('Italian', i)),
    );
    pantryFindMany.mockResolvedValue([
      mkPantryItem('chickpeas', 30, dayOffset(-3)), // fresh consume → not underused
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.underused).toBeNull();
  });

  it('returns null underused when pantry is empty', async () => {
    cookFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => mkCook('Italian', i)),
    );
    pantryFindMany.mockResolvedValue([]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.underused).toBeNull();
  });

  it('returns null underused when no item exceeds the 14-day floor', async () => {
    cookFindMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => mkCook('Italian', i)),
    );
    pantryFindMany.mockResolvedValue([
      mkPantryItem('rice', 7),
      mkPantryItem('flour', 10),
    ]);
    const iq = await computePantryIQ({ userId: 'u1', now: NOW });
    expect(iq!.underused).toBeNull();
  });
});

describe('IG10.1 — internals', () => {
  it('publishes thresholds for inspection', () => {
    expect(__INTERNALS.WINDOW_DAYS).toBe(30);
    expect(__INTERNALS.UNDERUSED_DAYS).toBe(14);
    expect(__INTERNALS.MIN_COOK_COUNT).toBe(5);
    expect(__INTERNALS.MIN_DOMINANT_RATIO).toBe(0.4);
  });
});
