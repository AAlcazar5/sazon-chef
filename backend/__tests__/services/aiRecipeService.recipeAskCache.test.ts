// Tier Y wedge perf (founder Telegram 2026-05-20 Track B): integration
// tests pinning the cache behavior wired into
// aiRecipeService.generateFromDescription. The cache must:
//
//   1. MISS on a fresh query, call the provider, store the result.
//   2. HIT on a repeat query, return the cached value WITHOUT calling
//      the provider again (saves DeepSeek $$ + ~4s latency).
//   3. ONLY apply to recipe-ask mode — the recipe-creation flow keeps
//      its provider-bound path (PII argument).
//   4. Cache hits are case + whitespace insensitive (key normalization).

process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';
process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test-key';

const mockedRoute = jest.fn();
const mockedGen = jest.fn();

jest.mock('../../src/services/aiProviders/AIProviderManager', () => {
  return {
    AIProviderManager: jest.fn().mockImplementation(() => ({
      routeToModel: mockedRoute,
      generateRecipe: mockedGen,
      getAvailableProviders: () => ['claude', 'deepseek'],
    })),
  };
});

import { aiRecipeService } from '../../src/services/aiRecipeService';
import { aiGenRecipeCache, recipeAskCacheKey } from '../../src/services/aiGenRecipeCache';

const VALID_RECIPE = {
  title: 'Grilled Chicken',
  description: 'Simple grilled chicken breast with herbs.',
  cuisine: 'American',
  mealType: 'dinner',
  cookTime: 25,
  difficulty: 'easy',
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

beforeEach(() => {
  jest.clearAllMocks();
  // Purge any stale cache entries between tests to keep cases isolated.
  // The CacheService doesn't expose a clear() — overwrite by setting the
  // same keys to undefined-ish doesn't help, so we delete keys we know
  // tests will touch. Easier path: instantiate per test via spec-local
  // helper. For now, use unique queries so cache pollution is harmless.
  mockedRoute.mockReturnValue({
    model: 'deepseek-chat',
    provider: 'deepseek',
    providerOrder: ['deepseek', 'claude'],
  });
  mockedGen.mockResolvedValue(VALID_RECIPE);
});

describe('aiRecipeService — recipe-ask cache integration', () => {
  it('MISS path: first ask calls the provider AND stores the result', async () => {
    const q = `cache-miss-${Date.now()}-${Math.random()}`;
    const out = await aiRecipeService.generateFromDescription(q, 'free', {
      mode: 'recipe-ask',
    });
    expect(out.title).toBe('Grilled Chicken');
    expect(mockedGen).toHaveBeenCalledTimes(1);
    // Cache should now hold this entry.
    expect(aiGenRecipeCache.get(recipeAskCacheKey(q))).not.toBeNull();
  });

  it('HIT path: second ask with same query returns cached, NO provider call', async () => {
    const q = `cache-hit-${Date.now()}-${Math.random()}`;
    await aiRecipeService.generateFromDescription(q, 'free', { mode: 'recipe-ask' });
    mockedGen.mockClear();

    const out = await aiRecipeService.generateFromDescription(q, 'free', {
      mode: 'recipe-ask',
    });
    expect(out.title).toBe('Grilled Chicken');
    expect(mockedGen).not.toHaveBeenCalled();
  });

  it('HIT is case-insensitive ("Grilled chicken" hits "grilled chicken")', async () => {
    const lower = `case-fold-${Date.now()}-${Math.random()}`;
    const upper = lower.toUpperCase();
    await aiRecipeService.generateFromDescription(lower, 'free', { mode: 'recipe-ask' });
    mockedGen.mockClear();

    await aiRecipeService.generateFromDescription(upper, 'free', { mode: 'recipe-ask' });
    expect(mockedGen).not.toHaveBeenCalled();
  });

  it('recipe-creation path (no mode) is NOT cached — always calls provider', async () => {
    const q = `creation-mode-${Date.now()}-${Math.random()}`;
    await aiRecipeService.generateFromDescription(q, 'free');
    await aiRecipeService.generateFromDescription(q, 'free');
    expect(mockedGen).toHaveBeenCalledTimes(2);
    // Cache should NOT hold a recipe-ask key for this description.
    expect(aiGenRecipeCache.get(recipeAskCacheKey(q))).toBeNull();
  });

  it('a recipe-creation call does not pollute the recipe-ask cache lookup', async () => {
    const q = `cross-mode-${Date.now()}-${Math.random()}`;
    // First, recipe-creation call (no caching).
    await aiRecipeService.generateFromDescription(q, 'free');
    mockedGen.mockClear();
    // Then recipe-ask call — should MISS (creation didn't store).
    await aiRecipeService.generateFromDescription(q, 'free', { mode: 'recipe-ask' });
    expect(mockedGen).toHaveBeenCalledTimes(1);
  });

  it('failed validation does NOT poison the cache', async () => {
    const q = `bad-${Date.now()}-${Math.random()}`;
    mockedGen.mockResolvedValueOnce({ title: '' }); // fails validation
    await expect(
      aiRecipeService.generateFromDescription(q, 'free', { mode: 'recipe-ask' }),
    ).rejects.toThrow();
    // Cache should be empty for this query — subsequent valid call must MISS.
    expect(aiGenRecipeCache.get(recipeAskCacheKey(q))).toBeNull();
  });
});
