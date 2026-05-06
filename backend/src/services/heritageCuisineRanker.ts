// backend/src/services/heritageCuisineRanker.ts
// ROADMAP 4.0 Tier J18.2 — Heritage-cuisine ranker.
//
// Returns a per-candidate boost score for the recommendation engine. The
// thesis: when a user has cooked Mexican ≥3 times in the last 30 days OR
// has Mexican explicitly flagged in onboarding (`UserPreferences.likedCuisines`
// is the proxy until an explicit `heritageCuisines` column exists), we
// deepen WITHIN that cuisine — surfacing more Mexican variants, regional
// Mexican, and lighter-technique Mexican siblings — instead of throwing
// the user toward cross-cuisine swaps.
//
// Cold start (no cook history + no flag) returns zero boosts — the
// engine's standard ranking is the fallback.

import { prisma } from '../lib/prisma';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HERITAGE_WINDOW_DAYS = 30;
const COOK_THRESHOLD = 3;
const HERITAGE_BOOST = 0.18;
const LIGHTER_VARIANT_BONUS = 0.07;

export interface HeritageCandidate {
  recipeId: string;
  cuisine: string;
  /** True when the candidate is tagged `lighter` in `RecipeVariant`. */
  isLighterVariant?: boolean;
}

export interface HeritageBoostInput {
  userId: string;
  asOfDate: Date;
  candidates: HeritageCandidate[];
}

export interface HeritageBoostEntry {
  recipeId: string;
  /** Additive boost (0 when cuisine is not a user heritage). */
  boost: number;
}

interface CookingLogRow {
  recipe: { cuisine: string | null } | null;
  cookedAt: Date;
}

interface UserPrefs {
  likedCuisines: Array<{ name: string }>;
}

export async function getHeritageBoost(
  input: HeritageBoostInput,
): Promise<HeritageBoostEntry[]> {
  if (!input.userId) {
    return input.candidates.map((c) => ({ recipeId: c.recipeId, boost: 0 }));
  }

  const asOfDate = input.asOfDate ?? new Date();
  const windowStart = new Date(asOfDate.getTime() - HERITAGE_WINDOW_DAYS * MS_PER_DAY);

  const [cookRows, prefs] = await Promise.all([
    (prisma as unknown as {
      cookingLog: {
        findMany: (args: unknown) => Promise<CookingLogRow[]>;
      };
    }).cookingLog.findMany({
      where: {
        userId: input.userId,
        cookedAt: { gte: windowStart, lt: asOfDate },
      },
      select: {
        recipe: { select: { cuisine: true } },
        cookedAt: true,
      },
    }),
    (prisma as unknown as {
      userPreferences: {
        findUnique: (args: unknown) => Promise<UserPrefs | null>;
      };
    }).userPreferences.findUnique({
      where: { userId: input.userId },
      include: { likedCuisines: true },
    }),
  ]);

  const cookCounts = new Map<string, number>();
  for (const row of cookRows) {
    const c = row?.recipe?.cuisine?.trim().toLowerCase();
    if (!c) continue;
    cookCounts.set(c, (cookCounts.get(c) ?? 0) + 1);
  }

  const heritageSet = new Set<string>();
  for (const [cuisine, count] of cookCounts.entries()) {
    if (count >= COOK_THRESHOLD) heritageSet.add(cuisine);
  }

  // Explicit onboarding flag — overrides the cook-history threshold.
  if (prefs?.likedCuisines) {
    for (const lc of prefs.likedCuisines) {
      const name = lc?.name?.trim().toLowerCase();
      if (name) heritageSet.add(name);
    }
  }

  return input.candidates.map((c) => {
    const candidateCuisine = c.cuisine?.trim().toLowerCase() ?? '';
    if (!candidateCuisine || !heritageSet.has(candidateCuisine)) {
      return { recipeId: c.recipeId, boost: 0 };
    }
    const lighterBonus = c.isLighterVariant ? LIGHTER_VARIANT_BONUS : 0;
    return {
      recipeId: c.recipeId,
      boost: HERITAGE_BOOST + lighterBonus,
    };
  });
}
