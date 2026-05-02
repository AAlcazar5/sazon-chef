// backend/__tests__/services/budgetAwareComposerService.test.ts
// Group 10X Phase 9 — cost-aware composer + pantry tiebreaker tests.

import {
  rankByBudgetFit,
  pantryTiebreaker,
  totalCostForComponents,
} from '../../src/services/budgetAwareComposerService';

describe('totalCostForComponents', () => {
  it('sums estimatedCostPerPortion × portionMultiplier across components', () => {
    const total = totalCostForComponents([
      { estimatedCostPerPortion: 2, portionMultiplier: 1 },
      { estimatedCostPerPortion: 0.5, portionMultiplier: 2 },
    ]);
    expect(total).toBe(3);
  });

  it('treats null/undefined cost as 0', () => {
    const total = totalCostForComponents([
      { estimatedCostPerPortion: null, portionMultiplier: 1 } as any,
      { estimatedCostPerPortion: 1, portionMultiplier: 1 },
    ]);
    expect(total).toBe(1);
  });

  it('returns 0 for empty input', () => {
    expect(totalCostForComponents([])).toBe(0);
  });
});

describe('rankByBudgetFit', () => {
  const candidates = [
    { id: 'p-A', totalCost: 8 },
    { id: 'p-B', totalCost: 4 },
    { id: 'p-C', totalCost: 6 },
    { id: 'p-D', totalCost: 12 },
  ];

  it('orders permutations under budget by cost ASC, places over-budget last', () => {
    const ranked = rankByBudgetFit(candidates, 7);
    expect(ranked.map((c) => c.id)).toEqual(['p-B', 'p-C', 'p-A', 'p-D']);
  });

  it('returns input order when budget is null/undefined', () => {
    const ranked = rankByBudgetFit(candidates, null);
    expect(ranked).toEqual(candidates);
  });

  it('handles empty array', () => {
    expect(rankByBudgetFit([], 5)).toEqual([]);
  });

  it('treats permutations with missing totalCost as 0 (cheapest)', () => {
    const ranked = rankByBudgetFit(
      [{ id: 'a', totalCost: 5 }, { id: 'b' } as any],
      10
    );
    expect(ranked[0].id).toBe('b');
  });
});

describe('pantryTiebreaker', () => {
  const pantryIds = new Set(['carrot-1', 'rice-1', 'salmon-1']);

  it('promotes the permutation that uses MORE pantry items when scores are equal', () => {
    const a = {
      id: 'a',
      score: 1,
      components: [{ componentId: 'rice-1' }, { componentId: 'salmon-1' }],
    };
    const b = {
      id: 'b',
      score: 1,
      components: [{ componentId: 'carrot-1' }],
    };
    const sorted = pantryTiebreaker([a, b], pantryIds);
    expect(sorted[0].id).toBe('a');
  });

  it('respects existing score order when scores differ (no flip)', () => {
    const a = {
      id: 'a',
      score: 0.5,
      components: [{ componentId: 'rice-1' }],
    };
    const b = {
      id: 'b',
      score: 0.9,
      components: [{ componentId: 'carrot-1' }],
    };
    const sorted = pantryTiebreaker([a, b], pantryIds);
    expect(sorted[0].id).toBe('b');
  });

  it('handles empty array', () => {
    expect(pantryTiebreaker([], pantryIds)).toEqual([]);
  });
});
