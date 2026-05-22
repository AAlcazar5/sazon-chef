// frontend/lib/coach/findOrGenerateRecipe.ts
//
// Tier Y live-wiring. Given a recipe ask (e.g., "pizza margarita"), try
// the curated catalog first (token search + Dice similarity rank — Y-Live-7,
// tolerates typos like Margarita↔Margherita); fall through to AI gen only
// when no strong catalog candidate. Maps either source into a
// RecipeCardPayload that CookingModeRecipeCard can render.
//
// The backend AI gen exposes `ingredientsStructured` ({name,amount,unit})
// so the servings stepper can rescale exactly (rescaleStepText needs
// anchored amount+unit tokens — see Y-1). Catalog recipes carry the same
// structured fields via Y-1a's RecipeIngredient additive columns; rows
// missing structure are dropped (W-A2 no-fabricate).

import { recipeApi } from '../api/recipe';
import type { ScalableIngredientLite } from '../cooking/rescaleStepText';
import {
  rankRecipeAskCandidates,
  type RankerSignals,
} from './rankRecipeAskCandidates';

export interface RecipeCardPayload {
  /**
   * Catalog id when the recipe came from the curated DB (Y-Live-7). Used
   * by CookLaunchModal → /cooking?recipeId=… to launch the step player
   * (Y-Live-1). AI-generated recipes have no id and only deliver the
   * card + launch preview until the player learns to take a direct
   * payload (future Y-Live-2).
   */
  recipeId?: string;
  title: string;
  description: string;
  /** Optional cuisine label — fuels the N=1 ranker's cuisine bonus and
   *  Picked-because rationale. Missing for AI-gen recipes when the model
   *  doesn't tag one. */
  cuisine?: string;
  /** Catalog/AI-gen difficulty label. Fuels the ranker's skill-tier
   *  bonus (at-or-below user's skill → small upranking). Unknown +
   *  missing values are neutral (no bonus, no penalty). */
  difficulty?: 'easy' | 'medium' | 'hard';
  baseServings: number;
  ingredients: ScalableIngredientLite[];
  steps: string[];
  macros?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  imageUrls?: string[];
  notes?: string;
}

// ── Catalog-first fuzzy lookup (Y-Live-7) ────────────────────────────────

/**
 * Dice/Sørensen coefficient on lowercased alnum bigrams. Returns [0,1].
 * Tolerant of typos within a token (Margarita↔Margherita), word-order,
 * and casing — better than substring `contains` for spelling tolerance,
 * cheaper than Levenshtein on long titles. Exported for unit testing.
 */
export function dice(a: string, b: string): number {
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bigrams = (s: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
    return out;
  };
  const A = bigrams(norm(a));
  const B = bigrams(norm(b));
  if (A.length === 0 || B.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of B) counts.set(g, (counts.get(g) ?? 0) + 1);
  let matches = 0;
  for (const g of A) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      matches += 1;
      counts.set(g, c - 1);
    }
  }
  return (2 * matches) / (A.length + B.length);
}

const CATALOG_MATCH_THRESHOLD = 0.55;
const CATALOG_SEARCH_LIMIT = 20;

/**
 * Y-Live-12: ordered list of search terms to retry against the catalog
 * when the first one returns nothing. Catches typos that wipe out the
 * first significant token: "chickn noodle soup" tries "chickn" → 0 hits
 * → retries with "noodle" → finds "Chicken Noodle Soup" → Dice ranks
 * against the full original query so the typo'd token's noise doesn't
 * dominate the score.
 *
 * Returns ALL ≥3-char tokens in their original order, falling back to
 * just the first token (any length) when no token clears 3 chars.
 * Exported for unit testing.
 */
export function extractSearchTerms(query: string): string[] {
  const tokens = query.trim().split(/\s+/).filter((t) => t.length > 0);
  const significant = tokens.filter((t) => t.length >= 3);
  if (significant.length > 0) return significant;
  return tokens[0] ? [tokens[0]] : [];
}

