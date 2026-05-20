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
import {
  findOrGenerateRecipe,
  dice,
  pickBestCatalogImage,
} from '../../../lib/coach/findOrGenerateRecipe';

const mockGen = recipeApi.generateFromDescription as jest.Mock;
const mockGetAll = recipeApi.getAllRecipes as jest.Mock;
// Default the catalog search to empty so existing tests fall through
// to AI gen (their original behavior pre-Y-Live-7).
const emptyCatalog = () => Promise.resolve({ data: { recipes: [] } });

// The axios response interceptor (lib/api/core.ts) unwraps the backend's
// {success, data} envelope, so by the time recipeApi.generateFromDescription
// resolves, the response is shaped {data: {recipe: {...}}} — NOT
// {data: {success, data: {recipe}}}. Fixture mirrors post-interceptor reality.
const FIXTURE = {
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
};

beforeEach(() => {
  mockGen.mockReset();
  mockGetAll.mockReset();
  mockGetAll.mockImplementation(emptyCatalog);
});

describe('findOrGenerateRecipe', () => {
  it('maps backend gen → RecipeCardPayload (preserves structured ingredients)', async () => {
    mockGen.mockResolvedValue(FIXTURE);
    const { primary: payload } = await findOrGenerateRecipe('pizza margarita');
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
      data: { recipe: { title: 'X' } },
    });
    const { primary: payload } = await findOrGenerateRecipe('x');
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
    expect(mockGen).toHaveBeenCalledWith('Pizza margarita', { mode: 'recipe-ask' });
  });
});

// Y-Live-7 — fuzzy DB lookup before AI gen. Founder bug 2026-05-19:
// "Pizza Margarita" should find the curated "Pizza Margherita" in the
// catalog (typo tolerance) before falling through to AI gen.
describe('pickBestCatalogImage (pure)', () => {
  it('returns undefined when sources is empty', () => {
    expect(pickBestCatalogImage('grilled chicken', [])).toBeUndefined();
  });

  it('picks the highest-Dice title with an imageUrl', () => {
    const out = pickBestCatalogImage('grilled chicken', [
      { title: 'Banana Bread', imageUrl: 'https://a/banana.jpg' },
      { title: 'Grilled Chicken Tandoori', imageUrl: 'https://a/tandoori.jpg' },
      { title: 'Mushroom Risotto', imageUrl: 'https://a/risotto.jpg' },
    ]);
    expect(out).toBe('https://a/tandoori.jpg');
  });

  it('returns the only source when there is one entry', () => {
    const out = pickBestCatalogImage('grilled chicken', [
      { title: 'Pasta', imageUrl: 'https://a/pasta.jpg' },
    ]);
    expect(out).toBe('https://a/pasta.jpg');
  });
});

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
    const { primary: payload } = await findOrGenerateRecipe('Pizza Margarita');
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
    const { primary: payload } = await findOrGenerateRecipe('Pizza Margarita');
    expect(payload.title).toBe('Pizza Margherita'); // from gen FIXTURE
    expect(mockGen).toHaveBeenCalledWith('Pizza Margarita', { mode: 'recipe-ask' });
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
    const { primary: payload } = await findOrGenerateRecipe('Pizza Margarita');
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
    const { primary: payload } = await findOrGenerateRecipe('Pizza Margarita');
    expect(payload.title).toBe('Pizza Margherita');
    expect(mockGen).toHaveBeenCalled();
  });
});

