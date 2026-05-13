// P4 retention — per-recipe cohort social proof.
//
// "3 people with your taste cooked this in the last week" — soft social
// signal that surfaces only when the count is real (≥3 distinct cookers).
// "People with your taste" is approximated as "users who share your top
// cuisine" — cheapest meaningful overlap signal without building a full
// embedding pipeline.
//
// Returns a null payload when the count is below threshold OR when the
// user has no cooking history to derive a top cuisine from. The frontend
// renders nothing in that case — quiet is correct.

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

const COHORT_WINDOW_DAYS = 7;
const MIN_VISIBLE_COUNT = 3;
const COOK_HISTORY_LOOKBACK_DAYS = 60;

export interface CohortProofPayload {
  /** Number of similar-taste users who cooked this recipe in the window. */
  cookerCount: number;
  /** The cuisine taste-overlap key used ("Persian"). null when no overlap. */
  cohortLabel: string | null;
}

const QUIET: CohortProofPayload = { cookerCount: 0, cohortLabel: null };

/**
 * Pure logic — exported for unit testing. Given the requesting user's top
 * cuisine + the set of distinct cookers (excluding the user), compute the
 * payload the frontend should render.
 */
export function pickCohortPayload(
  topCuisine: string | null,
  distinctCookerCount: number,
): CohortProofPayload {
  if (!topCuisine) return QUIET;
  if (distinctCookerCount < MIN_VISIBLE_COUNT) return QUIET;
  return { cookerCount: distinctCookerCount, cohortLabel: topCuisine };
}

/**
 * Compute the cohort-proof payload for a given user + recipe pair.
 */
export async function getRecipeCohortProof(
  userId: string,
  recipeId: string,
): Promise<CohortProofPayload> {
  try {
    // 1. Find the requesting user's top cuisine from their cook history.
    const sinceHistory = new Date(
      Date.now() - COOK_HISTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const logs = await prisma.cookingLog.findMany({
      where: { userId, cookedAt: { gte: sinceHistory } },
      select: { recipe: { select: { cuisine: true } } },
    });
    const counts = new Map<string, number>();
    for (const l of logs) {
      const c = l.recipe?.cuisine?.trim();
      if (!c) continue;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const topCuisine =
      Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    if (!topCuisine) return QUIET;

    // 2. Count distinct users who share that top cuisine (≥1 cook of it in
    //    the past 60 days) AND have cooked the target recipe in the past 7.
    const windowStart = new Date(
      Date.now() - COHORT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const recentCooks = await prisma.cookingLog.findMany({
      where: {
        recipeId,
        cookedAt: { gte: windowStart },
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    if (recentCooks.length === 0) return QUIET;

    const cookerIds = recentCooks.map((r) => r.userId);
    const sharedTasteCookers = await prisma.cookingLog.findMany({
      where: {
        userId: { in: cookerIds },
        cookedAt: { gte: sinceHistory },
        recipe: { cuisine: topCuisine },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return pickCohortPayload(topCuisine, sharedTasteCookers.length);
  } catch (error) {
    logger.warn({ err: error, userId, recipeId }, 'recipeCohortProof.failed');
    return QUIET;
  }
}

export const COHORT_PROOF_MIN_COUNT = MIN_VISIBLE_COUNT;
export const COHORT_PROOF_WINDOW_DAYS = COHORT_WINDOW_DAYS;
