// Tier Y live-wiring. Maps the /recipes/generate-from-description
// response → RecipeCardPayload (CookingModeRecipeCard props). Backend
// returns both flat `ingredients: string[]` (legacy form-fill) AND new
// `ingredientsStructured: {name,amount,unit}[]` (this PR) — the adapter
// uses the structured form so the stepper can rescale exactly. RED-first.

jest.mock('../../../lib/api/recipe', () => ({
  recipeApi: {
    generateFromDescription: jest.fn(),
    getAllRecipes: jest.fn(),
  },
}));

import { recipeApi } from '../../../lib/api/recipe';
import { findOrGenerateRecipe, dice } from '../../../lib/coach/findOrGenerateRecipe';

const mockGen = recipeApi.generateFromDescription as jest.Mock;
const mockGetAll = recipeApi.getAllRecipes as jest.Mock;
// Default the catalog search to empty so existing tests fall through
// to AI gen (their original behavior pre-Y-Live-7).
const emptyCatalog = () => Promise.resolve({ data: { recipes: [] } });

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

beforeEach(() => {
  mockGen.mockReset();
  mockGetAll.mockReset();
  mockGetAll.mockImplementation(emptyCatalog);
});

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

// Y-Live-7 — fuzzy DB lookup before AI gen. Founder bug 2026-05-19:
// "Pizza Margarita" should find the curated "Pizza Margherita" in the
// catalog (typo tolerance) before falling through to AI gen.
describe('dice (bigram similarity)', () => {
  it('handles single-char diff inside a token (Margarita ↔ Margherita)', () => {
    expect(dice('pizza margarita', 'Pizza Margherita')).toBeGreaterThan(0.7);
  });
  it('identical lowercase strings → 1.0', () => {
    expect(dice('carbonara', 'Carbonara')).toBeCloseTo(1.0, 2);
  });
  it('unrelated strings → very low', () => {
    expect(dice('pizza margarita', 'Salsa Macha (Mexican Chili Oil)')).toBeLessThan(
      0.3,
    );
  });
  it('empty / too-short → 0', () => {
    expect(dice('', 'anything')).toBe(0);
    expect(dice('a', 'a')).toBe(0); // <2 char strings have no bigrams
  });
});

describe('findOrGenerateRecipe — Y-Live-7 catalog-first lookup', () => {
  const CATALOG_HIT = {
    id: 'rcp_pizza_margherita',
    title: 'Pizza Margherita',
    description: 'Classic Neapolitan-style pizza.',
    servings: 2,
    ingredients: [
      { name: 'flour', amount: 1, unit: 'cup', text: '1 cup flour' },
      { name: 'mozzarella', amount: 4, unit: 'oz', text: '4 oz mozzarella' },
    ],
    instructions: [
      { text: 'Mix dough.', step: 1 },
      { text: 'Top + bake.', step: 2 },
    ],
    calories: 600,
    protein: 22,
    carbs: 80,
    fat: 18,
    fiber: 4,
    imageUrl: 'https://example.com/p.jpg',
    storageInstructions: 'Refrigerate leftovers up to 2 days.',
  };

  it('typo "Pizza Margarita" finds catalog "Pizza Margherita" (no gen call)', async () => {
    mockGetAll.mockResolvedValue({ data: { recipes: [CATALOG_HIT] } });
    const payload = await findOrGenerateRecipe('Pizza Margarita');
    expect(payload.title).toBe('Pizza Margherita');
    expect(payload.ingredients).toEqual([
      { name: 'flour', amount: 1, unit: 'cup' },
      { name: 'mozzarella', amount: 4, unit: 'oz' },
    ]);
    expect(payload.steps).toEqual(['Mix dough.', 'Top + bake.']);
    expect(payload.imageUrls).toEqual(['https://example.com/p.jpg']);
    // Y-Live-1: recipeId carried through so CookLaunchModal "Start cooking"
    // can navigate to /cooking?recipeId=…
    expect(payload.recipeId).toBe('rcp_pizza_margherita');
    // Y-Live-6: storageInstructions → notes so the NOTES block renders
    // (kitchen-mode parity — macros + author tips below the steps).
    expect(payload.notes).toBe('Refrigerate leftovers up to 2 days.');
    expect(mockGen).not.toHaveBeenCalled(); // catalog hit short-circuits gen
  });

  it('catalog has only unrelated recipes → falls through to AI gen', async () => {
    mockGetAll.mockResolvedValue({
      data: { recipes: [{ ...CATALOG_HIT, title: 'Banana Bread' }] },
    });
    mockGen.mockResolvedValue(FIXTURE);
    const payload = await findOrGenerateRecipe('Pizza Margarita');
    expect(payload.title).toBe('Pizza Margherita'); // from gen FIXTURE
    expect(mockGen).toHaveBeenCalledWith('Pizza Margarita');
  });

  it('catalog recipes lacking structured ingredients (legacy rows) → fall through to gen', async () => {
    mockGetAll.mockResolvedValue({
      data: {
        recipes: [
          {
            ...CATALOG_HIT,
            ingredients: [
              { text: '1 cup flour' }, // no name/amount/unit — legacy
              { text: '4 oz mozzarella' },
            ],
          },
        ],
      },
    });
    mockGen.mockResolvedValue(FIXTURE);
    const payload = await findOrGenerateRecipe('Pizza Margarita');
    expect(payload.title).toBe('Pizza Margherita'); // from gen, not the legacy catalog row
    expect(mockGen).toHaveBeenCalled();
  });

  it('empty catalog → falls through to gen', async () => {
    mockGetAll.mockResolvedValue({ data: { recipes: [] } });
    mockGen.mockResolvedValue(FIXTURE);
    await findOrGenerateRecipe('Pizza Margarita');
    expect(mockGen).toHaveBeenCalled();
  });

  it('catalog search throws → falls through to gen (resilient)', async () => {
    mockGetAll.mockRejectedValue(new Error('network'));
    mockGen.mockResolvedValue(FIXTURE);
    const payload = await findOrGenerateRecipe('Pizza Margarita');
    expect(payload.title).toBe('Pizza Margherita');
    expect(mockGen).toHaveBeenCalled();
  });
});