interface CatalogIngredient {
  name?: string;
  amount?: number | null;
  unit?: string | null;
  text?: string;
}

interface CatalogInstruction {
  text?: string;
  step?: number;
}

interface CatalogRecipe {
  id?: string;
  title?: string;
  description?: string;
  cuisine?: string | null;
  difficulty?: string | null;
  servings?: number;
  ingredients?: Array<CatalogIngredient | string>;
  instructions?: Array<CatalogInstruction | string>;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  imageUrl?: string;
  storageInstructions?: string | null;
}

interface GetAllRecipesResponse {
  data?: { recipes?: CatalogRecipe[] } | CatalogRecipe[];
}

function mapStructuredIngredient(
  ing: CatalogIngredient | string,
): ScalableIngredientLite | null {
  if (typeof ing === 'string' || !ing) return null;
  const { name, amount, unit } = ing;
  if (
    typeof name !== 'string' ||
    name.length === 0 ||
    typeof unit !== 'string' ||
    unit.length === 0 ||
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return null;
  }
  return { name, amount, unit };
}

function mapStep(s: CatalogInstruction | string): string | null {
  if (typeof s === 'string') return s;
  if (s && typeof s.text === 'string') return s.text;
  return null;
}

function normalizeDifficulty(d: unknown): 'easy' | 'medium' | 'hard' | undefined {
  if (typeof d !== 'string') return undefined;
  const lc = d.trim().toLowerCase();
  if (lc === 'easy' || lc === 'medium' || lc === 'hard') return lc;
  return undefined;
}

function mapCatalogRecipe(r: CatalogRecipe): RecipeCardPayload | null {
  if (!r.title) return null;
  const ingredients = (r.ingredients ?? [])
    .map(mapStructuredIngredient)
    .filter((x): x is ScalableIngredientLite => x !== null);
  // Stepper rescale requires structured ingredients. Legacy catalog rows
  // without amount/unit can't anchor `rescaleStepText` — fall through to
  // AI gen which guarantees structured output.
  if (ingredients.length === 0) return null;
  const steps = (r.instructions ?? [])
    .map(mapStep)
    .filter((x): x is string => x !== null);
  return {
    recipeId: r.id,
    title: r.title,
    description: r.description ?? '',
    cuisine: typeof r.cuisine === 'string' && r.cuisine.length > 0 ? r.cuisine : undefined,
    difficulty: normalizeDifficulty(r.difficulty),
    baseServings: r.servings && r.servings > 0 ? r.servings : 4,
    ingredients,
    steps,
    macros: {
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      fiber: r.fiber,
    },
    imageUrls: r.imageUrl ? [r.imageUrl] : undefined,
    // Y-Live-6 — storageInstructions surfaces in the card's NOTES block
    // (kitchen-mode parity). Null/missing is dropped to undefined so
    // the NOTES block doesn't render an empty author-tips line.
    notes:
      typeof r.storageInstructions === 'string' && r.storageInstructions.length > 0
        ? r.storageInstructions
        : undefined,
  };
}

interface CatalogFetchResult {
  /** Structured candidates — passed name + amount + unit on every
   *  ingredient row. Used by the N=1 ranker (it needs structured
   *  ingredients to rescale prose). Many legacy seeded recipes fail
   *  this filter, so this list can be much shorter than the raw set. */
  structuredCandidates: RecipeCardPayload[];
  /** All raw catalog rows from the search, mapped only enough to
   *  surface `title` + `imageUrl`. Used for image-borrow on AI-gen
   *  results: we don't care about ingredient structure when we're
   *  just stealing a photo, and many legacy rows DO have an imageUrl
   *  even when their ingredients aren't structured. */
  imageSources: Array<{ title: string; imageUrl: string }>;
}

/** Fetch and split the catalog response into the two sets the wedge
 *  needs: structured-for-ranking + raw-for-images.
 *
 *  Y-Live-12: retries with later tokens if the first one returns 0 rows
 *  (handles typos that wipe out the first significant token). Stops at
 *  the first term that returns ≥1 row. */
