// backend/scripts/seedBudget.ts
//
// Run-control for the catalog seed. Two modes:
//
//  • Legacy (no TARGET_SAVED): iterate a fixed plan of RECIPE_BUDGET jobs;
//    duplicates/failures consume a slot and yield nothing (old behavior).
//
//  • Target-saved (TARGET_SAVED=N): keep generating until N recipes are
//    actually SAVED — dups/fails don't count toward N. A mandatory attempt
//    cap (MAX_ATTEMPTS, default N × multiplier) bounds spend so a saturated
//    cuisine can't loop forever, and plan exhaustion (no legitimate cuisine
//    slots left, per the per-cuisine target floor) also stops the run.
//
// Pure + deterministic so the stop logic is unit-tested without a live run.

export interface RunBudget {
  /** N saved-recipe goal, or null in legacy mode. */
  targetSaved: number | null;
  /** How many jobs buildPlan should emit (the loop never exceeds this). */
  planCap: number;
  /** Hard ceiling on generation attempts — the spend guardrail. */
  maxAttempts: number;
}

export function resolveRunBudget(opts: {
  recipeBudget: number;
  targetSaved: number | null;
  maxAttempts: number | null;
  attemptMultiplier: number;
}): RunBudget {
  const { recipeBudget, targetSaved, maxAttempts, attemptMultiplier } = opts;

  if (targetSaved == null || targetSaved <= 0) {
    // Legacy: plan and cap are both the fixed budget.
    return { targetSaved: null, planCap: recipeBudget, maxAttempts: recipeBudget };
  }

  // Clamp the multiplier to ≥ 1 so the cap can never be below the goal
  // (otherwise the run would stop before it could possibly hit the target).
  const safeMultiplier = Math.max(1, attemptMultiplier);
  const cap =
    maxAttempts != null && maxAttempts > 0
      ? maxAttempts
      : Math.ceil(targetSaved * safeMultiplier);

  return { targetSaved, planCap: cap, maxAttempts: cap };
}

export type StopReason =
  | 'target_reached'
  | 'max_attempts'
  | 'plan_exhausted'
  | null;

export interface StopDecision {
  stop: boolean;
  reason: StopReason;
}

export function evaluateStop(state: {
  succeeded: number;
  targetSaved: number | null;
  attempts: number;
  maxAttempts: number;
  planExhausted: boolean;
}): StopDecision {
  const { succeeded, targetSaved, attempts, maxAttempts, planExhausted } = state;

  // Success wins over every cap — finishing the goal is never a failure.
  if (targetSaved != null && succeeded >= targetSaved) {
    return { stop: true, reason: 'target_reached' };
  }
  if (attempts >= maxAttempts) {
    return { stop: true, reason: 'max_attempts' };
  }
  if (planExhausted) {
    return { stop: true, reason: 'plan_exhausted' };
  }
  return { stop: false, reason: null };
}
