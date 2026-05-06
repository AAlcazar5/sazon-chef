// ROADMAP 4.0 TB4.1 — Persona generator test.

import {
  generateSyntheticPersonas,
  Persona,
} from '../../scripts/recommender/generateSyntheticPersonas';

describe('generateSyntheticPersonas (TB4.1)', () => {
  it('produces 100 personas by default', () => {
    const personas = generateSyntheticPersonas({ seed: 1 });
    expect(personas).toHaveLength(100);
  });

  it('is deterministic on seed', () => {
    const a = generateSyntheticPersonas({ seed: 42, count: 50 });
    const b = generateSyntheticPersonas({ seed: 42, count: 50 });
    expect(a).toEqual(b);
  });

  it('different seeds produce different personas', () => {
    const a = generateSyntheticPersonas({ seed: 1, count: 50 });
    const b = generateSyntheticPersonas({ seed: 2, count: 50 });
    expect(a[0]).not.toEqual(b[0]);
  });

  it('covers expected distribution: ≥10% have allergies, ≥20% weeknight cookers', () => {
    const personas = generateSyntheticPersonas({ seed: 7 });
    const withAllergies = personas.filter((p) => p.allergies.length > 0);
    expect(withAllergies.length / personas.length).toBeGreaterThanOrEqual(0.1);
    const weeknight = personas.filter((p) => p.cookFrequency === 'weeknight');
    expect(weeknight.length / personas.length).toBeGreaterThanOrEqual(0.2);
  });

  it('no two personas are byte-identical', () => {
    const personas = generateSyntheticPersonas({ seed: 11 });
    const seen = new Set(personas.map((p: Persona) => JSON.stringify(p)));
    expect(seen.size).toBe(personas.length);
  });

  it('every persona has a 64-dim taste seed vector', () => {
    const personas = generateSyntheticPersonas({ seed: 1, count: 5 });
    for (const p of personas) {
      expect(p.tasteSeed).toHaveLength(64);
      for (const v of p.tasteSeed) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
