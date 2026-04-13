// backend/src/services/__tests__/pantryMatchService.test.ts
import {
  computePantryMatch,
  normalizeIngredient,
  isStaple,
  matchesPantry,
} from '../pantryMatchService';

describe('pantryMatchService', () => {
  describe('normalizeIngredient', () => {
    it('strips quantity prefix', () => {
      expect(normalizeIngredient('2 cups white rice')).toBe('white rice');
      expect(normalizeIngredient('1 lb chicken breast')).toBe('chicken breast');
      expect(normalizeIngredient('3 cloves garlic')).toBe('garlic');
    });
    it('drops trailing preparation notes', () => {
      expect(normalizeIngredient('1 onion, diced')).toBe('onion');
      expect(normalizeIngredient('2 tbsp olive oil (divided)')).toBe('olive oil');
    });
  });

  describe('isStaple', () => {
    it('recognizes common staples', () => {
      expect(isStaple('salt')).toBe(true);
      expect(isStaple('1 tsp salt')).toBe(true);
      expect(isStaple('2 tbsp olive oil')).toBe(true);
      expect(isStaple('black pepper')).toBe(true);
      expect(isStaple('water')).toBe(true);
    });
    it('non-staples return false', () => {
      expect(isStaple('chicken breast')).toBe(false);
      expect(isStaple('tomato')).toBe(false);
    });
  });

  describe('matchesPantry', () => {
    it('exact and fuzzy-token matches', () => {
      expect(matchesPantry('chicken breast', ['chicken breast'])).toBe(true);
      expect(matchesPantry('2 lb chicken breast', ['chicken'])).toBe(true);
      expect(matchesPantry('tomato', ['cherry tomatoes'])).toBe(true);
    });
    it('returns false when no overlap', () => {
      expect(matchesPantry('tofu', ['chicken', 'rice'])).toBe(false);
    });
  });

  describe('computePantryMatch', () => {
    it('100% when all ingredients in pantry', () => {
      const result = computePantryMatch(
        [{ text: 'chicken breast' }, { text: 'white rice' }, { text: 'broccoli' }],
        ['chicken breast', 'white rice', 'broccoli'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.missing).toEqual([]);
    });

    it('staples count as matched even if not in pantry', () => {
      const result = computePantryMatch(
        [{ text: 'chicken breast' }, { text: '1 tsp salt' }, { text: '2 tbsp olive oil' }],
        ['chicken breast'],
      );
      expect(result.matchPercentage).toBe(100);
      expect(result.missing).toEqual([]);
    });

    it('partial match: reports missing and correct percentage', () => {
      const result = computePantryMatch(
        [
          { text: 'chicken breast' },
          { text: 'white rice' },
          { text: 'broccoli' },
          { text: 'fresh basil' },
        ],
        ['chicken', 'rice', 'broccoli'],
      );
      expect(result.matched).toHaveLength(3);
      expect(result.missing).toEqual(['fresh basil']);
      expect(result.matchPercentage).toBe(75);
    });

    it('0% when nothing matches', () => {
      const result = computePantryMatch(
        [{ text: 'chicken breast' }, { text: 'white rice' }],
        ['apple', 'banana'],
      );
      expect(result.matchPercentage).toBe(0);
      expect(result.missing).toHaveLength(2);
    });

    it('canSubstitute is true when every missing item has a common swap', () => {
      const result = computePantryMatch(
        [
          { text: 'chicken breast' },
          { text: '1/2 cup sour cream' },
          { text: 'lemon juice' },
        ],
        ['chicken breast'],
      );
      expect(result.missing).toHaveLength(2);
      expect(result.canSubstitute).toBe(true);
    });

    it('canSubstitute is false when any missing item has no swap', () => {
      const result = computePantryMatch(
        [
          { text: 'chicken breast' },
          { text: 'saffron threads' },
          { text: 'lemon juice' },
        ],
        ['chicken breast'],
      );
      expect(result.canSubstitute).toBe(false);
    });

    it('empty ingredient list returns 0%', () => {
      const result = computePantryMatch([], ['chicken']);
      expect(result.matchPercentage).toBe(0);
      expect(result.matched).toEqual([]);
      expect(result.missing).toEqual([]);
    });

    it('quantity prefixes are ignored in matching', () => {
      const result = computePantryMatch(
        [{ text: '2 cups cooked quinoa' }, { text: '1 lb ground beef' }],
        ['quinoa', 'ground beef'],
      );
      expect(result.matchPercentage).toBe(100);
    });
  });
});
