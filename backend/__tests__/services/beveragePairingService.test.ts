// backend/__tests__/services/beveragePairingService.test.ts
// ROADMAP 4.0 Tier J17.3 — Beverage pairing slot (TDD).
//
// Curated cuisine → 2–3 traditional beverages mapping. The slot just IS
// the beverage — never framed against soda or as an "alternative."

import {
  getPairings,
  BEVERAGE_PAIRINGS,
} from '../../src/services/beveragePairingService';

describe('getPairings', () => {
  it('returns 2–3 pairings for a known cuisine (Japanese)', () => {
    const pairings = getPairings('Japanese');
    expect(pairings.length).toBeGreaterThanOrEqual(2);
    expect(pairings.length).toBeLessThanOrEqual(3);
    expect(pairings[0]).toBeTruthy();
  });

  it('returns 2–3 pairings for Mexican', () => {
    const pairings = getPairings('Mexican');
    expect(pairings.length).toBeGreaterThanOrEqual(2);
    expect(pairings.length).toBeLessThanOrEqual(3);
  });

  it('returns 2–3 pairings for Lebanese', () => {
    const pairings = getPairings('Lebanese');
    expect(pairings.length).toBeGreaterThanOrEqual(2);
    expect(pairings.length).toBeLessThanOrEqual(3);
  });

  it('matches case-insensitively', () => {
    const a = getPairings('japanese');
    const b = getPairings('JAPANESE');
    const c = getPairings('Japanese');
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('returns an empty array for an unknown cuisine', () => {
    expect(getPairings('Atlantean')).toEqual([]);
  });

  it('returns an empty array for empty/null input', () => {
    expect(getPairings('')).toEqual([]);
    expect(getPairings(undefined as unknown as string)).toEqual([]);
  });
});

describe('beveragePairingService — banned framing regression', () => {
  // The slot must never frame the beverage as a substitute or moralized
  // alternative. The persona thesis is: it just IS the drink.
  const BANNED = [
    'instead of',
    'skip the',
    'alternative to',
    'better than soda',
    'instead of soda',
    'guilt-free',
    'healthy alternative',
    'low-fat',
    'diet',
    'macro',
    'optimize',
    'goal',
    'less than',
    'lose',
    'weight',
    'skinny',
  ];

  it('contains no banned framing in any curated pairing string', () => {
    const allText = Object.values(BEVERAGE_PAIRINGS)
      .flat()
      .join(' ')
      .toLowerCase();
    for (const term of BANNED) {
      expect(allText).not.toContain(term.toLowerCase());
    }
  });

  it('emits at least 4 curated cuisines covering a global spread', () => {
    expect(Object.keys(BEVERAGE_PAIRINGS).length).toBeGreaterThanOrEqual(4);
  });
});
