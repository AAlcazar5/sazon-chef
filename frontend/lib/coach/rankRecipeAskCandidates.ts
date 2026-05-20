// Tier Y live-wiring (founder 2026-05-19): N=1 ranker for ambiguous
// recipe asks. "Grilled chicken" returns 100+ catalog candidates; this
// module picks ONE using signals the app already has (pantry, last cook
// cuisine, adjacency), and surfaces the next-best as alternates for the
// "Show me another" swap chip.
//
// Pure function — no React, no API. The wedge wires it in:
// findOrGenerateRecipe(query, signals) → { primary, alternates, rationale }
//
// Determinism is the contract: same query + same signals + same
// candidates → identical ranking. The user's "Show me another" chip
// cycles through `alternates` in stable order, never randomizes.

import { dice, type RecipeCardPayload } from './findOrGenerateRecipe';

export interface RankerSignals {
  /** Lowercased ingredient names the user currently has on hand.
   *  Sourced from CoachContextResponse.pantryExpiringSoon (already
   *  cached by useCoachQuickChipContext). */
  pantryNames: string[];
  /** Cuisine of the user's most recent cook (useLastCookCuisine). */
  lastCookCuisine: string | null;
  /** Server-computed adjacency target — secondary cuisine signal. */
  topAdjacentCuisine: string | null;
  /** Cuisines the user has explicitly saved, ordered by frequency
   *  (top-saved first). Sourced from useSavedRecipeCuisines. Stronger
   *  signal than adjacency (explicit user action vs server inference).
   *  Optional + defaults to [] for backward compat with existing tests. */
  savedCollectionCuisines?: string[];
  /** User's onboarding-set cooking skill tier (useSkillTier). When set,
   *  recipes whose difficulty is at-or-below the user's tier get a small
   *  bonus — a beginner asking "Grilled chicken" should land on Simple
   *  Grilled Chicken (easy) over Grilled Chicken Tandoori (hard) when
   *  Dice is tied. No penalty for over-skill recipes (joy obsession >
   *  gating — chef can still see easy recipes if they ask for them). */
  userSkillTier?: 'beginner' | 'cook' | 'chef' | null;
  /** Recipe IDs the user recently cooked (useRecentCookRecipeIds). The
   *  ranker applies a multiplicative damper when a wedge candidate's
   *  recipeId is in this list — same recipe twice in a row reads as
   *  staleness, not personalization. Variety > repetition. */
  recentlyCookedRecipeIds?: string[];
}

export interface RankedCandidate {
  recipe: RecipeCardPayload;
  diceScore: number;
  pantryOverlap: number;
  cuisineBonus: number;
  /** 1 when the recipe's difficulty is at-or-below the user's skill tier
   *  (including unknown-difficulty as a neutral "treat as easy"); 0 when
   *  the recipe is harder than the tier. Always 0 when no userSkillTier
   *  signal is available. */
  skillFit: number;
  totalScore: number;
  /** One-liner shown under the title. Names the dominant signal that
   *  picked this recipe. Undefined when there's nothing to explain
   *  (cold-start: no pantry + no cuisine + no informative skill match). */
  rationale?: string;
}

// Weights tune the relative contribution of each signal. W_DICE + W_PANTRY +
// W_CUISINE + W_SKILL sum to 1.05 (skill is a small additive nudge — it
// only matters when stronger signals tie, e.g., two equally-relevant
// candidates differ only in difficulty).
const W_DICE = 0.6;
const W_PANTRY = 0.3;
const W_CUISINE = 0.1;
const W_SKILL = 0.05;

// Multiplicative damper applied AFTER the additive score is computed:
// if recipe.recipeId ∈ recentlyCookedRecipeIds, totalScore is scaled by
// this factor. 0.85 is enough to flip the primary pick when scores are
// close but doesn't bury a recipe that's genuinely the best match.
const RECENT_COOK_DAMPER = 0.85;

function pantryOverlapScore(
  recipeIngredients: RecipeCardPayload['ingredients'],
  pantryNames: string[],
): { score: number; matched: string[] } {
  if (pantryNames.length === 0 || recipeIngredients.length === 0) {
    return { score: 0, matched: [] };
  }
  const pantryLc = pantryNames.map((p) => p.toLowerCase());
  const matched: string[] = [];
  for (const ing of recipeIngredients) {
    const nameLc = ing.name.toLowerCase();
    for (const p of pantryLc) {
      if (nameLc.includes(p) || p.includes(nameLc)) {
        matched.push(p);
        break;
      }
    }
  }
  return {
    score: matched.length / recipeIngredients.length,
    matched,
  };
}

function cuisineMatches(
  recipeCuisine: string | undefined,
  target: string | null,
): boolean {
  if (!recipeCuisine || !target) return false;
  return recipeCuisine.toLowerCase() === target.toLowerCase();
}

type CuisineSource = 'last' | 'saved-top' | 'saved' | 'adjacent';
interface CuisineHit {
  cuisine: string;
  source: CuisineSource;
  /** Weight in [0, 1]. The highest-weight matching source wins; this
   *  becomes `cuisineBonus` (scaled by W_CUISINE in totalScore). */
  weight: number;
}

/** Highest-weight cuisine match across all available signals. Lets a
 *  strong signal (explicit user save, recent cook) outrank a weaker one
 *  (server-inferred adjacency) when both fire on different candidates. */
