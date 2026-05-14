// backend/src/services/recommender/retrieveSimilar.ts
// ROADMAP 4.0 RD2.1 — anchor-recipe similarity retrieval.
//
// "More like this" anchors on the *current* recipe's embedding, NOT the
// user's context vector. The home feed already personalizes by user; the
// detail surface answers "show me other recipes like this one." Cosine
// over the active catalog (excluding self), with optional hard filters
// (allergens, dietary, cookTime) and recently-cooked exclusion (default
// 30 days — detail is a discovery surface, not a re-cook nudge).

import { prisma } from '../../lib/prisma';
import {
  cosineSimilarity,
  decodeEmbedding,
  isValidEmbedding,
} from './embeddingStore';

export interface SimilarHardFilters {
  allergens?: string[];
  dietaryTags?: string[];
  maxCookTime?: number | null;
}

export interface RetrieveSimilarArgs {
  /** Anchor recipe id — the recipe currently on detail. */
  anchorRecipeId: string;
  /** User id, used for the recently-cooked exclusion. */
  userId?: string;
  /** Top-K to return after filters. */
  k?: number;
  /** Hard filters; empty = no filter. */
  hardFilters?: SimilarHardFilters;
  /** Exclude recipes the user cooked within the last N days. Default 30.
   *  Set to 0 to disable. */
  excludeCookedSinceDays?: number;
  /** Seed for the cuisine-fallback shuffle. Tests pass a fixed value;
   *  production omits this and the service uses Date.now(). */
  shuffleSeed?: number;
}

export interface SimilarRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
  /** 0-1 similarity (embedding path) or normalized popularity (cuisine fallback). */
  score: number;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
}

const DEFAULT_K = 8;
const MAX_K = 12;
const DEFAULT_COOKED_EXCLUDE_DAYS = 30;

interface CatalogRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
  embedding: Buffer | null;
  ingredients: Array<{ text: string }>;
  tagsJson: string | null;
  popularityScore?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function recipeContainsAllergen(
  recipe: Pick<CatalogRecipe, 'ingredients'>,
  allergens: string[],
): boolean {
  if (allergens.length === 0) return false;
  for (const ing of recipe.ingredients) {
    const txt = normalize(ing.text);
    for (const a of allergens) {
      if (txt.includes(normalize(a))) return true;
    }
  }
  return false;
}

interface MacroSource {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
}

/** 0-1 closeness between two recipes' macro profiles. 1 = identical. */
function macroProximity(a: MacroSource, b: MacroSource): number {
  const fields: Array<{ key: keyof MacroSource; scale: number }> = [
    { key: 'calories', scale: 600 },
    { key: 'protein', scale: 40 },
    { key: 'carbs', scale: 60 },
    { key: 'fat', scale: 30 },
    { key: 'fiber', scale: 12 },
  ];
  let totalWeight = 0;
  let weightedSimilarity = 0;
  for (const { key, scale } of fields) {
    const av = a[key];
    const bv = b[key];
    if (av == null || bv == null) continue;
    const drift = Math.abs(av - bv) / scale;
    const closeness = Math.max(0, 1 - drift);
    weightedSimilarity += closeness;
    totalWeight += 1;
  }
  return totalWeight === 0 ? 0 : weightedSimilarity / totalWeight;
}

