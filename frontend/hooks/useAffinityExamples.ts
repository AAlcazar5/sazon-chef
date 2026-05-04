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

import { useEffect, useState } from 'react';
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

/**
 * Pull personalized cuisine examples for empty-state copy.
 *
 * Implementation reuses the /browse-by-family endpoint rather than adding
 * a dedicated affinity-only endpoint — that surface already returns the
 * same affinity calculation along with adjacency flags.
 */
export function useAffinityExamples(): AffinityExamples {
  const [topCuisines, setTopCuisines] = useState<string[]>([]);
  const [wildcard, setWildcard] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await recipeApi.getBrowseByFamily();
        const families = ((res?.data?.families ?? res?.families) as FamilyEntry[]) ?? [];

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

        if (!cancelled) {
          setTopCuisines(cooked);
          setWildcard(pickedWildcard);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { topCuisines, wildcard, loading };
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
