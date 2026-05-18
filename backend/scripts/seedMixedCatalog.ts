// backend/scripts/seedMixedCatalog.ts
//
// Pure planner for a mixed all-mealType catalog pass that "beefs up the
// lowest count categories". allocateByDeficit distributes the run across the
// six catalog meal types weighted by how far each sits below the fattest one
// (every type still gets a smoothing floor so the run stays a true mix);
// buildMixedCatalogPlan turns that allocation into cuisine-pinned jobs with a
// per-mealType archetype steer × specificity nudge, reusing the proven
// international rotation pattern (cuisine fastest, archetype on wrap).

import {
  INTERNATIONAL_SNACK_CUISINES,
  INTERNATIONAL_SNACK_ARCHETYPES,
  INTERNATIONAL_DESSERT_ARCHETYPES,
  INTERNATIONAL_SAUCE_ARCHETYPES,
  INTL_NUDGES,
} from './seedSnackDessert';

export type MixedMealType =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'dessert'
  | 'sauce';

export const MIXED_MEALTYPES: readonly MixedMealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'dessert',
  'sauce',
];

export interface MixedCatalogJob {
  mealType: MixedMealType;
  cuisine: string;
  styleHint: string;
  groupKey: string;
}

export type MealTypeCounts = Record<MixedMealType, number>;

const BREAKFAST_ARCHETYPES: readonly string[] = [
  'a hearty traditional breakfast',
  'a light morning dish',
  'a savory egg-based breakfast',
  'a morning porridge or breakfast grain bowl',
  'a street-style breakfast',
  'a breakfast pastry or baked morning item',
  'a fresh fruit-and-dairy morning dish',
  'a fried or griddled breakfast',
];

// Lunch & dinner share the savory-main archetype pool.
const MAIN_ARCHETYPES: readonly string[] = [
  'a slow-braised or stewed main',
  'a grilled or charred main',
  'a soup or brothy bowl',
  'a rice or grain-based main',
  'a noodle or dumpling dish',
  'a flatbread, wrap, or stuffed-bread main',
  'a legume or bean-forward dish',
  'a roasted or oven-baked main',
  'a vegetable-forward main',
  'a one-pot rustic home-style dish',
  'a skewered or kebab-style dish',
  'a curry or sauce-simmered dish',
];

const ARCHETYPES_BY_MEAL: Record<MixedMealType, readonly string[]> = {
  breakfast: BREAKFAST_ARCHETYPES,
  lunch: MAIN_ARCHETYPES,
  dinner: MAIN_ARCHETYPES,
  snack: INTERNATIONAL_SNACK_ARCHETYPES,
  dessert: INTERNATIONAL_DESSERT_ARCHETYPES,
  sauce: INTERNATIONAL_SAUCE_ARCHETYPES,
};

/**
 * Distribute `total` slots across the six meal types weighted by deficit
 * (fattestCount − thisCount). A per-type smoothing floor keeps every type
 * present even when its deficit is ~0, so the run is a real mix rather than
 * only the single thinnest category. Deterministic; the largest-remainder
 * method makes the rounded shares sum back to exactly `total`.
 */
export function allocateByDeficit(
  total: number,
  counts: MealTypeCounts,
): MealTypeCounts {
  const zero = (): MealTypeCounts => ({
    breakfast: 0, lunch: 0, dinner: 0, snack: 0, dessert: 0, sauce: 0,
  });
  if (total <= 0) return zero();

  const max = Math.max(...MIXED_MEALTYPES.map((mt) => counts[mt] ?? 0));
  // Floor so the fattest type (deficit 0) still appears; ~5% of the spread,
  // min 1, keeps the bias strongly toward the thin categories.
  const floor = Math.max(1, Math.round(0.05 * max));
  const weights = MIXED_MEALTYPES.map(
    (mt) => max - (counts[mt] ?? 0) + floor,
  );
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const raw = weights.map((w) => (total * w) / weightSum);
  const alloc = zero();
  const floored = raw.map((r) => Math.floor(r));
  let used = floored.reduce((a, b) => a + b, 0);
  // Largest-remainder: hand the leftover units to the biggest fractional parts.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (used < total) {
    floored[order[k % order.length].i] += 1;
    used += 1;
    k += 1;
  }
  MIXED_MEALTYPES.forEach((mt, i) => {
    alloc[mt] = floored[i];
  });
  return alloc;
}

/**
 * Deterministic mixed plan, INTERLEAVED. Meal types are emitted via stride
 * (Webster) scheduling so any prefix of the plan tracks the allocation ratio
 * — critical because seedRunner stops at TARGET_SAVED while planCap is 5×
 * that: a block-at-a-time plan would only ever produce the first meal type.
 * Within each meal type, cuisine rotates fastest (offset-shifted), archetype
 * advances on cuisine-wrap, nudge on archetype-wrap (the international axis).
 */
export function buildMixedCatalogPlan(
  total: number,
  counts: MealTypeCounts,
  opts: { cuisineOffset?: number } = {},
): MixedCatalogJob[] {
  if (total <= 0) return [];
  const cuisines = INTERNATIONAL_SNACK_CUISINES;
  const offset = Math.trunc(opts.cuisineOffset ?? 0);
  const alloc = allocateByDeficit(total, counts);

  const emitted: Record<MixedMealType, number> = {
    breakfast: 0, lunch: 0, dinner: 0, snack: 0, dessert: 0, sauce: 0,
  };

  const jobFor = (mealType: MixedMealType, i: number): MixedCatalogJob => {
    const archetypes = ARCHETYPES_BY_MEAL[mealType];
    const idx = i + offset;
    const c = ((idx % cuisines.length) + cuisines.length) % cuisines.length;
    const a = Math.floor(Math.abs(idx) / cuisines.length) % archetypes.length;
    const n =
      Math.floor(Math.abs(idx) / (cuisines.length * archetypes.length)) %
      INTL_NUDGES.length;
    const cuisine = cuisines[c];
    return {
      mealType,
      cuisine,
      styleHint: `${archetypes[a]} authentic to ${cuisine} cuisine — ${INTL_NUDGES[n]}`,
      // Keyed by cuisine (not cuisine:mealType) so seedRunner primes the
      // per-group avoid list from existing DB titles for that cuisine.
      groupKey: cuisine,
    };
  };

  const plan: MixedCatalogJob[] = [];
  for (let step = 1; step <= total; step += 1) {
    // Webster/Sainte-Laguë stride: at each step pick the meal type whose
    // emitted count is furthest below its proportional share so far. Ties
    // break by MIXED_MEALTYPES order for determinism.
    let pick: MixedMealType | null = null;
    let best = -Infinity;
    for (const mt of MIXED_MEALTYPES) {
      if (emitted[mt] >= alloc[mt]) continue;
      const priority = (alloc[mt] * step) / total - emitted[mt];
      if (priority > best) {
        best = priority;
        pick = mt;
      }
    }
    if (pick === null) break; // every type exhausted (sum(alloc) === total)
    plan.push(jobFor(pick, emitted[pick]));
    emitted[pick] += 1;
  }
  return plan;
}
