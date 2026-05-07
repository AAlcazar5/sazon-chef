// ROADMAP 4.0 IG9.1 — Ingredient surface logging.
//
// Thin wrapper over `recordRecommenderEvent` (N1.1). Every IG-surfaced
// suggestion (running-low chip, co-purchase chip, use-it-up boost, swap
// suggestion, try-this-ingredient card, pantry-IQ row) writes one event
// to the unified `recommenderEvent` table — NO sibling table.
//
// Dedup window: 60s per (userId, surface, suggestedItem) so React
// StrictMode / network retries don't double-log a single user action.
//
// Powers IG6 weight tuning + IG8 ablation studies + Tier M synthesis.

import {
  recordRecommenderEvent,
  type RecommenderSurface,
} from './recommenderEventSchema';

const DEDUP_WINDOW_MS = 60 * 1000;

/** Surfaces this logger covers — strictly a subset of the unified enum. */
export type IngredientSurface = Extract<
  RecommenderSurface,
  'ingredient_recommend' | 'ingredient_co_purchase' | 'pantry_iq'
>;

/** Source labels for the suggestion provenance. */
export type IngredientSuggestionSource =
  | 'cadence'      // IG3.2 running-low
  | 'co_purchase'  // IG2.2 pairs-with
  | 'embedding'    // IG1.2 semantic neighbors
  | 'static'       // legacy ingredientSwapService dict
  | 'user'         // user's prior swap choice
  | 'crowd'        // cross-user mode
  | 'cultural';    // IG8 cultural discovery

export type IngredientLogEventType =
  | 'impression'
  | 'tap'
  | 'accept'
  | 'dismiss';

export interface LogIngredientEventInput {
  userId: string;
  surface: IngredientSurface;
  eventType: IngredientLogEventType;
  /** Display name of the suggested ingredient. */
  suggestedItem: string;
  /** Where the suggestion came from. */
  source: IngredientSuggestionSource;
  /** Position within a list-style surface (0-indexed). */
  position?: number;
  /** Inject reference time for tests. */
  asOf?: Date;
  /** Additional structured context (e.g., anchor ingredient for co-purchase). */
  metadata?: Record<string, unknown>;
}

const dedupCache = new Map<string, number>();

function dedupKey(input: LogIngredientEventInput): string {
  return [
    input.surface,
    input.eventType,
    input.userId,
    input.suggestedItem.toLowerCase().trim(),
  ].join('|');
}

function isDuplicate(key: string, now: number): boolean {
  const last = dedupCache.get(key);
  if (last != null && now - last < DEDUP_WINDOW_MS) return true;
  dedupCache.set(key, now);
  return false;
}

/** Test helper — clear the dedup cache between tests. */
export function __resetDedupCacheForTests(): void {
  dedupCache.clear();
}

/**
 * Log a single ingredient-surface event. Returns the row id, null on
 * dedup hit, or null on persist failure (the unified writer logs failures
 * — telemetry is best-effort).
 */
export async function logIngredientEvent(
  input: LogIngredientEventInput,
): Promise<string | null> {
  if (!input.userId) return null;
  if (!input.suggestedItem) return null;
  const asOf = input.asOf ?? new Date();
  const key = dedupKey(input);
  if (isDuplicate(key, asOf.getTime())) return null;

  const metadata: Record<string, unknown> = {
    suggestedItem: input.suggestedItem,
    source: input.source,
    ...(input.position != null ? { position: input.position } : {}),
    ...(input.metadata ?? {}),
  };

  return recordRecommenderEvent({
    userId: input.userId,
    surface: input.surface,
    eventType: input.eventType,
    asOf,
    metadata,
  });
}

export const __DEDUP_WINDOW_MS = DEDUP_WINDOW_MS;
