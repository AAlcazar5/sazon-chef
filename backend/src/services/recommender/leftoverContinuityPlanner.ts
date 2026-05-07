// ROADMAP 4.0 WK2.1 — Leftover continuity planner ("cook once, eat twice").
//
// Detects opportunities to scale up a cook by N portions + slot leftover
// servings into the next 1–2 days' lunch/dinner. Pure function — caller
// passes the candidate recipe + week state + user's leftover acceptance
// rate; the planner returns a carryOverPlan annotation or null.
//
// Honest tradeoffs:
//   - Recipe scalability is caller-supplied via `scalesLinearly` boolean
//     (caller computes the heuristic from recipe.tags / category — e.g.,
//     soups / stews / grain bowls / casseroles scale; sushi rolls don't).
//   - User leftover acceptance rate is caller-supplied (computed upstream
//     from `LeftoverInventory` events). The planner uses it as a gate:
//     below ACCEPTANCE_FLOOR (0.3) → skip proposing for this user.
//   - The planner only schedules same-week (cookDay + 1..2 days). Carrying
//     across weeks is a future enhancement.

const ACCEPTANCE_FLOOR = 0.3;
const MAX_DAYS_FORWARD = 2;
const PORTIONS_PER_LEFTOVER_MEAL = 1;

export type SlotKind = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

export interface CandidateRecipe {
  recipeId: string;
  /** Caller-supplied: does this recipe scale linearly? Soups/stews/grain
   *  bowls/casseroles → true; sushi rolls / delicate plates → false. */
  scalesLinearly: boolean;
  /** Servings per single cook (recipe.servings). */
  servings: number;
}

export interface OpenSlot {
  /** ISO date (yyyy-mm-dd). */
  date: string;
  kind: SlotKind;
}

export interface PlanCarryOverInput {
  candidate: CandidateRecipe;
  /** ISO date (yyyy-mm-dd) the candidate would be cooked. */
  cookOnDay: string;
  /** Open slots in the next MAX_DAYS_FORWARD days (lunch + dinner; never breakfast). */
  openSlots: OpenSlot[];
  /** User's historical leftover-acceptance rate ∈ [0, 1]. Below 0.3 → no carry-over proposed. */
  userAcceptanceRate: number;
}

export interface CarryOverPlan {
  recipeId: string;
  cookOnDay: string;
  eatOnDays: string[];
  portions: number;
}

const ACCEPTABLE_LEFTOVER_KINDS: SlotKind[] = ['lunch', 'dinner'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00Z`).getTime();
  const b = new Date(`${bIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Plan a carry-over schedule. Returns null when:
 *   - candidate does not scale linearly
 *   - no open lunch/dinner slots within MAX_DAYS_FORWARD
 *   - user's leftover acceptance rate is below ACCEPTANCE_FLOOR
 */
export function planLeftoverContinuity(
  input: PlanCarryOverInput,
): CarryOverPlan | null {
  if (!input.candidate.scalesLinearly) return null;
  if (input.userAcceptanceRate < ACCEPTANCE_FLOOR) return null;

  // Find acceptable next-day slots within MAX_DAYS_FORWARD.
  const eligible = input.openSlots
    .filter((s) => {
      const delta = daysBetween(input.cookOnDay, s.date);
      return (
        delta > 0 &&
        delta <= MAX_DAYS_FORWARD &&
        ACCEPTABLE_LEFTOVER_KINDS.includes(s.kind)
      );
    })
    .sort((a, b) => daysBetween(input.cookOnDay, a.date) - daysBetween(input.cookOnDay, b.date));

  if (eligible.length === 0) return null;

  // Decide how many leftover meals to schedule. Bound by:
  //   - candidate.servings (a 4-serving recipe can feed 1 cook + 3 leftover meals)
  //   - eligible slot count
  const reservedForCook = 1; // assume 1 portion eaten on cookOnDay
  const availableLeftovers = Math.max(
    0,
    input.candidate.servings - reservedForCook,
  );
  const slotCount = Math.min(availableLeftovers, eligible.length);
  if (slotCount === 0) return null;

  const eatOnDays = eligible.slice(0, slotCount).map((s) => s.date);
  return {
    recipeId: input.candidate.recipeId,
    cookOnDay: input.cookOnDay,
    eatOnDays,
    portions: slotCount * PORTIONS_PER_LEFTOVER_MEAL,
  };
}

export const __INTERNALS = {
  ACCEPTANCE_FLOOR,
  MAX_DAYS_FORWARD,
  PORTIONS_PER_LEFTOVER_MEAL,
};
