// backend/src/services/newToYouFeedService.ts
//
// Group 11 Phase 5 — "New to you" personalized adjacency feed.
//
// Cold start: seed from onboarding likedCuisines → top adjacencies.
// Warm start: rank from cookingLog + savedRecipe affinity → top adjacencies.
// Always excludes cuisines the user has already explored — the whole point
// is exposure to adjacent UNexplored cuisines.
//
// Future: write impression + tap signals back into adjacency weights, family
// balance (one per family before doubling up), pantry coverage rerank.

import { prisma } from '../lib/prisma';
import { getAdjacentCuisines } from '../utils/cuisineAdjacency';

const COOK_WEIGHT = 2;
const SAVE_WEIGHT = 1;
const TOP_AFFINITY_SOURCES = 3;

export interface NewToYouRecipe {
  id: string;
  title: string;
  cuisine: string | null;
  personalizationReason: string;
  sourceCuisine: string;
  [key: string]: unknown;
}

export interface NewToYouFeed {
  recipes: NewToYouRecipe[];
  isColdStart: boolean;
  sourceCuisines: string[];
  adjacentCuisines: string[];
}

export interface BuildNewToYouFeedOptions {
  limit?: number;
}

/**
 * Build the "New to you" personalized adjacency feed.
 *
 * - Reads cookingLog + savedRecipe to compute the user's cuisine affinity.
 * - If empty, falls back to onboarding-time likedCuisines (cold start).
 * - For each top-affinity cuisine, fetches adjacent cuisines and surfaces
 *   recipes from those — never from cuisines the user has already explored.
 */
export async function buildNewToYouFeed(
  userId: string,
  opts: BuildNewToYouFeedOptions = {},
): Promise<NewToYouFeed> {
  const limit = Math.max(1, Math.min(50, opts.limit ?? 8));

  // 1. Build affinity map from cooking + saves.
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
  const exploredCuisines = new Set<string>();

  for (const log of cookLogs) {
    const cuisine = log?.recipe?.cuisine;
    if (!cuisine) continue;
    exploredCuisines.add(cuisine);
    affinity.set(cuisine, (affinity.get(cuisine) ?? 0) + COOK_WEIGHT);
  }
  for (const save of saves) {
    const cuisine = save?.recipe?.cuisine;
    if (!cuisine) continue;
    exploredCuisines.add(cuisine);
    affinity.set(cuisine, (affinity.get(cuisine) ?? 0) + SAVE_WEIGHT);
  }

  // 2. Determine cold vs warm start.
  let sourceCuisines: string[] = [];
  let isColdStart = false;

  if (affinity.size > 0) {
    sourceCuisines = [...affinity.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_AFFINITY_SOURCES)
      .map(([cuisine]) => cuisine);
  } else {
    isColdStart = true;
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
      include: { likedCuisines: true },
    });
    const onboardingCuisines = (prefs?.likedCuisines ?? [])
      .map((c) => c.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);
    sourceCuisines = onboardingCuisines.slice(0, TOP_AFFINITY_SOURCES);
    // Cold-start sources count as "known but not yet cooked" — exclude from
    // surfaced cuisines so we don't recommend something the user JUST said
    // they like (offer adjacencies instead).
    for (const c of sourceCuisines) exploredCuisines.add(c);
  }

  if (sourceCuisines.length === 0) {
    return {
      recipes: [],
      isColdStart: true,
      sourceCuisines: [],
      adjacentCuisines: [],
    };
  }

  // 3. Build the adjacent-cuisine ranking. Each adjacent cuisine remembers
  //    its strongest source so we can attribute the personalization reason.
  type AdjEntry = { cuisine: string; weight: number; sourceCuisine: string };
  const adjacentMap = new Map<string, AdjEntry>();
  for (const source of sourceCuisines) {
    for (const edge of getAdjacentCuisines(source)) {
      if (exploredCuisines.has(edge.cuisine)) continue;
      const existing = adjacentMap.get(edge.cuisine);
      if (!existing || edge.weight > existing.weight) {
        adjacentMap.set(edge.cuisine, {
          cuisine: edge.cuisine,
          weight: edge.weight,
          sourceCuisine: source,
        });
      }
    }
  }

  if (adjacentMap.size === 0) {
    return {
      recipes: [],
      isColdStart,
      sourceCuisines,
      adjacentCuisines: [],
    };
  }

  const adjacentRanked = [...adjacentMap.values()].sort((a, b) => b.weight - a.weight);
  const targetCuisines = adjacentRanked.map((a) => a.cuisine);

  // 4. Fetch system recipes from the target cuisines. Over-fetch a bit so we
  //    can spread surfaces across multiple cuisines rather than collapsing
  //    onto whichever cuisine has the most rows in the DB.
  const fetched = await prisma.recipe.findMany({
    where: {
      cuisine: { in: targetCuisines },
      isUserCreated: false,
    },
    take: limit * 3,
  }) as unknown as Array<Record<string, unknown> & { id: string; title: string; cuisine: string | null }>;

  // 5. Round-robin across adjacent cuisines so the surface is varied.
  const byCuisine = new Map<string, typeof fetched>();
  for (const r of fetched) {
    if (!r.cuisine) continue;
    if (!byCuisine.has(r.cuisine)) byCuisine.set(r.cuisine, []);
    byCuisine.get(r.cuisine)!.push(r);
  }

  const result: NewToYouRecipe[] = [];
  let cursor = 0;
  while (result.length < limit) {
    let progress = false;
    for (const adj of adjacentRanked) {
      if (result.length >= limit) break;
      const bucket = byCuisine.get(adj.cuisine);
      if (!bucket || bucket.length === 0) continue;
      const r = bucket.shift()!;
      result.push({
        ...r,
        cuisine: r.cuisine ?? null,
        personalizationReason: buildReason(adj.sourceCuisine, isColdStart),
        sourceCuisine: adj.sourceCuisine,
      });
      progress = true;
    }
    cursor += 1;
    if (!progress) break;
    if (cursor > limit + 10) break; // hard safety
  }

  return {
    recipes: result,
    isColdStart,
    sourceCuisines,
    adjacentCuisines: adjacentRanked.map((a) => a.cuisine),
  };
}

function buildReason(sourceCuisine: string, isColdStart: boolean): string {
  return isColdStart
    ? `From your onboarding picks — adjacent to ${sourceCuisine}`
    : `Because you cooked ${sourceCuisine}`;
}
