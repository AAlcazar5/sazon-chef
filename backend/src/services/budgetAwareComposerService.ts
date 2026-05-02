// backend/src/services/budgetAwareComposerService.ts
// Group 10X Phase 9 — cost-aware composer ranking + pantry tiebreaker.

export interface Costed {
  estimatedCostPerPortion: number | null;
  portionMultiplier: number;
}

export interface CostedPermutation {
  totalCost?: number;
}

export const totalCostForComponents = (components: Costed[]): number =>
  components.reduce((acc, c) => acc + (c.estimatedCostPerPortion ?? 0) * c.portionMultiplier, 0);

export const rankByBudgetFit = <T extends CostedPermutation>(
  candidates: T[],
  budget: number | null | undefined
): T[] => {
  if (budget == null || candidates.length === 0) return candidates;
  const underBudget = candidates
    .filter((c) => (c.totalCost ?? 0) <= budget)
    .sort((a, b) => (a.totalCost ?? 0) - (b.totalCost ?? 0));
  const overBudget = candidates
    .filter((c) => (c.totalCost ?? 0) > budget)
    .sort((a, b) => (a.totalCost ?? 0) - (b.totalCost ?? 0));
  return [...underBudget, ...overBudget];
};

export interface PantryScored {
  score: number;
  components: { componentId: string }[];
}

const SCORE_EPS = 1e-6;

export const pantryTiebreaker = <T extends PantryScored>(
  permutations: T[],
  pantryComponentIds: Set<string>
): T[] => {
  return [...permutations].sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > SCORE_EPS) return scoreDiff;
    const aPantry = a.components.filter((c) => pantryComponentIds.has(c.componentId)).length;
    const bPantry = b.components.filter((c) => pantryComponentIds.has(c.componentId)).length;
    return bPantry - aPantry;
  });
};
