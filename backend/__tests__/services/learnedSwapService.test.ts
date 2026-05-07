// ROADMAP 4.0 IG6.2 — learnedSwapService test.

import { prisma } from '../../src/lib/prisma';
import {
  suggestSwaps,
  __INTERNALS,
} from '../../src/services/learnedSwapService';

const findMany = jest.fn();
(prisma as any).ingredientEvent = {
  ...((prisma as any).ingredientEvent ?? {}),
  findMany,
};

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue([]);
});

const mkRow = (
  userId: string,
  ingredientName: string,
  swapTargetName: string,
  eventType: 'swappedOut' | 'swappedIn' = 'swappedOut',
) => ({
  userId,
  ingredientName,
  swapTargetName,
  eventType,
});

describe('IG6.2 — suggestSwaps shape', () => {
  it('returns [] for empty name', async () => {
    expect(await suggestSwaps({ name: '' })).toEqual([]);
  });

  it('returns static dict swaps when no user / crowd signal exists', async () => {
    findMany.mockResolvedValue([]);
    const out = await suggestSwaps({ name: 'chicken breast' });
    // Static dict has known entries for chicken breast — at least one
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((s) => s.source === 'static')).toBe(true);
  });

  it('caps results at k', async () => {
    const out = await suggestSwaps({ name: 'chicken breast', k: 2 });
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it('publishes the source enum on each result', async () => {
    const out = await suggestSwaps({ name: 'chicken breast' });
    for (const s of out) {
      expect(['user', 'crowd', 'embedding', 'static']).toContain(s.source);
    }
  });
});

describe('IG6.2 — user-prior beats other sources', () => {
  it('user with 3 prior chickpeas → lentils swaps gets lentils ranked first', async () => {
    findMany.mockImplementation((arg: any) => {
      if (arg.where.eventType === 'swappedOut' && arg.where.userId === 'u1') {
        return Promise.resolve([
          mkRow('u1', 'chickpeas', 'lentils'),
          mkRow('u1', 'chickpeas', 'lentils'),
          mkRow('u1', 'chickpeas', 'lentils'),
        ]);
      }
      // crowd: zero distinct other users
      return Promise.resolve([]);
    });
    const out = await suggestSwaps({
      name: 'chickpeas',
      userId: 'u1',
    });
    expect(out[0].alternative).toBe('lentils');
    expect(out[0].source).toBe('user');
    expect(out[0].weight).toBe(__INTERNALS.USER_PRIOR_WEIGHT);
  });
});

describe('IG6.2 — crowd-mode k-anonymity floor', () => {
  it('crowd contributors below floor → falls through to static / other sources', async () => {
    // Only 5 distinct users contributing → below floor (30)
    findMany.mockImplementation((arg: any) => {
      if (arg.where.eventType === 'swappedOut' && arg.where.userId?.not) {
        return Promise.resolve(
          Array.from({ length: 5 }, (_, i) =>
            mkRow(`other-${i}`, 'chickpeas', 'lentils'),
          ),
        );
      }
      return Promise.resolve([]);
    });
    const out = await suggestSwaps({
      name: 'chickpeas',
      userId: 'u1',
    });
    // None should be source=crowd (k-anonymity not met)
    expect(out.every((s) => s.source !== 'crowd')).toBe(true);
  });

  it('crowd contributors at/above floor → crowd source surfaces', async () => {
    findMany.mockImplementation((arg: any) => {
      if (arg.where.eventType === 'swappedOut' && arg.where.userId?.not) {
        return Promise.resolve(
          Array.from({ length: 35 }, (_, i) =>
            mkRow(`other-${i}`, 'chickpeas', 'lentils'),
          ),
        );
      }
      return Promise.resolve([]);
    });
    const out = await suggestSwaps({
      name: 'chickpeas',
      userId: 'u1',
    });
    const lentils = out.find((s) => s.alternative === 'lentils');
    expect(lentils).toBeDefined();
    expect(lentils!.source).toBe('crowd');
  });
});

describe('IG6.2 — dietary filter', () => {
  it('vegan filter excludes animal-based swaps from ALL sources', async () => {
    // Seed user prior with chicken breast (animal) — should be filtered out
    findMany.mockImplementation((arg: any) => {
      if (arg.where.eventType === 'swappedOut' && arg.where.userId === 'u1') {
        return Promise.resolve([
          mkRow('u1', 'tofu', 'chicken breast'),
        ]);
      }
      return Promise.resolve([]);
    });
    const out = await suggestSwaps({
      name: 'tofu',
      userId: 'u1',
      dietaryRestrictions: ['vegan'],
    });
    expect(out.find((s) => /chicken/i.test(s.alternative))).toBeUndefined();
  });

  it('dairy-free filter excludes dairy-based swaps', async () => {
    findMany.mockImplementation((arg: any) => {
      if (arg.where.eventType === 'swappedOut' && arg.where.userId === 'u1') {
        return Promise.resolve([
          mkRow('u1', 'chicken breast', 'butter'),
        ]);
      }
      return Promise.resolve([]);
    });
    const out = await suggestSwaps({
      name: 'chicken breast',
      userId: 'u1',
      dietaryRestrictions: ['dairy-free'],
    });
    expect(out.find((s) => /butter/i.test(s.alternative))).toBeUndefined();
  });
});

describe('IG6.2 — without userId', () => {
  it('still returns static-source swaps', async () => {
    const out = await suggestSwaps({ name: 'chicken breast' });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].source).toBe('static');
  });

  it('crowd with no excludeUser parameter still works (no userId)', async () => {
    findMany.mockImplementation((arg: any) => {
      if (arg.where.eventType === 'swappedOut') {
        return Promise.resolve(
          Array.from({ length: 35 }, (_, i) =>
            mkRow(`other-${i}`, 'chickpeas', 'lentils'),
          ),
        );
      }
      return Promise.resolve([]);
    });
    const out = await suggestSwaps({ name: 'chickpeas' });
    const lentils = out.find((s) => s.alternative === 'lentils');
    expect(lentils?.source).toBe('crowd');
  });
});

describe('IG6.2 — internals', () => {
  it('publishes weight + k-anonymity constants for inspection', () => {
    expect(__INTERNALS.CROWD_KANON_FLOOR).toBe(30);
    expect(__INTERNALS.USER_PRIOR_WEIGHT).toBe(1.0);
    expect(__INTERNALS.STATIC_WEIGHT).toBeLessThan(__INTERNALS.USER_PRIOR_WEIGHT);
    expect(__INTERNALS.CROWD_WEIGHT_BASE).toBeLessThan(
      __INTERNALS.USER_PRIOR_WEIGHT,
    );
  });
});
