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
