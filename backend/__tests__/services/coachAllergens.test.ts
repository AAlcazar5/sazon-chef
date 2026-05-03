// Group 10Y Sec H2: word-boundary allergen matching.
// Verifies the fix for the substring bug where "nut" matched "coconut".

import { checkAllergens } from '../../src/services/coachTools';

describe('checkAllergens — word-boundary matching (Sec H2)', () => {
  it('does NOT flag "coconut" or "donut" when "nut" is banned', () => {
    const result = checkAllergens(
      ['1 cup coconut milk', '2 donuts', 'sea salt'],
      ['nut'],
    );
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags every form of "peanut" when "peanut" is banned', () => {
    expect(checkAllergens(['peanut butter'], ['peanut']).ok).toBe(false);
    expect(checkAllergens(['peanut oil'], ['peanut']).ok).toBe(false);
    expect(checkAllergens(['roasted peanuts'], ['peanut']).ok).toBe(false);
  });

  it('flags "milk" and "Milk Powder" when "milk" is banned', () => {
    expect(checkAllergens(['1 cup milk'], ['milk']).ok).toBe(false);
    expect(checkAllergens(['Milk Powder'], ['milk']).ok).toBe(false);
  });

  it('does NOT flag "buttermilk" when "milk" is banned (token boundary)', () => {
    // "buttermilk" tokenizes to ["buttermilk"] — distinct from "milk".
    const result = checkAllergens(['buttermilk biscuits'], ['milk']);
    expect(result.ok).toBe(true);
  });

  it('flags multi-word ingredient strings containing the banned token', () => {
    expect(checkAllergens(['Shellfish broth'], ['shellfish']).ok).toBe(false);
    expect(checkAllergens(['fresh shellfish'], ['shellfish']).ok).toBe(false);
  });

  it('returns ok when no allergens are configured', () => {
    expect(checkAllergens(['anything', 'goes'], []).ok).toBe(true);
  });

  it('handles plural banned token vs singular ingredient and vice versa', () => {
    expect(checkAllergens(['peanut'], ['peanuts']).ok).toBe(false);
    expect(checkAllergens(['peanuts'], ['peanut']).ok).toBe(false);
  });

  it('multi-word banned ingredient requires every token to match in one ingredient', () => {
    // "soy sauce" should match "soy sauce" but not just "soy" alone or "sauce" alone.
    expect(checkAllergens(['soy sauce'], ['soy sauce']).ok).toBe(false);
    expect(checkAllergens(['soybean'], ['soy sauce']).ok).toBe(true);
    expect(checkAllergens(['hot sauce'], ['soy sauce']).ok).toBe(true);
  });

  it('returns the original banned name in violations (preserves casing)', () => {
    const result = checkAllergens(['1 cup milk'], ['Milk']);
    expect(result.ok).toBe(false);
    expect(result.violations).toEqual(['Milk']);
  });
});
