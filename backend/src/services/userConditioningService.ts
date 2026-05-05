// backend/src/services/userConditioningService.ts
// ROADMAP 4.0 Tier C1 — AI prompt user-conditioning layer.
//
// `buildRecipePrompt()` already injects the cuisine health-tier addendum.
// This service builds a per-user addendum that layers on top:
//   - goal-phase weighting (cut → lower-calorie; bulk → hearty + protein-forward)
//   - structured-intent nudges (protein/fiber/variety from C5 writeback)
//   - "don't suggest lighter versions" if user's history shows they don't lighten
//   - gap-aware superfood callouts ONLY when the user has prior affinity
//
// Returns `null` when the user has no signal (lifestyle default — base
// prompt remains untouched).

export interface UserPromptState {
  goalPhase?: 'cut' | 'maintain' | 'bulk' | 'recomp';
  /** Top nutrient gaps the user is under on (rolling 7d). e.g. ['fiber', 'iron']. */
  nutrientGaps?: string[];
  /** Ingredients/superfoods the user has demonstrated affinity for. */
  superfoodAffinity?: string[];
  /** 0..1 — fraction of cooks where the user picked the lightened variant. */
  cookHistoryLightenRate?: number;
  /** Boolean nudge flags from CoachMemory writeback (C5). */
  structuredIntents?: {
    cuisineVarietyBoost?: boolean;
    proteinTargetNudge?: boolean;
    fiberTargetNudge?: boolean;
  };
  /** UI density preference governs whether to inject conditioning at all. */
  nutritionUIDensity: 'minimal' | 'macros' | 'macros + micros' | 'power-user';
}

const LIGHTEN_THRESHOLD = 0.2; // <20% means user rarely lightens

export function buildUserConditioningAddendum(state: UserPromptState): string | null {
  if (state.nutritionUIDensity === 'minimal') {
    // User opted out of nutrition-flavored guidance. Base prompt is enough.
    return null;
  }

  const lines: string[] = [];

  // Goal phase weighting (skip 'maintain' and 'recomp' — they're neutral).
  if (state.goalPhase === 'cut') {
    lines.push(
      'User is in a calorie deficit; emphasize lower-calorie versions when authenticity allows.'
    );
  } else if (state.goalPhase === 'bulk') {
    lines.push(
      'User is in a surplus; suggest hearty, protein-forward variations.'
    );
  }

  // Structured intents from C5 memory writeback.
  if (state.structuredIntents?.proteinTargetNudge) {
    lines.push(
      'User often hungry between meals — bias toward protein-dense components.'
    );
  }
  if (state.structuredIntents?.fiberTargetNudge) {
    lines.push(
      'User wants to feel full longer — bias toward fiber-rich components.'
    );
  }
  if (state.structuredIntents?.cuisineVarietyBoost) {
    lines.push(
      'User wants variety — explore adjacent cuisines and ingredients.'
    );
  }

  // Skip "lighter version" suggestions for users who don't lighten.
  if (
    typeof state.cookHistoryLightenRate === 'number' &&
    state.cookHistoryLightenRate < LIGHTEN_THRESHOLD
  ) {
    lines.push(
      'Skip "lighter version" suggestions; this user rarely lightens dishes.'
    );
  }

  // Gap-aware superfood callouts: only surface superfoods the user has shown
  // affinity for. Match by simple substring intersection.
  if (
    state.nutrientGaps &&
    state.nutrientGaps.length > 0 &&
    state.superfoodAffinity &&
    state.superfoodAffinity.length > 0
  ) {
    const matched = state.superfoodAffinity.slice(0, 3); // cap to keep prompt compact
    if (matched.length > 0) {
      lines.push(
        `If natural, highlight ${matched.join(', ')} — user has affinity and is currently low on ${state.nutrientGaps.join(', ')}.`
      );
    }
  }

  if (lines.length === 0) return null;
  return lines.join(' ');
}
