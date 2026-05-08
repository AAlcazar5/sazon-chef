// backend/src/services/yearlyRecapService.ts
// ROADMAP 4.0 J13 — Sazon Wrapped yearly recap.
//
// Pure aggregation. Same shape as weeklyRecapService, longer window, five
// card slides instead of one. Caller fetches the year of cooks, ingredients,
// nutrient totals, and cuisine first-cook history; we shape them into the
// Wrapped payload. No DB calls in this service — keeps it cheap to test
// and lets the route layer batch reads.
//
// Voice: lifestyle, never trainer. The five slides are gifts, not verdicts.
// Banned vocab (cut/bulk/maintain/macro-friendly) must not appear in any
// rendered string.
//
// Sparse-year framing: ≤5 cooks → still produce 5 slides, but copy reframes
// to "your first year cooking with Sazon" instead of "you crushed it."

import {
  computeTopIngredient,
  computeTopNutrient,
  type RecapCookRow,
  type RecapIngredientCount,
  type TopCuisineResult,
} from './weeklyRecapService';

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

const SPARSE_THRESHOLD = 5;
const TOP_CUISINE_LIMIT = 5;

export interface CuisineFirstCook {
  cuisine: string;
  firstCookedAt: Date;
}

export interface CuisineStreakResult {
  cuisine: string;
  length: number;
}

/**
 * Longest run of consecutive same-cuisine cooks across the year.
 * Cooks are sorted by cookedAt asc; null cuisines break the streak but
 * don't count. Tiebreaks: earlier-starting streak wins.
 */
export function computeLongestCuisineStreak(
  cooks: ReadonlyArray<RecapCookRow>
): CuisineStreakResult | null {
  if (!cooks || cooks.length === 0) return null;
  const sorted = [...cooks].sort(
    (a, b) => a.cookedAt.getTime() - b.cookedAt.getTime()
  );
  let bestCuisine: string | null = null;
  let bestLen = 0;
  let curCuisine: string | null = null;
  let curLen = 0;
  for (const c of sorted) {
    // Null/missing cuisine is invisible — doesn't break the run, doesn't extend it.
    if (!c.cuisine) continue;
    if (c.cuisine === curCuisine) {
      curLen += 1;
    } else {
      curCuisine = c.cuisine;
      curLen = 1;
    }
    if (curLen > bestLen) {
      bestLen = curLen;
      bestCuisine = curCuisine;
    }
  }
  return bestCuisine ? { cuisine: bestCuisine, length: bestLen } : null;
}

/**
 * Latest cuisine the user cooked for the first time within `year`. Picks
 * the *latest* first-time so the slide reads "you tried Salvadoran in
 * August" — surprises near the end of the year are more screenshot-able
 * than ones in January. Returns null if every cuisine the user has ever
 * tried predates the target year.
 */
export function computeFirstTimeCuisine(
  cuisines: ReadonlyArray<CuisineFirstCook>,
  year: number
): CuisineFirstCook | null {
  if (!cuisines || cuisines.length === 0) return null;
  const inYear = cuisines.filter((c) => c.firstCookedAt.getUTCFullYear() === year);
  if (inYear.length === 0) return null;
  return [...inYear].sort(
    (a, b) => b.firstCookedAt.getTime() - a.firstCookedAt.getTime()
  )[0];
}

export function computeUniqueIngredientCount(
  ings: ReadonlyArray<RecapIngredientCount>
): number {
  if (!ings || ings.length === 0) return 0;
  const seen = new Set<string>();
  for (const i of ings) {
    const k = i.name.toLowerCase().trim();
    if (!k) continue;
    if (STAPLE_INGREDIENTS.has(k)) continue;
    seen.add(k);
  }
  return seen.size;
}

/**
 * Top-N cuisines this year by cook count. Stable tiebreak: alphabetical.
 */
