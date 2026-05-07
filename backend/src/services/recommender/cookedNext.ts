// ROADMAP 4.0 RD5.1 — recipe-detail "Cooked this and then…" recommender.
//
// Thin wrapper over `cohortInsightsService.getCookedNext` (N7.3, which
// already enforces N8.2 privacy + ≥30 distinct-cooker k-anonymity floor).
// This wrapper layers on:
//   - recipe-id → full Recipe row resolution
//   - exclusion of recipes the requesting user has already cooked
//   - banned-vocab guard on returned titles (lifestyle voice)
//
// Contract: never returns user IDs or per-user history — aggregation only.
// Empty result is the privacy-safe default for both opt-out and below-floor.

import { prisma } from '../../lib/prisma';
import { getCookedNext as getCohortCookedNext } from '../cohortInsightsService';
import { findVoiceViolation } from '../voice/bannedVocabularyCorpus';

const DEFAULT_K = 5;
const MAX_K = 10;

export interface CookedNextRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  cuisine: string | null;
  cookTime: number | null;
  cookCount: number;
}

export interface CookedNextResult {
  recipes: CookedNextRecipe[];
  privacyOptOut: boolean;
  belowKAnonFloor: boolean;
}

export interface CookedNextInput {
  recipeId: string;
  userId: string;
  k?: number;
  withinDays?: number;
}

function clampK(k: number | undefined): number {
  const v = k == null ? DEFAULT_K : k;
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_K;
  return Math.min(MAX_K, Math.floor(v));
}

interface RecipeRow {
  id: string;
  title: string;
  imageUrl: string | null;
  cuisine: string | null;
  cookTime: number | null;
}

/**
 * RD5.1 — "Cooked this and then…" recommender for the recipe detail page.
 */
export async function cookedNext(
  input: CookedNextInput,
): Promise<CookedNextResult> {
  if (!input.recipeId) {
    throw new Error('cookedNext: recipeId required');
  }
  const k = clampK(input.k);

  const cohort = await getCohortCookedNext({
    recipeId: input.recipeId,
    k,
    excludeUserId: input.userId,
    withinDays: input.withinDays,
  });

  const empty: CookedNextResult = {
    recipes: [],
    privacyOptOut: cohort.privacyOptOut,
    belowKAnonFloor: cohort.belowKAnonFloor,
  };
  if (cohort.privacyOptOut || cohort.belowKAnonFloor) return empty;
  if (cohort.recipes.length === 0) {
    return { ...empty, recipes: [] };
  }

  const ids = cohort.recipes.map((r) => r.recipeId);

  // Recipes the caller has already cooked — exclude from the result so we
  // don't recommend "cook this thing you literally already cooked."
  const alreadyCooked = (await (prisma as any).cookingLog.findMany({
    where: { userId: input.userId, recipeId: { in: ids } },
    select: { recipeId: true },
    distinct: ['recipeId'],
  })) as Array<{ recipeId: string }>;
  const cookedSet = new Set(alreadyCooked.map((c) => c.recipeId));

  const remaining = cohort.recipes.filter((r) => !cookedSet.has(r.recipeId));
  if (remaining.length === 0) return { ...empty, recipes: [] };

  const rows = (await (prisma as any).recipe.findMany({
    where: { id: { in: remaining.map((r) => r.recipeId) } },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      cuisine: true,
      cookTime: true,
    },
  })) as RecipeRow[];

  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const out: CookedNextRecipe[] = [];
  for (const r of remaining) {
    const row = byId.get(r.recipeId);
    if (!row) continue; // stale cohort id — recipe was deleted
    if (findVoiceViolation(row.title) != null) continue; // banned-vocab guard
    out.push({
      id: row.id,
      title: row.title,
      imageUrl: row.imageUrl,
      cuisine: row.cuisine,
      cookTime: row.cookTime,
      cookCount: r.cookCount,
    });
  }

  return {
    ...empty,
    recipes: out.slice(0, k),
  };
}

export const __INTERNALS = { DEFAULT_K, MAX_K } as const;
