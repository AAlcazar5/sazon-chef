// ROADMAP 4.0 WK0.1 — weekPlanRetrievalAdapter test.

import {
  retrieveCandidatesForWeek,
  __INTERNALS,
} from '../../../src/services/recommender/weekPlanRetrievalAdapter';
import * as retrievalModule from '../../../src/services/recommender/retrieveCandidates';

jest.mock('../../../src/services/recommender/retrieveCandidates');

const slot = (id: string, kind: string, date: string) => ({
  slotId: id,
  kind: kind as any,
  date,
  hardFilters: {},
});

const FAKE_VEC = [0.1, 0.2, 0.3];

beforeEach(() => {
  jest.clearAllMocks();
  (retrievalModule.retrieveCandidates as jest.Mock).mockResolvedValue({
    recipeIds: ['r1', 'r2', 'r3', 'r4', 'r5'],
    scores: [0.9, 0.85, 0.8, 0.75, 0.7],
    scanned: 100,
    survivors: 50,
  });
});

describe('WK0.1 — retrieveCandidatesForWeek', () => {
  it('returns empty result for empty userId', async () => {
    const out = await retrieveCandidatesForWeek({
      userId: '',
      slots: [slot('s1', 'lunch', '2026-05-08')],
      context: {},
      contextVector: FAKE_VEC,
    });
    expect(out.slots).toEqual([]);
    expect(retrievalModule.retrieveCandidates).not.toHaveBeenCalled();
  });

  it('returns empty result when no slots provided', async () => {
    const out = await retrieveCandidatesForWeek({
      userId: 'u1',
      slots: [],
      context: {},
      contextVector: FAKE_VEC,
    });
    expect(out.slots).toEqual([]);
    expect(out.anyFallbackNeeded).toBe(false);
  });

  it('dispatches one retrieval call per slot', async () => {
    const slots = [
      slot('s1', 'breakfast', '2026-05-08'),
      slot('s2', 'lunch', '2026-05-08'),
      slot('s3', 'dinner', '2026-05-08'),
    ];
    await retrieveCandidatesForWeek({
      userId: 'u1',
      slots,
      context: {},
      contextVector: FAKE_VEC,
    });
    expect(retrievalModule.retrieveCandidates).toHaveBeenCalledTimes(3);
  });

  it('passes the user contextVector + per-slot hardFilters to retrieval', async () => {
    const s = slot('s1', 'lunch', '2026-05-08');
    s.hardFilters = {
      allergens: ['peanut'],
      dietaryTags: ['vegetarian'],
      maxCookTime: 30,
    };
    await retrieveCandidatesForWeek({
      userId: 'u1',
      slots: [s],
      context: { pantryNames: ['rice', 'tofu'] },
      contextVector: FAKE_VEC,
    });
    const args = (retrievalModule.retrieveCandidates as jest.Mock).mock.calls[0][0];
    expect(args.userId).toBe('u1');
    expect(args.contextVector).toBe(FAKE_VEC);
    expect(args.hardFilters.allergens).toEqual(['peanut']);
    expect(args.hardFilters.dietaryTags).toEqual(['vegetarian']);
    expect(args.hardFilters.maxCookTime).toBe(30);
    expect(args.hardFilters.pantryItems).toEqual(['rice', 'tofu']);
    expect(args.hardFilters.minPantryCoverage).toBe(0); // soft, not blocking
  });

  it('returns ranked candidates per slot', async () => {
    const out = await retrieveCandidatesForWeek({
      userId: 'u1',
      slots: [slot('s1', 'lunch', '2026-05-08')],
      context: {},
      contextVector: FAKE_VEC,
    });
    expect(out.slots).toHaveLength(1);
    expect(out.slots[0].slotId).toBe('s1');
    expect(out.slots[0].recipeIds).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
    expect(out.slots[0].needsAiFallback).toBe(false);
  });

  it('flags needsAiFallback when candidate count < FALLBACK_FLOOR (3)', async () => {
    (retrievalModule.retrieveCandidates as jest.Mock).mockResolvedValue({
      recipeIds: ['r1', 'r2'], // only 2 — below floor
      scores: [0.9, 0.8],
      scanned: 50,
      survivors: 5,
    });
    const out = await retrieveCandidatesForWeek({
      userId: 'u1',
      slots: [slot('s1', 'lunch', '2026-05-08')],
      context: {},
      contextVector: FAKE_VEC,
    });
    expect(out.slots[0].needsAiFallback).toBe(true);
    expect(out.anyFallbackNeeded).toBe(true);
  });

  it('does not flag fallback when candidate count meets the floor exactly (3)', async () => {
    (retrievalModule.retrieveCandidates as jest.Mock).mockResolvedValue({
      recipeIds: ['r1', 'r2', 'r3'],
      scores: [0.9, 0.8, 0.7],
      scanned: 50,
      survivors: 5,
    });
    const out = await retrieveCandidatesForWeek({
      userId: 'u1',
      slots: [slot('s1', 'lunch', '2026-05-08')],
      context: {},
      contextVector: FAKE_VEC,
    });
    expect(out.slots[0].needsAiFallback).toBe(false);
  });

  it('honors caller-supplied k (capped at MAX_K)', async () => {
    await retrieveCandidatesForWeek({
      userId: 'u1',
      slots: [slot('s1', 'lunch', '2026-05-08')],
      context: {},
      contextVector: FAKE_VEC,
      k: 999,
    });
    const args = (retrievalModule.retrieveCandidates as jest.Mock).mock.calls[0][0];
    expect(args.k).toBe(__INTERNALS.MAX_K);
  });

  it('mixed-fallback weeks set anyFallbackNeeded when ANY slot needs fallback', async () => {
    (retrievalModule.retrieveCandidates as jest.Mock)
      .mockResolvedValueOnce({
        recipeIds: ['r1', 'r2', 'r3', 'r4', 'r5'],
        scores: [0.9, 0.85, 0.8, 0.75, 0.7],
        scanned: 100,
        survivors: 50,
      })
      .mockResolvedValueOnce({
        recipeIds: ['r-a'], // below floor → fallback
        scores: [0.6],
        scanned: 80,
        survivors: 1,
      });
    const out = await retrieveCandidatesForWeek({
      userId: 'u1',
      slots: [
        slot('s1', 'breakfast', '2026-05-08'),
        slot('s2', 'lunch', '2026-05-08'),
      ],
      context: {},
      contextVector: FAKE_VEC,
    });
    expect(out.slots[0].needsAiFallback).toBe(false);
    expect(out.slots[1].needsAiFallback).toBe(true);
    expect(out.anyFallbackNeeded).toBe(true);
  });

  it('publishes constants for cap-test inspection', () => {
    expect(__INTERNALS.DEFAULT_K).toBe(8);
    expect(__INTERNALS.FALLBACK_FLOOR).toBe(3);
    expect(__INTERNALS.MAX_K).toBe(25);
  });

  it('forwards retrieval telemetry (scanned + survivors) per slot', async () => {
    (retrievalModule.retrieveCandidates as jest.Mock).mockResolvedValue({
      recipeIds: ['r1', 'r2', 'r3', 'r4', 'r5'],
      scores: [0.9, 0.85, 0.8, 0.75, 0.7],
      scanned: 1234,
      survivors: 87,
    });
    const out = await retrieveCandidatesForWeek({
      userId: 'u1',
      slots: [slot('s1', 'lunch', '2026-05-08')],
      context: {},
      contextVector: FAKE_VEC,
    });
    expect(out.slots[0].scanned).toBe(1234);
    expect(out.slots[0].survivors).toBe(87);
  });
});
