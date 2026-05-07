// ROADMAP 4.0 N0.3 — retrievalSession cursor test.

import {
  createSession,
  nextCandidate,
  getNearMisses,
  SESSION_EXPIRED,
  SESSION_TTL_MS,
  __resetForTests,
} from '../../src/services/recommender/retrievalSession';

beforeEach(() => __resetForTests());

const candidates = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    recipeId: `r-${i}`,
    score: 1 - i * 0.05,
  }));

describe('N0.3 — createSession', () => {
  it('writes a session row with full ranked list and returns a fresh UUID', () => {
    const s = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(15),
      cutoffIndex: 5,
    });
    expect(s.retrievalCallId).toMatch(/[0-9a-f-]{36}/i);
    expect(s.candidates).toHaveLength(15);
    expect(s.cutoffScore).toBeCloseTo(candidates(15)[4].score);
    expect(s.expiresAt - s.createdAt).toBe(SESSION_TTL_MS);
  });

  it('rejects empty userId or surface', () => {
    expect(() =>
      createSession({ userId: '', surface: 'today_hero', candidates: [] }),
    ).toThrow(/userId/);
    expect(() =>
      createSession({ userId: 'u1', surface: '', candidates: [] }),
    ).toThrow(/surface/);
  });

  it('replaces any prior session for the same (userId, surface)', () => {
    const a = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(5),
      cutoffIndex: 3,
    });
    const b = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(5),
      cutoffIndex: 3,
    });
    expect(a.retrievalCallId).not.toBe(b.retrievalCallId);
    // Old cursor returns expired
    expect(nextCandidate(a.retrievalCallId, 1)).toBe(SESSION_EXPIRED);
    // New cursor still works
    expect(nextCandidate(b.retrievalCallId, 1)).not.toBe(SESSION_EXPIRED);
  });

  it('keeps separate sessions for different (userId, surface) pairs', () => {
    const heroToday = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(5),
      cutoffIndex: 3,
    });
    const heroWeek = createSession({
      userId: 'u1',
      surface: 'week_slot',
      candidates: candidates(5),
      cutoffIndex: 3,
    });
    expect(nextCandidate(heroToday.retrievalCallId, 1)).not.toBe(SESSION_EXPIRED);
    expect(nextCandidate(heroWeek.retrievalCallId, 1)).not.toBe(SESSION_EXPIRED);
  });
});

describe('N0.3 — nextCandidate', () => {
  it('returns the candidate at the requested position without re-running TB1', () => {
    const s = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(10),
      cutoffIndex: 5,
    });
    const second = nextCandidate(s.retrievalCallId, 1);
    expect(second).not.toBe(SESSION_EXPIRED);
    expect((second as any).recipeId).toBe('r-1');
  });

  it('returns null when position is past the end', () => {
    const s = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(3),
      cutoffIndex: 1,
    });
    expect(nextCandidate(s.retrievalCallId, 99)).toBeNull();
  });

  it('returns null when position is negative', () => {
    const s = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(3),
      cutoffIndex: 1,
    });
    expect(nextCandidate(s.retrievalCallId, -1)).toBeNull();
  });

  it('returns SESSION_EXPIRED for unknown call ids', () => {
    expect(nextCandidate('not-a-real-uuid', 0)).toBe(SESSION_EXPIRED);
  });
});

describe('N0.3 — getNearMisses', () => {
  it('returns positions just below the cut with marginVsCut populated', () => {
    const s = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(10),
      cutoffIndex: 5,
    });
    const misses = getNearMisses(s.retrievalCallId, 3);
    expect(misses).not.toBe(SESSION_EXPIRED);
    const list = misses as any[];
    expect(list).toHaveLength(3);
    expect(list[0].recipeId).toBe('r-5');
    expect(list[0].marginVsCut).toBeGreaterThan(0);
    expect(list[0].marginVsCut).toBeCloseTo(0.05, 5);
  });

  it('caps at remaining candidates when k exceeds the list', () => {
    const s = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(7),
      cutoffIndex: 5,
    });
    const misses = getNearMisses(s.retrievalCallId, 50);
    expect((misses as any[]).length).toBe(2);
  });

  it('returns SESSION_EXPIRED for unknown call ids', () => {
    expect(getNearMisses('mystery-id', 5)).toBe(SESSION_EXPIRED);
  });
});

describe('N0.3 — TTL expiry', () => {
  it('returns SESSION_EXPIRED once TTL elapses', () => {
    jest.useFakeTimers();
    try {
      const s = createSession({
        userId: 'u1',
        surface: 'today_hero',
        candidates: candidates(5),
        cutoffIndex: 3,
      });
      // Advance just under TTL — still alive
      jest.advanceTimersByTime(SESSION_TTL_MS - 1000);
      expect(nextCandidate(s.retrievalCallId, 1)).not.toBe(SESSION_EXPIRED);
      // Advance past TTL — expired
      jest.advanceTimersByTime(2000);
      expect(nextCandidate(s.retrievalCallId, 1)).toBe(SESSION_EXPIRED);
      expect(getNearMisses(s.retrievalCallId, 3)).toBe(SESSION_EXPIRED);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('N0.3 — cross-surface cursor independence', () => {
  it('HX2.1 + HX5.1 share the same cursor for today_hero, but Week-screen surfaces have their own', () => {
    // One TB1 call per (user, surface): HX2.1 (next) and HX5.1 (near-miss)
    // both use the same cursor for today_hero. Week-screen uses a separate one.
    const today = createSession({
      userId: 'u1',
      surface: 'today_hero',
      candidates: candidates(10),
      cutoffIndex: 5,
    });
    const week = createSession({
      userId: 'u1',
      surface: 'week_slot',
      candidates: candidates(8),
      cutoffIndex: 4,
    });

    // HX2.1 reads next for today_hero
    const reroll = nextCandidate(today.retrievalCallId, 1);
    expect((reroll as any).recipeId).toBe('r-1');

    // HX5.1 reads near-misses on the SAME today_hero cursor
    const misses = getNearMisses(today.retrievalCallId, 2);
    expect((misses as any[])[0].recipeId).toBe('r-5');

    // Week screen has its own independent cursor
    const weekCand = nextCandidate(week.retrievalCallId, 0);
    expect((weekCand as any).recipeId).toBe('r-0');
  });
});
