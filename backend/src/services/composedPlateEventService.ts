// ROADMAP 4.0 N7.2 — Build-a-Plate unified event logging.
//
// Every slot pick / swap / lock fires a `recommenderEvent` with surface
// `build_a_plate_*`. Tier M synthesis joins cleanly with Today + Week +
// Pantry + Recipe-Detail data because every surface writes to the same
// table via the unified contract (N1.1 / N1.3).
//
// Per N1.2, this service does NOT introduce a sibling event table. All
// writes go through `recordRecommenderEvent` with the canonical
// `build_a_plate_slot | build_a_plate_swap | build_a_plate_lock` surfaces.
//
// Idempotency: a 200ms in-process dedup window prevents accidental
// double-fires from React StrictMode / network retries (same pattern as
// HX7.1 homeSurfaceEventLog).

import { recordRecommenderEvent } from './recommender/recommenderEventSchema';

const DEDUP_WINDOW_MS = 200;

export interface BuildAPlateBaseInput {
  userId: string;
  /** Composed plate id (cuid) the slot belongs to. */
  plateId: string;
  /** Slot identifier — typically a string like 'protein' / 'starch' / 'side'. */
  slot: string;
  /** Inject reference time for tests; defaults to `new Date()`. */
  asOf?: Date;
}

export interface SlotPickInput extends BuildAPlateBaseInput {
  recipeId: string;
  position?: number;
}

export interface SlotSwapInput extends BuildAPlateBaseInput {
  fromRecipeId: string | null;
  toRecipeId: string;
}

export interface SlotLockInput extends BuildAPlateBaseInput {
  recipeId: string;
}

const dedupCache = new Map<string, number>();

function dedupKey(parts: Array<string | number | null | undefined>): string {
  return parts.map((p) => p ?? '').join('|');
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

export async function logSlotPick(
  input: SlotPickInput,
): Promise<string | null> {
  const asOf = input.asOf ?? new Date();
  const key = dedupKey([
    'pick',
    input.userId,
    input.plateId,
    input.slot,
    input.recipeId,
  ]);
  if (isDuplicate(key, asOf.getTime())) return null;
  return recordRecommenderEvent({
    userId: input.userId,
    surface: 'build_a_plate_slot',
    eventType: 'tap',
    asOf,
    pickedRecipeId: input.recipeId,
    metadata: {
      plateId: input.plateId,
      slot: input.slot,
      ...(input.position != null ? { position: input.position } : {}),
    },
  });
}

export async function logSlotSwap(
  input: SlotSwapInput,
): Promise<string | null> {
  const asOf = input.asOf ?? new Date();
  const key = dedupKey([
    'swap',
    input.userId,
    input.plateId,
    input.slot,
    input.fromRecipeId,
    input.toRecipeId,
  ]);
  if (isDuplicate(key, asOf.getTime())) return null;
  return recordRecommenderEvent({
    userId: input.userId,
    surface: 'build_a_plate_swap',
    eventType: 'swap',
    asOf,
    pickedRecipeId: input.toRecipeId,
    metadata: {
      plateId: input.plateId,
      slot: input.slot,
      fromRecipeId: input.fromRecipeId,
      toRecipeId: input.toRecipeId,
    },
  });
}

export async function logSlotLock(
  input: SlotLockInput,
): Promise<string | null> {
  const asOf = input.asOf ?? new Date();
  const key = dedupKey([
    'lock',
    input.userId,
    input.plateId,
    input.slot,
    input.recipeId,
  ]);
  if (isDuplicate(key, asOf.getTime())) return null;
  return recordRecommenderEvent({
    userId: input.userId,
    surface: 'build_a_plate_lock',
    eventType: 'accept',
    asOf,
    pickedRecipeId: input.recipeId,
    metadata: {
      plateId: input.plateId,
      slot: input.slot,
    },
  });
}