/** Mulberry32 PRNG — deterministic, fast, good enough for shuffle. */
function makeRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], seed?: number): T[] {
  const rng = seed != null ? makeRng(seed) : Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dietaryMatches(
  recipe: Pick<CatalogRecipe, 'tagsJson'>,
  dietaryTags: string[],
): boolean {
  if (dietaryTags.length === 0) return true;
  const tags = (recipe.tagsJson ?? '').toLowerCase();
  return dietaryTags.every((t) => tags.includes(t.toLowerCase()));
}

export async function retrieveSimilar(
  args: RetrieveSimilarArgs,
): Promise<SimilarRecipe[]> {
  const k = Math.min(args.k ?? DEFAULT_K, MAX_K);
  const filters = args.hardFilters ?? {};

  const anchor = (await prisma.recipe.findUnique({
    where: { id: args.anchorRecipeId },
    select: {
      id: true,
      embedding: true,
      cuisine: true,
      cookTime: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      fiber: true,
    } as any,
  } as any)) as {
    id: string;
    embedding: Buffer | null;
    cuisine: string | null;
    cookTime: number | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
  } | null;
  if (!anchor) return [];

  let anchorVector: number[] | null = null;
  if (anchor.embedding) {
    try {
      anchorVector = decodeEmbedding(anchor.embedding);
    } catch {
      anchorVector = null;
    }
    if (anchorVector && !isValidEmbedding(anchorVector)) anchorVector = null;
  }

  // Recently-cooked exclusion (shared by embedding + cuisine-fallback paths).
  const excludeIds = new Set<string>([args.anchorRecipeId]);
  const excludeDays = args.excludeCookedSinceDays ?? DEFAULT_COOKED_EXCLUDE_DAYS;
  if (args.userId && excludeDays > 0) {
    const cutoff = new Date(Date.now() - excludeDays * 24 * 60 * 60 * 1000);
    try {
      const recent = (await (prisma as any).cookingLog.findMany({
        where: { userId: args.userId, cookedAt: { gte: cutoff } },
        select: { recipeId: true },
      })) as Array<{ recipeId: string }>;
      recent.forEach((r) => excludeIds.add(r.recipeId));
    } catch {
      /* swallow — graceful */
    }
  }

  // Exclude recipes the user has already saved — otherwise the carousel
  // can render empty for power users whose anchor cuisine matches most of
  // their cookbook. "More like this" is a discovery surface, not a
  // re-surface of what's already saved.
  if (args.userId) {
    try {
      const saved = (await (prisma as any).savedRecipe.findMany({
        where: { userId: args.userId },
        select: { recipeId: true },
      })) as Array<{ recipeId: string }>;
      saved.forEach((s) => excludeIds.add(s.recipeId));
    } catch {
      /* swallow — graceful */
    }
  }

  // Cuisine fallback: user-imported / AI / forked recipes often lack
  // embeddings. Without this branch the "You might also like" surface
  // disappears whenever the anchor has no embedding. Return top-K from
  // the same cuisine sorted by popularityScore (nulls last) so the
  // discovery rail still has something to show.
  if (!anchorVector) {
    if (!anchor.cuisine) return [];
    const sameCuisine = (await prisma.recipe.findMany({
      where: { deletedAt: null, cuisine: anchor.cuisine } as any,
      select: {
        id: true,
        title: true,
        cuisine: true,
        cookTime: true,
        imageUrl: true,
        embedding: true,
        ingredients: { select: { text: true } },
        tagsJson: true,
        popularityScore: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        fiber: true,
      } as any,
    } as any)) as unknown as CatalogRecipe[];

    const fallback: SimilarRecipe[] = [];
    for (const recipe of sameCuisine) {
      if (excludeIds.has(recipe.id)) continue;
      if (filters.maxCookTime != null && (recipe.cookTime ?? 0) > filters.maxCookTime) continue;
      if (filters.allergens && recipeContainsAllergen(recipe, filters.allergens)) continue;
      // Intentional: dietary tag filter is skipped here. The catalog
      // rarely tags recipes with dietary keywords (e.g. "dairy-free"),
      // so requiring a tag match empties the fallback for any user with
      // a dietary restriction. Allergens stay enforced for safety.
      // Fallback "match %": cuisine match is the floor, cookTime + macro
      // proximity to the anchor add real variation, popularityScore
      // (when present) bumps strong picks. Frontend renders this as
      // round(score * 100). The catalog rarely has popularityScore
      // populated, so without the baseline + proximity terms every card
      // would read 0% match.
      const BASELINE = 0.55;
      const COOKTIME_MAX_BONUS = 0.15;
      const COOKTIME_PENALTY_PER_MIN = 0.01;
      const MACRO_MAX_BONUS = 0.2;
      const POPULARITY_MAX_BONUS = 0.1;

      let cookTimeBonus = 0;
      if (anchor.cookTime != null && recipe.cookTime != null) {
        const drift = Math.abs(recipe.cookTime - anchor.cookTime);
        cookTimeBonus = Math.max(0, COOKTIME_MAX_BONUS - drift * COOKTIME_PENALTY_PER_MIN);
      }
      const macroBonus = MACRO_MAX_BONUS * macroProximity(anchor, recipe);
      const popularityBonus =
        recipe.popularityScore != null
          ? (recipe.popularityScore / 100) * POPULARITY_MAX_BONUS
          : 0;
      const score = Math.min(1, BASELINE + cookTimeBonus + macroBonus + popularityBonus);

      fallback.push({
        id: recipe.id,
        title: recipe.title,
        cuisine: recipe.cuisine,
        cookTime: recipe.cookTime,
        imageUrl: recipe.imageUrl,
        score,
        calories: recipe.calories ?? null,
        protein: recipe.protein ?? null,
        carbs: recipe.carbs ?? null,
        fat: recipe.fat ?? null,
        fiber: recipe.fiber ?? null,
      });
    }

    fallback.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
    // Rotate recommendations: pull a wider top-tier pool and shuffle so
    // the carousel doesn't return the same 10 cards on every reload.
    // Caller passes seed for deterministic tests; production uses Date.now.
    const pool = fallback.slice(0, k * 4);
    return shuffleInPlace(pool, args.shuffleSeed).slice(0, k);
  }

  const recipes = (await prisma.recipe.findMany({
    where: { deletedAt: null } as any,
    select: {
      id: true,
      title: true,
      cuisine: true,
      cookTime: true,
      imageUrl: true,
      embedding: true,
      ingredients: { select: { text: true } },
      tagsJson: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      fiber: true,
    } as any,
  } as any)) as unknown as CatalogRecipe[];

  const survivors: SimilarRecipe[] = [];
  for (const recipe of recipes) {
    if (excludeIds.has(recipe.id)) continue;
    if (!recipe.embedding) continue;
    if (filters.maxCookTime != null && (recipe.cookTime ?? 0) > filters.maxCookTime) continue;
    if (filters.allergens && recipeContainsAllergen(recipe, filters.allergens)) continue;
    if (filters.dietaryTags && !dietaryMatches(recipe, filters.dietaryTags)) continue;

    let decoded: number[] | null = null;
    try {
      decoded = decodeEmbedding(recipe.embedding);
    } catch {
      continue;
    }
    if (!isValidEmbedding(decoded)) continue;

    const score = cosineSimilarity(anchorVector, decoded as number[]);
    survivors.push({
      id: recipe.id,
      title: recipe.title,
      cuisine: recipe.cuisine,
      cookTime: recipe.cookTime,
      imageUrl: recipe.imageUrl,
      score,
      calories: recipe.calories ?? null,
      protein: recipe.protein ?? null,
      carbs: recipe.carbs ?? null,
      fat: recipe.fat ?? null,
      fiber: recipe.fiber ?? null,
    });
  }

  survivors.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.id.localeCompare(b.id),
  );
  return survivors.slice(0, k);
}
