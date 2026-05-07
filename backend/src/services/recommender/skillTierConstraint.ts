// ROADMAP 4.0 WK7.1 — KitchenIQ tier as a generator soft constraint.
//
// Pre-generation soft constraint that tilts a week toward the user's
// current cooking confidence:
//   - beginners (KitchenIQ < 3)    → ≥ 70% Easy slots
//   - intermediate (3 ≤ IQ < 7)    → 50% Easy, mix of Medium
//   - advanced (IQ ≥ 7)            → spread including ≥ 1 Hard slot
//
// Manual overrides (slots the user pinned) are NEVER displaced — the
// constraint applies only to unpinned slots.
//
// Algorithm: greedy pass per day picks the highest-score candidate; then
// ratio enforcement swaps mismatched slots for the best alternative of
// the desired difficulty until the ratio is reached or alternatives run
// out. Soft constraint — never blocks a great recipe just to hit a
// difficulty quota. Pure function, no DB, no mutation.

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface SkillTierCandidate {
  recipeId: string;
  score: number;
  difficulty: Difficulty;
}

export type SkillTier = 'beginner' | 'intermediate' | 'advanced';

export interface ApplySkillTierInput {
  candidatesByDay: SkillTierCandidate[][];
  kitchenIQ: number;
  /** Map of dayIdx → pinned recipeId (manual override). */
  manualOverrides?: Record<number, string>;
}

export interface SelectedSkillSlot {
  recipeId: string;
  difficulty: Difficulty;
  score: number;
  /** True when this slot is locked by manualOverride. */
  pinned: boolean;
}

export interface ApplySkillTierResult {
  selections: SelectedSkillSlot[];
  tier: SkillTier;
  targetEasyRatio: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  meetsTarget: boolean;
}

const KITCHEN_IQ_BEGINNER_MAX = 3; // < 3
const KITCHEN_IQ_ADVANCED_MIN = 7; // ≥ 7

const TARGET_EASY_RATIO: Record<SkillTier, number> = {
  beginner: 0.7,
  intermediate: 0.5,
  advanced: 0.33,
};

export function tierFromKitchenIQ(iq: number): SkillTier {
  if (iq < KITCHEN_IQ_BEGINNER_MAX) return 'beginner';
  if (iq >= KITCHEN_IQ_ADVANCED_MIN) return 'advanced';
  return 'intermediate';
}

function pickBestNonPinned(
  candidates: SkillTierCandidate[],
  pinnedId: string | null,
): SkillTierCandidate | null {
  if (candidates.length === 0) return null;
  if (pinnedId == null) {
    return [...candidates].sort((a, b) => b.score - a.score)[0];
  }
  // Pinned: caller-supplied recipeId — find it in candidates or fall back.
  const pinned = candidates.find((c) => c.recipeId === pinnedId);
  if (pinned) return pinned;
  return [...candidates].sort((a, b) => b.score - a.score)[0];
}

function countEasy(selections: SelectedSkillSlot[]): number {
  return selections.filter((s) => s.difficulty === 'Easy').length;
}

export function applySkillTierConstraint(
  input: ApplySkillTierInput,
): ApplySkillTierResult {
  const tier = tierFromKitchenIQ(input.kitchenIQ);
  const target = TARGET_EASY_RATIO[tier];
  const overrides = input.manualOverrides ?? {};

  // Phase 1: greedy pick per day, honoring manual overrides.
  const selections: SelectedSkillSlot[] = [];
  for (let i = 0; i < input.candidatesByDay.length; i++) {
    const overrideId = overrides[i];
    const picked = pickBestNonPinned(input.candidatesByDay[i], overrideId ?? null);
    if (!picked) continue;
    selections.push({
      recipeId: picked.recipeId,
      difficulty: picked.difficulty,
      score: picked.score,
      pinned: overrideId != null && picked.recipeId === overrideId,
    });
  }

  if (selections.length === 0) {
    return {
      selections: [],
      tier,
      targetEasyRatio: target,
      easyCount: 0,
      mediumCount: 0,
      hardCount: 0,
      meetsTarget: true,
    };
  }

  // Phase 2: ratio enforcement.
  const totalDays = selections.length;
  const targetEasyCount = Math.ceil(totalDays * target);
  let easyNow = countEasy(selections);

  // Beginner / intermediate: swap non-Easy unpinned slots → best Easy alt.
  if (tier !== 'advanced' && easyNow < targetEasyCount) {
    type SwapOption = { dayIdx: number; replacement: SkillTierCandidate; delta: number };
    const swaps: SwapOption[] = [];
    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      if (sel.pinned) continue;
      if (sel.difficulty === 'Easy') continue;
      const easyCandidates = input.candidatesByDay[i].filter((c) => c.difficulty === 'Easy');
      if (easyCandidates.length === 0) continue;
      const best = [...easyCandidates].sort((a, b) => b.score - a.score)[0];
      swaps.push({ dayIdx: i, replacement: best, delta: sel.score - best.score });
    }
    swaps.sort((a, b) => a.delta - b.delta);
    for (const s of swaps) {
      if (easyNow >= targetEasyCount) break;
      selections[s.dayIdx] = {
        recipeId: s.replacement.recipeId,
        difficulty: s.replacement.difficulty,
        score: s.replacement.score,
        pinned: false,
      };
      easyNow += 1;
    }
  }

  // Advanced: ensure ≥ 1 Hard slot when alternatives exist.
  if (tier === 'advanced' && !selections.some((s) => s.difficulty === 'Hard')) {
    type HardSwap = { dayIdx: number; replacement: SkillTierCandidate; delta: number };
    const hardSwaps: HardSwap[] = [];
    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      if (sel.pinned) continue;
      const hardCandidates = input.candidatesByDay[i].filter((c) => c.difficulty === 'Hard');
      if (hardCandidates.length === 0) continue;
      const best = [...hardCandidates].sort((a, b) => b.score - a.score)[0];
      hardSwaps.push({ dayIdx: i, replacement: best, delta: sel.score - best.score });
    }
    hardSwaps.sort((a, b) => a.delta - b.delta);
    if (hardSwaps.length > 0) {
      const s = hardSwaps[0];
      selections[s.dayIdx] = {
        recipeId: s.replacement.recipeId,
        difficulty: s.replacement.difficulty,
        score: s.replacement.score,
        pinned: false,
      };
    }
  }

  const easyCount = selections.filter((s) => s.difficulty === 'Easy').length;
  const mediumCount = selections.filter((s) => s.difficulty === 'Medium').length;
  const hardCount = selections.filter((s) => s.difficulty === 'Hard').length;
  const meetsTarget =
    tier === 'advanced'
      ? hardCount >= 1 || !input.candidatesByDay.some((cs) => cs.some((c) => c.difficulty === 'Hard'))
      : easyCount >= targetEasyCount;

  return {
    selections,
    tier,
    targetEasyRatio: target,
    easyCount,
    mediumCount,
    hardCount,
    meetsTarget,
  };
}

export const __INTERNALS = {
  KITCHEN_IQ_BEGINNER_MAX,
  KITCHEN_IQ_ADVANCED_MIN,
  TARGET_EASY_RATIO,
};
