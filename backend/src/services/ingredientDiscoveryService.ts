// ROADMAP 4.0 IG8.1 — "Try this ingredient" weekly cultural discovery.
//
// Surfaces one ingredient the user has *never* used that's central to an
// underrepresented cuisine (cuisines the user hasn't cooked recently).
// Pairs with one beginner-friendly recipe that uses it. Editorial, never
// didactic — copy is "Sumac is the Persian pantry's secret sour" not
// "You're missing 47 ingredients to be culturally diverse."
//
// Cooldown: 60 days per ingredient — tracked via `recommenderEvent` rows
// with surface=`pantry_iq` + metadata.kind=`cultural-discovery`. No new
// table needed.
//
// Cross-tier dovetail: copy generation lives in `sazonVoiceService` (N3.2)
// — this service emits structural signals + recipe pairing.

import { prisma } from '../lib/prisma';
import { getCulturalPrimer } from './culturalPrimerService';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const COOLDOWN_DAYS = 60;
const COOK_LOOKBACK_DAYS = 30;
const RECIPE_COOK_TIME_MAX = 45;

/**
 * Curated map: cuisine cluster → flagship ingredient that's central to it
 * but absent from typical Western kitchens. Each ingredient must (a) appear
 * in at least one recipe in the catalog, (b) carry a cultural narrative, and
 * (c) NOT be a finished dish (curtido / pupusas don't qualify).
 *
 * Keyed lowercase. Expand as the catalog grows + Tier D priorities shift.
 */
export const CULTURAL_DISCOVERY_INGREDIENTS: Record<string, string> = {
  persian: 'sumac',
  lebanese: "za'atar",
  ethiopian: 'berbere',
  burmese: 'lahpet',
  thai: 'makrut lime',
  ghanaian: 'grains of selim',
  filipino: 'calamansi',
  okinawan: 'bitter melon',
  cajun: 'filé powder',
  salvadorean: 'loroco',
};

export interface DiscoverySuggestion {
  /** Lowercase canonical ingredient name. */
  ingredient: string;
  /** Cuisine cluster this ingredient anchors (lowercase). */
  cuisine: string;
  /** Cultural primer copy from `culturalPrimerService` (when available). */
  primerTitle: string | null;
  primerBody: string | null;
  /** Recipe id of the beginner-friendly pairing (≤ RECIPE_COOK_TIME_MAX). */
  recipeId: string | null;
  recipeTitle: string | null;
}

export interface PickWeeklyDiscoveryInput {
  userId: string;
  now?: Date;
}

interface CookRow {
  recipe: { cuisine: string | null } | null;
}

interface EventRow {
  ingredientName: string;
}

interface RecentDiscoveryRow {
  asOf: Date;
  contextSnapshot: string;
}

interface RecipeMatch {
  id: string;
  title: string;
  cookTime: number | null;
}

async function loadRecentlyCookedCuisines(
  userId: string,
  now: Date,
): Promise<Set<string>> {
  const since = new Date(now.getTime() - COOK_LOOKBACK_DAYS * MS_PER_DAY);
  const cooks = (await (prisma as any).cookingLog.findMany({
    where: { userId, cookedAt: { gte: since } },
    include: { recipe: { select: { cuisine: true } } },
  })) as CookRow[];
  const out = new Set<string>();
  for (const c of cooks) {
    const cuisine = c.recipe?.cuisine?.trim().toLowerCase();
    if (cuisine) out.add(cuisine);
  }
  return out;
}

async function loadEverUsedIngredients(userId: string): Promise<Set<string>> {
  const rows = (await (prisma as any).ingredientEvent.findMany({
    where: { userId },
    select: { ingredientName: true },
  })) as EventRow[];
  return new Set(rows.map((r) => r.ingredientName.toLowerCase()));
}

async function loadRecentDiscoverySuggestions(
  userId: string,
  now: Date,
): Promise<Set<string>> {
  const since = new Date(now.getTime() - COOLDOWN_DAYS * MS_PER_DAY);
  const rows = (await (prisma as any).recommenderEvent.findMany({
    where: {
      userId,
      asOf: { gte: since },
    },
    select: { asOf: true, contextSnapshot: true },
  })) as RecentDiscoveryRow[];
  const out = new Set<string>();
  for (const r of rows) {
    try {
      const snap = JSON.parse(r.contextSnapshot) as {
        surface?: string;
        metadata?: { kind?: string; suggestedItem?: string };
      };
      if (snap.surface !== 'pantry_iq') continue;
      if (snap.metadata?.kind !== 'cultural-discovery') continue;
      const item = snap.metadata.suggestedItem;
      if (item) out.add(item.toLowerCase());
    } catch {
      // malformed contextSnapshot — skip
    }
  }
  return out;
}

async function findBeginnerRecipe(
  ingredient: string,
): Promise<RecipeMatch | null> {
  // Substring match in recipe.ingredients[].text — pragmatic until IG1's
  // semantic match ships. Filter to ≤ RECIPE_COOK_TIME_MAX cookTime so the
  // suggestion stays beginner-friendly.
  const candidates = (await (prisma as any).recipe.findMany({
    where: {
      cookTime: { lte: RECIPE_COOK_TIME_MAX },
      ingredients: { some: { text: { contains: ingredient } } },
    },
    select: { id: true, title: true, cookTime: true },
    take: 5,
    orderBy: { cookTime: 'asc' },
  })) as RecipeMatch[];
  if (candidates.length === 0) return null;
  return candidates[0];
}

/**
 * Returns one cultural-discovery suggestion or null when no candidate qualifies.
 * Filters: cuisines the user has cooked recently → skip; ingredients the user
 * has ever used → skip; ingredients suggested in the past 60 days → skip.
 */
export async function pickWeeklyDiscovery(
  input: PickWeeklyDiscoveryInput,
): Promise<DiscoverySuggestion | null> {
  if (!input.userId) return null;
  const now = input.now ?? new Date();

  const [cookedCuisines, everUsed, recentSuggestions] = await Promise.all([
    loadRecentlyCookedCuisines(input.userId, now),
    loadEverUsedIngredients(input.userId),
    loadRecentDiscoverySuggestions(input.userId, now),
  ]);

  for (const [cuisine, ingredient] of Object.entries(
    CULTURAL_DISCOVERY_INGREDIENTS,
  )) {
    if (cookedCuisines.has(cuisine)) continue;
    const ingLower = ingredient.toLowerCase();
    if (everUsed.has(ingLower)) continue;
    if (recentSuggestions.has(ingLower)) continue;

    const recipe = await findBeginnerRecipe(ingredient);
    const primer = getCulturalPrimer(cuisine);
    return {
      ingredient: ingLower,
      cuisine,
      primerTitle: primer?.title ?? null,
      primerBody: primer?.body ?? null,
      recipeId: recipe?.id ?? null,
      recipeTitle: recipe?.title ?? null,
    };
  }

  return null;
}

export const __INTERNALS = {
  COOLDOWN_DAYS,
  COOK_LOOKBACK_DAYS,
  RECIPE_COOK_TIME_MAX,
};
