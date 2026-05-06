// backend/__tests__/data/cuisineArchetypeMatrix.test.ts
// ROADMAP 4.0 Tier D4 — Archetype coverage matrix.

import {
  ARCHETYPES,
  Archetype,
  getCuisineArchetypeStatus,
  assignArchetype,
} from '../../src/data/cuisineArchetypeMatrix';
import { listAllCanonicals } from '../../src/data/cuisineTaxonomy';

describe('archetype matrix structure', () => {
  it('declares exactly 8 archetypes', () => {
    expect(ARCHETYPES).toHaveLength(8);
    expect(ARCHETYPES).toEqual([
      'weeknight_main',
      'weekend_project',
      'comfort_stew',
      'rice_or_grain',
      'vegetable_forward',
      'sweet_or_dessert',
      'breakfast',
      'quick_lunch',
    ]);
  });

  it('every canonical × archetype returns required | optional | n/a', () => {
    const valid = new Set(['required', 'optional', 'n/a']);
    for (const c of listAllCanonicals()) {
      for (const a of ARCHETYPES) {
        const status = getCuisineArchetypeStatus(c.canonical, a);
        expect(status).not.toBeNull();
        expect(valid.has(status as string)).toBe(true);
      }
    }
  });

  it('returns null for unknown canonical', () => {
    expect(
      getCuisineArchetypeStatus('klingon', 'weeknight_main' as Archetype),
    ).toBeNull();
  });

  it('every active canonical has weeknight_main = required (default)', () => {
    for (const c of listAllCanonicals()) {
      if (c.deprecated) continue;
      expect(getCuisineArchetypeStatus(c.canonical, 'weeknight_main')).toBe(
        'required',
      );
    }
  });

  it('honors per-cuisine overrides — Mexican breakfast = required', () => {
    expect(getCuisineArchetypeStatus('mexican', 'breakfast')).toBe(
      'required',
    );
  });

  it('honors per-cuisine overrides — Persian weekend_project = required', () => {
    expect(getCuisineArchetypeStatus('persian', 'weekend_project')).toBe(
      'required',
    );
  });

  it('Italian rice_or_grain = required (risotto)', () => {
    expect(getCuisineArchetypeStatus('italian', 'rice_or_grain')).toBe(
      'required',
    );
  });
});

describe('assignArchetype — deterministic classification', () => {
  const baseRecipe = {
    cookTimeMin: 30,
    courseType: 'dinner',
    ingredientNames: ['chicken thigh', 'olive oil', 'garlic'],
    title: 'Lemon Chicken',
  };

  it('breakfast course type → breakfast archetype', () => {
    expect(
      assignArchetype({ ...baseRecipe, courseType: 'breakfast' }),
    ).toBe('breakfast');
  });

  it('dessert course type → sweet_or_dessert', () => {
    expect(assignArchetype({ ...baseRecipe, courseType: 'dessert' })).toBe(
      'sweet_or_dessert',
    );
  });

  it('cookTime > 60 → weekend_project', () => {
    expect(
      assignArchetype({ ...baseRecipe, cookTimeMin: 90 }),
    ).toBe('weekend_project');
  });

  it('cookTime ≤ 20 + non-dinner course → quick_lunch', () => {
    expect(
      assignArchetype({ ...baseRecipe, cookTimeMin: 15, courseType: 'lunch' }),
    ).toBe('quick_lunch');
  });

  it('stew-marker ingredient → comfort_stew (regardless of cook time)', () => {
    expect(
      assignArchetype({
        ...baseRecipe,
        title: 'Persian Fesenjan',
        ingredientNames: ['chicken thigh', 'walnut', 'pomegranate'],
      }),
    ).toBe('comfort_stew');
  });

  it('grain-anchored ingredient → rice_or_grain', () => {
    expect(
      assignArchetype({
        ...baseRecipe,
        title: 'Chicken Rice Bowl',
        ingredientNames: ['chicken', 'jasmine rice', 'scallion'],
      }),
    ).toBe('rice_or_grain');
  });

  it('biryani classified as rice_or_grain (grain marker)', () => {
    expect(
      assignArchetype({
        ...baseRecipe,
        title: 'Chicken Biryani',
        ingredientNames: ['chicken', 'basmati rice', 'saffron'],
      }),
    ).toBe('rice_or_grain');
  });

  it('no protein source → vegetable_forward', () => {
    expect(
      assignArchetype({
        ...baseRecipe,
        title: 'Roasted Vegetables',
        ingredientNames: ['carrot', 'parsnip', 'olive oil', 'thyme'],
      }),
    ).toBe('vegetable_forward');
  });

  it('default — chicken with cook time 30, no markers → weeknight_main', () => {
    expect(assignArchetype(baseRecipe)).toBe('weeknight_main');
  });

  it('is deterministic — same input always returns same archetype', () => {
    const a = assignArchetype(baseRecipe);
    const b = assignArchetype(baseRecipe);
    expect(a).toBe(b);
  });
});