// Founder rule 2026-05-19: a recipe ask must never escape to LLM
// paragraphs. When AI gen errors out (quota, 500, network), fall back to
// the best below-threshold catalog candidate so the wedge still renders
// a card. Only when BOTH paths fail does findOrGenerate throw.
describe('findOrGenerateRecipe — catalog fallback when AI gen fails', () => {
  // Title "Grilled Salmon Bowl" vs query "Grilled chicken" scores ~0.41
  // (Dice on bigrams) — below the 0.55 primary threshold, so not the
  // first hit. When AI gen throws, this becomes the fallback so the
  // wedge can still hand back a card.
  const BELOW_THRESHOLD_CATALOG = {
    data: {
      recipes: [
        {
          id: 'rcp_grilled_salmon_bowl',
          title: 'Grilled Salmon Bowl',
          description: 'Smoky salmon over rice.',
          servings: 4,
          ingredients: [
            { name: 'salmon', amount: 1, unit: 'lb' },
            { name: 'rice', amount: 1, unit: 'cup' },
          ],
          instructions: [{ text: 'Grill salmon.' }, { text: 'Serve.' }],
          calories: 500,
        },
      ],
    },
  };

  it('AI gen throws + below-threshold catalog → returns catalog fallback (no throw)', async () => {
    mockGetAll.mockResolvedValue(BELOW_THRESHOLD_CATALOG);
    mockGen.mockRejectedValue(new Error('AI quota exceeded'));
    const { primary } = await findOrGenerateRecipe('Grilled chicken');
    expect(primary.title).toBe('Grilled Salmon Bowl');
    expect(primary.recipeId).toBe('rcp_grilled_salmon_bowl');
    expect(mockGen).toHaveBeenCalled();
  });

  it('AI gen throws + no catalog candidates → propagates the gen error', async () => {
    mockGetAll.mockResolvedValue({ data: { recipes: [] } });
    mockGen.mockRejectedValue(new Error('AI down'));
    await expect(findOrGenerateRecipe('Grilled chicken')).rejects.toThrow(/AI down/);
  });
});

