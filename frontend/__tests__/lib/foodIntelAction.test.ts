// frontend/__tests__/lib/foodIntelAction.test.ts

import { isSearchableTip, getTipSearchQuery } from '../../lib/foodIntelAction';
import type { FoodIntelTip } from '../../lib/foodIntelTips';

function tip(partial: Partial<FoodIntelTip> & Pick<FoodIntelTip, 'category' | 'trigger'>): FoodIntelTip {
  return {
    id: 'x',
    title: 't',
    body: 'b',
    tags: [],
    personalizationKeys: { cuisine: [], nutrient: [], skillTier: [], goalPhase: [] },
    ...partial,
  } as FoodIntelTip;
}

describe('foodIntelAction', () => {
  describe('isSearchableTip', () => {
    it.each(['superfood', 'nutrient', 'pairing'] as const)(
      '%s tip with a trigger is searchable',
      (category) => {
        expect(isSearchableTip(tip({ category, trigger: 'turmeric' }))).toBe(true);
      },
    );

    it.each(['technique', 'myth_bust'] as const)('%s tip is not searchable', (category) => {
      expect(isSearchableTip(tip({ category, trigger: 'searing' }))).toBe(false);
    });

    it('searchable category with an empty trigger is not searchable', () => {
      expect(isSearchableTip(tip({ category: 'superfood', trigger: '' }))).toBe(false);
      expect(isSearchableTip(tip({ category: 'superfood', trigger: '   ' }))).toBe(false);
    });
  });

  describe('getTipSearchQuery', () => {
    it('returns the trimmed trigger for a searchable tip', () => {
      expect(getTipSearchQuery(tip({ category: 'superfood', trigger: '  turmeric ' }))).toBe('turmeric');
    });

    it('returns null for a non-searchable tip', () => {
      expect(getTipSearchQuery(tip({ category: 'technique', trigger: 'searing' }))).toBeNull();
    });

    it('returns null when trigger is empty even on a searchable category', () => {
      expect(getTipSearchQuery(tip({ category: 'nutrient', trigger: '' }))).toBeNull();
    });
  });
});
