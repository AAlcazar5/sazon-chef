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
}

export interface SimilarRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
  score: number;
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
  tagsString: string | null;
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

function dietaryMatches(
  recipe: Pick<CatalogRecipe, 'tagsString'>,
  dietaryTags: string[],
): boolean {
  if (dietaryTags.length === 0) return true;
  const tags = (recipe.tagsString ?? '').toLowerCase();
  return dietaryTags.every((t) => tags.includes(t.toLowerCase()));
}

export async function retrieveSimilar(
  args: RetrieveSimilarArgs,
): Promise<SimilarRecipe[]> {
  const k = Math.min(args.k ?? DEFAULT_K, MAX_K);
  const filters = args.hardFilters ?? {};

  const anchor = (await prisma.recipe.findUnique({
    where: { id: args.anchorRecipeId },
    select: { id: true, embedding: true } as any,
  } as any)) as { id: string; embedding: Buffer | null } | null;
  if (!anchor || !anchor.embedding) return [];

  let anchorVector: number[] | null = null;
  try {
    anchorVector = decodeEmbedding(anchor.embedding);
  } catch {
    return [];
  }
  if (!isValidEmbedding(anchorVector)) return [];

  // Recently-cooked exclusion.
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
      tagsString: true,
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
    });
  }

  survivors.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.id.localeCompare(b.id),
  );
  return survivors.slice(0, k);
}