function resolveCuisineHit(
  recipeCuisine: string | undefined,
  signals: RankerSignals,
): CuisineHit | null {
  if (!recipeCuisine) return null;
  let best: CuisineHit | null = null;
  const consider = (hit: CuisineHit) => {
    if (!best || hit.weight > best.weight) best = hit;
  };
  if (cuisineMatches(recipeCuisine, signals.lastCookCuisine)) {
    consider({ cuisine: signals.lastCookCuisine as string, source: 'last', weight: 1.0 });
  }
  const saved = signals.savedCollectionCuisines ?? [];
  if (saved.length > 0) {
    const idx = saved.findIndex(
      (c) => c.toLowerCase() === recipeCuisine.toLowerCase(),
    );
    if (idx === 0) {
      consider({ cuisine: saved[0], source: 'saved-top', weight: 0.8 });
    } else if (idx > 0) {
      consider({ cuisine: saved[idx], source: 'saved', weight: 0.6 });
    }
  }
  if (cuisineMatches(recipeCuisine, signals.topAdjacentCuisine)) {
    consider({ cuisine: signals.topAdjacentCuisine as string, source: 'adjacent', weight: 0.5 });
  }
  return best;
}

/** Difficulty rank — lower = easier; matches the natural ordering used
 *  by both the catalog `difficulty` column and AI-gen output. */
const DIFFICULTY_RANK: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};
const TIER_MAX_RANK: Record<'beginner' | 'cook' | 'chef', number> = {
  beginner: 0, // easy only
  cook: 1, // easy or medium
  chef: 2, // any
};

/** Returns 1 when the recipe's difficulty is at-or-below the user's
 *  skill tier (or no signal available — treated as neutral "fits"). 0
 *  only when the recipe is strictly harder than the tier allows. */
function skillFitScore(
  difficulty: 'easy' | 'medium' | 'hard' | undefined,
  tier: 'beginner' | 'cook' | 'chef' | null | undefined,
): number {
  if (!tier) return 0; // no signal → no bonus, no penalty
  if (!difficulty) return 1; // unknown-difficulty → treat as fits
  return DIFFICULTY_RANK[difficulty] <= TIER_MAX_RANK[tier] ? 1 : 0;
}

/** True only when the skill-fit hit is *informative* — naming it in the
 *  rationale should reflect a real "matched to your kitchen" pick, not
 *  the trivial case (chef can do anything). */
function skillRationaleFor(
  difficulty: 'easy' | 'medium' | 'hard' | undefined,
  tier: 'beginner' | 'cook' | 'chef' | null | undefined,
): string | undefined {
  if (!tier || tier === 'chef') return undefined; // chef matches all → uninformative
  if (!difficulty) return undefined;
  if (DIFFICULTY_RANK[difficulty] > TIER_MAX_RANK[tier]) return undefined;
  return tier === 'beginner'
    ? 'Beginner-friendly — gentle for your kitchen.'
    : 'Comfortable for your kitchen.';
}

function buildRationale(
  matchedPantry: string[],
  cuisineHit: CuisineHit | null,
  skillRationale: string | undefined,
): string | undefined {
  if (matchedPantry.length > 0) {
    const names = matchedPantry.slice(0, 2).join(' + ');
    return `Picked because you've got ${names} on hand.`;
  }
  if (cuisineHit) {
    switch (cuisineHit.source) {
      case 'last':
        return `Picked because ${cuisineHit.cuisine} is your recent cuisine.`;
      case 'saved-top':
        return `Picked because you save a lot of ${cuisineHit.cuisine}.`;
      case 'saved':
        return `Picked because you've saved ${cuisineHit.cuisine} recipes before.`;
      case 'adjacent':
        return `Picked because ${cuisineHit.cuisine} is on your radar.`;
    }
  }
  // Skill is the lowest-priority rationale — only fires when there's
  // nothing more interesting to say.
  return skillRationale;
}

export function rankRecipeAskCandidates(
  query: string,
  candidates: RecipeCardPayload[],
  signals: RankerSignals,
): RankedCandidate[] {
  if (candidates.length === 0) return [];

  const scored = candidates.map((recipe, idx) => {
    const diceScore = dice(recipe.title, query);
    const { score: pantryOverlap, matched: matchedPantry } = pantryOverlapScore(
      recipe.ingredients,
      signals.pantryNames,
    );

    const cuisineHit = resolveCuisineHit(recipe.cuisine, signals);
    const cuisineBonus = cuisineHit ? cuisineHit.weight : 0;

    const skillFit = skillFitScore(recipe.difficulty, signals.userSkillTier);
    const skillRationale = skillRationaleFor(
      recipe.difficulty,
      signals.userSkillTier,
    );

    const additive =
      W_DICE * diceScore +
      W_PANTRY * pantryOverlap +
      W_CUISINE * cuisineBonus +
      W_SKILL * skillFit;
    const recentlyCooked =
      !!recipe.recipeId &&
      (signals.recentlyCookedRecipeIds ?? []).includes(recipe.recipeId);
    const totalScore = recentlyCooked ? additive * RECENT_COOK_DAMPER : additive;
    const rationale = buildRationale(matchedPantry, cuisineHit, skillRationale);

    return {
      recipe,
      diceScore,
      pantryOverlap,
      cuisineBonus,
      skillFit,
      totalScore,
      rationale,
      _idx: idx,
    };
  });

  // Stable sort: higher totalScore first, ties broken by input order so
  // the same inputs always yield the same ranking (determinism contract).
  scored.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a._idx - b._idx;
  });

  return scored.map(({ _idx: _, ...rest }) => rest);
}
