// backend/src/services/weeklyRecapService.ts
// ROADMAP 4.0 Tier C9 — Weekly recap card service.
//
// Pure aggregation service. Caller fetches the week's cooks, ingredients,
// nutrient totals, and "new this week" lists; we shape them into a Spotify-
// Wrapped-style recap card. Lifestyle voice — celebrate the variety, never
// scold the gaps.

export interface RecapCookRow {
  recipeId: string;
  cuisine: string | null;
  cookedAt: Date;
}

export interface RecapIngredientCount {
  name: string;
  count: number;
}

const STAPLE_INGREDIENTS = new Set(
  [
    'salt',
    'kosher salt',
    'sea salt',
    'pepper',
    'black pepper',
    'olive oil',
    'oil',
    'water',
    'butter',
    'sugar',
  ].map((s) => s.toLowerCase())
);

export interface TopCuisineResult {
  cuisine: string;
  count: number;
}

export function computeTopCuisine(cooks: ReadonlyArray<RecapCookRow>): TopCuisineResult | null {
  if (!cooks || cooks.length === 0) return null;
  const counts = new Map<string, number>();
  for (const c of cooks) {
    if (!c.cuisine) continue;
    counts.set(c.cuisine, (counts.get(c.cuisine) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  // Sort by (count desc, cuisine asc) for stable tiebreaks.
  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  return { cuisine: sorted[0][0], count: sorted[0][1] };
}

export interface TopIngredientResult {
  name: string;
  count: number;
}

export function computeTopIngredient(
  ingredients: ReadonlyArray<RecapIngredientCount>
): TopIngredientResult | null {
  if (!ingredients || ingredients.length === 0) return null;
  const filtered = ingredients.filter(
    (i) => !STAPLE_INGREDIENTS.has(i.name.toLowerCase())
  );
  if (filtered.length === 0) return null;
  const sorted = [...filtered].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });
  return { name: sorted[0].name, count: sorted[0].count };
}

export interface TopNutrientResult {
  name: string;
  /** Total intake over the window. */
  total: number;
  /** Target intake over the window. */
  target: number;
  /** Percentage of target hit (>= 1.0 to qualify). */
  percentOfTarget: number;
}

export function computeTopNutrient(
  totals: Record<string, number>,
  targets: Record<string, number>
): TopNutrientResult | null {
  if (!totals || !targets) return null;
  let best: TopNutrientResult | null = null;
  for (const [name, total] of Object.entries(totals)) {
    const target = targets[name];
    if (typeof target !== 'number' || target <= 0) continue;
    const pct = total / target;
    if (pct < 1) continue; // must exceed target to be the "top"
    if (!best || pct > best.percentOfTarget) {
      best = { name, total, target, percentOfTarget: pct };
    }
  }
  return best;
}

export interface DiscoveryInputs {
  newCuisinesThisWeek: ReadonlyArray<string>;
  newIngredientsThisWeek: ReadonlyArray<string>;
}

export function computeDiscovery(inputs: DiscoveryInputs): string | null {
  if (inputs.newCuisinesThisWeek.length > 0) {
    const c = inputs.newCuisinesThisWeek[0];
    return `First time cooking ${c} this week. New cuisine added to your map.`;
  }
  if (inputs.newIngredientsThisWeek.length > 0) {
    const i = inputs.newIngredientsThisWeek[0];
    return `New ingredient on the rotation: ${i}.`;
  }
  return null;
}

export interface RecapInputs {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  cooks: ReadonlyArray<RecapCookRow>;
  ingredients: ReadonlyArray<RecapIngredientCount>;
  nutrientTotals: Record<string, number>;
  nutrientTargets: Record<string, number>;
  newCuisinesThisWeek: ReadonlyArray<string>;
  newIngredientsThisWeek: ReadonlyArray<string>;
}

export interface WeeklyRecapCard {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  cookCount: number;
  cuisineCount: number;
  topCuisine: TopCuisineResult | null;
  topIngredient: TopIngredientResult | null;
  topNutrient: TopNutrientResult | null;
  discovery: string | null;
}

export function buildWeeklyRecap(inputs: RecapInputs): WeeklyRecapCard {
  const cuisineSet = new Set<string>();
  for (const c of inputs.cooks) {
    if (c.cuisine) cuisineSet.add(c.cuisine);
  }
  return {
    userId: inputs.userId,
    weekStart: inputs.weekStart,
    weekEnd: inputs.weekEnd,
    cookCount: inputs.cooks.length,
    cuisineCount: cuisineSet.size,
    topCuisine: computeTopCuisine(inputs.cooks),
    topIngredient: computeTopIngredient(inputs.ingredients),
    topNutrient: computeTopNutrient(inputs.nutrientTotals, inputs.nutrientTargets),
    discovery: computeDiscovery({
      newCuisinesThisWeek: inputs.newCuisinesThisWeek,
      newIngredientsThisWeek: inputs.newIngredientsThisWeek,
    }),
  };
}
