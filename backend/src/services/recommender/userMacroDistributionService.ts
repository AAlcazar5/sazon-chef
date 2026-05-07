// ROADMAP 4.0 WK5.1 — Per-user macro distribution learner.
//
// Replaces `aiRecipeService.generateDailyMealPlan`'s hardcoded
// `standardDistribution` with a per-user-learned split. From the user's
// cook events (MealPlan.meals cooked-vs-skipped + cookingHistoryStats),
// tally meal-kind frequency and normalize into a distribution that
// represents *how this user actually eats*.
//
// Cold-start (N2.1 `cold` tier) → returns STANDARD_DISTRIBUTION.
// Mid-tier (3–6 cooks for cookBased / 5–14 events for eventBased) → blends
//          the learned distribution with the standard at 50/50.
// High-tier → returns the learned distribution.
//
// Pure function — no DB, no mutation. The service emits NUMBERS only;
// lifestyle-voice copy lives in N3 `sazonVoiceService`. There is no
// user-facing string returned by this service, by design.

export const MEAL_KINDS = ['breakfast', 'lunch', 'dinner', 'snacks', 'dessert'] as const;
export type MealKind = (typeof MEAL_KINDS)[number];
export type SignalTier = 'cold' | 'mid' | 'high';

export interface MacroDistribution {
  breakfast: number;
  lunch: number;
  dinner: number;
  snacks: number;
  dessert: number;
}

export const STANDARD_DISTRIBUTION: MacroDistribution = {
  breakfast: 0.25,
  lunch: 0.30,
  dinner: 0.35,
  snacks: 0.10,
  dessert: 0.0,
};

const MID_BLEND = 0.5;

export interface CookEvent {
  /** ISO date — used for telemetry only; not persisted by this service. */
  date?: string;
  kind: MealKind;
  /** True when the meal was actually cooked. Skipped meals don't count. */
  cooked: boolean;
}

export interface ComputeDistributionInput {
  cookEvents: CookEvent[];
  signalTier: SignalTier;
}

function tallyKinds(events: CookEvent[]): Record<MealKind, number> {
  const counts: Record<MealKind, number> = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snacks: 0,
    dessert: 0,
  };
  for (const e of events) {
    if (!e.cooked) continue;
    counts[e.kind] = (counts[e.kind] ?? 0) + 1;
  }
  return counts;
}

function normalize(counts: Record<MealKind, number>): MacroDistribution {
  const total = MEAL_KINDS.reduce((s, k) => s + counts[k], 0);
  if (total === 0) return { ...STANDARD_DISTRIBUTION };
  return {
    breakfast: counts.breakfast / total,
    lunch: counts.lunch / total,
    dinner: counts.dinner / total,
    snacks: counts.snacks / total,
    dessert: counts.dessert / total,
  };
}

function blend(a: MacroDistribution, b: MacroDistribution, weightA: number): MacroDistribution {
  const wA = Math.min(1, Math.max(0, weightA));
  const wB = 1 - wA;
  return {
    breakfast: a.breakfast * wA + b.breakfast * wB,
    lunch: a.lunch * wA + b.lunch * wB,
    dinner: a.dinner * wA + b.dinner * wB,
    snacks: a.snacks * wA + b.snacks * wB,
    dessert: a.dessert * wA + b.dessert * wB,
  };
}

export function computeMacroDistribution(
  input: ComputeDistributionInput,
): MacroDistribution {
  if (input.signalTier === 'cold') return { ...STANDARD_DISTRIBUTION };
  const tally = tallyKinds(input.cookEvents);
  const learned = normalize(tally);
  if (input.signalTier === 'mid') {
    return blend(learned, STANDARD_DISTRIBUTION, MID_BLEND);
  }
  return learned;
}

export const __INTERNALS = {
  MID_BLEND,
};
