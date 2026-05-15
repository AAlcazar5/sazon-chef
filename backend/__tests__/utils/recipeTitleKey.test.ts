// backend/__tests__/utils/recipeTitleKey.test.ts

import { normalizeRecipeTitleKey } from '../../src/utils/recipeTitleKey';

describe('normalizeRecipeTitleKey', () => {
  it('lowercases and trims', () => {
    expect(normalizeRecipeTitleKey('  Sicilian Pasta  ')).toBe('sicilian pasta');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeRecipeTitleKey('Sicilian   Pasta\tPuttanesca')).toBe(
      'sicilian pasta puttanesca',
    );
  });

  it('strips punctuation and symbols', () => {
    expect(normalizeRecipeTitleKey('Argentinian Chimichurri Steak — with Grilled Vegetables!')).toBe(
      'argentinian chimichurri steak with grilled vegetables',
    );
  });

  it('strips combining accents (NFKD)', () => {
    expect(normalizeRecipeTitleKey('Crème Brûlée')).toBe('creme brulee');
    expect(normalizeRecipeTitleKey('Jalapeño Poppers')).toBe('jalapeno poppers');
  });

  it('treats the reported duplicate variants as the same key', () => {
    const a = normalizeRecipeTitleKey('Argentinian Chimichurri Steak with Grilled Vegetables');
    const b = normalizeRecipeTitleKey('argentinian  chimichurri  steak  with  grilled  vegetables');
    const c = normalizeRecipeTitleKey('Argentinian Chimichurri Steak with Grilled Vegetables.');
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('returns empty string for null / undefined / blank', () => {
    expect(normalizeRecipeTitleKey(null)).toBe('');
    expect(normalizeRecipeTitleKey(undefined)).toBe('');
    expect(normalizeRecipeTitleKey('   ')).toBe('');
    expect(normalizeRecipeTitleKey('!!!')).toBe('');
  });

  it('keeps distinct dishes distinct', () => {
    expect(normalizeRecipeTitleKey('Beef Tacos')).not.toBe(
      normalizeRecipeTitleKey('Chicken Tacos'),
    );
  });
});
