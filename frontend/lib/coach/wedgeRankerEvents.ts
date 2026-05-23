// frontend/lib/coach/wedgeRankerEvents.ts
//
// Y-Rank-6 (founder roadmap Telegram 2026-05-20): surface-events
// telemetry for the wedge ranker. Lets us measure post-launch whether
// `saved` beats `adjacency` in practice, whether `skill` rationale
// actually flips picks, whether `liked` swung the tie-breaker, etc.
//
// Pure observation: no UI change, no behavior change. Fire-and-forget
// via apiClient; errors are silently swallowed (telemetry should never
// surface as a user-blocking error).

import { apiClient } from '../api';
import type { PrimarySource } from './rankRecipeAskCandidates';

export interface WedgeRankerEventPayload {
  /** Catalog recipe id when the pick came from the curated DB. AI-gen
   *  picks have no id; the telemetry still fires (with `recipeId: null`)
   *  so we can measure how often the wedge falls through to gen. */
  recipeId: string | null;
  /** Which signal contributed most to the picked candidate's score.
   *  'ai-gen' marks AI-generated picks that didn't go through the
   *  ranker — measures fall-through rate post-launch. */
  primarySource: PrimarySource | 'ai-gen';
  /** Number of alternates available in the swap-chip pool. 0 for
   *  AI-gen-only results. */
  altsPoolSize: number;
}

export function logWedgeRankerEvent(payload: WedgeRankerEventPayload): void {
  // Fire-and-forget — never await.
  apiClient
    .post('/telemetry/wedge-ranker-events', payload)
    .catch(() => undefined);
}
