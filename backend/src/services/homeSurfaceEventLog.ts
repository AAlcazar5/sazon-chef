// backend/src/services/homeSurfaceEventLog.ts
// ROADMAP 4.0 HX7.1 — per-surface impression + interaction logging.
//
// Records hero re-rolls, rationale-ribbon expands, almost-made-it taps,
// first-cuisine-badge taps, cohort-overlay taps, Sazon-reasoning peeks,
// lifted-discovery-card impressions/taps, and quick-action chip taps.
// Powers HX1.5 retire-or-keep ablations + Tier M weekly synthesis
// ("which joy peaks earned their slot this week").
//
// Persistence: writes to the existing TB3 `recommenderEvent` table with a
// `surface: 'home_<id>'` sentinel embedded in `contextSnapshot` (same
// pattern FX3.3 introduced). When N1.1 lands the unified discriminator
// column, this service flips its writes to that column without touching
// callers.

import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

// ── Types ──────────────────────────────────────────────────────────────────

export type HomeSurfaceId =
  | 'today_hero'
  | 'hero_rationale_ribbon'
  | 'first_cuisine_badge'
  | 'cohort_overlay'
  | 'sazon_reasoning_peek'
  | 'almost_made_it'
  | 'seasonal_produce_card'
  | 'today_discovery_card'
  | 'quick_action_chip'
  | 'stretch_card'
  | 'plate_of_week_card';

export type HomeSurfaceEventType =
  | 'impression'
  | 'tap'
  | 'reroll'
  | 'expand'
  | 'dismiss';

export interface HomeSurfaceEventInput {
  userId: string;
  surface: HomeSurfaceId;
  eventType: HomeSurfaceEventType;
  /** Position within a list/strip (0-indexed) when applicable. */
  position?: number;
  /** Optional small structured payload — never free-text from the user. */
  metadata?: Record<string, string | number | boolean | null>;
  occurredAt?: Date;
}

const PII_KEYS = new Set(['search', 'searchQuery', 'cravingQuery', 'query', 'note', 'message']);

const ALLOWED_METADATA_VALUES = ['string', 'number', 'boolean'];

// Idempotency: drop double-taps on the same (user, surface, eventType, position)
// within this window. Tap targets often fire two events on rapid double-tap;
// the second one is noise.
const DOUBLE_TAP_DEDUP_MS = 200;
const recentEventCache = new Map<string, number>();

function dedupKey(input: HomeSurfaceEventInput): string {
  return `${input.userId}|${input.surface}|${input.eventType}|${input.position ?? ''}`;
}

function isDoubleTap(input: HomeSurfaceEventInput, now: number): boolean {
  const key = dedupKey(input);
  const last = recentEventCache.get(key);
  if (last != null && now - last < DOUBLE_TAP_DEDUP_MS) return true;
  recentEventCache.set(key, now);
  // Best-effort cache trim — drop anything older than 5s.
  if (recentEventCache.size > 256) {
    for (const [k, ts] of recentEventCache.entries()) {
      if (now - ts > 5000) recentEventCache.delete(k);
    }
  }
  return false;
}

/** Sanitize metadata: drop PII keys, drop non-primitive values. */
export function sanitizeMetadata(
  input: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | null> {
  if (!input) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(input)) {
    if (PII_KEYS.has(k)) continue;
    if (v === null) {
      out[k] = null;
      continue;
    }
    const t = typeof v;
    if (ALLOWED_METADATA_VALUES.includes(t)) {
      out[k] = v as string | number | boolean;
    }
    // arrays / objects / functions silently dropped
  }
  return out;
}

/**
 * Idempotency-aware writer. Returns the event id, or null on a deduped /
 * failed write. Callers don't care about the difference — the log is
 * fire-and-forget.
 */
export async function logHomeSurfaceEvent(
  input: HomeSurfaceEventInput,
): Promise<string | null> {
  const now = Date.now();
  if (isDoubleTap(input, now)) return null;

  try {
    const event = (await (prisma as any).recommenderEvent.create({
      data: {
        userId: input.userId,
        asOf: input.occurredAt ?? new Date(now),
        contextSnapshot: JSON.stringify({
          surface: `home_${input.surface}`,
          eventType: input.eventType,
          position: input.position ?? null,
          metadata: sanitizeMetadata(input.metadata),
        }),
        candidateIds: JSON.stringify([]),
        pickedRecipeId: null,
        confidence: 0,
        copyLine: '',
        source: 'retrieval_fallback',
      },
    })) as { id: string };
    return event.id;
  } catch (err) {
    logger.warn(
      { err, userId: input.userId, surface: input.surface },
      'HX7.1 logHomeSurfaceEvent failed',
    );
    return null;
  }
}

/** Test-only — clear the in-memory dedup cache. Avoid in production paths. */
export function __resetDedupCacheForTests(): void {
  recentEventCache.clear();
}
