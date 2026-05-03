// Group 10S: Kitchen IQ progress service — pure unit tests.

import {
  computeProgress,
  evaluateUnlocks,
  type ProgressInput,
} from '../../../src/modules/kitchenIQ/kitchenIQProgressService';
import { KITCHEN_IQ_MANIFEST } from '../../../src/modules/kitchenIQ/kitchenIQManifest';

const baseInput: ProgressInput = {
  recipesCookedAllTime: 0,
  cuisinesExploredCount: 0,
  ingredientsCooked: [],
  lastCheckedUnlocks: [],
};

describe('evaluateUnlocks', () => {
  it('returns starter cards (unlockCondition.type === "none") for a brand-new user', () => {
    const ids = evaluateUnlocks(baseInput);
    expect(ids).toContain('nut-protein');
    expect(ids).toContain('con-volume-eating');
    expect(ids).toContain('con-reading-labels');
  });

  it('cook_count threshold gates correctly', () => {
    const at4 = evaluateUnlocks({ ...baseInput, recipesCookedAllTime: 4 });
    const at5 = evaluateUnlocks({ ...baseInput, recipesCookedAllTime: 5 });
    expect(at4).not.toContain('nut-magnesium');
    expect(at5).toContain('nut-magnesium');
  });

  it('higher cook counts unlock more cards monotonically', () => {
    const ids5 = new Set(evaluateUnlocks({ ...baseInput, recipesCookedAllTime: 5 }));
    const ids15 = new Set(evaluateUnlocks({ ...baseInput, recipesCookedAllTime: 15 }));
    for (const id of ids5) expect(ids15.has(id)).toBe(true);
    expect(ids15.size).toBeGreaterThan(ids5.size);
  });

  it('cuisine_count threshold unlocks cuisine_health cards', () => {
    const at2 = evaluateUnlocks({ ...baseInput, cuisinesExploredCount: 2 });
    const at5 = evaluateUnlocks({ ...baseInput, cuisinesExploredCount: 5 });
    expect(at2).not.toContain('cui-okinawa');
    expect(at5).toContain('cui-okinawa');
    expect(at5).toContain('cui-mediterranean');
  });

  it('ingredient_used checks lowercase + trimmed match', () => {
    const noTurmeric = evaluateUnlocks({ ...baseInput, ingredientsCooked: ['chicken', 'rice'] });
    expect(noTurmeric).not.toContain('ing-turmeric');

    const withTurmeric = evaluateUnlocks({
      ...baseInput,
      ingredientsCooked: ['Turmeric', 'rice'],
    });
    expect(withTurmeric).toContain('ing-turmeric');
  });

  it('matches multi-word ingredient triggers', () => {
    const ids = evaluateUnlocks({
      ...baseInput,
      ingredientsCooked: ['apple cider vinegar', 'olive oil'],
    });
    expect(ids).toContain('ing-acv');
  });

  it('does not unlock cards whose conditions are unmet', () => {
    const ids = evaluateUnlocks({ ...baseInput, recipesCookedAllTime: 4 });
    expect(ids).not.toContain('nut-iron'); // requires 15
    expect(ids).not.toContain('cui-okinawa'); // requires 5 cuisines
  });
});

describe('computeProgress', () => {
  it('returns totalCards equal to manifest length', () => {
    const p = computeProgress(baseInput);
    expect(p.totalCards).toBe(KITCHEN_IQ_MANIFEST.length);
  });

  it('newUnlocks is empty when lastCheckedUnlocks already covers everything unlocked', () => {
    const ids = evaluateUnlocks({ ...baseInput, recipesCookedAllTime: 5 });
    const p = computeProgress({
      ...baseInput,
      recipesCookedAllTime: 5,
      lastCheckedUnlocks: ids,
    });
    expect(p.newUnlocks).toEqual([]);
  });

  it('newUnlocks contains only cards not in lastCheckedUnlocks', () => {
    const p = computeProgress({
      ...baseInput,
      recipesCookedAllTime: 5,
      lastCheckedUnlocks: ['nut-protein'], // user already saw the starter, but not the rest
    });
    expect(p.newUnlocks).toContain('nut-magnesium');
    expect(p.newUnlocks).toContain('nut-fiber');
    expect(p.newUnlocks).not.toContain('nut-protein');
  });

  it('unlockedCount matches unlockedIds length', () => {
    const p = computeProgress({ ...baseInput, recipesCookedAllTime: 20 });
    expect(p.unlockedCount).toBe(p.unlockedIds.length);
  });

  it('empty cooking history returns only starter (none-condition) cards', () => {
    const p = computeProgress(baseInput);
    const noneCondCount = KITCHEN_IQ_MANIFEST.filter(
      (m) => m.unlockCondition.type === 'none',
    ).length;
    expect(p.unlockedCount).toBe(noneCondCount);
  });

  it('stale ids in lastCheckedUnlocks do not appear in unlockedIds', () => {
    const p = computeProgress({
      ...baseInput,
      lastCheckedUnlocks: ['nonexistent-card-id', 'nut-protein'],
    });
    expect(p.unlockedIds).not.toContain('nonexistent-card-id');
    expect(p.unlockedIds).toContain('nut-protein');
    // The seen starter is not in newUnlocks; the unseen starters are.
    expect(p.newUnlocks).not.toContain('nut-protein');
    expect(p.newUnlocks).toContain('con-volume-eating');
  });
});
