// ROADMAP 4.0 WK0.1 — Week-plan retrieval adapter.
//
// Single entry point that takes a slot constraint set + week context and
// returns ranked candidates per slot, backed by TB1 candidate retrieval +
// TB2 LLM ranker (already shipped). Replaces:
//   - `mealPlanFindRecipesController.computeMatchScore` (the rule-based
//     25/25/20/15/10/5 hand-tuned scorer) — to be retired in WK0.2
//   - the per-slot AI-only path in `aiRecipeService.generateDailyMealPlan`
//     for slots that can be filled from the catalog (AI fallback only
//     fires when adapter returns < threshold candidates)
//
// Pure-ish service: takes the resolved slot constraints + pantry + cadence
// state and returns ranked candidates. Caller decides persistence + AI
// fallback path.
//
// Dovetails:
//   - WK1.1 pantry boost (positive score weight when recipe matches pantry)
//   - WK1.2 use-it-up slots (pin slots to expiring ingredients)
//   - WK4.1 cuisine rotation (constraint: no 2 consecutive same-cuisine)
//   - WK5.1 per-user macro distribution (drives slot mix per day)
//   - WK6.1 nutrient gap (boost recipes high in low-DV micros)
//   - WK7.1 skill tier (≥70% Easy for KitchenIQ < 3)

import { retrieveCandidates } from './retrieveCandidates';

const DEFAULT_K = 8;
const FALLBACK_FLOOR = 3;
const MAX_K = 25;

export type WeekSlotKind = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';

export interface WeekSlotConstraint {
  /** Slot identifier (date + kind). Stable string the caller hands back. */
  slotId: string;
  /** Which slot kind this is — drives macro shape + cookTime defaults. */
  kind: WeekSlotKind;
  /** Date this slot belongs to (ISO yyyy-mm-dd) — used for cuisine rotation. */
  date: string;
  /** Per-slot dietary / allergen / cookTime caps. */
  hardFilters: {
    allergens?: string[];
    dietaryTags?: string[];
    maxCookTime?: number | null;
  };
}

export interface WeekPlanContextState {
  /** Names of items in the user's pantry (for WK1.1 boost). */
  pantryNames?: string[];
  /** Items expiring within the use-it-up window (for WK1.2 pinning). */
  expiringNames?: string[];
  /** Cuisines on already-planned slots earlier in the week (for WK4.1). */
  plannedCuisines?: string[];
  /** Skill tier (1–10) for WK7.1 difficulty curve. */
  kitchenIqTier?: number;
}

export interface WeekRetrieveCandidatesInput {
  userId: string;
  /** Per-slot input — adapter loops + dispatches. */
  slots: WeekSlotConstraint[];
  /** Cross-slot signals; same shape used by every slot's call. */
  context: WeekPlanContextState;
  /**
   * User's context vector from B1 — same shape TB1 expects. Caller
   * (week-plan controller) builds this once + passes through.
   */
  contextVector: number[];
  /** Top-K per slot. Default 8. Capped at MAX_K. */
  k?: number;
}

export interface WeekRetrievedSlot {
  slotId: string;
  /** Ranked recipe ids; empty if no catalog match (caller falls back to AI). */
  recipeIds: string[];
  /** Top-K scores parallel to recipeIds. */
  scores: number[];
  /** True iff candidate count is below FALLBACK_FLOOR — caller should
   *  invoke AI generation for this slot. */
  needsAiFallback: boolean;
  /** Telemetry: total candidates scanned + survivors after hard filters. */
  scanned: number;
  survivors: number;
}

export interface WeekRetrieveCandidatesResult {
  slots: WeekRetrievedSlot[];
  /** True iff any slot needs AI fallback. */
  anyFallbackNeeded: boolean;
}

/**
 * Resolve ranked candidates for every slot in one batch. Each slot reuses
 * the same B1 user contextVector — only the per-slot hardFilters change.
 *
 * The boost layer (WK1.1 pantry, WK1.2 expiring, WK4.1 rotation, WK6.1
 * nutrient gap, WK7.1 skill tier) is composed by the caller via
 * `applyWeekPlanBoosts` (separate file) so this adapter stays focused on
 * dispatch + telemetry.
 */
export async function retrieveCandidatesForWeek(
  input: WeekRetrieveCandidatesInput,
): Promise<WeekRetrieveCandidatesResult> {
  if (!input.userId) {
    return { slots: [], anyFallbackNeeded: false };
  }
  if (input.slots.length === 0) {
    return { slots: [], anyFallbackNeeded: false };
  }
  const k = Math.min(input.k ?? DEFAULT_K, MAX_K);

  const pantry = input.context.pantryNames ?? [];

  const out: WeekRetrievedSlot[] = [];
  let anyFallback = false;
  for (const slot of input.slots) {
    // eslint-disable-next-line no-await-in-loop
    const result = await retrieveCandidates({
      userId: input.userId,
      contextVector: input.contextVector,
      hardFilters: {
        allergens: slot.hardFilters.allergens ?? [],
        dietaryTags: slot.hardFilters.dietaryTags ?? [],
        maxCookTime: slot.hardFilters.maxCookTime ?? null,
        pantryItems: pantry,
        // Soft signal for WK1.1 — minPantryCoverage stays low so the boost
        // is positive rather than blocking. WK1.1's separate boost layer
        // applies the actual ranking weight.
        minPantryCoverage: 0,
      },
      k,
    });

    const needsFallback = result.recipeIds.length < FALLBACK_FLOOR;
    if (needsFallback) anyFallback = true;
    out.push({
      slotId: slot.slotId,
      recipeIds: result.recipeIds,
      scores: result.scores,
      needsAiFallback: needsFallback,
      scanned: result.scanned,
      survivors: result.survivors,
    });
  }

  return { slots: out, anyFallbackNeeded: anyFallback };
}

export const __INTERNALS = {
  DEFAULT_K,
  FALLBACK_FLOOR,
  MAX_K,
};