export function computeTopCuisines(
  cooks: ReadonlyArray<RecapCookRow>,
  limit: number = TOP_CUISINE_LIMIT
): TopCuisineResult[] {
  const counts = new Map<string, number>();
  for (const c of cooks) {
    if (!c.cuisine) continue;
    counts.set(c.cuisine, (counts.get(c.cuisine) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([cuisine, count]) => ({ cuisine, count }));
}

export type WrappedSlideType =
  | 'top_cuisines'
  | 'ingredients_tasted'
  | 'longest_streak'
  | 'micros'
  | 'first_time';

export interface WrappedSlide {
  type: WrappedSlideType;
  title: string;
  subtitle?: string;
  primary: string;
  detail?: string[];
}

export interface YearlyWrappedPayload {
  userId: string;
  year: number;
  cookCount: number;
  isSparse: boolean;
  slides: WrappedSlide[];
}

export interface YearlyRecapInputs {
  userId: string;
  year: number;
  cooks: ReadonlyArray<RecapCookRow>;
  ingredients: ReadonlyArray<RecapIngredientCount>;
  nutrientTotals: Record<string, number>;
  nutrientTargets: Record<string, number>;
  cuisinesEverTried: ReadonlyArray<CuisineFirstCook>;
}

function topCuisinesSlide(
  cooks: ReadonlyArray<RecapCookRow>,
  isSparse: boolean
): WrappedSlide {
  const top = computeTopCuisines(cooks);
  if (top.length === 0) {
    return {
      type: 'top_cuisines',
      title: 'Your year in cuisines',
      primary: 'A blank map, ready to fill.',
    };
  }
  return {
    type: 'top_cuisines',
    title: isSparse ? 'Your first cuisines' : 'Your top cuisines',
    primary: top[0].cuisine,
    detail: top.map((c) => `${c.cuisine} · ${c.count}`),
  };
}

function ingredientsTastedSlide(
  ings: ReadonlyArray<RecapIngredientCount>
): WrappedSlide {
  const count = computeUniqueIngredientCount(ings);
  const topIngredient = computeTopIngredient(ings);
  return {
    type: 'ingredients_tasted',
    title: 'Ingredients tasted',
    primary: count > 0 ? `${count} unique ingredients` : 'Your pantry is just starting.',
    detail: topIngredient ? [`Most-used: ${topIngredient.name} (${topIngredient.count}x)`] : undefined,
  };
}

function longestStreakSlide(cooks: ReadonlyArray<RecapCookRow>): WrappedSlide {
  const streak = computeLongestCuisineStreak(cooks);
  if (!streak) {
    return {
      type: 'longest_streak',
      title: 'Longest run',
      primary: 'A streak is just one cook away.',
    };
  }
  return {
    type: 'longest_streak',
    title: 'Longest run',
    primary: `${streak.length}× ${streak.cuisine} in a row`,
    subtitle: 'When a cuisine grabs you, you go.',
  };
}

function microsSlide(
  totals: Record<string, number>,
  targets: Record<string, number>
): WrappedSlide {
  const top = computeTopNutrient(totals, targets);
  if (!top) {
    return {
      type: 'micros',
      title: 'Micros highlights',
      primary: 'Discovery is the surface, not the score.',
    };
  }
  const pct = Math.round(top.percentOfTarget * 100);
  return {
    type: 'micros',
    title: 'Micros highlights',
    primary: `You crushed ${top.name}`,
    subtitle: `${pct}% of the year's target — ${top.name} is your nutrient of the year.`,
  };
}

function firstTimeSlide(
  cuisines: ReadonlyArray<CuisineFirstCook>,
  year: number
): WrappedSlide {
  const ft = computeFirstTimeCuisine(cuisines, year);
  if (!ft) {
    return {
      type: 'first_time',
      title: 'A new world',
      primary: 'Next year, a cuisine you\'ve never cooked.',
    };
  }
  const month = ft.firstCookedAt.toLocaleString('en-US', { month: 'long' });
  return {
    type: 'first_time',
    title: 'New this year',
    primary: `${ft.cuisine}, first cooked in ${month}`,
    subtitle: 'A cuisine you\'d never made before — and now it\'s in your map.',
  };
}

export function buildYearlyWrapped(inputs: YearlyRecapInputs): YearlyWrappedPayload {
  const cookCount = inputs.cooks.length;
  const isSparse = cookCount <= SPARSE_THRESHOLD;
  const slides: WrappedSlide[] = [
    topCuisinesSlide(inputs.cooks, isSparse),
    ingredientsTastedSlide(inputs.ingredients),
    longestStreakSlide(inputs.cooks),
    microsSlide(inputs.nutrientTotals, inputs.nutrientTargets),
    firstTimeSlide(inputs.cuisinesEverTried, inputs.year),
  ];
  return {
    userId: inputs.userId,
    year: inputs.year,
    cookCount,
    isSparse,
    slides,
  };
}
