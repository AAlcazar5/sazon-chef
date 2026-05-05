// backend/__tests__/services/drinkPairingService.test.ts
// ROADMAP 4.0 F8 — drink pairing service (TDD).

import {
  DRINK_PAIRINGS,
  getDrinkPairing,
  buildPairingPayload,
} from '../../src/services/drinkPairingService';

describe('DRINK_PAIRINGS library', () => {
  it('every cuisine entry has alcoholic + sparkling + hot suggestions', () => {
    for (const [, pairing] of Object.entries(DRINK_PAIRINGS)) {
      expect(pairing.alcoholic.length).toBeGreaterThan(0);
      expect(pairing.sparkling.length).toBeGreaterThan(0);
      expect(pairing.hot.length).toBeGreaterThan(0);
    }
  });

  it('keys are lowercase', () => {
    for (const cuisine of Object.keys(DRINK_PAIRINGS)) {
      expect(cuisine).toBe(cuisine.toLowerCase());
    }
  });

  it('lifestyle voice — no banned macro/diet vocabulary', () => {
    const banned = ['macro', 'cut ', 'bulk', 'maintain ', 'diet ', 'low cal'];
    for (const [, pairing] of Object.entries(DRINK_PAIRINGS)) {
      const blob = `${pairing.alcoholic} ${pairing.sparkling} ${pairing.hot}`.toLowerCase();
      for (const phrase of banned) {
        expect(blob).not.toContain(phrase);
      }
    }
  });
});

describe('getDrinkPairing', () => {
  it('returns the right pairing for known cuisines (lowercase)', () => {
    expect(getDrinkPairing('persian').alcoholic).toMatch(/Côtes-du-Rhône|Riesling/);
  });

  it('is case-insensitive', () => {
    const a = getDrinkPairing('PERSIAN');
    const b = getDrinkPairing('persian');
    expect(a).toEqual(b);
  });

  it('returns the default pairing for unknown cuisines', () => {
    const result = getDrinkPairing('atlantean');
    expect(result.alcoholic).toMatch(/light red|crisp white/);
  });

  it('returns the default pairing for empty cuisine', () => {
    const result = getDrinkPairing('');
    expect(result.alcoholic).toMatch(/light red/);
  });

  it('returns the default pairing for whitespace cuisine', () => {
    const result = getDrinkPairing('   ');
    expect(result.alcoholic).toMatch(/light red/);
  });
});

describe('buildPairingPayload', () => {
  it('returns three suggestions by default', () => {
    const payload = buildPairingPayload({ cuisine: 'thai' });
    expect(payload.suggestions).toHaveLength(3);
  });

  it('omits the alcoholic suggestion when excluded', () => {
    const payload = buildPairingPayload({ cuisine: 'thai', excludeAlcoholic: true });
    expect(payload.suggestions).toHaveLength(2);
    // First non-alcoholic should be the sparkling line.
    expect(payload.suggestions[0]).toMatch(/sparkling water|kaffir/);
  });

  it('preserves the display order: alcoholic → sparkling → hot', () => {
    const pairing = DRINK_PAIRINGS['lebanese'];
    const payload = buildPairingPayload({ cuisine: 'lebanese' });
    expect(payload.suggestions[0]).toBe(pairing.alcoholic);
    expect(payload.suggestions[1]).toBe(pairing.sparkling);
    expect(payload.suggestions[2]).toBe(pairing.hot);
  });

  it('falls back to default pairing for unknown cuisine but still returns 3', () => {
    const payload = buildPairingPayload({ cuisine: 'unknown' });
    expect(payload.suggestions).toHaveLength(3);
  });
});
