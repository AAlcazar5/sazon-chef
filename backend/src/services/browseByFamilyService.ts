// backend/src/services/browseByFamilyService.ts
//
// Group 11 Phase 5 — "Browse by Region" personalized family ranking.
//
// Returns CUISINE_FAMILIES annotated with this user's affinity, ordered so
// the most-cooked family is first, unexplored-but-adjacent families next,
// never-touched families last. The "New for you" badge surfaces when a
// family has at least one unexplored cuisine adjacent to a cuisine the
// user has already cooked or saved.
//
// Naturally pairs with the /api/recipes/new-to-you feed: that surface
// recommends recipes one cuisine at a time; this surface lets the user
// drill into a whole family.

import { prisma } from '../lib/prisma';
import {
  CUISINE_FAMILIES,
  getAdjacentCuisines,
} from '../utils/cuisineAdjacency';

const COOK_WEIGHT = 2;
const SAVE_WEIGHT = 1;

export interface FamilyEntry {
  family: string;
  cuisines: string[];
  /** Sum of (cooks*2 + saves) across cuisines in this family. */
  affinityScore: number;
  /** Cuisines from this family the user has actually cooked or saved. */
  exploredCuisines: string[];
  /** True if the user has any cooks/saves from this family. */
  isExplored: boolean;
  /**
   * True if the family contains at least one unexplored cuisine that is
   * adjacent to one of the user's affinity cuisines. Drives the "New for
   * you" badge in the UI.
   */
  hasNewForYou: boolean;
}

/**
 * Build the personalized family ranking. Order:
 *   1. Highest-affinity families first (descending affinity score)
 *   2. Within zero-affinity families: those flagged "New for you" first
 *   3. Then alphabetical for stability
 */
export async function buildBrowseByFamily(userId: string): Promise<FamilyEntry[]> {
  const [cookLogs, saves] = await Promise.all([
    prisma.cookingLog.findMany({
      where: { userId },
      select: { recipe: { select: { cuisine: true } } },
      take: 200,
    }),
    prisma.savedRecipe.findMany({
      where: { userId },
      select: { recipe: { select: { cuisine: true } } },
      take: 200,
    }),
  ]);

  const affinity = new Map<string, number>();
  for (const log of cookLogs) {
    const c = log?.recipe?.cuisine;
    if (!c) continue;
    affinity.set(c, (affinity.get(c) ?? 0) + COOK_WEIGHT);
  }
  for (const save of saves) {
    const c = save?.recipe?.cuisine;
    if (!c) continue;
    affinity.set(c, (affinity.get(c) ?? 0) + SAVE_WEIGHT);
  }

  // Adjacency closure: every cuisine adjacent to any affinity cuisine.
  const adjacentToAffinity = new Set<string>();
  for (const cuisine of affinity.keys()) {
    for (const edge of getAdjacentCuisines(cuisine)) {
      adjacentToAffinity.add(edge.cuisine);
    }
  }

  const entries: FamilyEntry[] = [];
  for (const [family, cuisines] of Object.entries(CUISINE_FAMILIES)) {
    let affinityScore = 0;
    const explored: string[] = [];
    let hasNewForYou = false;

    for (const c of cuisines) {
      const score = affinity.get(c) ?? 0;
      if (score > 0) {
        affinityScore += score;
        explored.push(c);
      } else if (adjacentToAffinity.has(c)) {
        hasNewForYou = true;
      }
    }

    entries.push({
      family,
      cuisines,
      affinityScore,
      exploredCuisines: explored,
      isExplored: explored.length > 0,
      hasNewForYou,
    });
  }

  return entries.sort((a, b) => {
    if (a.affinityScore !== b.affinityScore) return b.affinityScore - a.affinityScore;
    if (a.hasNewForYou !== b.hasNewForYou) return a.hasNewForYou ? -1 : 1;
    return a.family.localeCompare(b.family);
  });
}
