// ROADMAP 4.0 WK4.1 — Cuisine rotation as a generator constraint.
//
// Reverses Tier J's flow: variety logic used to flag boring weeks AFTER
// generation. WK4 enforces the rotation BEFORE generation: candidates are
// pre-ranked per day; this function picks a recipe per day that satisfies
//   1. no two consecutive days share a canonical cuisine
//   2. the week visits ≥ minDistinctClusters across Tier-C `cuisineAdjacency`
// while still maximizing the per-day score.
//
// Algorithm: greedy with at-most-one fallback per day.
//   - Day 1: pick the top-scored candidate whose cuisine ≠ recent[-1].
//   - Day k (k > 1): pick the top-scored candidate whose cuisine ≠ day k-1.
//   - After greedy pass: if cluster count < minDistinctClusters, swap the
//     LOWEST-impact day (smallest score gap to its second-best from a
//     previously-unused cluster) until the threshold is met.
//   - If no candidate satisfies the per-day rule, fall back to the top-
//     scored candidate (better to ship a slightly-repeated week than no
//     week at all). The result still flags `consecutiveRepeats` so the
//     caller can decide whether to re-roll.
//
// Pure function — no DB, no mutation. Caller wires `clusterFor` from
// Tier C's adjacency map.

export interface CandidateForDay {
  recipeId: string;
  cuisine: string;
  score: number;
}

export interface SelectWeekRotationInput {
  /** Ranked-or-not candidates per day (will be sorted score-desc internally). */
  days: CandidateForDay[][];
  /** cuisine → cluster lookup (Tier C). Returns null when cuisine is unmapped. */
  clusterFor: (cuisine: string) => string | null;
  /** Cuisines from the user's recent cooks (last N days before this week). */
  recentCuisines?: string[];
  /** Minimum distinct clusters required across the generated week. */
  minDistinctClusters?: number;
}

export interface SelectedDay {
  recipeId: string;
  cuisine: string;
  cluster: string | null;
  score: number;
  /** True when this day's pick repeats the previous day's cuisine
   *  (greedy fallback was used because no alternative satisfied the rule). */
  consecutiveRepeat: boolean;
}

export interface SelectWeekRotationResult {
  selections: SelectedDay[];
  distinctClusters: number;
  /** True if any day fell back to a same-cuisine pick. */
  hasConsecutiveRepeat: boolean;
  /** True if `distinctClusters >= minDistinctClusters`. */
  meetsClusterFloor: boolean;
}

const DEFAULT_MIN_DISTINCT_CLUSTERS = 3;

function sortDescByScore(c: CandidateForDay[]): CandidateForDay[] {
  return [...c].sort((a, b) => b.score - a.score);
}

function pickForDay(
  candidates: CandidateForDay[],
  prevCuisine: string | null,
): { picked: CandidateForDay; repeat: boolean } | null {
  if (candidates.length === 0) return null;
  if (prevCuisine == null) {
    return { picked: candidates[0], repeat: false };
  }
  const nonRepeat = candidates.find((c) => c.cuisine !== prevCuisine);
  if (nonRepeat) return { picked: nonRepeat, repeat: false };
  // Fallback: keep top-score even though it repeats.
  return { picked: candidates[0], repeat: true };
}

export function selectWeekWithRotation(
  input: SelectWeekRotationInput,
): SelectWeekRotationResult {
  const minClusters = input.minDistinctClusters ?? DEFAULT_MIN_DISTINCT_CLUSTERS;
  const recent = input.recentCuisines ?? [];
  let prevCuisine: string | null = recent.length > 0 ? recent[recent.length - 1] : null;

  const sortedDays = input.days.map(sortDescByScore);
  const selections: SelectedDay[] = [];

  for (let i = 0; i < sortedDays.length; i++) {
    const result = pickForDay(sortedDays[i], prevCuisine);
    if (!result) continue;
    selections.push({
      recipeId: result.picked.recipeId,
      cuisine: result.picked.cuisine,
      cluster: input.clusterFor(result.picked.cuisine),
      score: result.picked.score,
      consecutiveRepeat: result.repeat,
    });
    prevCuisine = result.picked.cuisine;
  }

  // Cluster-floor enforcement: if we're below minClusters, try to swap days
  // whose top pick belongs to an already-used cluster with that day's
  // best alternative from an unused cluster. Order swaps by smallest score
  // delta — swap the cheapest-quality-loss day first.
  const usedClusters = new Set(selections.map((s) => s.cluster).filter((c): c is string => c != null));
  if (usedClusters.size < minClusters) {
    type SwapCandidate = {
      dayIdx: number;
      replacement: CandidateForDay;
      newCluster: string;
      delta: number; // score loss vs current pick
    };
    const swaps: SwapCandidate[] = [];
    for (let i = 0; i < sortedDays.length; i++) {
      const current = selections[i];
      if (!current) continue;
      const prev = i === 0 ? (recent.length > 0 ? recent[recent.length - 1] : null) : selections[i - 1].cuisine;
      const next = i + 1 < selections.length ? selections[i + 1].cuisine : null;
      for (const cand of sortedDays[i]) {
        const cluster = input.clusterFor(cand.cuisine);
        if (cluster == null) continue;
        if (usedClusters.has(cluster)) continue;
        if (cand.cuisine === prev) continue;
        if (cand.cuisine === next) continue;
        swaps.push({
          dayIdx: i,
          replacement: cand,
          newCluster: cluster,
          delta: current.score - cand.score,
        });
        break; // best (highest-score) replacement from each new-cluster path
      }
    }
    swaps.sort((a, b) => a.delta - b.delta);
    for (const s of swaps) {
      if (usedClusters.size >= minClusters) break;
      if (usedClusters.has(s.newCluster)) continue; // already added by an earlier swap
      const day = selections[s.dayIdx];
      const oldCluster = day.cluster;
      // Re-evaluate consecutive repeat on the replacement.
      const prev = s.dayIdx === 0 ? (recent.length > 0 ? recent[recent.length - 1] : null) : selections[s.dayIdx - 1].cuisine;
      selections[s.dayIdx] = {
        recipeId: s.replacement.recipeId,
        cuisine: s.replacement.cuisine,
        cluster: s.newCluster,
        score: s.replacement.score,
        consecutiveRepeat: prev != null && s.replacement.cuisine === prev,
      };
      usedClusters.add(s.newCluster);
      // If the old cluster is no longer used by any other day, drop it.
      if (oldCluster != null && !selections.some((x) => x.cluster === oldCluster)) {
        usedClusters.delete(oldCluster);
      }
    }
  }

  const distinct = new Set(selections.map((s) => s.cluster).filter((c): c is string => c != null)).size;
  const hasRepeat = selections.some((s) => s.consecutiveRepeat);
  return {
    selections,
    distinctClusters: distinct,
    hasConsecutiveRepeat: hasRepeat,
    meetsClusterFloor: distinct >= minClusters,
  };
}

export const __INTERNALS = {
  DEFAULT_MIN_DISTINCT_CLUSTERS,
};
