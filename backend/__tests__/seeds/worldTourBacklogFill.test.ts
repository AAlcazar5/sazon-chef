// ROADMAP 4.0 Tier T-bis loose-end — world-tour backlog fill test.

import { buildWorldTourSeed } from '../../scripts/seedWorldTourBacklogFill';

describe('seedWorldTourBacklogFill', () => {
  const seed = buildWorldTourSeed();

  it('produces ≥130 recipes (lifts catalog past the 1500 floor)', () => {
    expect(seed.length).toBeGreaterThanOrEqual(130);
  });

  it('every recipe has unique id, title, ingredients, and instructions', () => {
    const ids = new Set(seed.map((r) => r.id));
    expect(ids.size).toBe(seed.length);
    for (const r of seed) {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.ingredients.length).toBeGreaterThanOrEqual(4);
      expect(r.instructions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('covers ≥10 distinct canonical cuisines', () => {
    const cuisines = new Set(seed.map((r) => r.canonicalCuisine));
    expect(cuisines.size).toBeGreaterThanOrEqual(10);
  });

  it('every recipe has macros set (no zero placeholders)', () => {
    for (const r of seed) {
      expect(r.calories).toBeGreaterThan(100);
      expect(r.protein).toBeGreaterThan(0);
      expect(r.carbs).toBeGreaterThan(0);
      expect(r.fat).toBeGreaterThan(0);
    }
  });

  it('all dinners cook in ≤120 minutes (weeknight bias)', () => {
    for (const r of seed) {
      expect(r.cookTime).toBeLessThanOrEqual(120);
    }
  });

  it('every recipe sets canonicalCuisine to a non-empty lowercase slug', () => {
    for (const r of seed) {
      expect(r.canonicalCuisine).toMatch(/^[a-z_]+$/);
    }
  });
});
