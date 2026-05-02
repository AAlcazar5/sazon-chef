// backend/__tests__/services/cuisineCoherence.test.ts
// Group 10X Phase 2 — Cuisine coherence rules unit tests.

import {
  CUISINE_CLASHES,
  componentsClash,
  plateCoherenceScore,
} from '../../src/services/cuisineCoherence';

describe('CUISINE_CLASHES table', () => {
  it('has at least 4 clash pairs seeded', () => {
    expect(CUISINE_CLASHES.length).toBeGreaterThanOrEqual(4);
  });

  it('every entry is a pair of non-empty arrays', () => {
    for (const [setA, setB] of CUISINE_CLASHES) {
      expect(Array.isArray(setA)).toBe(true);
      expect(Array.isArray(setB)).toBe(true);
      expect(setA.length).toBeGreaterThan(0);
      expect(setB.length).toBeGreaterThan(0);
    }
  });

  it('contains the Korean / Argentinian clash', () => {
    const found = CUISINE_CLASHES.some(
      ([a, b]) =>
        (a.includes('Korean') && b.includes('Argentinian')) ||
        (a.includes('Argentinian') && b.includes('Korean'))
    );
    expect(found).toBe(true);
  });

  it('contains the Mexican / Japanese clash', () => {
    const found = CUISINE_CLASHES.some(
      ([a, b]) =>
        (a.includes('Mexican') && b.includes('Japanese')) ||
        (a.includes('Japanese') && b.includes('Mexican'))
    );
    expect(found).toBe(true);
  });

  it('contains the Indian / Italian clash', () => {
    const found = CUISINE_CLASHES.some(
      ([a, b]) =>
        (a.includes('Indian') && b.includes('Italian')) ||
        (a.includes('Italian') && b.includes('Indian'))
    );
    expect(found).toBe(true);
  });

  it('contains the French / Vietnamese clash', () => {
    const found = CUISINE_CLASHES.some(
      ([a, b]) =>
        (a.includes('French') && b.includes('Vietnamese')) ||
        (a.includes('Vietnamese') && b.includes('French'))
    );
    expect(found).toBe(true);
  });
});

describe('componentsClash()', () => {
  const makeComponent = (cuisines: string[]) => ({ cuisineTags: cuisines });

  it('returns true when one component is Korean and the other is Argentinian', () => {
    expect(
      componentsClash(makeComponent(['Korean']), makeComponent(['Argentinian']))
    ).toBe(true);
  });

  it('is symmetric — Argentinian + Korean also clashes', () => {
    expect(
      componentsClash(makeComponent(['Argentinian']), makeComponent(['Korean']))
    ).toBe(true);
  });

  it('returns true for Mexican + Japanese', () => {
    expect(
      componentsClash(makeComponent(['Mexican']), makeComponent(['Japanese']))
    ).toBe(true);
  });

  it('returns false when both are Mediterranean', () => {
    expect(
      componentsClash(makeComponent(['Mediterranean']), makeComponent(['Mediterranean']))
    ).toBe(false);
  });

  it('returns false for South American + Argentinian (same side of clash)', () => {
    expect(
      componentsClash(makeComponent(['South American']), makeComponent(['Argentinian']))
    ).toBe(false);
  });

  it('returns false for Indian + Thai (not in any clash pair)', () => {
    expect(
      componentsClash(makeComponent(['Indian']), makeComponent(['Thai']))
    ).toBe(false);
  });

  it('returns false when either component has empty cuisineTags', () => {
    expect(componentsClash(makeComponent([]), makeComponent(['Korean']))).toBe(false);
    expect(componentsClash(makeComponent(['Korean']), makeComponent([]))).toBe(false);
  });
});

describe('plateCoherenceScore()', () => {
  const makeComponent = (cuisines: string[]) => ({ cuisineTags: cuisines });

  it('returns 0 when any two components clash', () => {
    const plate = [makeComponent(['Korean']), makeComponent(['Argentinian'])];
    expect(plateCoherenceScore(plate)).toBe(0);
  });

  it('returns 0 for a 4-component plate with one clashing pair', () => {
    const plate = [
      makeComponent(['Korean']),
      makeComponent(['Asian']),
      makeComponent(['Mediterranean']),
      makeComponent(['Argentinian']),
    ];
    expect(plateCoherenceScore(plate)).toBe(0);
  });

  it('returns 1 when all components share a single cuisine', () => {
    const plate = [
      makeComponent(['Japanese', 'Asian']),
      makeComponent(['Japanese']),
      makeComponent(['Asian', 'Japanese']),
    ];
    expect(plateCoherenceScore(plate)).toBe(1);
  });

  it('returns 1 for a single-component plate (trivially coherent)', () => {
    expect(plateCoherenceScore([makeComponent(['Mediterranean'])])).toBe(1);
  });

  it('returns 0 for an empty plate', () => {
    expect(plateCoherenceScore([])).toBe(0);
  });

  it('returns a value between 0 and 1 for mixed non-clashing cuisines', () => {
    const plate = [
      makeComponent(['Mediterranean']),
      makeComponent(['American']),
      makeComponent(['European']),
    ];
    const score = plateCoherenceScore(plate);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
