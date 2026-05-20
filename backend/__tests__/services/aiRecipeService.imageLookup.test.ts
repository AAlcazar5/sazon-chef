// Tier Y wedge photos (founder 2026-05-20): the wedge needs a real
// food photo for ANY recipe ask, not just queries that happen to match
// a catalog row. aiRecipeService.generateFromDescription now consults
// Spoonacular's complexSearch post-validation to attach an imageUrl,
// cached 24h by title via recipeImageCache.

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test-key';
process.env.SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || 'test-spoon';

const mockedRoute = jest.fn();
const mockedGen = jest.fn();
const mockedFindImage = jest.fn();
const mockedFindImages = jest.fn();
const mockedIsConfigured = jest.fn();

jest.mock('../../src/services/aiProviders/AIProviderManager', () => ({
  AIProviderManager: jest.fn().mockImplementation(() => ({
    routeToModel: mockedRoute,
    generateRecipe: mockedGen,
    getAvailableProviders: () => ['claude', 'deepseek'],
  })),
}));

jest.mock('../../src/services/spoonacularService', () => ({
  spoonacularService: {
    isConfigured: () => mockedIsConfigured(),
    findRecipeImage: (q: string) => mockedFindImage(q),
    findRecipeImages: (q: string, n: number, cuisine?: string) =>
      mockedFindImages(q, n, cuisine),
  },
}));

import { aiRecipeService } from '../../src/services/aiRecipeService';
import { aiGenRecipeCache } from '../../src/services/aiGenRecipeCache';
import {
  recipeImageCache,
  recipeImageCacheKey,
} from '../../src/services/recipeImageCache';

/** Factory returning a fresh recipe object each call — prevents test-
 *  to-test mutation leakage if any code path on the recipe payload
 *  accidentally mutates it. */
function makeValidRecipe() {
  return {
    title: 'Grilled Chicken',
    description: 'Simple grilled chicken breast with herbs.',
    cuisine: 'American',
    mealType: 'dinner' as const,
    cookTime: 25,
    difficulty: 'easy' as const,
    servings: 2,
    calories: 400,
    protein: 35,
    carbs: 10,
    fat: 20,
    fiber: 2,
    ingredients: [
      { name: 'chicken breast', amount: 1, unit: 'lb' },
      { name: 'olive oil', amount: 2, unit: 'tbsp' },
    ],
    instructions: [
      { step: 1, instruction: 'Pat chicken dry.' },
      { step: 2, instruction: 'Grill for 8 minutes per side.' },
    ],
    tips: [],
    tags: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  aiGenRecipeCache.clear();
  recipeImageCache.clear();
  mockedIsConfigured.mockReturnValue(true);
  mockedRoute.mockReturnValue({
    model: 'deepseek-chat',
    provider: 'deepseek',
    providerOrder: ['deepseek', 'claude'],
  });
  // Fresh recipe object per call — no mutation leakage across tests.
  mockedGen.mockImplementation(async () => makeValidRecipe());
});

describe('aiRecipeService — Spoonacular image lookup (recipe-ask only)', () => {
  it('attaches 3-photo imageUrls + primary imageUrl from Spoonacular', async () => {
    mockedFindImages.mockResolvedValueOnce([
      'https://spoonacular.test/grilled-1.jpg',
      'https://spoonacular.test/grilled-2.jpg',
      'https://spoonacular.test/grilled-3.jpg',
    ]);
    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrls).toEqual([
      'https://spoonacular.test/grilled-1.jpg',
      'https://spoonacular.test/grilled-2.jpg',
      'https://spoonacular.test/grilled-3.jpg',
    ]);
    expect(out.imageUrl).toBe('https://spoonacular.test/grilled-1.jpg'); // legacy field = primary
    // Looked up by the validated title + cuisine, count=3.
    expect(mockedFindImages).toHaveBeenCalledWith('Grilled Chicken', 3, 'American');
  });

  it('does NOT look up an image for recipe-CREATION mode (no flag → no lookup)', async () => {
    await aiRecipeService.generateFromDescription('Grandma fesenjan', 'free');
    expect(mockedFindImages).not.toHaveBeenCalled();
  });

  it('cache HIT on second ask: no second Spoonacular call', async () => {
    mockedFindImages.mockResolvedValueOnce([
      'https://spoonacular.test/grilled-1.jpg',
      'https://spoonacular.test/grilled-2.jpg',
    ]);
    await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    aiGenRecipeCache.clear(); // force re-gen; image cache stays warm
    mockedFindImages.mockClear();

    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrls?.length).toBe(2);
    expect(mockedFindImages).not.toHaveBeenCalled();
  });

  it('cache key uses TITLE + cuisine + count — cross-query dedup when those match', async () => {
    mockedFindImages.mockResolvedValueOnce(['https://spoonacular.test/grilled.jpg']);
    await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    aiGenRecipeCache.clear();
    mockedFindImages.mockClear();
    await aiRecipeService.generateFromDescription('chicken on the grill', 'free', {
      mode: 'recipe-ask',
    });
    expect(mockedFindImages).not.toHaveBeenCalled();
  });

  it('Spoonacular not configured → recipe still returns, imageUrls undefined', async () => {
    mockedIsConfigured.mockReturnValueOnce(false);
    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrls).toBeUndefined();
    expect(mockedFindImages).not.toHaveBeenCalled();
  });

  it('Spoonacular throws → recipe still returns, imageUrls undefined', async () => {
    mockedFindImages.mockRejectedValueOnce(new Error('spoonacular 500'));
    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrls).toBeUndefined();
  });

  it('Spoonacular returns empty array → recipe returns without imageUrls', async () => {
    mockedFindImages.mockResolvedValueOnce([]);
    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrls).toBeUndefined();
  });
});

describe('recipeImageCacheKey', () => {
  it('case-folds + collapses whitespace (mirrors aiGenRecipeCache normalization)', () => {
    expect(recipeImageCacheKey('Grilled Chicken')).toBe(
      recipeImageCacheKey('  grilled   chicken  '),
    );
  });
});
