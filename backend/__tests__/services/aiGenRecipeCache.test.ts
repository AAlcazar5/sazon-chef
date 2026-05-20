// Tier Y wedge perf (founder Telegram 2026-05-20 Track B): unit tests
// for the recipe-ask cache key normalizer. Cache integration with
// aiRecipeService is covered separately in
// aiRecipeService.recipeAskCache.test.ts so this file can stay pure.

import { recipeAskCacheKey, aiGenRecipeCache } from '../../src/services/aiGenRecipeCache';

describe('recipeAskCacheKey', () => {
  it('produces a stable key for the canonical lowercase form (versioned prefix)', () => {
    // `:v2` suffix bumps when the cached value shape changes — bumping
    // it on a shape change is intentional, so this test pins the
    // current version. If you change the prefix here, write a follow-
    // up migration plan (old entries expire on TTL, new entries take
    // the bumped prefix, no in-flight breakage).
    expect(recipeAskCacheKey('grilled chicken')).toBe('recipe-ask:v2:grilled chicken');
  });

  it('case-folds so "Grilled chicken" and "GRILLED CHICKEN" share a cache entry', () => {
    expect(recipeAskCacheKey('Grilled chicken')).toBe(recipeAskCacheKey('GRILLED CHICKEN'));
    expect(recipeAskCacheKey('Grilled chicken')).toBe(recipeAskCacheKey('grilled chicken'));
  });

  it('trims surrounding whitespace', () => {
    expect(recipeAskCacheKey('  Grilled chicken  ')).toBe(
      recipeAskCacheKey('Grilled chicken'),
    );
  });

  it('collapses internal whitespace runs to a single space', () => {
    expect(recipeAskCacheKey('Grilled   chicken')).toBe(
      recipeAskCacheKey('Grilled chicken'),
    );
    expect(recipeAskCacheKey('Grilled\tchicken')).toBe(
      recipeAskCacheKey('Grilled chicken'),
    );
  });

  it('keys differ for semantically-different queries', () => {
    expect(recipeAskCacheKey('Grilled chicken')).not.toBe(
      recipeAskCacheKey('Grilled salmon'),
    );
    expect(recipeAskCacheKey('chicken')).not.toBe(recipeAskCacheKey('chicken thighs'));
  });
});

describe('aiGenRecipeCache (singleton)', () => {
  it('stores and retrieves a recipe by key', () => {
    const key = recipeAskCacheKey('cache-self-test-' + Date.now());
    const fixture = { title: 'Test Recipe', description: 'Fixture.' };
    aiGenRecipeCache.set(key, fixture);
    expect(aiGenRecipeCache.get(key)).toEqual(fixture);
  });

  it('returns null for a missing key', () => {
    expect(aiGenRecipeCache.get('recipe-ask:does-not-exist-' + Date.now())).toBeNull();
  });
});