// Founder ask 2026-05-19: ambiguous recipe asks should pick ONE recipe
// using N=1 signals + expose alternates for "Show me another →".
describe('findOrGenerateRecipe — N=1 ranker + alternates', () => {
  const MULTI_CANDIDATE_CATALOG = {
    data: {
      recipes: [
        {
          id: 'rcp_italian',
          title: 'Grilled Chicken Italian',
          cuisine: 'Italian',
          servings: 4,
          ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
          instructions: [{ text: 'Grill.' }],
        },
        {
          id: 'rcp_japanese',
          title: 'Grilled Chicken Japanese',
          cuisine: 'Japanese',
          servings: 4,
          ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
          instructions: [{ text: 'Grill.' }],
        },
        {
          id: 'rcp_mexican',
          title: 'Grilled Chicken Mexican',
          cuisine: 'Mexican',
          servings: 4,
          ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
          instructions: [{ text: 'Grill.' }],
        },
      ],
    },
  };

  it('lastCookCuisine boosts the matching catalog candidate to primary', async () => {
    mockGetAll.mockResolvedValue(MULTI_CANDIDATE_CATALOG);
    const result = await findOrGenerateRecipe('Grilled Chicken Italian', {
      pantryNames: [],
      lastCookCuisine: 'Japanese',
      topAdjacentCuisine: null,
    });
    // Italian still wins on Dice (title-exact), but Japanese gets the
    // cuisine bonus — close-Dice candidates flip via N=1.
    // Verify primary always comes from the ranker (deterministic).
    expect(result.primary.recipeId).toBeDefined();
    expect(result.alternates.length).toBe(2);
    // Alternates carry the non-primary candidates in ranked order.
    expect(result.alternates.map((r) => r.recipeId)).not.toContain(
      result.primary.recipeId,
    );
  });

  it('exposes rationale when pantry overlap drives the pick', async () => {
    mockGetAll.mockResolvedValue({
      data: {
        recipes: [
          {
            id: 'rcp_a',
            title: 'Grilled Chicken Bowl',
            servings: 4,
            ingredients: [
              { name: 'chicken', amount: 1, unit: 'lb' },
              { name: 'paprika', amount: 1, unit: 'tsp' },
            ],
            instructions: [{ text: 'Grill.' }],
          },
        ],
      },
    });
    const result = await findOrGenerateRecipe('Grilled chicken', {
      pantryNames: ['paprika'],
      lastCookCuisine: null,
      topAdjacentCuisine: null,
    });
    expect(result.rationale).toMatch(/paprika/i);
  });

  it('AI-gen-only result has empty alternates (no catalog pool to swap into)', async () => {
    mockGetAll.mockResolvedValue({ data: { recipes: [] } });
    mockGen.mockResolvedValue(FIXTURE);
    const result = await findOrGenerateRecipe('pizza margarita');
    expect(result.primary.title).toBe('Pizza Margherita');
    expect(result.alternates).toEqual([]);
  });

  // Founder bug 2026-05-20 (round 3): legacy catalog rows are dropped
  // by the structured-ingredient filter, so the image-borrow path
  // couldn't find anything to inherit from even when imageUrls were
  // available. The wedge now uses a SEPARATE raw-rows-with-imageUrl
  // list for borrow lookups — legacy rows with photos still contribute.
  it('AI-gen inherits imageUrls from LEGACY catalog rows (no structured ingredients required)', async () => {
    mockGetAll.mockResolvedValue({
      data: {
        recipes: [
          {
            id: 'rcp_legacy',
            title: 'Grilled Chicken Tandoori',
            // No structured ingredients — only legacy `text` fields.
            // The ranker drops this row; the image-borrow path keeps it.
            ingredients: [{ text: '1 lb chicken' }, { text: '2 tbsp yogurt' }],
            instructions: [{ text: 'Grill.' }],
            imageUrl: 'https://images.example.com/tandoori-real-photo.jpg',
          },
        ],
      },
    });
    mockGen.mockResolvedValue(FIXTURE); // no imageUrl in fixture
    const result = await findOrGenerateRecipe('Grilled chicken');
    expect(result.primary.imageUrls).toEqual([
      'https://images.example.com/tandoori-real-photo.jpg',
    ]);
  });

  it('AI-gen result inherits imageUrls from a structured catalog candidate too', async () => {
    mockGetAll.mockResolvedValue({
      data: {
        recipes: [
          {
            id: 'rcp_other',
            title: 'Grilled Salmon Bowl',
            cuisine: 'American',
            servings: 4,
            ingredients: [{ name: 'salmon', amount: 1, unit: 'lb' }],
            instructions: [{ text: 'Grill.' }],
            imageUrl: 'https://images.example.com/grilled-salmon-bowl.jpg',
          },
        ],
      },
    });
    mockGen.mockResolvedValue(FIXTURE);
    const result = await findOrGenerateRecipe('Grilled chicken');
    expect(result.primary.imageUrls).toEqual([
      'https://images.example.com/grilled-salmon-bowl.jpg',
    ]);
  });

  it('does NOT overwrite imageUrls when AI gen already provided them', async () => {
    mockGetAll.mockResolvedValue({
      data: {
        recipes: [
          {
            id: 'rcp_other',
            title: 'Grilled Salmon Bowl',
            servings: 4,
            ingredients: [{ name: 'salmon', amount: 1, unit: 'lb' }],
            instructions: [{ text: 'Grill.' }],
            imageUrl: 'https://catalog.example.com/should-not-win.jpg',
          },
        ],
      },
    });
    mockGen.mockResolvedValue({
      data: {
        recipe: {
          ...FIXTURE.data.recipe,
          imageUrl: 'https://gen.example.com/from-ai.jpg',
        },
      },
    });
    const result = await findOrGenerateRecipe('Grilled chicken');
    expect(result.primary.imageUrls).toEqual(['https://gen.example.com/from-ai.jpg']);
  });

  it('does not crash when no catalog candidates have an image', async () => {
    mockGetAll.mockResolvedValue({
      data: {
        recipes: [
          {
            id: 'rcp_noimg',
            title: 'Grilled Salmon Bowl',
            servings: 4,
            ingredients: [{ name: 'salmon', amount: 1, unit: 'lb' }],
            instructions: [{ text: 'Grill.' }],
            // no imageUrl
          },
        ],
      },
    });
    mockGen.mockResolvedValue(FIXTURE);
    const result = await findOrGenerateRecipe('Grilled chicken');
    // No image borrowed → primary.imageUrls stays undefined.
    expect(result.primary.imageUrls).toBeUndefined();
  });
});
