// X-C1 (founder roadmap Tier X — Moat Hardening): tests for the
// composed cook-memory-insights service. Pins:
//   - Empty log → null (honest-empty matches MemoryMirrorLead contract)
//   - Composition: cadence delegates to cookPatternService output
//   - Substitution fingerprint extraction + ranking
//   - Flop counting (rating='flop' OR outcome='flop')
//   - User-scoped queries (IDOR safety)

import { prisma } from '../../src/lib/prisma';
import {
  computeCookMemoryInsight,
  EMPTY_COOK_MEMORY_INSIGHT,
} from '../../src/services/cookMemoryInsightsService';

const cookingLog = (prisma as unknown as {
  cookingLog: { findMany: jest.Mock };
}).cookingLog;
const cookEvent = (prisma as unknown as {
  cookEvent: { findMany: jest.Mock };
}).cookEvent;

const NOW = new Date('2026-05-23T18:00:00.000Z');

beforeEach(() => {
  cookingLog.findMany.mockReset();
  cookEvent.findMany.mockReset();
});

describe('computeCookMemoryInsight — empty contract', () => {
  it('returns null for a user with NO cook history', async () => {
    cookingLog.findMany.mockResolvedValue([]);
    cookEvent.findMany.mockResolvedValue([]);

    const result = await computeCookMemoryInsight({
      userId: 'u_empty',
      now: NOW,
    });

    expect(result).toBeNull();
  });

  it('returns null for empty userId (defensive)', async () => {
    expect(await computeCookMemoryInsight({ userId: '' })).toBeNull();
  });
});

describe('computeCookMemoryInsight — populated', () => {
  it('returns the composed shape when ANY signal fires', async () => {
    // cookPatternService.getCookPattern → findMany returns >0 entries
    // → cadence object with non-zero totalCooks.
    cookingLog.findMany
      // 1st call: getCookPattern's 60-day window scan
      .mockResolvedValueOnce([
        { cookedAt: new Date('2026-05-15T18:00:00Z') },
        { cookedAt: new Date('2026-05-08T18:00:00Z') },
      ])
      // 2nd call: most-recent (for cuisine cadence)
      .mockResolvedValueOnce([
        {
          cookedAt: new Date('2026-05-22T18:00:00Z'),
          recipe: { cuisine: 'Italian' },
        },
      ])
      // 3rd call: cookRecapInsightService's monthly window
      .mockResolvedValueOnce([]);
    cookEvent.findMany
      .mockResolvedValueOnce([]) // swap events
      .mockResolvedValueOnce([]); // outcome events

    const result = await computeCookMemoryInsight({
      userId: 'u_one',
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.cadence.totalCooks).toBe(2);
    expect(result!.cuisineCadence).toBeNull(); // not enough cooks for streak
    expect(result!.substitutions).toEqual([]);
    expect(result!.flopsRecent).toBe(0);
  });

  it('extracts substitution fingerprint from swap events, ranked', async () => {
    cookingLog.findMany
      .mockResolvedValueOnce([{ cookedAt: new Date('2026-05-20T18:00:00Z') }])
      .mockResolvedValueOnce([]);
    cookEvent.findMany
      .mockResolvedValueOnce([
        // The "butter→olive oil" swap appears 3 times — should rank first.
        { payload: '{"from":"butter","to":"olive oil"}', createdAt: NOW },
        { payload: '{"from":"butter","to":"olive oil"}', createdAt: NOW },
        { payload: '{"from":"butter","to":"olive oil"}', createdAt: NOW },
        // Single swaps — tied in count, alphabetical tie-break.
        { payload: '{"from":"sour cream","to":"yogurt"}', createdAt: NOW },
        { payload: '{"from":"chicken","to":"tofu"}', createdAt: NOW },
        // Bad payload — should be silently skipped.
        { payload: 'not-json', createdAt: NOW },
        { payload: '{}', createdAt: NOW },
        { payload: '{"from":""}', createdAt: NOW },
      ])
      .mockResolvedValueOnce([]);

    const result = await computeCookMemoryInsight({
      userId: 'u_swap',
      now: NOW,
    });

    expect(result).not.toBeNull();
    expect(result!.substitutions).toEqual([
      { from: 'butter', to: 'olive oil', count: 3 },
      { from: 'chicken', to: 'tofu', count: 1 },
      { from: 'sour cream', to: 'yogurt', count: 1 },
    ]);
  });

  it('counts flops via rating="flop" OR outcome="flop"', async () => {
    cookingLog.findMany
      .mockResolvedValueOnce([{ cookedAt: new Date('2026-05-20T18:00:00Z') }])
      .mockResolvedValueOnce([]);
    cookEvent.findMany
      .mockResolvedValueOnce([]) // swaps
      .mockResolvedValueOnce([
        { payload: '{"rating":"flop"}', createdAt: NOW },
        { payload: '{"outcome":"FLOP"}', createdAt: NOW }, // case-insensitive
        { payload: '{"rating":"win"}', createdAt: NOW }, // not a flop
        { payload: 'malformed', createdAt: NOW }, // skipped
      ]);

    const result = await computeCookMemoryInsight({
      userId: 'u_flop',
      now: NOW,
    });

    expect(result!.flopsRecent).toBe(2);
  });

  it('all queries are scoped to the passed userId (IDOR safety)', async () => {
    cookingLog.findMany.mockResolvedValue([]);
    cookEvent.findMany.mockResolvedValue([]);

    await computeCookMemoryInsight({ userId: 'u_idor', now: NOW });

    for (const call of cookingLog.findMany.mock.calls) {
      expect(call[0].where.userId).toBe('u_idor');
    }
    for (const call of cookEvent.findMany.mock.calls) {
      expect(call[0].where.userId).toBe('u_idor');
    }
  });

  it("caps substitution list at 3 (the fingerprint, not the full log)", async () => {
    cookingLog.findMany
      .mockResolvedValueOnce([{ cookedAt: new Date('2026-05-20T18:00:00Z') }])
      .mockResolvedValueOnce([]);
    cookEvent.findMany
      .mockResolvedValueOnce([
        { payload: '{"from":"a","to":"b"}', createdAt: NOW },
        { payload: '{"from":"c","to":"d"}', createdAt: NOW },
        { payload: '{"from":"e","to":"f"}', createdAt: NOW },
        { payload: '{"from":"g","to":"h"}', createdAt: NOW },
        { payload: '{"from":"i","to":"j"}', createdAt: NOW },
      ])
      .mockResolvedValueOnce([]);

    const result = await computeCookMemoryInsight({
      userId: 'u_cap',
      now: NOW,
    });

    expect(result!.substitutions.length).toBe(3);
  });
});

describe('EMPTY_COOK_MEMORY_INSIGHT', () => {
  it('is a valid CookMemoryInsight shape (caller can use as `??` fallback)', () => {
    expect(EMPTY_COOK_MEMORY_INSIGHT.cadence.totalCooks).toBe(0);
    expect(EMPTY_COOK_MEMORY_INSIGHT.cuisineCadence).toBeNull();
    expect(EMPTY_COOK_MEMORY_INSIGHT.substitutions).toEqual([]);
    expect(EMPTY_COOK_MEMORY_INSIGHT.flopsRecent).toBe(0);
  });
});