async function fetchCatalogCandidates(query: string): Promise<CatalogFetchResult> {
  const terms = extractSearchTerms(query);
  if (terms.length === 0) return { structuredCandidates: [], imageSources: [] };
  for (const term of terms) {
    const res = (await recipeApi.getAllRecipes({
      search: term,
      limit: CATALOG_SEARCH_LIMIT,
    })) as GetAllRecipesResponse;
    const recipes = Array.isArray(res?.data)
      ? res.data
      : res?.data?.recipes ?? [];
    if (recipes.length === 0) continue;
    const structuredCandidates = recipes
      .map(mapCatalogRecipe)
      .filter((r): r is RecipeCardPayload => r !== null);
    const imageSources: Array<{ title: string; imageUrl: string }> = [];
    for (const r of recipes) {
      if (
        typeof r.title === 'string' &&
        r.title.length > 0 &&
        typeof r.imageUrl === 'string' &&
        r.imageUrl.length > 0
      ) {
        imageSources.push({ title: r.title, imageUrl: r.imageUrl });
      }
    }
    return { structuredCandidates, imageSources };
  }
  return { structuredCandidates: [], imageSources: [] };
}

/** Pure helper — find the catalog row with the highest title-Dice
 *  against `query` and return its imageUrl, or undefined if no rows
 *  have one. Exported for unit testing. */
export function pickBestCatalogImage(
  query: string,
  sources: Array<{ title: string; imageUrl: string }>,
): string | undefined {
  if (sources.length === 0) return undefined;
  let best: { url: string; score: number } | null = null;
  for (const s of sources) {
    const score = dice(s.title, query);
    if (!best || score > best.score) {
      best = { url: s.imageUrl, score };
    }
  }
  return best?.url;
}

// ── AI generation fallback (existing path) ────────────────────────────────

interface GeneratedRecipeShape {
  title?: string;
  description?: string;
  cuisine?: string;
  difficulty?: string;
  servings?: number;
  ingredientsStructured?: Array<{ name: string; amount: number; unit: string }>;
  instructions?: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  tips?: string[];
  imageUrl?: string;
  /** Kitchen-mode parity (founder 2026-05-20): backend returns up to
   *  3 Spoonacular-looked-up photos ranked by title-Dice similarity. */
  imageUrls?: string[];
}

interface GeneratedResponse {
  // The core axios response interceptor (lib/api/core.ts) unwraps
  // `{success, data}` envelopes one level, so `.data` is already the
  // payload `{recipe: {...}}` here — NOT another nested `{success, data}`.
  data?: { recipe?: GeneratedRecipeShape };
}

async function generateViaAi(query: string): Promise<RecipeCardPayload> {
  // Founder 2026-05-19 — pass mode: 'recipe-ask' so the backend skips its
  // free-text PII guard and routes through DeepSeek for free-tier users
  // (Anthropic quota was the dominant failure mode hitting the wedge).
  const res = (await recipeApi.generateFromDescription(query, {
    mode: 'recipe-ask',
  })) as GeneratedResponse;
  const recipe = res?.data?.recipe;
  if (!recipe) {
    throw new Error('Recipe generation returned no recipe');
  }
  // Drop rows without a valid amount+unit — never fabricate quantities
  // (W-A2 invariant; same rule toScalableIngredients enforces server-side).
  const ingredients: ScalableIngredientLite[] = (recipe.ingredientsStructured ?? [])
    .filter(
      (i) =>
        !!i.name &&
        Number.isFinite(i.amount) &&
        i.amount > 0 &&
        typeof i.unit === 'string' &&
        i.unit.length > 0,
    )
    .map((i) => ({ name: i.name, amount: i.amount, unit: i.unit }));

  return {
    title: recipe.title ?? 'Untitled recipe',
    description: recipe.description ?? '',
    cuisine:
      typeof recipe.cuisine === 'string' && recipe.cuisine.length > 0
        ? recipe.cuisine
        : undefined,
    difficulty: normalizeDifficulty(recipe.difficulty),
    baseServings:
      typeof recipe.servings === 'number' && recipe.servings > 0
        ? recipe.servings
        : 4,
    ingredients,
    steps: recipe.instructions ?? [],
    macros: {
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
    },
    // Prefer the multi-image array (kitchen-mode collage); fall back
    // to the single imageUrl for older backends / legacy callers.
    imageUrls:
      recipe.imageUrls && recipe.imageUrls.length > 0
        ? recipe.imageUrls
        : recipe.imageUrl
        ? [recipe.imageUrl]
        : undefined,
    notes: (recipe.tips ?? []).join(' '),
  };
}

