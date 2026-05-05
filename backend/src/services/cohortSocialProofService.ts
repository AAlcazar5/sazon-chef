// backend/src/services/cohortSocialProofService.ts
// ROADMAP 4.0 F9 — Cohort social proof.
//
// "Persian is trending in your taste cluster" — surfaces the top 1–2 cuisines
// that users similar to the target user have been viewing/cooking lately.
//
// V1 implementation cuts a few corners on purpose:
//   - "Cluster" is the full active user base. The B2 cohort-distance service
//     already exists; gating membership on Jaccard similarity is a v2
//     refinement. The v1 line is still informative because trending-among-
//     users-who-cook-real-food beats generic "trending" any day.
//   - We exclude cuisines the target user has cooked in the last 30 days from
//     the result — they don't need a nudge for a cuisine they're already on.
//
// The output is intentionally permissive: returns null when there isn't
// enough signal (small cohort, no clear leader). The Today card hides
// silently in that case.

import { prisma } from '../lib/prisma';

const LOOKBACK_DAYS = 7;
const MIN_VIEWS_FOR_TRENDING = 5;
const PERSONAL_RECENT_COOK_LOOKBACK_DAYS = 30;

export interface CohortSocialProof {
  /** Lowercase cuisine name. */
  cuisine: string;
  /** Number of distinct users that viewed/cooked this cuisine in the window. */
  uniqueUsers: number;
  /** Lifestyle-voiced one-liner. */
  copy: string;
}

interface ComputeInput {
  userId: string;
  /** Defaults to `new Date()`. */
  asOfDate?: Date;
}

/**
 * Compute the top trending cuisine in the cohort, excluding ones the target
 * user has cooked recently. Returns null when no cuisine clears the
 * MIN_VIEWS_FOR_TRENDING threshold or every leader is already on the user's
 * recent-cooks list.
 */
export async function computeCohortSocialProof(
  input: ComputeInput,
): Promise<CohortSocialProof | null> {
  const asOf = input.asOfDate ?? new Date();
  const lookbackStart = new Date(asOf.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const personalStart = new Date(
    asOf.getTime() - PERSONAL_RECENT_COOK_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );

  // Recent cooks for the target user — to exclude.
  const recentCooks = (await (prisma as any).cookingLog.findMany({
    where: { userId: input.userId, cookedAt: { gte: personalStart } },
    include: { recipe: { select: { cuisine: true } } },
  })) as Array<{ recipe: { cuisine: string | null } }>;
  const recentCuisinesSet = new Set(
    recentCooks
      .map((c) => (c.recipe?.cuisine ?? '').trim().toLowerCase())
      .filter(Boolean),
  );

  // Cohort views in the lookback window. Joining recipe to get cuisine.
  const views = (await (prisma as any).recipeView.findMany({
    where: { viewedAt: { gte: lookbackStart } },
    include: { recipe: { select: { cuisine: true } } },
  })) as Array<{ userId: string; recipe: { cuisine: string | null } }>;

  // Tally uniqueUsers per cuisine.
  const usersByCuisine = new Map<string, Set<string>>();
  for (const v of views) {
    const cuisine = (v.recipe?.cuisine ?? '').trim().toLowerCase();
    if (!cuisine) continue;
    if (recentCuisinesSet.has(cuisine)) continue;
    if (!usersByCuisine.has(cuisine)) usersByCuisine.set(cuisine, new Set());
    usersByCuisine.get(cuisine)!.add(v.userId);
  }

  // Pick the leader.
  let leader: { cuisine: string; uniqueUsers: number } | null = null;
  for (const [cuisine, users] of usersByCuisine.entries()) {
    if (users.size < MIN_VIEWS_FOR_TRENDING) continue;
    if (!leader || users.size > leader.uniqueUsers) {
      leader = { cuisine, uniqueUsers: users.size };
    }
  }
  if (!leader) return null;

  return {
    cuisine: leader.cuisine,
    uniqueUsers: leader.uniqueUsers,
    copy: buildCopy(leader.cuisine),
  };
}

/** Lifestyle voice. Capitalize the cuisine for display. */
function buildCopy(cuisine: string): string {
  const capitalized = cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
  return `${capitalized} is trending in your taste cluster.`;
}

// Exported for tests.
export const SOCIAL_PROOF_CONSTANTS = {
  LOOKBACK_DAYS,
  MIN_VIEWS_FOR_TRENDING,
  PERSONAL_RECENT_COOK_LOOKBACK_DAYS,
} as const;
