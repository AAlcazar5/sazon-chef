// backend/__tests__/services/skillTierService.test.ts
// Group 10X Phase 9 — composer skill tier progression tests.

import {
  computeSkillTier,
  visibleSlotsForTier,
  filterComponentsByTier,
  TIER_THRESHOLDS,
} from '../../src/services/skillTierService';

describe('TIER_THRESHOLDS', () => {
  it('beginner→cook at 5 plates, cook→chef at 20 plates', () => {
    expect(TIER_THRESHOLDS.cook).toBe(5);
    expect(TIER_THRESHOLDS.chef).toBe(20);
  });
});

describe('computeSkillTier', () => {
  it('returns beginner for 0 plates cooked', () => {
    expect(computeSkillTier(0)).toBe('beginner');
  });
  it('returns beginner for 4 plates (just below cook threshold)', () => {
    expect(computeSkillTier(4)).toBe('beginner');
  });
  it('returns cook at exactly 5 plates', () => {
    expect(computeSkillTier(5)).toBe('cook');
  });
  it('returns cook for 19 plates (just below chef threshold)', () => {
    expect(computeSkillTier(19)).toBe('cook');
  });
  it('returns chef at exactly 20 plates', () => {
    expect(computeSkillTier(20)).toBe('chef');
  });
  it('returns chef for 100 plates', () => {
    expect(computeSkillTier(100)).toBe('chef');
  });
});

describe('visibleSlotsForTier', () => {
  it('beginner sees only protein, base, vegetable (3 slots)', () => {
    expect(visibleSlotsForTier('beginner')).toEqual(['protein', 'base', 'vegetable']);
  });
  it('cook unlocks sauce (4 slots)', () => {
    expect(visibleSlotsForTier('cook')).toEqual(['protein', 'base', 'vegetable', 'sauce']);
  });
  it('chef unlocks garnish too (5 slots)', () => {
    expect(visibleSlotsForTier('chef')).toEqual([
      'protein',
      'base',
      'vegetable',
      'sauce',
      'garnish',
    ]);
  });
});

describe('filterComponentsByTier', () => {
  const allComponents = [
    { id: 'simple-1', slot: 'protein', complexity: 1 },
    { id: 'simple-2', slot: 'protein', complexity: 1 },
    { id: 'mid-1', slot: 'protein', complexity: 2 },
    { id: 'advanced-1', slot: 'protein', complexity: 3 },
    { id: 'sauce-1', slot: 'sauce', complexity: 1 },
    { id: 'garnish-1', slot: 'garnish', complexity: 1 },
  ];

  it('beginner sees only complexity=1 components and only allowed slots', () => {
    const filtered = filterComponentsByTier(allComponents, 'beginner');
    expect(filtered.find((c) => c.id === 'sauce-1')).toBeUndefined();
    expect(filtered.find((c) => c.id === 'garnish-1')).toBeUndefined();
    expect(filtered.find((c) => c.id === 'mid-1')).toBeUndefined();
    expect(filtered.find((c) => c.id === 'advanced-1')).toBeUndefined();
    expect(filtered.find((c) => c.id === 'simple-1')).toBeDefined();
  });

  it('cook sees complexity ≤ 2 across protein/base/vegetable/sauce', () => {
    const filtered = filterComponentsByTier(allComponents, 'cook');
    expect(filtered.find((c) => c.id === 'mid-1')).toBeDefined();
    expect(filtered.find((c) => c.id === 'sauce-1')).toBeDefined();
    expect(filtered.find((c) => c.id === 'garnish-1')).toBeUndefined();
    expect(filtered.find((c) => c.id === 'advanced-1')).toBeUndefined();
  });

  it('chef sees everything', () => {
    const filtered = filterComponentsByTier(allComponents, 'chef');
    expect(filtered).toHaveLength(allComponents.length);
  });

  it('treats components without a complexity field as complexity=1 (defensive)', () => {
    const noComplexity = [{ id: 'x', slot: 'protein' }];
    const filtered = filterComponentsByTier(noComplexity, 'beginner');
    expect(filtered).toHaveLength(1);
  });
});
