// ROADMAP 4.0 TB1.2 — Top-K candidate retrieval.
//
// Hard filters first (allergies, dietary, time-budget, pantry coverage),
// then cosine similarity to the user context vector. SQLite-friendly:
// loop in memory — at <2k recipes this is faster than any vector DB.

import { prisma } from '../../lib/prisma';
import {
  cosineSimilarity,
  decodeEmbedding,
  isValidEmbedding,
} from './embeddingStore';

export interface HardFilters {
  allergens: string[];
  dietaryTags: string[];
  maxCookTime: number | null;
  pantryItems: string[];
  minPantryCoverage: number; // 0..1
}

export interface RetrievalContext {
  userId: string;
  contextVector: number[];
  hardFilters: HardFilters;
}

export interface RetrieveCandidatesArgs extends RetrievalContext {
  k?: number;
}

export interface RetrievalResult {
  recipeIds: string[];
  scores: number[];
  scanned: number;
  survivors: number;
}

interface CatalogRecipe {
  id: string;
  cuisine: string;
  canonicalCuisine: string | null;
  cookTime: number;
  embedding: Buffer | null;
  ingredients: Array<{ text: string }>;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function recipeContainsAllergen(
  recipe: CatalogRecipe,
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

function pantryCoverage(
  recipe: CatalogRecipe,
  pantryItems: string[],
): number {
  if (recipe.ingredients.length === 0) return 0;
  if (pantryItems.length === 0) return 0;
  const pantrySet = new Set(pantryItems.map(normalize));
  let matched = 0;
  for (const ing of recipe.ingredients) {
    const tokens = normalize(ing.text).split(/\s+/);
    if (tokens.some((t) => pantrySet.has(t))) matched++;
  }
  return matched / recipe.ingredients.length;
}

export async function retrieveCandidates(
  args: RetrieveCandidatesArgs,
): Promise<RetrievalResult> {
  const k = args.k ?? 50;
  const filters = args.hardFilters;

  const recipes = (await prisma.recipe.findMany({
    where: { deletedAt: null } as any,
    select: {
      id: true,
      cuisine: true,
      canonicalCuisine: true,
      cookTime: true,
      embedding: true,
      ingredients: { select: { text: true } },
    } as any,
  } as any)) as unknown as CatalogRecipe[];

  const survivors: Array<{ id: string; score: number }> = [];

  for (const recipe of recipes) {
    if (!recipe.embedding) continue;
    if (filters.maxCookTime != null && recipe.cookTime > filters.maxCookTime)
      continue;
    if (recipeContainsAllergen(recipe, filters.allergens)) continue;
    if (
      filters.minPantryCoverage > 0 &&
      pantryCoverage(recipe, filters.pantryItems) < filters.minPantryCoverage
    )
      continue;

    let decoded: number[] | null = null;
    try {
      decoded = decodeEmbedding(recipe.embedding);
    } catch {
      continue;
    }
    if (!isValidEmbedding(decoded)) continue;
    const score = cosineSimilarity(args.contextVector, decoded as number[]);
    survivors.push({ id: recipe.id, score });
  }

  survivors.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.id.localeCompare(b.id),
  );
  const top = survivors.slice(0, k);

  return {
    recipeIds: top.map((s) => s.id),
    scores: top.map((s) => s.score),
    scanned: recipes.length,
    survivors: survivors.length,
  };
}
