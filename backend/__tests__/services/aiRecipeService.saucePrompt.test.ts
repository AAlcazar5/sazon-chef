// 'sauce' meal type — sauces/condiments/dressings/dips (tzatziki, chimichurri,
// harissa, …) as a first-class catalog category. Both prompt builders must
// instruct the model to make a flavor accompaniment, NOT a standalone meal,
// without disturbing the existing snack/dessert branches.

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';

import {
  aiRecipeService,
  type RecipeGenerationParams,
} from '../../src/services/aiRecipeService';

const base: RecipeGenerationParams = {
  userId: null,
  mealType: 'sauce',
  cuisineOverride: 'Greek',
};

const buildFull = (p: RecipeGenerationParams): string =>
  (
    aiRecipeService as unknown as {
      buildRecipePrompt: (x: RecipeGenerationParams) => string;
    }
  ).buildRecipePrompt(p);

describe("sauce branch — buildSanitizedRecipePrompt (Path B)", () => {
  it('instructs a sauce/condiment, not a meal', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(base);
    expect(out.toLowerCase()).toMatch(/sauce|condiment|dressing|dip/);
    expect(out.toLowerCase()).toMatch(/accompaniment|not a (standalone )?meal|not a main/);
  });

  it('does not regress the snack branch', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt({ ...base, mealType: 'snack' });
    expect(out).toMatch(/snack recipe/i);
    expect(out.toLowerCase()).not.toMatch(/condiment/);
  });

  it('respects an explicit recipeTitle (no sauce override copy)', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt({
      ...base,
      recipeTitle: 'Tzatziki',
    });
    expect(out).toMatch(/This is a sauce recipe\./);
  });
});

describe('sauce branch — buildRecipePrompt (full prompt / seed path)', () => {
  it('instructs a sauce/condiment, not a meal', () => {
    const out = buildFull(base).toLowerCase();
    expect(out).toMatch(/sauce|condiment|dressing|dip/);
    expect(out).toMatch(/accompaniment|not a (standalone )?meal|not a main/);
  });

  it('does not regress the dessert branch', () => {
    const out = buildFull({ ...base, mealType: 'dessert' });
    expect(out).toMatch(/dessert recipe/i);
    expect(out.toLowerCase()).not.toMatch(/condiment/);
  });
});
