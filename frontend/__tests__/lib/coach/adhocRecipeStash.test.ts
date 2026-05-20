// Tier Y-Live-2 follow-up (founder bug 2026-05-20): the ad-hoc stash
// lets AI-gen recipes (no catalog id) hand off to /cook-step via a
// process-local payload map. Pure module, tested in isolation.

import {
  setAdhocRecipe,
  getAdhocRecipe,
  clearAdhocRecipes,
  makeAdhocRecipeId,
} from '../../../lib/coach/adhocRecipeStash';
import type { RecipeCardPayload } from '../../../lib/coach/findOrGenerateRecipe';

const FIXTURE: RecipeCardPayload = {
  title: 'Grilled Chicken',
  description: 'Simple.',
  baseServings: 2,
  ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
  steps: ['Grill.', 'Rest.'],
};

beforeEach(() => clearAdhocRecipes());

describe('adhocRecipeStash', () => {
  it('round-trips a payload by id', () => {
    setAdhocRecipe('a1', FIXTURE);
    expect(getAdhocRecipe('a1')).toEqual(FIXTURE);
  });

  it('returns undefined for an unknown id', () => {
    expect(getAdhocRecipe('nope')).toBeUndefined();
  });

  it('single-slot semantics: a new set wipes prior entries', () => {
    setAdhocRecipe('a1', FIXTURE);
    setAdhocRecipe('a2', { ...FIXTURE, title: 'Other' });
    expect(getAdhocRecipe('a1')).toBeUndefined();
    expect(getAdhocRecipe('a2')?.title).toBe('Other');
  });

  it('repeated reads of the same id return the same payload', () => {
    setAdhocRecipe('a1', FIXTURE);
    const first = getAdhocRecipe('a1');
    const second = getAdhocRecipe('a1');
    expect(first).toBe(second);
  });

  it('clearAdhocRecipes empties the stash', () => {
    setAdhocRecipe('a1', FIXTURE);
    clearAdhocRecipes();
    expect(getAdhocRecipe('a1')).toBeUndefined();
  });
});

describe('makeAdhocRecipeId', () => {
  it('returns a string prefixed with adhoc_', () => {
    expect(makeAdhocRecipeId()).toMatch(/^adhoc_/);
  });

  it('produces unique ids on rapid calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => makeAdhocRecipeId()));
    expect(ids.size).toBe(100);
  });
});
