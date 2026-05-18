// styleHint — the positive diversity axis (#3 done properly).
//
// The dedup seed plateaued at ~70-100 distinct dishes/cuisine because
// {cuisine, mealType} prompting + negative title-avoidance asymptotes:
// the model keeps reaching for the iconic dish. styleHint feeds a POSITIVE
// per-job steer ("make a slow-braised regional dish, not the iconic one")
// into the prompt so it explores the cuisine's breadth. This pins the
// contract for both prompt builders.

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';

import {
  aiRecipeService,
  type RecipeGenerationParams,
} from '../../src/services/aiRecipeService';

const HINT = 'a slow-braised or stewed main — regional and lesser-known, not the iconic dish';

const base: RecipeGenerationParams = {
  userId: null,
  mealType: 'dinner',
  cuisineOverride: 'Pakistani',
};

// buildRecipePrompt is private; the seed path uses it. Cast to reach it,
// keeping the real param type so test inputs stay compile-checked.
const buildFull = (p: RecipeGenerationParams): string =>
  (
    aiRecipeService as unknown as {
      buildRecipePrompt: (x: RecipeGenerationParams) => string;
    }
  ).buildRecipePrompt(p);

describe('styleHint in buildSanitizedRecipePrompt (Path B / free tier)', () => {
  it('embeds the positive steer when set', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt({ ...base, styleHint: HINT });
    expect(out).toContain(HINT);
  });

  it('omits any steer line when styleHint is unset (no behavior change for existing callers)', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(base);
    expect(out).not.toMatch(/slow-braised|lesser-known|do NOT default/i);
  });

  it('does not fight an explicit recipeTitle (explicit dish wins)', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt({
      ...base,
      recipeTitle: 'Nihari',
      styleHint: HINT,
    });
    expect(out).not.toContain(HINT);
  });
});

describe('styleHint in buildRecipePrompt (full prompt / seed path)', () => {
  it('embeds the positive steer when set and no recipeTitle', () => {
    expect(buildFull({ ...base, styleHint: HINT })).toContain(HINT);
  });

  it('omits the steer when unset', () => {
    expect(buildFull(base)).not.toMatch(/do NOT default to the (most )?iconic/i);
  });

  it('recipeTitle takes precedence over styleHint', () => {
    const out = buildFull({ ...base, recipeTitle: 'Haleem', styleHint: HINT });
    expect(out).not.toContain(HINT);
  });
});
