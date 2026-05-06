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
//
// FX3.1 — when the candidate count after filter intersection is below
// SOFT_FILTER_THRESHOLD, also return the unfiltered top-K so the caller can
// soft-rank. `softFilterMode` is true when the soft set is what should be
// shown.
// FX3.3 — when post-filter retrieval yields exactly zero candidates, log a
// recommenderEvent so over-filtered combos can be audited.

import { buildContextVector } from './contextVector';
import {
  retrieveCandidates,
  HardFilters,
} from './retrieveCandidates';
import { recordZeroResultFilter } from './recommenderEventService';

export interface AdapterArgs {
  userId: string;
  enabled?: boolean;
  k?: number;
  hardFilters?: HardFilters;
  asOf?: Date;
  /** FX3.1 — opaque filter set for soft-fallback / FX3.3 logging. */
  appliedFilters?: Record<string, unknown>;
}

export interface AdapterResult {
  recipeIds: string[];
  scores: number[];
  /** FX3.1 — true when soft-fallback kicked in (the recipeIds are the
   *  unfiltered top-K instead of the filter-intersected set). */
  softFilterMode?: boolean;
  /** FX3.1 — hint for the UI ("your filters narrowed results"). */
  narrowedBy?: string[];
}

const DEFAULT_FILTERS: HardFilters = {
  allergens: [],
  dietaryTags: [],
  maxCookTime: null,
  pantryItems: [],
  minPantryCoverage: 0,
};

export const SOFT_FILTER_THRESHOLD = 10;

export function isRetrievalEnabled(): boolean {
  return process.env.RECOMMENDER_RETRIEVAL === '1';
}

/** Active filter keys for the "narrowedBy" hint — keeps caller payload
 *  small and stable for the UI pill copy. */
function activeFilterKeys(filters: HardFilters | undefined): string[] {
  if (!filters) return [];
  const keys: string[] = [];
  if (filters.allergens?.length) keys.push('allergens');
  if (filters.dietaryTags?.length) keys.push('dietary');
  if (filters.maxCookTime != null) keys.push('cookTime');
  if (filters.minPantryCoverage > 0) keys.push('pantry');
  return keys;
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

    const hardFilters = args.hardFilters ?? DEFAULT_FILTERS;
    const k = args.k ?? 50;

    const filtered = await retrieveCandidates({
      userId: args.userId,
      contextVector: context.vector,
      hardFilters,
      k,
    });

    // FX3.1 / FX3.3 — empty or sparse filtered set: fall back to unfiltered
    // top-K so the user sees something. Empty sets also get logged.
    if (filtered.recipeIds.length === 0) {
      // FX3.3 — only log when filters were actually active; the cold-start /
      // no-filter zero-result is a different (content) problem.
      if (activeFilterKeys(hardFilters).length > 0) {
        await recordZeroResultFilter({
          userId: args.userId,
          asOf: args.asOf,
          filters: args.appliedFilters ?? {},
        });
      }
    }

    if (filtered.recipeIds.length >= SOFT_FILTER_THRESHOLD) {
      return {
        recipeIds: filtered.recipeIds,
        scores: filtered.scores,
        softFilterMode: false,
      };
    }

    // FX3.1 — sparse / empty: pull the unfiltered top-K from the same
    // context vector. Caller treats these as soft preferences.
    const unfiltered = await retrieveCandidates({
      userId: args.userId,
      contextVector: context.vector,
      hardFilters: DEFAULT_FILTERS,
      k,
    });
    if (unfiltered.recipeIds.length === 0) return null;

    return {
      recipeIds: unfiltered.recipeIds,
      scores: unfiltered.scores,
      softFilterMode: true,
      narrowedBy: activeFilterKeys(hardFilters),
    };
  } catch {
    return null;
  }
}
