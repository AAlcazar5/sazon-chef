// ROADMAP 4.0 Tier $$ — $$5.1 — Anthropic prompt-caching health monitor.
//
// S17 / S17b / S17c attached cache_control to the persona block + the
// 15-tool schema and trimmed the dynamic block. If any of those silently
// regress (profile JSON drifts byte-by-byte, tool array gets mutated by
// a downstream wrapper, SDK upgrade no-ops cache_control on a model the
// API hasn't enabled it for yet), we'd burn money for weeks before
// noticing in the bills.
//
// This module tracks consecutive cache misses per conversationId and
// emits one `coach_cache_health_warning` analytics event per process
// after the 3rd consecutive miss. Throttled so a single broken convo
// can't spam the log.

import { emit } from './coachAnalytics';

const WARNING_THRESHOLD = 3;

interface ConversationHealth {
  consecutiveMisses: number;
  warned: boolean;
}

const tracker = new Map<string, ConversationHealth>();

export interface RecordTurnCacheUsageInput {
  conversationId: string;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/**
 * Record a single coach turn's cache usage. Fires `coach_cache_health_warning`
 * once per conversation when 3+ consecutive turns have cacheReadTokens=0.
 */
export function recordTurnCacheUsage(input: RecordTurnCacheUsageInput): void {
  if (!input.conversationId) return;

  const cur = tracker.get(input.conversationId) ?? {
    consecutiveMisses: 0,
    warned: false,
  };

  if (input.cacheReadTokens > 0) {
    // Healthy turn — reset counter so future broken stretches start fresh.
    cur.consecutiveMisses = 0;
    tracker.set(input.conversationId, cur);
    return;
  }

  cur.consecutiveMisses += 1;

  if (cur.consecutiveMisses >= WARNING_THRESHOLD && !cur.warned) {
    emit('coach_cache_health_warning', {
      conversationId: input.conversationId,
      consecutiveMisses: cur.consecutiveMisses,
      lastCacheWriteTokens: input.cacheWriteTokens,
      hint: 'cacheReadTokens=0 across 3+ turns — check that systemBlocks.stable is byte-stable and tools array is not mutated downstream.',
    });
    cur.warned = true;
  }

  tracker.set(input.conversationId, cur);
}

/** Test helper — clear the tracker between tests. */
export function __resetCacheHealthForTests(): void {
  tracker.clear();
}

export const __INTERNALS = { WARNING_THRESHOLD } as const;
