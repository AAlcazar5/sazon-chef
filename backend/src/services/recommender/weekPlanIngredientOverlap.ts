// ROADMAP 4.0 WK9.1 — Cross-meal ingredient overlap bonus.
//
// When the generator scores a candidate slot, candidates that share ≥
// MIN_OVERLAP ingredients with already-planned slots earlier in the
// week earn a soft, cap-bounded bonus. Same shopping-list line items
// cover multiple meals → less waste; UI surfaces "ginger appears in 3
// meals this week" on the shopping list.
//
// Soft signal — never crowds out a great non-overlapping recipe. Pure
// function, no DB, no mutation.

const MIN_OVERLAP = 3;
const PER_OVERLAP_BOOST = 0.03;
const MAX_OVERLAP_BOOST = 0.10;

export interface OverlapCandidate {
  recipeId: string;
  score: number;
  /** Lower-cased ingredient names. */
  ingredients: string[];
}

export interface ApplyOverlapBoostInput {
  candidates: OverlapCandidate[];
  /** Ingredients already committed to earlier slots in the same week. */
  alreadyPlannedIngredients: string[];
  perOverlapBoost?: number;
  maxOverlapBoost?: number;
  minOverlap?: number;
}

export interface BoostedOverlapCandidate extends OverlapCandidate {
  overlapCount: number;
  overlapMatched: string[];
  boost: number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function countOverlap(
  candidateIngredients: string[],
  plannedSet: Set<string>,
): { count: number; matched: string[] } {
  const seen = new Set<string>();
  const matched: string[] = [];
  for (const raw of candidateIngredients) {
    const ing = normalize(raw);
    if (!ing || seen.has(ing)) continue;
    seen.add(ing);
    if (plannedSet.has(ing)) matched.push(ing);
  }
  return { count: matched.length, matched };
}

export function applyIngredientOverlapBoost(
  input: ApplyOverlapBoostInput,
): BoostedOverlapCandidate[] {
  const minOverlap = input.minOverlap ?? MIN_OVERLAP;
  const perOverlap = input.perOverlapBoost ?? PER_OVERLAP_BOOST;
  const cap = input.maxOverlapBoost ?? MAX_OVERLAP_BOOST;
  const planned = new Set(input.alreadyPlannedIngredients.map(normalize).filter(Boolean));

  return input.candidates.map((c) => {
    const { count, matched } = countOverlap(c.ingredients, planned);
    const boost =
      count >= minOverlap ? Math.min(cap, perOverlap * count) : 0;
    return {
      ...c,
      score: c.score + boost,
      overlapCount: count,
      overlapMatched: matched,
      boost,
    };
  });
}

export const __INTERNALS = {
  MIN_OVERLAP,
  PER_OVERLAP_BOOST,
  MAX_OVERLAP_BOOST,
};
