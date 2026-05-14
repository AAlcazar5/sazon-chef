// Path B — `buildSanitizedRecipePrompt` PII guard tests.
//
// Free-tier users route recipe generation through Gemini Flash-Lite.
// The promise: PII never leaves Anthropic infrastructure. This test
// suite pins the contract that the sanitized prompt builder produces
// a prompt containing ONLY allow-listed fields, regardless of what
// PII the caller passes in `RecipeGenerationParams`.

// AIProviderManager's constructor demands at least one provider key.
// Set a fake one before the module loads so importing aiRecipeService
// doesn't throw — the prompt builder is a pure function on the service,
// so no real provider call happens.
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';

import { aiRecipeService } from '../../src/services/aiRecipeService';

const baseParams = {
  userId: 'u-private-id-leak',
  recipeTitle: undefined,
  mealType: 'dinner' as const,
  cuisineOverride: 'Persian',
  maxCookTimeForMeal: 30,
};

const pollutedParams = {
  ...baseParams,
  // The fields below are ALL PII or PII-adjacent and must not appear in
  // the output prompt.
  userPreferences: {
    likedCuisines: ['Persian', 'Thai'],
    dietaryRestrictions: ['vegetarian'],
    strictDietaryRestrictions: ['kosher'],
    preferToAvoidRestrictions: ['gluten'],
    bannedIngredients: ['cilantro', 'shrimp'],
    preferredSuperfoods: ['quinoa', 'spinach'],
    spiceLevel: 'mild',
    cookTimePreference: 25,
    cookingSkillLevel: 'beginner',
    weekdayCookTime: 20,
    weekendCookTime: 45,
  },
  macroGoals: {
    calories: 2200,
    protein: 165,
    carbs: 220,
    fat: 70,
  },
  physicalProfile: {
    gender: 'female',
    age: 31,
    activityLevel: 'moderate',
    fitnessGoal: 'maintenance',
  },
  previousMeals: [
    { title: 'Khoresh Fesenjan', cuisine: 'Persian', mainProtein: 'chicken' },
  ],
  userFeedback: {
    likedRecipes: [
      { title: 'Pad Thai', cuisine: 'Thai', ingredients: ['rice noodles', 'shrimp'], cookTime: 30 },
    ],
    dislikedRecipes: [
      { title: 'Beet Soup', cuisine: 'Eastern European', ingredients: ['beets'], cookTime: 45 },
    ],
  },
  maxTotalPrepTime: 60,
  maxDailyBudget: 25,
  remainingBudget: 12.5,
  dayDate: '2026-05-13',
};

describe('aiRecipeService.buildSanitizedRecipePrompt', () => {
  it('includes the meal type, cuisine, and cook time when set', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(baseParams);
    expect(out).toMatch(/dinner/);
    expect(out).toContain('Persian');
    expect(out).toMatch(/30 minutes/);
    expect(out).toMatch(/Return JSON only/);
  });

  it('uses the recipe title verbatim when provided', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt({
      ...baseParams,
      recipeTitle: 'Khoresh Fesenjan',
    });
    expect(out).toContain('Khoresh Fesenjan');
  });

  it('strips the userId completely from output', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(pollutedParams);
    expect(out).not.toContain('u-private-id-leak');
  });

  it('strips userPreferences (allergens / dietary / banned ingredients / superfoods)', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(pollutedParams);
    expect(out.toLowerCase()).not.toContain('vegetarian');
    expect(out.toLowerCase()).not.toContain('kosher');
    expect(out.toLowerCase()).not.toContain('cilantro');
    expect(out.toLowerCase()).not.toContain('shrimp');
    expect(out.toLowerCase()).not.toContain('quinoa');
    expect(out.toLowerCase()).not.toContain('spinach');
    expect(out.toLowerCase()).not.toContain('beginner'); // cookingSkillLevel
  });

  it('strips macroGoals (calorie / protein / carb / fat targets)', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(pollutedParams);
    expect(out).not.toContain('2200');
    expect(out).not.toContain('165');
    expect(out).not.toContain('220');
    // Note: '70' might appear coincidentally — test relies on the prompt
    // not having a "70" anywhere, which is true for the allow-list output.
    expect(out).not.toContain('70');
    expect(out.toLowerCase()).not.toMatch(/macro|calorie target|protein target/);
  });

  it('strips physicalProfile (gender / age / activity / fitness goal)', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(pollutedParams);
    expect(out.toLowerCase()).not.toContain('female');
    expect(out).not.toContain('31');
    expect(out.toLowerCase()).not.toContain('moderate');
    expect(out.toLowerCase()).not.toContain('maintenance');
    expect(out.toLowerCase()).not.toMatch(/fitness goal/);
  });

  it('strips previousMeals + userFeedback (cooking history)', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(pollutedParams);
    expect(out).not.toContain('Pad Thai');
    expect(out).not.toContain('rice noodles');
    expect(out.toLowerCase()).not.toMatch(/previous meals|liked recipes|disliked/);
  });

  it('strips budget fields', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(pollutedParams);
    expect(out).not.toContain('25');
    expect(out).not.toContain('12.5');
    expect(out.toLowerCase()).not.toContain('budget');
  });

  it('strips the day date', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt(pollutedParams);
    expect(out).not.toContain('2026-05-13');
  });

  it('produces a substantially shorter prompt than the personalized builder', () => {
    const sanitized = aiRecipeService.buildSanitizedRecipePrompt(pollutedParams);
    // The personalized builder isn't exposed publicly, but we know it
    // grows with userPreferences/macroGoals/etc. — a useful proxy is
    // that the sanitized version stays well under ~600 chars even with
    // every field set, while the personalized version commonly exceeds
    // 2000.
    expect(sanitized.length).toBeLessThan(600);
  });

  it('rejects unsafe cuisine input (regex-injection / oversized strings)', () => {
    const out = aiRecipeService.buildSanitizedRecipePrompt({
      ...baseParams,
      cuisineOverride: 'Persian"; LEAK_KEY; --',
    });
    // The cuisine sanitizer should strip this entirely; the rest of the
    // prompt still renders.
    expect(out).not.toContain('LEAK_KEY');
    expect(out).not.toContain(';');
  });
});
