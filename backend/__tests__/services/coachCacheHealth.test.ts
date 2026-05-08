// $$5.1 — Cache-miss alert tests.
//
// Per-conversation tracker that fires `coach_cache_health_warning` after
// 3+ consecutive turns with cacheReadTokens=0. Catches silent regressions
// in S17 prompt caching (e.g. tool array drift, profile JSON not byte-stable,
// SDK upgrade that no-ops cache_control).

import {
  recordTurnCacheUsage,
  __resetCacheHealthForTests,
  __INTERNALS,
} from '../../src/services/coachCacheHealth';

const mockEmit = jest.fn();
jest.mock('../../src/services/coachAnalytics', () => ({
  emit: (...args: unknown[]) => mockEmit(...args),
}));

beforeEach(() => {
  mockEmit.mockReset();
  __resetCacheHealthForTests();
});

describe('$$5.1 — coachCacheHealth', () => {
  it('does not warn on a single turn with cacheRead=0 (could be the first call)', () => {
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 100 });
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('does not warn on 2 cache misses (first call writes, second may still warm)', () => {
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 100 });
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('fires coach_cache_health_warning on the 3rd consecutive cache miss', () => {
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 100 });
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 0 });
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(mockEmit).toHaveBeenCalledWith(
      'coach_cache_health_warning',
      expect.objectContaining({
        conversationId: 'c1',
        consecutiveMisses: 3,
      }),
    );
  });

  it('throttles — never fires twice for the same conversation in one process', () => {
    for (let i = 0; i < 6; i += 1) {
      recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 0 });
    }
    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('any cacheRead > 0 resets the consecutive-miss counter', () => {
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 100 });
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 0 });
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 5000, cacheWriteTokens: 0 });
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 0 });
    recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('tracks conversations independently', () => {
    for (let i = 0; i < 3; i += 1) {
      recordTurnCacheUsage({ conversationId: 'c1', cacheReadTokens: 0, cacheWriteTokens: 0 });
    }
    expect(mockEmit).toHaveBeenCalledTimes(1);
    // c2 is fresh — needs its own 3 misses
    recordTurnCacheUsage({ conversationId: 'c2', cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(mockEmit).toHaveBeenCalledTimes(1);
    recordTurnCacheUsage({ conversationId: 'c2', cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(mockEmit).toHaveBeenCalledTimes(1);
    recordTurnCacheUsage({ conversationId: 'c2', cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(mockEmit).toHaveBeenCalledTimes(2);
  });

  it('rejects empty conversationId silently (no-op)', () => {
    recordTurnCacheUsage({ conversationId: '', cacheReadTokens: 0, cacheWriteTokens: 0 });
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('publishes the threshold constant', () => {
    expect(__INTERNALS.WARNING_THRESHOLD).toBe(3);
  });
});
