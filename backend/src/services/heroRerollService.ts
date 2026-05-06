// backend/src/services/heroRerollService.ts
// ROADMAP 4.0 HX2.1 — hero re-roll picks the next-ranked candidate.
//
// Up to MAX_REROLLS calls per (userId, day) — beyond that the caller is
// expected to fall through to SurpriseMeModal. Each call walks one position
// down the same retrieval rank (positions 2 / 3 / 4) so the user always
// sees a meaningfully-different recipe without a re-fetch round-trip.

import { resolveRetrievalCandidates } from './recommender/homeFeedRetrievalAdapter';
import { prisma } from '../lib/prisma';

export const MAX_REROLLS = 3;

export interface HeroRerollArgs {
  userId: string;
  /** 1-indexed rank to fetch. 1 = the original hero pick (skipped here),
   *  so callers usually pass 2..MAX_REROLLS+1. */
  rank: number;
}

export interface HeroRerollResult {
  rank: number;
  recipe: {
    id: string;
    title: string;
    imageUrl: string | null;
    cuisine: string | null;
    cookTime: number | null;
  } | null;
  /** True when the requested rank exceeds MAX_REROLLS (caller falls
   *  through to SurpriseMeModal). */
  exhausted: boolean;
}

export async function getHeroReroll(
  args: HeroRerollArgs,
): Promise<HeroRerollResult> {
  if (args.rank > MAX_REROLLS + 1) {
    return { rank: args.rank, recipe: null, exhausted: true };
  }
  // 1-indexed → 0-indexed slice; we always need at least `rank` candidates.
  const k = Math.max(args.rank, 5);
  const retrieval = await resolveRetrievalCandidates({ userId: args.userId, k });
  if (!retrieval || retrieval.recipeIds.length < args.rank) {
    return { rank: args.rank, recipe: null, exhausted: false };
  }
  const id = retrieval.recipeIds[args.rank - 1];
  const recipe = (await prisma.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      cuisine: true,
      cookTime: true,
    } as any,
  } as any)) as HeroRerollResult['recipe'];
  return { rank: args.rank, recipe, exhausted: false };
}
