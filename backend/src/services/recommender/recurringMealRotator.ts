// ROADMAP 4.0 WK10.1 — Recurring slot rotation.
//
// Pure rotator that picks the next recipe for a recurring slot under one
// of three strategies:
//   - 'fixed'             → always the same recipe (legacy behavior)
//   - 'cuisine_variants'  → rotate within the same canonical cuisine
//                          ("Friday pizza" → Detroit → Neapolitan → Sicilian → NY)
//   - 'cluster'           → rotate within an adjacency cluster
//                          ("Friday Mediterranean" → pizza → fattoush → orzo bowl)
//
// Algorithm: pick the candidate that was used LEAST recently (oldest
// `lastUsedDate`, or unused candidates first). Ties broken by score
// descending. Caller supplies the candidate set; this service is the
// scheduler, not the recipe-discovery layer.
//
// Pure function — no DB, no mutation. Schema field
// `RecurringMeal.rotationStrategy` is a follow-up Prisma migration; this
// service operates entirely on caller-supplied input.

export type RotationStrategy = 'fixed' | 'cuisine_variants' | 'cluster';

export interface RotationCandidate {
  recipeId: string;
  cuisine: string;
  /** ISO date the candidate was last used in this slot (null = never). */
  lastUsedDate: string | null;
  /** Caller-supplied baseline score (T-bis ranker output). */
  score: number;
}

export interface PickRotationInput {
  strategy: RotationStrategy;
  /** When strategy === 'fixed', the recipe id to always return. */
  fixedRecipeId?: string;
  candidates: RotationCandidate[];
}

export interface PickRotationResult {
  recipeId: string | null;
  reason: 'fixed' | 'least-recently-used' | 'unused-candidate' | 'no-candidates';
}

function compareLastUsed(a: RotationCandidate, b: RotationCandidate): number {
  // Unused candidates first (treated as oldest possible).
  if (a.lastUsedDate == null && b.lastUsedDate == null) {
    // Both unused → score-desc.
    return b.score - a.score;
  }
  if (a.lastUsedDate == null) return -1;
  if (b.lastUsedDate == null) return 1;
  // Both used → oldest first; tie-break score-desc.
  const cmp = a.lastUsedDate.localeCompare(b.lastUsedDate);
  if (cmp !== 0) return cmp;
  return b.score - a.score;
}

export function pickRecurringRotation(
  input: PickRotationInput,
): PickRotationResult {
  if (input.strategy === 'fixed') {
    return {
      recipeId: input.fixedRecipeId ?? null,
      reason: 'fixed',
    };
  }
  if (input.candidates.length === 0) {
    return { recipeId: null, reason: 'no-candidates' };
  }
  const sorted = [...input.candidates].sort(compareLastUsed);
  const top = sorted[0];
  return {
    recipeId: top.recipeId,
    reason: top.lastUsedDate == null ? 'unused-candidate' : 'least-recently-used',
  };
}

/**
 * Helper for tests + caller harnesses: simulate N consecutive applications
 * of the rotator, updating lastUsedDate after each pick. Returns the
 * sequence of recipe ids picked.
 */
export interface SimulateRotationInput {
  strategy: RotationStrategy;
  fixedRecipeId?: string;
  candidates: RotationCandidate[];
  /** Number of consecutive picks to simulate. */
  iterations: number;
  /** Caller-controlled date sequence (ISO yyyy-mm-dd, length === iterations). */
  dateSequence: string[];
}

export function simulateRecurringRotation(
  input: SimulateRotationInput,
): string[] {
  const cands = input.candidates.map((c) => ({ ...c }));
  const out: string[] = [];
  for (let i = 0; i < input.iterations; i++) {
    const result = pickRecurringRotation({
      strategy: input.strategy,
      fixedRecipeId: input.fixedRecipeId,
      candidates: cands,
    });
    if (result.recipeId == null) break;
    out.push(result.recipeId);
    const idx = cands.findIndex((c) => c.recipeId === result.recipeId);
    if (idx >= 0) cands[idx] = { ...cands[idx], lastUsedDate: input.dateSequence[i] };
  }
  return out;
}