// ── Public ────────────────────────────────────────────────────────────────

export interface RecipeAskResult {
  /** The picked recipe — ranker's top candidate, or the AI-gen result. */
  primary: RecipeCardPayload;
  /** Next-best catalog candidates in ranked order. Powers the "Show me
   *  another →" swap chip on the card. Empty for AI-gen-only results. */
  alternates: RecipeCardPayload[];
  /** One-liner explaining the pick (pantry / cuisine). Undefined when
   *  there's nothing N=1 to surface (cold-start). */
  rationale?: string;
}

const EMPTY_SIGNALS: RankerSignals = {
  pantryNames: [],
  lastCookCuisine: null,
  topAdjacentCuisine: null,
};

export async function findOrGenerateRecipe(
  query: string,
  signals: RankerSignals = EMPTY_SIGNALS,
): Promise<RecipeAskResult> {
  // 1. Curated catalog first — token search + N=1 ranker (Dice + pantry
  //    overlap + cuisine bonus). A catalog hiccup must never block the
  //    wedge: any throw → fall through to gen.
  let structuredCandidates: RecipeCardPayload[] = [];
  let imageSources: Array<{ title: string; imageUrl: string }> = [];
  try {
    const fetched = await fetchCatalogCandidates(query);
    structuredCandidates = fetched.structuredCandidates;
    imageSources = fetched.imageSources;
  } catch {
    // intentional swallow — gen below is the safety net
  }
  if (structuredCandidates.length > 0) {
    const ranked = rankRecipeAskCandidates(query, structuredCandidates, signals);
    const top = ranked[0];
    // Only commit to a catalog answer when Dice clears the confidence
    // threshold — otherwise prefer AI gen, which has world knowledge and
    // often produces a more on-target recipe for ambiguous asks. The
    // ranker still gets the final say within the catalog pool above.
    if (top.diceScore >= CATALOG_MATCH_THRESHOLD) {
      return {
        primary: top.recipe,
        alternates: ranked.slice(1).map((r) => r.recipe),
        rationale: top.rationale,
      };
    }
  }
  // 2. AI gen — handles ambiguous / typo / novel queries. On failure
  //    (quota, 500, network), fall back to the best catalog candidate
  //    even at below-threshold Dice so the wedge still renders a card.
  //    Founder rule: recipe ask → card, never paragraph.
  try {
    const generated = await generateViaAi(query);
    // Founder bug 2026-05-20 (round 3): AI-gen recipes still lack
    // photos because the structured-ingredient filter dropped most
    // legacy catalog rows, leaving the image-borrow path empty.
    // Use imageSources (raw rows, no ingredient filter) instead —
    // legacy rows often have a perfectly good imageUrl even when
    // their ingredients aren't structured for the ranker.
    if (!generated.imageUrls?.length) {
      const borrowed = pickBestCatalogImage(query, imageSources);
      if (borrowed) {
        generated.imageUrls = [borrowed];
      }
    }
    return { primary: generated, alternates: [] };
  } catch (genErr) {
    if (structuredCandidates.length > 0) {
      const ranked = rankRecipeAskCandidates(query, structuredCandidates, signals);
      return {
        primary: ranked[0].recipe,
        alternates: ranked.slice(1).map((r) => r.recipe),
        rationale: ranked[0].rationale,
      };
    }
    throw genErr;
  }
}
