// backend/__tests__/data/lightenedTechniqueCorpus.test.ts
// ROADMAP 4.0 Tier J18.3 — Lightened-technique corpus (TDD).
//
// Each heritage cuisine with a known heavy default must have ≥3 lightened
// sibling recipes seeded. Banned-vocab regression at the corpus level —
// every title and technique line is scanned.

import {
  LIGHTENED_TECHNIQUE_CORPUS,
  HERITAGE_CUISINES_WITH_HEAVY_DEFAULT,
} from '../../scripts/seedLightenedTechniqueCorpus';

describe('LIGHTENED_TECHNIQUE_CORPUS', () => {
  it('covers every heritage cuisine with a heavy default with ≥3 lightened siblings', () => {
    for (const cuisine of HERITAGE_CUISINES_WITH_HEAVY_DEFAULT) {
      const entries = LIGHTENED_TECHNIQUE_CORPUS.filter(
        (e) => e.cuisine.toLowerCase() === cuisine.toLowerCase(),
      );
      expect(entries.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('lists Mexican, Southern, Italian-American, Filipino, Caribbean, Indian, Levantine', () => {
    const lower = HERITAGE_CUISINES_WITH_HEAVY_DEFAULT.map((c) => c.toLowerCase());
    expect(lower).toEqual(
      expect.arrayContaining([
        'mexican',
        'southern',
        'italian-american',
        'filipino',
        'caribbean',
        'indian',
        'levantine',
      ]),
    );
  });

  it('every entry uses the locked tag taxonomy', () => {
    const allowed = new Set(['weeknight', 'sunday', 'campfire', 'lighter']);
    for (const entry of LIGHTENED_TECHNIQUE_CORPUS) {
      expect(allowed.has(entry.tag)).toBe(true);
    }
  });

  describe('banned-vocab regression', () => {
    const BANNED = [
      'healthy alternative',
      'guilt-free',
      'skinny',
      'macro-friendly',
      'low-fat',
      'diet',
      'instead of',
      'less than',
      'lose',
      'weight',
      'optimize',
      'cauliflower rice', // explicit banned in spec
      'zucchini noodles', // explicit banned in spec
      'protein-powder',   // explicit banned in spec
    ];

    it('emits no banned vocab in any seeded title or technique line', () => {
      const allText = LIGHTENED_TECHNIQUE_CORPUS.map(
        (e) => `${e.title} ${e.techniqueLine ?? ''} ${e.parentTitle ?? ''}`,
      )
        .join(' ')
        .toLowerCase();
      for (const term of BANNED) {
        expect(allText).not.toContain(term.toLowerCase());
      }
    });
  });
});
