// ROADMAP 4.0 TB1.3 — Home-feed retrieval adapter.
//
// Thin adapter that the recipe controller calls before its own
// candidate-selection step. Returns a recipe-id whitelist (the top-K
// ids by cosine similarity to the user's context vector) which the
// controller passes as `where.id IN (...)`. The existing 70/30 scorer
// still reranks the survivors.
//
// Returns null whenever retrieval is disabled, cold-start, or errors —
// caller falls back to the rule-based path. The flag is environment-
// driven (`RECOMMENDER_RETRIEVAL=1`) so it's reversible without a
// deploy.

import { buildContextVector } from './contextVector';
import {
  retrieveCandidates,
  HardFilters,
} from './retrieveCandidates';

export interface AdapterArgs {
  userId: string;
  enabled?: boolean;
  k?: number;
  hardFilters?: HardFilters;
  asOf?: Date;
}

export interface AdapterResult {
  recipeIds: string[];
  scores: number[];
}

const DEFAULT_FILTERS: HardFilters = {
  allergens: [],
  dietaryTags: [],
  maxCookTime: null,
  pantryItems: [],
  minPantryCoverage: 0,
};

export function isRetrievalEnabled(): boolean {
  return process.env.RECOMMENDER_RETRIEVAL === '1';
}

export async function resolveRetrievalCandidates(
  args: AdapterArgs,
): Promise<AdapterResult | null> {
  const enabled = args.enabled ?? isRetrievalEnabled();
  if (!enabled) return null;

  try {
    const context = await buildContextVector({
      userId: args.userId,
      asOf: args.asOf ?? new Date(),
    });
    if (!context.vector) return null;

    const result = await retrieveCandidates({
      userId: args.userId,
      contextVector: context.vector,
      hardFilters: args.hardFilters ?? DEFAULT_FILTERS,
      k: args.k ?? 50,
    });

    if (result.recipeIds.length === 0) return null;
    return {
      recipeIds: result.recipeIds,
      scores: result.scores,
    };
  } catch {
    return null;
  }
}
