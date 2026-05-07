// ROADMAP 4.0 WK4.2 — Pre-generation boring-week guard.
//
// During week-plan generation, if the candidate plan would trip
// BoringWeekNudge thresholds, the generator self-corrects BEFORE
// returning — swaps one slot for a cuisine-adjacent variant and
// re-checks. Caps at MAX_CORRECTIONS (default 3) to avoid infinite
// loops.
//
// Algorithm:
//   1. Check `isBoring(plan)`. If false → done.
//   2. Identify the over-represented cuisine (caller decides; e.g.,
//      cuisine appearing in ≥ 5 of 7 days → over-rep).
//   3. Find the slot whose pick belongs to that cuisine + has the
//      *highest-score adjacent-cuisine alternative* in its candidate
//      set. Swap. Caller logs the rationale via mealPlanEvent.
//   4. Repeat steps 1–3 until not boring OR MAX_CORRECTIONS reached
//      OR no swap available.
//
// Pure function — no DB / no mutation. Caller writes the log entries.

import type { CandidateForDay } from './cuisineRotationConstraint';

const MAX_CORRECTIONS = 3;

export interface BoringWeekCheckResult {
  boring: boolean;
  /** When boring=true, the cuisine that's over-represented. */
  overRepresentedCuisine?: string;
}

export interface CorrectionRecord {
  dayIdx: number;
  fromRecipeId: string;
  toRecipeId: string;
  fromCuisine: string;
  toCuisine: string;
  /** Lifestyle-voice rationale ("Swapped Tuesday's pasta for Moroccan stew — same family, different vibe.") */
  rationale: string;
}

export interface SelectedDayLite {
  recipeId: string;
  cuisine: string;
  score: number;
}

export interface SelfCorrectInput {
  selections: SelectedDayLite[];
  candidatesByDay: CandidateForDay[][];
  /** Caller's boring-week predicate. */
  isBoring: (selections: SelectedDayLite[]) => BoringWeekCheckResult;
  /** Caller's adjacency lookup (Tier C cuisineAdjacency). */
  getAdjacent: (cuisine: string) => string[];
  /** Optional cap override (default 3). */
  maxCorrections?: number;
}

export type TerminationReason =
  | 'not-boring'
  | 'max-corrections'
  | 'no-swap-available';

export interface SelfCorrectResult {
  selections: SelectedDayLite[];
  corrections: CorrectionRecord[];
  terminatedReason: TerminationReason;
  iterationsRun: number;
}

interface SwapCandidate {
  dayIdx: number;
  replacement: CandidateForDay;
}

function findBestAdjacencySwap(
  selections: SelectedDayLite[],
  candidatesByDay: CandidateForDay[][],
  overRepCuisine: string,
  getAdjacent: (cuisine: string) => string[],
): SwapCandidate | null {
  const adjacencySet = new Set(getAdjacent(overRepCuisine));
  if (adjacencySet.size === 0) return null;

  let best: SwapCandidate | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < selections.length; i++) {
    const sel = selections[i];
    if (sel.cuisine !== overRepCuisine) continue;
    const cands = candidatesByDay[i] ?? [];
    for (const c of cands) {
      if (c.cuisine === overRepCuisine) continue;
      if (!adjacencySet.has(c.cuisine)) continue;
      // Don't violate consecutive-cuisine constraint by re-introducing one.
      const prev = i > 0 ? selections[i - 1].cuisine : null;
      const next = i + 1 < selections.length ? selections[i + 1].cuisine : null;
      if (c.cuisine === prev || c.cuisine === next) continue;
      if (c.score > bestScore) {
        bestScore = c.score;
        best = { dayIdx: i, replacement: c };
      }
    }
  }
  return best;
}

function buildRationale(
  fromCuisine: string,
  toCuisine: string,
): string {
  return `Swapped ${fromCuisine} for ${toCuisine} — adjacent cuisine, same vibe, different flavor lane.`;
}

export function selfCorrectBoringWeek(input: SelfCorrectInput): SelfCorrectResult {
  const cap = input.maxCorrections ?? MAX_CORRECTIONS;
  let working: SelectedDayLite[] = input.selections.map((s) => ({ ...s }));
  const corrections: CorrectionRecord[] = [];
  let iterations = 0;

  while (iterations < cap) {
    const check = input.isBoring(working);
    if (!check.boring) {
      return {
        selections: working,
        corrections,
        terminatedReason: 'not-boring',
        iterationsRun: iterations,
      };
    }
    if (!check.overRepresentedCuisine) {
      return {
        selections: working,
        corrections,
        terminatedReason: 'no-swap-available',
        iterationsRun: iterations,
      };
    }

    const swap = findBestAdjacencySwap(
      working,
      input.candidatesByDay,
      check.overRepresentedCuisine,
      input.getAdjacent,
    );
    if (!swap) {
      return {
        selections: working,
        corrections,
        terminatedReason: 'no-swap-available',
        iterationsRun: iterations,
      };
    }

    const old = working[swap.dayIdx];
    const updated = [...working];
    updated[swap.dayIdx] = {
      recipeId: swap.replacement.recipeId,
      cuisine: swap.replacement.cuisine,
      score: swap.replacement.score,
    };
    corrections.push({
      dayIdx: swap.dayIdx,
      fromRecipeId: old.recipeId,
      toRecipeId: swap.replacement.recipeId,
      fromCuisine: old.cuisine,
      toCuisine: swap.replacement.cuisine,
      rationale: buildRationale(old.cuisine, swap.replacement.cuisine),
    });
    working = updated;
    iterations += 1;
  }

  // Reached cap; final boring check stamps the termination reason.
  const final = input.isBoring(working);
  return {
    selections: working,
    corrections,
    terminatedReason: final.boring ? 'max-corrections' : 'not-boring',
    iterationsRun: iterations,
  };
}

export const __INTERNALS = {
  MAX_CORRECTIONS,
};
