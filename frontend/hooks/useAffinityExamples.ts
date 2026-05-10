// frontend/hooks/useAffinityExamples.ts
//
// Group 11 Phase 5 — N=1 empty-state polish.
//
// Returns example cuisines pulled from THIS user's affinity vector — top
// 3 most-cooked cuisines + 1 adjacency wildcard. Day-1 user gets their
// onboarding picks; year-1 user gets their loved cuisines + a fresh
// adjacent suggestion they haven't tried. Never a hardcoded sampler.
//
// Empty states across cookbook / meal plan / shopping list consume this
// hook to render copy like "Try Salvadorean pupusas or Vietnamese pho —
// both fit your taste" instead of "save your favorite recipes!"
//
// P5: migrated to React Query so the three empty-state surfaces share one
// browse-by-family fetch.

import { useQuery } from '@tanstack/react-query';
import { recipeApi } from '../lib/api';

export interface AffinityExamples {
  /** Top affinity cuisines (cooked + saved + onboarding fallback). */
  topCuisines: string[];
  /** A single adjacent-but-unexplored cuisine — the "wildcard". */
  wildcard: string | null;
  /** True when the data is still loading. */
  loading: boolean;
}

interface FamilyEntry {
  family: string;
  cuisines: string[];
  affinityScore: number;
  exploredCuisines: string[];
  isExplored: boolean;
  hasNewForYou: boolean;
}

interface ExamplesShape {
  topCuisines: string[];
  wildcard: string | null;
}

const EMPTY: ExamplesShape = { topCuisines: [], wildcard: null };
const QUERY_KEY = ['affinityExamples'] as const;

function deriveExamples(families: FamilyEntry[]): ExamplesShape {
  // Top cuisines: most-cooked from highest-affinity families, in
  // descending family-affinity order. We pull from exploredCuisines
  // since those are the cuisines this user has actually touched.
  const cooked: string[] = [];
  for (const fam of families) {
    if (fam.affinityScore <= 0) break; // families are sorted by affinity desc
    for (const c of fam.exploredCuisines) {
      if (!cooked.includes(c)) cooked.push(c);
      if (cooked.length >= 3) break;
    }
    if (cooked.length >= 3) break;
  }

  // Wildcard: first cuisine in the first hasNewForYou family that
  // isn't already in topCuisines.
  let pickedWildcard: string | null = null;
  for (const fam of families) {
    if (!fam.hasNewForYou) continue;
    for (const c of fam.cuisines) {
      if (cooked.includes(c)) continue;
      if (fam.exploredCuisines.includes(c)) continue;
      pickedWildcard = c;
      break;
    }
    if (pickedWildcard) break;
  }

  return { topCuisines: cooked, wildcard: pickedWildcard };
}

/**
 * Pull personalized cuisine examples for empty-state copy.
 *
 * Implementation reuses the /browse-by-family endpoint rather than adding
 * a dedicated affinity-only endpoint — that surface already returns the
 * same affinity calculation along with adjacency flags.
 */
export function useAffinityExamples(): AffinityExamples {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ExamplesShape> => {
      try {
        const res = await recipeApi.getBrowseByFamily();
        const data = res as unknown as {
          data?: { families?: FamilyEntry[] };
          families?: FamilyEntry[];
        };
        const families = (data?.data?.families ?? data?.families ?? []) as FamilyEntry[];
        return deriveExamples(families);
      } catch {
        return EMPTY;
      }
    },
  });

  const data = query.data ?? EMPTY;
  return {
    topCuisines: data.topCuisines,
    wildcard: data.wildcard,
    loading: query.isLoading,
  };
}

/**
 * Format a list of example cuisines as inline copy for an empty state.
 * Returns empty string when no signal is available, so the caller can
 * fall through to a static fallback description without conditional UI.
 */
export function formatAffinityHint(examples: AffinityExamples): string {
  const { topCuisines, wildcard } = examples;
  const items = [...topCuisines.slice(0, 2)];
  if (wildcard) items.push(wildcard);
  if (items.length === 0) return '';
  if (items.length === 1) return `Start with ${items[0]}.`;
  if (items.length === 2) return `Try ${items[0]} or ${items[1]}.`;
  return `Try ${items[0]}, ${items[1]}, or ${items[2]}.`;
}
