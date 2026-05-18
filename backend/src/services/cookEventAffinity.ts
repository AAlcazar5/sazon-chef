// backend/src/services/cookEventAffinity.ts
//
// W-A3 — the loop. Translate a captured CookEvent into the EXISTING slot
// affinity vocabulary so the Cook Log feeds recommendations WITHOUT touching
// the scoring-adjacent delta map. `cookEventToAffinityEvent` may only ever
// return one of slotAffinityService's existing `AffinityEvent` shapes (or
// null) — it cannot invent a new delta. `scale`/`note` map to null on
// purpose: a scale-up is a *batch-bias* signal, not a slot-affinity delta;
// forcing it into an AffinityEvent would fabricate a weight. The feed is
// best-effort and non-blocking (the byproduct law: a loop-feed failure must
// never deny the user the action they took).

import type { AffinityEvent } from './slotAffinityService';
import { recordAffinityEvent } from './slotAffinityService';
import { logger } from '../utils/logger';

export interface CookEventLike {
  type: string;
  userId: string;
  recipeId: string | null;
  payload: Record<string, unknown>;
}

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string') ? (v as string[]) : [];

/**
 * Pure. CookEvent → an existing AffinityEvent, or null when the event
 * carries no slot-affinity signal. Never emits a non-existent type, so the
 * 70/30-adjacent delta map in slotAffinityService is structurally untouched.
 */
export function cookEventToAffinityEvent(
  e: CookEventLike,
): AffinityEvent | null {
  const componentIds = asStringArray(e.payload?.componentIds);
  switch (e.type) {
    case 'made_it':
      return { type: 'plate_cooked', userId: e.userId, componentIds };
    case 'outcome': {
      const stars = e.payload?.stars;
      if (typeof stars === 'number' && stars >= 1 && stars <= 5) {
        return {
          type: 'plate_rated',
          userId: e.userId,
          componentIds,
          stars: stars as 1 | 2 | 3 | 4 | 5,
        };
      }
      return null;
    }
    case 'swap': {
      const cid = e.payload?.swappedOutComponentId;
      if (typeof cid === 'string' && cid.length > 0) {
        return { type: 'swap_away', userId: e.userId, componentId: cid };
      }
      return null;
    }
    // 'scale' (batch-bias, not a slot delta) and 'note' carry no slot signal.
    default:
      return null;
  }
}

/**
 * Best-effort, non-blocking: map a captured CookEvent and, if it carries a
 * slot signal, feed it into the existing affinity pipeline. Swallows +
 * logs failures so the capture path is never broken by the feed.
 */
export async function feedAffinityFromCookEvent(
  e: CookEventLike,
): Promise<void> {
  const affinity = cookEventToAffinityEvent(e);
  if (!affinity) return;
  try {
    await recordAffinityEvent(affinity);
  } catch (err) {
    logger.error(
      { err, userId: e.userId, type: e.type },
      'cook-log: affinity feed failed (non-blocking)',
    );
  }
}
