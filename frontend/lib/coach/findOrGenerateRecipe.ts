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

function firstSignificantToken(query: string): string {
  const tokens = query.trim().split(/\s+/);
  return tokens.find((t) => t.length >= 3) ?? tokens[0] ?? '';
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

/** All structured catalog candidates for a query, no scoring applied.
 *  Ranking is delegated to `rankRecipeAskCandidates` so the same logic
 *  can be reused for swap-chip alternates. */
async function fetchCatalogCandidates(
  query: string,
): Promise<RecipeCardPayload[]> {
  const term = firstSignificantToken(query);
  if (!term) return [];
  const res = (await recipeApi.getAllRecipes({
    search: term,
    limit: CATALOG_SEARCH_LIMIT,
  })) as GetAllRecipesResponse;
  const recipes = Array.isArray(res?.data)
    ? res.data
    : res?.data?.recipes ?? [];
  return recipes
    .map(mapCatalogRecipe)
    .filter((r): r is RecipeCardPayload => r !== null);
}

// ── AI generation fallback (existing path) ────────────────────────────────

interface GeneratedRecipeShape {
  title?: string;
  description?: string;
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
    imageUrls: recipe.imageUrl ? [recipe.imageUrl] : undefined,
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
  let catalogCandidates: RecipeCardPayload[] = [];
  try {
    catalogCandidates = await fetchCatalogCandidates(query);
  } catch {
    // intentional swallow — gen below is the safety net
  }
  if (catalogCandidates.length > 0) {
    const ranked = rankRecipeAskCandidates(query, catalogCandidates, signals);
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
    return { primary: generated, alternates: [] };
  } catch (genErr) {
    if (catalogCandidates.length > 0) {
      const ranked = rankRecipeAskCandidates(query, catalogCandidates, signals);
      return {
        primary: ranked[0].recipe,
        alternates: ranked.slice(1).map((r) => r.recipe),
        rationale: ranked[0].rationale,
      };
    }
    throw genErr;
  }
}
