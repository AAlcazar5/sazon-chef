// backend/src/services/firstCookStatsService.ts
// ROADMAP 4.0 Tier J2 — First-cook-of-cuisine stats.
//
// Lightweight helper combining `isFirstCookOfCuisine` with the user's running
// total of distinct cuisines cooked. Powers the post-cook passport-stamp
// celebration.

import { prisma } from '../lib/prisma';
import { isFirstCookOfCuisine } from './culturalPrimerService';

export interface FirstCookStatsInput {
  userId: string;
  cuisine: string;
  asOfDate: Date;
  /** Total cuisines available in the catalog. Defaults to 134 (Tier D scope). */
  totalCuisinesAvailable?: number;
}

export interface FirstCookStats {
  isFirstCook: boolean;
  cuisinesCookedCount: number;
  totalCuisinesAvailable: number;
}

const DEFAULT_TOTAL_CUISINES = 134;

export async function computeFirstCookStats(
  input: FirstCookStatsInput,
): Promise<FirstCookStats> {
  if (!input.userId) throw new Error('userId required');
  const cuisine = (input.cuisine ?? '').trim();
  const total = input.totalCuisinesAvailable ?? DEFAULT_TOTAL_CUISINES;

  if (!cuisine) {
    return {
      isFirstCook: false,
      cuisinesCookedCount: await countDistinctCuisinesCooked(input.userId, input.asOfDate),
      totalCuisinesAvailable: total,
    };
  }

  const [isFirstCook, cuisinesCookedCount] = await Promise.all([
    isFirstCookOfCuisine({ userId: input.userId, cuisine, asOfDate: input.asOfDate }),
    countDistinctCuisinesCooked(input.userId, input.asOfDate),
  ]);

  return {
    isFirstCook,
    cuisinesCookedCount,
    totalCuisinesAvailable: total,
  };
}

async function countDistinctCuisinesCooked(
  userId: string,
  asOfDate: Date,
): Promise<number> {
  const rows = (await (prisma as any).cookingLog.findMany({
    where: { userId, cookedAt: { lte: asOfDate } },
    select: { recipe: { select: { cuisine: true } } },
  })) as Array<{ recipe: { cuisine: string | null } | null }>;
  const cuisines = new Set<string>();
  for (const row of rows) {
    const c = row?.recipe?.cuisine?.trim?.();
    if (c) cuisines.add(c.toLowerCase());
  }
  return cuisines.size;
}
