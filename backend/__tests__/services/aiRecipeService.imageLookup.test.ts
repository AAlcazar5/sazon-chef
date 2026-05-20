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
  it('attaches imageUrl from Spoonacular when AI gen has none', async () => {
    mockedFindImage.mockResolvedValueOnce('https://spoonacular.test/grilled.jpg');
    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrl).toBe('https://spoonacular.test/grilled.jpg');
    // Looked up by the validated title, not the original query.
    expect(mockedFindImage).toHaveBeenCalledWith('Grilled Chicken');
  });

  it('does NOT look up an image for recipe-CREATION mode (no flag → no lookup)', async () => {
    await aiRecipeService.generateFromDescription('Grandma fesenjan', 'free');
    expect(mockedFindImage).not.toHaveBeenCalled();
  });

  it('cache HIT on second ask: no second Spoonacular call', async () => {
    mockedFindImage.mockResolvedValueOnce('https://spoonacular.test/grilled.jpg');
    await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    // Clear AI gen cache to force a re-gen but image cache stays warm.
    aiGenRecipeCache.clear();
    mockedFindImage.mockClear();

    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrl).toBe('https://spoonacular.test/grilled.jpg');
    expect(mockedFindImage).not.toHaveBeenCalled();
  });

  it('cache key uses the title, not the query — different queries that yield the same title share a cache hit', async () => {
    mockedFindImage.mockResolvedValueOnce('https://spoonacular.test/grilled.jpg');
    await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    // Manually seed: a SECOND query yields the same validated title.
    // (mocked gen always returns "Grilled Chicken")
    aiGenRecipeCache.clear();
    mockedFindImage.mockClear();
    await aiRecipeService.generateFromDescription('chicken on the grill', 'free', {
      mode: 'recipe-ask',
    });
    expect(mockedFindImage).not.toHaveBeenCalled();
  });

  it('Spoonacular not configured → recipe still returns, imageUrl undefined', async () => {
    mockedIsConfigured.mockReturnValueOnce(false);
    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrl).toBeUndefined();
    expect(mockedFindImage).not.toHaveBeenCalled();
  });

  it('Spoonacular throws → recipe still returns, imageUrl undefined (lookup must never fail the gen)', async () => {
    mockedFindImage.mockRejectedValueOnce(new Error('spoonacular 500'));
    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrl).toBeUndefined();
  });

  it('Spoonacular returns null (no match found) → recipe returns without imageUrl', async () => {
    mockedFindImage.mockResolvedValueOnce(null);
    const out = await aiRecipeService.generateFromDescription('Grilled chicken', 'free', {
      mode: 'recipe-ask',
    });
    expect(out.imageUrl).toBeUndefined();
  });
});

describe('recipeImageCacheKey', () => {
  it('case-folds + collapses whitespace (mirrors aiGenRecipeCache normalization)', () => {
    expect(recipeImageCacheKey('Grilled Chicken')).toBe(
      recipeImageCacheKey('  grilled   chicken  '),
    );
  });
});
