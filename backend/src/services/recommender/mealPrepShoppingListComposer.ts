// ROADMAP 4.0 WK3.2 — Prep block + IG3 running-low cadence overlay.
//
// Composes the Sunday-prep shopping list. The prep block (WK3.1) tells us
// what ingredients to batch-cook this week; IG3.2 `predictRunningLow` tells
// us which staples are about to run out *anyway*. By overlaying the two,
// the user can roll staple replenishment into the same Sunday grocery run
// "for free."
//
// Output: a flat list with `source: 'prep' | 'cadence'`. Ingredients that
// appear in both lists are unified into a single `'prep'` row with a
// `cadenceFlagged: true` annotation — so the UI can show a small
// "running low too" tag without double-listing.
//
// Pure function — no DB, no mutation.

import type { MealPrepBatchPlan } from './mealPrepBatchPlanner';

export type PrepShoppingItemSource = 'prep' | 'cadence';

export interface RunningLowItem {
  ingredientName: string;
  daysSinceLastPurchase?: number;
  ratio?: number;
  confidence?: 'low' | 'medium' | 'high';
}

export interface PrepShoppingItem {
  ingredient: string;
  source: PrepShoppingItemSource;
  /** When the prep ingredient is also flagged by IG3.2, mirror the cadence info here. */
  cadenceFlagged?: boolean;
  cadenceRatio?: number;
  cadenceConfidence?: 'low' | 'medium' | 'high';
  /** Frequency from the batch plan (only set when source === 'prep'). */
  frequency?: number;
  estimatedMinutes?: number;
}

export interface ComposePrepShoppingListInput {
  batchPlan: MealPrepBatchPlan | null;
  runningLow: RunningLowItem[];
}

export interface ComposePrepShoppingListResult {
  items: PrepShoppingItem[];
  prepCount: number;
  cadenceCount: number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export function composePrepShoppingList(
  input: ComposePrepShoppingListInput,
): ComposePrepShoppingListResult {
  const prepIngredients = input.batchPlan?.ingredientsToBatch ?? [];
  const cadenceByName = new Map<string, RunningLowItem>();
  for (const r of input.runningLow) {
    const name = normalize(r.ingredientName);
    if (!name) continue;
    if (!cadenceByName.has(name)) cadenceByName.set(name, r);
  }

  const items: PrepShoppingItem[] = [];
  const seen = new Set<string>();

  for (const p of prepIngredients) {
    const name = normalize(p.ingredient);
    if (seen.has(name)) continue;
    seen.add(name);
    const matchingCadence = cadenceByName.get(name);
    items.push({
      ingredient: p.ingredient,
      source: 'prep',
      frequency: p.frequency,
      estimatedMinutes: p.estimatedMinutes,
      ...(matchingCadence
        ? {
            cadenceFlagged: true,
            cadenceRatio: matchingCadence.ratio,
            cadenceConfidence: matchingCadence.confidence,
          }
        : {}),
    });
  }

  for (const r of input.runningLow) {
    const name = normalize(r.ingredientName);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    items.push({
      ingredient: r.ingredientName,
      source: 'cadence',
      cadenceRatio: r.ratio,
      cadenceConfidence: r.confidence,
    });
  }

  let prepCount = 0;
  let cadenceCount = 0;
  for (const i of items) {
    if (i.source === 'prep') prepCount += 1;
    else cadenceCount += 1;
  }
  return { items, prepCount, cadenceCount };
}
