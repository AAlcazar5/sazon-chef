// Tier Y live-wiring. Maps the /recipes/generate-from-description
// response → RecipeCardPayload (CookingModeRecipeCard props). Backend
// returns both flat `ingredients: string[]` (legacy form-fill) AND new
// `ingredientsStructured: {name,amount,unit}[]` (this PR) — the adapter
// uses the structured form so the stepper can rescale exactly. RED-first.

jest.mock('../../../lib/api/recipe', () => ({
  recipeApi: {
    generateFromDescription: jest.fn(),
  },
}));

import { recipeApi } from '../../../lib/api/recipe';
import { findOrGenerateRecipe } from '../../../lib/coach/findOrGenerateRecipe';

const mockGen = recipeApi.generateFromDescription as jest.Mock;

const FIXTURE = {
  data: {
    success: true,
    data: {
      recipe: {
        title: 'Pizza Margherita',
        description: 'Classic Neapolitan-style pizza.',
        servings: 2,
        ingredients: ['1 cup flour', '0.5 tsp salt'],
        ingredientsStructured: [
          { name: 'flour', amount: 1, unit: 'cup' },
          { name: 'salt', amount: 0.5, unit: 'tsp' },
          { name: 'salt to taste', amount: 0, unit: '' }, // junk row
        ],
        instructions: ['Mix dough.', 'Bake at 500°F for 10 minutes.'],
        calories: 600,
        protein: 22,
        carbs: 80,
        fat: 18,
        fiber: 4,
        tips: ['Use 00 flour for chewier crust.'],
      },
    },
  },
};

beforeEach(() => mockGen.mockReset());

describe('findOrGenerateRecipe', () => {
  it('maps backend gen → RecipeCardPayload (preserves structured ingredients)', async () => {
    mockGen.mockResolvedValue(FIXTURE);
    const payload = await findOrGenerateRecipe('pizza margarita');
    expect(payload.title).toBe('Pizza Margherita');
    expect(payload.description).toBe('Classic Neapolitan-style pizza.');
    expect(payload.baseServings).toBe(2);
    // junk row (amount 0 / empty unit) is dropped — never fabricates
    expect(payload.ingredients).toEqual([
      { name: 'flour', amount: 1, unit: 'cup' },
      { name: 'salt', amount: 0.5, unit: 'tsp' },
    ]);
    expect(payload.steps).toEqual([
      'Mix dough.',
      'Bake at 500°F for 10 minutes.',
    ]);
    expect(payload.macros).toEqual({
      calories: 600,
      protein: 22,
      carbs: 80,
      fat: 18,
      fiber: 4,
    });
    expect(payload.notes).toContain('00 flour');
  });

  it('handles missing optional fields gracefully', async () => {
    mockGen.mockResolvedValue({
      data: { success: true, data: { recipe: { title: 'X' } } },
    });
    const payload = await findOrGenerateRecipe('x');
    expect(payload.title).toBe('X');
    expect(payload.baseServings).toBe(4); // sensible default
    expect(payload.ingredients).toEqual([]);
    expect(payload.steps).toEqual([]);
  });

  it('throws when the response has no recipe (caller surfaces the error)', async () => {
    mockGen.mockResolvedValue({ data: { success: false } });
    await expect(findOrGenerateRecipe('x')).rejects.toThrow();
  });

  it('passes the query through to recipeApi.generateFromDescription', async () => {
    mockGen.mockResolvedValue(FIXTURE);
    await findOrGenerateRecipe('Pizza margarita');
    expect(mockGen).toHaveBeenCalledWith('Pizza margarita');
  });
});
