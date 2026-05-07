// ROADMAP 4.0 WK13.1 — Week-plan event logging.
//
// Thin wrapper over `recordRecommenderEvent` (N1.1). Every Week-side
// generator action (plan generation, slot swap, regenerate-day, copy-
// last-week, optimize-cost, save-template, apply-template) writes one
// event to the unified `recommenderEvent` table — NO sibling
// `WeekPlanEvent` model.
//
// Dedup window: 60s per (userId, surface, eventType, slotKey) so React
// StrictMode / network retries don't double-log a single user action.
//
// Inherits TELEMETRY_CONTRACT from N1.3:
//   - 100% sampling
//   - 90-day raw event TTL
//   - PII guard (free-text fields rejected by validator)

import {
  recordRecommenderEvent,
  type RecommenderSurface,
} from './recommenderEventSchema';

const DEDUP_WINDOW_MS = 60 * 1000;

/** Surface families this logger covers — strict subset of the unified enum. */
export type WeekPlanSurface = Extract<
  RecommenderSurface,
  'week_slot' | 'week_plan_event'
>;

/** Canonical week-plan event types. */
export type WeekPlanEventType =
  | 'plan_generate'
  | 'slot_swap'
  | 'regenerate_day'
  | 'copy_last_week'
  | 'optimize_cost'
  | 'save_template'
  | 'apply_template'
  | 'slot_lock'
  | 'slot_clear';

export interface LogWeekPlanEventInput {
  userId: string;
  surface: WeekPlanSurface;
  eventType: WeekPlanEventType;
  /** ISO date of the slot being mutated (when applicable). */
  slotDate?: string;
  /** Slot kind — breakfast / lunch / dinner / snack / dessert. */
  slotKind?: string;
  /** Recipe id touched by the action (when applicable). */
  pickedRecipeId?: string;
  /** Inject reference time for tests. */
  asOf?: Date;
  /** Additional structured context (preState / postState / source signals). */
  metadata?: Record<string, unknown>;
}

const dedupCache = new Map<string, number>();

function dedupKey(input: LogWeekPlanEventInput): string {
  return [
    input.surface,
    input.eventType,
    input.userId,
    input.slotDate ?? '',
    input.slotKind ?? '',
  ].join('|');
}

function isDuplicate(key: string, now: number): boolean {
  const last = dedupCache.get(key);
  if (last != null && now - last < DEDUP_WINDOW_MS) return true;
  dedupCache.set(key, now);
  return false;
}

/** Test helper — clear the dedup cache between tests. */
export function __resetWeekPlanDedupCacheForTests(): void {
  dedupCache.clear();
}

/**
 * Log a single week-plan event. Returns the row id, null on dedup hit, or
 * null on persist failure (the unified writer logs failures — telemetry
 * is best-effort).
 */
export async function logWeekPlanEvent(
  input: LogWeekPlanEventInput,
): Promise<string | null> {
  if (!input.userId) return null;
  const asOf = input.asOf ?? new Date();
  const key = dedupKey(input);
  if (isDuplicate(key, asOf.getTime())) return null;

  const metadata: Record<string, unknown> = {
    ...(input.slotDate ? { slotDate: input.slotDate } : {}),
    ...(input.slotKind ? { slotKind: input.slotKind } : {}),
    ...(input.metadata ?? {}),
  };

  return recordRecommenderEvent({
    userId: input.userId,
    surface: input.surface,
    eventType: input.eventType,
    asOf,
    pickedRecipeId: input.pickedRecipeId ?? null,
    metadata,
  });
}

export const __DEDUP_WINDOW_MS = DEDUP_WINDOW_MS;
