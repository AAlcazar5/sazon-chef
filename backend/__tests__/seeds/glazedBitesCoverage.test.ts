// ROADMAP 4.0 D13 — Glazed Protein Bites family expansion seed.
//
// The seed extends the existing MealComponent anchors with a recipe family
// in the soy-honey-sesame-rice-vinegar style. Tests assert in-memory data
// shape — no DB round-trips.

import {
  buildGlazedBitesSeed,
  GLAZED_BITE_TAG,
  filterGlazedBites,
} from '../../scripts/seedGlazedBites';

const REQUIRED_INGREDIENTS = ['soy', 'honey', 'sesame'];

describe('seedGlazedBites — D13', () => {
  const recipes = buildGlazedBitesSeed();

  it('emits at least 20 recipes', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(20);
  });

  it('at least 15 carry the glazed_bite tag in tagsJson', () => {
    const tagged = recipes.filter((r) => {
      if (!r.tagsJson) return false;
      try {
        const tags = JSON.parse(r.tagsJson);
        return Array.isArray(tags) && tags.includes(GLAZED_BITE_TAG);
      } catch {
        return false;
      }
    });
    expect(tagged.length).toBeGreaterThanOrEqual(15);
  });

  it('every recipe has soy + honey + sesame in the ingredient list', () => {
    for (const r of recipes) {
      const ingText = r.ingredients.join(' ').toLowerCase();
      for (const required of REQUIRED_INGREDIENTS) {
        expect(ingText).toContain(required);
      }
    }
  });

  it('spans at least 3 dietary buckets', () => {
    const buckets = new Set<string>();
    for (const r of recipes) {
      for (const d of r.dietaryBuckets) buckets.add(d);
    }
    expect(buckets.size).toBeGreaterThanOrEqual(3);
  });

  it('spans the target protein matrix (turkey, steak, halloumi, paneer, tofu, shrimp)', () => {
    const proteins = new Set(recipes.map((r) => r.protein_kind.toLowerCase()));
    expect(proteins.has('ground turkey')).toBe(true);
    expect([...proteins].some((p) => p.includes('steak'))).toBe(true);
    expect(proteins.has('halloumi')).toBe(true);
    expect(proteins.has('paneer')).toBe(true);
    expect([...proteins].some((p) => p.includes('tofu'))).toBe(true);
    expect(proteins.has('shrimp')).toBe(true);
  });

  it('every recipe references an oven/pan/air-fryer finishing method', () => {
    for (const r of recipes) {
      const allInstr = r.instructions.join(' ').toLowerCase();
      const hits =
        allInstr.includes('toaster') ||
        allInstr.includes('skillet') ||
        allInstr.includes('air fry') ||
        allInstr.includes('air-fry') ||
        allInstr.includes('sear') ||
        allInstr.includes('oven') ||
        allInstr.includes('pan');
      expect(hits).toBe(true);
    }
  });

  describe('filterGlazedBites helper', () => {
    it('returns only recipes whose tagsJson contains glazed_bite', () => {
      const out = filterGlazedBites([
        { id: 'a', tagsJson: JSON.stringify(['glazed_bite']) },
        { id: 'b', tagsJson: JSON.stringify(['cravings_made_real']) },
        { id: 'c', tagsJson: null },
      ]);
      expect(out.map((r) => r.id)).toEqual(['a']);
    });

    it('handles malformed JSON safely', () => {
      const out = filterGlazedBites([{ id: 'x', tagsJson: 'oops' }]);
      expect(out).toEqual([]);
    });
  });
});
