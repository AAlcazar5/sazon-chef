// ROADMAP 4.0 D12 — "Cravings, Made Real" smart-collection seed.
//
// The seed script ships a pure data-builder (`buildCravingsMadeRealSeed`)
// so we can assert on shape without touching the DB. Smart-collection
// lookups also live as a pure helper so the cravingFlow can read it.

import {
  buildCravingsMadeRealSeed,
  CRAVINGS_MADE_REAL_TAG,
  filterCravingsMadeReal,
} from '../../scripts/seedCravingsMadeReal';

const BANNED_VOCAB = [
  'low-cal',
  'low cal',
  'skinny',
  'macro-friendly',
  'macro friendly',
  'fast food makeover',
];

describe('seedCravingsMadeReal — D12', () => {
  const recipes = buildCravingsMadeRealSeed();

  it('emits at least 10 recipes', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(10);
  });

  it('every recipe carries the cravings_made_real tag in tagsJson', () => {
    for (const r of recipes) {
      expect(r.tagsJson).toBeTruthy();
      const tags = JSON.parse(r.tagsJson) as string[];
      expect(Array.isArray(tags)).toBe(true);
      expect(tags).toContain(CRAVINGS_MADE_REAL_TAG);
    }
  });

  it('descriptions emphasize ingredient quality, not macro reduction', () => {
    for (const r of recipes) {
      const text = `${r.title} ${r.description}`.toLowerCase();
      for (const banned of BANNED_VOCAB) {
        expect(text).not.toContain(banned);
      }
    }
  });

  it('descriptions reference real-ingredient / from-scratch / whole-food language', () => {
    const qualitySignals = [
      'real',
      'from-scratch',
      'from scratch',
      'whole',
      'hand-made',
      'hand made',
      'house-made',
      'house made',
      'grass-fed',
      'aged',
      'cultured',
      'fresh',
      'cured',
      'wild-caught',
    ];
    for (const r of recipes) {
      const text = `${r.title} ${r.description}`.toLowerCase();
      const hit = qualitySignals.some((s) => text.includes(s));
      expect(hit).toBe(true);
    }
  });

  it('every recipe has ingredients and a cuisine', () => {
    for (const r of recipes) {
      expect(r.ingredients.length).toBeGreaterThan(0);
      expect(r.cuisine).toBeTruthy();
    }
  });

  describe('filterCravingsMadeReal helper (smart collection lookup)', () => {
    it('returns only recipes whose tagsJson contains the tag', () => {
      const mixed = [
        { id: 'a', tagsJson: JSON.stringify(['cravings_made_real']) },
        { id: 'b', tagsJson: JSON.stringify(['glazed_bite']) },
        { id: 'c', tagsJson: null },
        { id: 'd', tagsJson: JSON.stringify(['cravings_made_real', 'glazed_bite']) },
      ];
      const out = filterCravingsMadeReal(mixed);
      expect(out.map((r) => r.id).sort()).toEqual(['a', 'd']);
    });

    it('is null-safe for recipes without tagsJson', () => {
      const out = filterCravingsMadeReal([{ id: 'x' }, { id: 'y', tagsJson: null }]);
      expect(out).toEqual([]);
    });

    it('ignores malformed JSON gracefully', () => {
      const out = filterCravingsMadeReal([{ id: 'x', tagsJson: 'not-json' }]);
      expect(out).toEqual([]);
    });
  });
});
