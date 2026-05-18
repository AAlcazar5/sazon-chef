// Group 10S Surface 2 — N=1 ranker for the Kitchen IQ browse screen.
// Sorts cards by user-state relevance, with unlocked cards always above locked.

import type { KitchenIQCard } from './cards';
import type { UserState } from '../foodIntelMatcher';

const NUTRIENT_GAP_WEIGHT = 60;
const CUISINE_COOK_WEIGHT = 30;
const CUISINE_COOK_CAP = 5;
const INGREDIENT_AFFINITY_WEIGHT = 20;
const SKILL_TIER_WEIGHT = 10;

export function scoreCard(card: KitchenIQCard, userState: UserState): number {
  const keys = card.personalizationKeys;
  let score = 0;

  // NOTE: `rolling7dNutrientGaps` and `topAffinityIngredients` are stubbed
  // empty in `useFoodIntelUserState` until 10R-phase2 wires them. Until then
  // these dimensions contribute 0 to the ranker (60 + 20 = 80 of 120 points).
  // See `plans/plan-archives/ROADMAP_3.0.md` §10R-Phase2 for the closed completion record (wire-up shipped 2026-05-04).
  const gaps = new Set(userState.rolling7dNutrientGaps);
  if (keys.nutrient.some((n) => gaps.has(n))) {
    score += NUTRIENT_GAP_WEIGHT;
  }

  if (keys.cuisine.length > 0) {
    const cuisineSet = new Set(keys.cuisine);
    let cookCount = 0;
    for (const c of userState.cookHistory.cuisines) {
      if (cuisineSet.has(c)) cookCount += 1;
    }
    score += CUISINE_COOK_WEIGHT * Math.min(cookCount, CUISINE_COOK_CAP);
  }

  const affinity = new Set(userState.topAffinityIngredients);
  if (keys.ingredient.some((i) => affinity.has(i))) {
    score += INGREDIENT_AFFINITY_WEIGHT;
  }

  if (keys.skillTier.includes(userState.skillTier)) {
    score += SKILL_TIER_WEIGHT;
  }

  return score;
}

export function rankCardsByUserState(
  cards: ReadonlyArray<KitchenIQCard>,
  userState: UserState,
  isUnlocked: (id: string) => boolean,
): KitchenIQCard[] {
  const scored = cards.map((card) => ({
    card,
    score: scoreCard(card, userState),
    unlocked: isUnlocked(card.id),
  }));

  return [...scored]
    .sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.card.id.localeCompare(b.card.id);
    })
    .map((x) => x.card);
}
