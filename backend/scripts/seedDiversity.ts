// backend/scripts/seedDiversity.ts
//
// Pure diversity helpers for seed-500-newer-cuisines-dedup.ts.
//
// The dedup-safe seed used to call generateRecipe with only { cuisine,
// mealType } — no memory of what it had already produced — so every one of
// the ~118 "Pakistani dinner" jobs reverted to the single most prototypical
// dish and 73% of generations were thrown away as duplicate-title skips.
//
// These helpers feed the model a rotating window of already-covered titles
// via the existing RecipeGenerationParams.previousMeals channel (#3, the
// per-job diversity axis) and accumulate colliding titles across retries
// (#1, retry-on-dup). No aiRecipeService change required.
//
// cuisine is deliberately set to '' on every entry: buildRecipePrompt emits
// "Use a DIFFERENT cuisine than: <set>" from previousMeals[].cuisine, which
// would fight the seed's pinned cuisineOverride. An empty set neutralizes
// that line while the title list + "ensure variety" instruction still land.

import { normalizeRecipeTitleKey } from '../src/utils/recipeTitleKey';

export interface AvoidMeal {
  title: string;
  cuisine: string;
  mainProtein?: string;
}

export type SeedMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Positive diversity axis. {cuisine, mealType} prompting + negative
// title-avoidance asymptotes at ~70-100 distinct dishes/cuisine — the model
// keeps reaching for the iconic dish. A rotating POSITIVE steer (archetype ×
// specificity nudge) pushes it across the cuisine's breadth instead. Each
// archetype phrase carries its own meal token so a breakfast slot never gets
// a braised stew.
const BREAKFAST_ARCHETYPES = [
  'a hearty traditional breakfast',
  'a light morning dish',
  'a breakfast pastry or baked morning item',
  'a savory egg-based breakfast',
  'a morning porridge or breakfast grain bowl',
  'a street-style breakfast',
  'a celebratory weekend brunch dish',
  'a savory breakfast flatbread or stuffed morning bread',
  'a fresh fruit-and-dairy morning dish',
  'a fried or griddled breakfast',
];

const SNACK_ARCHETYPES = [
  'a savory hand-held snack',
  'a fried or crispy snack bite',
  'a sweet-leaning snack nibble',
  'a dip or spread snack with something to dip',
  'a roasted or toasted snack mix',
  'a street-vendor snack',
  'a baked savory snack pastry',
  'a finger-food party snack',
];

const MAIN_ARCHETYPES = [
  'a slow-braised or stewed main',
  'a grilled or charred main',
  'a soup or brothy bowl',
  'a rice or grain-based main',
  'a noodle or dumpling dish',
  'a flatbread, wrap, or stuffed-bread main',
  'a legume or bean-forward dish',
  'a roasted or oven-baked main',
  'a fresh, raw, or cured preparation (only if authentic to the cuisine)',
  'a festive or celebration centerpiece dish',
  'a vegetable-forward main',
  'a one-pot rustic home-style dish',
  'a fried or crisp-textured main',
  'a skewered or kebab-style dish',
  'a curry or sauce-simmered dish',
  'a substantial composed salad or cold plate',
];

const SPECIFICITY_NUDGES = [
  'regional and lesser-known, not the iconic dish',
  'a rustic everyday home-style version',
  'a festive or holiday version',
  'a modern lighter take grounded in tradition',
  'drawn from a specific sub-region, not the most famous national dish',
];

// Record forces exhaustiveness at declaration — a new SeedMealType value
// becomes a compile error here instead of silently falling to MAIN.
const ARCHETYPES_BY_MEAL: Record<SeedMealType, string[]> = {
  breakfast: BREAKFAST_ARCHETYPES,
  lunch: MAIN_ARCHETYPES,
  dinner: MAIN_ARCHETYPES,
  snack: SNACK_ARCHETYPES,
};

/**
 * Deterministic per-job positive steer. archetype rotates fastest (by
 * jobIndex); the specificity nudge advances once the archetype list wraps —
 * so the first archetypes×nudges jobs for a cuisine are all distinct before
 * anything repeats (e.g. 16×5 = 80 unique steers for dinner).
 */
export function pickDiversityAxis(mealType: SeedMealType, jobIndex: number): string {
  const archetypes = ARCHETYPES_BY_MEAL[mealType];
  const i = ((jobIndex % archetypes.length) + archetypes.length) % archetypes.length;
  // Math.abs keeps the dividend ≥ 0, so the nudge index is already in range —
  // no negative-modulo guard needed (unlike `i`, which uses raw jobIndex).
  const n = Math.floor(Math.abs(jobIndex) / archetypes.length) % SPECIFICITY_NUDGES.length;
  return `${archetypes[i]} — ${SPECIFICITY_NUDGES[n]}`;
}

function dedupeByTitleKey(titles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const title of titles) {
    const key = normalizeRecipeTitleKey(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}

const asAvoid = (title: string): AvoidMeal => ({ title, cuisine: '' });

/**
 * Build the per-job avoid context: a rotating, deduped, size-capped slice of
 * the titles already covered for this cuisine. Rotating by jobIndex means
 * successive jobs for the same cuisine suppress different prototypes, so the
 * model is pushed across the dish space instead of all landing on the one
 * canonical recipe.
 */
export function buildAvoidContext(
  knownTitles: string[],
  opts: { windowSize: number; jobIndex: number },
): AvoidMeal[] {
  const unique = dedupeByTitleKey(knownTitles);
  if (unique.length === 0) return [];
  if (unique.length <= opts.windowSize) return unique.map(asAvoid);

  const offset = ((opts.jobIndex % unique.length) + unique.length) % unique.length;
  const rotated = [...unique.slice(offset), ...unique.slice(0, offset)];
  return rotated.slice(0, opts.windowSize).map(asAvoid);
}

/**
 * Immutably append a freshly-collided title to the avoid context for the next
 * retry of the same slot. No-ops if already present (normalized). Caps the
 * list, dropping the oldest entries — the most recent collisions are the
 * immediate threat the next attempt must dodge.
 */
export function appendAvoid(
  context: AvoidMeal[],
  collidedTitle: string,
  cap: number,
): AvoidMeal[] {
  const key = normalizeRecipeTitleKey(collidedTitle);
  if (!key) return context;
  const present = context.some((m) => normalizeRecipeTitleKey(m.title) === key);
  if (present) return context;
  const next = [...context, asAvoid(collidedTitle)];
  return next.length > cap ? next.slice(next.length - cap) : next;
}
