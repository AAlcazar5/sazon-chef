// backend/__tests__/utils/cuisineAdjacency.test.ts
// Group 11 Phase 1 — Cuisine Adjacency Engine tests.

import {
  getAdjacentCuisines,
  getCuisineFamily,
  calculateAdjacencyBoost,
  CUISINE_FAMILIES,
  ADJACENT_SCALE,
  __ALL_DEFINED_CUISINES,
} from '../../src/utils/cuisineAdjacency';

describe('CUISINE_FAMILIES', () => {
  it('defines all major continent/region families', () => {
    const expected = [
      'Latin American',
      'African',
      'Middle Eastern & Persian',
      'East & Southeast Asian',
      'South Asian',
    ];
    for (const f of expected) {
      expect(CUISINE_FAMILIES[f]).toBeDefined();
      expect(CUISINE_FAMILIES[f].length).toBeGreaterThan(0);
    }
  });

  it('every cuisine in every family has a non-empty name', () => {
    for (const cuisines of Object.values(CUISINE_FAMILIES)) {
      for (const c of cuisines) {
        expect(c.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('getCuisineFamily', () => {
  it('returns the family for a known cuisine', () => {
    expect(getCuisineFamily('Persian')).toBe('Middle Eastern & Persian');
    expect(getCuisineFamily('Nigerian')).toBe('African');
    expect(getCuisineFamily('Thai')).toBe('East & Southeast Asian');
    expect(getCuisineFamily('Puerto Rican')).toBe('Latin American');
  });

  it('returns null for an unknown cuisine', () => {
    expect(getCuisineFamily('Atlantean')).toBeNull();
  });
});

describe('getAdjacentCuisines', () => {
  it('returns adjacencies for a known cuisine with weights in (0, 1]', () => {
    const adj = getAdjacentCuisines('Thai');
    expect(adj.length).toBeGreaterThan(0);
    for (const a of adj) {
      expect(a.weight).toBeGreaterThan(0);
      expect(a.weight).toBeLessThanOrEqual(1);
      expect(['subcuisine', 'sibling', 'diaspora', 'technique']).toContain(a.relationship);
    }
  });

  it('returns an empty array for a cuisine with no adjacencies defined', () => {
    expect(getAdjacentCuisines('Atlantean')).toEqual([]);
  });

  it('is bidirectional — if Thai → Lao exists, then Lao → Thai exists with same weight', () => {
    const thaiAdj = getAdjacentCuisines('Thai');
    const laoFromThai = thaiAdj.find((a) => a.cuisine === 'Lao');
    expect(laoFromThai).toBeDefined();

    const laoAdj = getAdjacentCuisines('Lao');
    const thaiFromLao = laoAdj.find((a) => a.cuisine === 'Thai');
    expect(thaiFromLao).toBeDefined();
    expect(thaiFromLao!.weight).toBe(laoFromThai!.weight);
  });

  it('is bidirectional for every authored adjacency in the map', () => {
    for (const cuisine of __ALL_DEFINED_CUISINES) {
      const adj = getAdjacentCuisines(cuisine);
      for (const edge of adj) {
        const reverse = getAdjacentCuisines(edge.cuisine);
        const back = reverse.find((r) => r.cuisine === cuisine);
        expect(back).toBeDefined();
        expect(back!.weight).toBe(edge.weight);
      }
    }
  });

  it('does not include duplicate edges in the same direction', () => {
    for (const cuisine of __ALL_DEFINED_CUISINES) {
      const adj = getAdjacentCuisines(cuisine);
      const targets = adj.map((a) => a.cuisine);
      expect(new Set(targets).size).toBe(targets.length);
    }
  });
});

describe('calculateAdjacencyBoost', () => {
  it('returns the full exact boost when the recipe cuisine is in the user liked list', () => {
    const boost = calculateAdjacencyBoost(['Thai'], 'Thai', 0.3);
    expect(boost).toBe(0.3);
  });

  it('returns a scaled (lower) boost for an adjacent cuisine', () => {
    const boost = calculateAdjacencyBoost(['Thai'], 'Burmese', 0.3);
    expect(boost).toBeGreaterThan(0);
    expect(boost).toBeLessThan(0.3);
  });

  it('adjacent boost is always less than the exact boost (per spec)', () => {
    const exactBoost = 0.3;
    for (const cuisine of __ALL_DEFINED_CUISINES.slice(0, 30)) {
      const adj = getAdjacentCuisines(cuisine);
      for (const edge of adj) {
        const boost = calculateAdjacencyBoost([cuisine], edge.cuisine, exactBoost);
        expect(boost).toBeLessThan(exactBoost);
      }
    }
  });

  it('returns 0 for a cuisine with no adjacency to the user liked list', () => {
    const boost = calculateAdjacencyBoost(['Thai'], 'Swedish', 0.3);
    expect(boost).toBe(0);
  });

  it('handles empty user liked cuisines gracefully', () => {
    expect(calculateAdjacencyBoost([], 'Thai', 0.3)).toBe(0);
  });

  it('takes the strongest adjacency when multiple liked cuisines match', () => {
    // user likes Thai (Burmese weight 0.65) AND Indian (Burmese weight 0.45 via technique)
    const boost = calculateAdjacencyBoost(['Thai', 'Indian'], 'Burmese', 0.3);
    const expected = 0.3 * 0.65 * ADJACENT_SCALE;
    expect(boost).toBeCloseTo(expected, 5);
  });

  it('handles a recipe cuisine that has no entry in the map (graceful fallback)', () => {
    expect(calculateAdjacencyBoost(['Thai'], 'Atlantean', 0.3)).toBe(0);
  });
});

describe('Adjacency invariants per roadmap', () => {
  it('every authored cuisine has weight in [0, 1]', () => {
    for (const cuisine of __ALL_DEFINED_CUISINES) {
      const adj = getAdjacentCuisines(cuisine);
      for (const edge of adj) {
        expect(edge.weight).toBeGreaterThan(0);
        expect(edge.weight).toBeLessThanOrEqual(1);
      }
    }
  });
});
