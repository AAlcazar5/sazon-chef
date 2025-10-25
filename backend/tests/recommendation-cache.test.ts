// backend/tests/recommendation-cache.test.ts
import { recommendationCache } from '../src/utils/recommendationCache';

describe('Recommendation Cache', () => {
  beforeEach(() => {
    recommendationCache.clearAllCaches();
  });

  afterEach(() => {
    recommendationCache.clearAllCaches();
  });

  describe('getSuggestedRecipes', () => {
    it('should cache and return suggested recipes', async () => {
      const mockFetcher = jest.fn().mockResolvedValue([
        { id: 'recipe-1', title: 'Test Recipe' }
      ]);

      const params = {
        userId: 'user-1',
        filters: {
          cuisines: ['Italian'],
          maxCookTime: 30
        }
      };

      // First call should fetch from source
      const result1 = await recommendationCache.getSuggestedRecipes(params, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(result1).toEqual([{ id: 'recipe-1', title: 'Test Recipe' }]);

      // Second call should use cache
      const result2 = await recommendationCache.getSuggestedRecipes(params, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual([{ id: 'recipe-1', title: 'Test Recipe' }]);
    });

    it('should handle different filter parameters separately', async () => {
      const mockFetcher = jest.fn().mockResolvedValue([]);

      const params1 = {
        userId: 'user-1',
        filters: { cuisines: ['Italian'] }
      };

      const params2 = {
        userId: 'user-1',
        filters: { cuisines: ['Mexican'] }
      };

      await recommendationCache.getSuggestedRecipes(params1, mockFetcher);
      await recommendationCache.getSuggestedRecipes(params2, mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRandomRecipe', () => {
    it('should cache and return random recipe', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        id: 'recipe-1',
        title: 'Random Recipe'
      });

      const userId = 'user-1';

      // First call should fetch from source
      const result1 = await recommendationCache.getRandomRecipe(userId, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ id: 'recipe-1', title: 'Random Recipe' });

      // Second call should use cache
      const result2 = await recommendationCache.getRandomRecipe(userId, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual({ id: 'recipe-1', title: 'Random Recipe' });
    });
  });

  describe('getUserPreferences', () => {
    it('should cache and return user preferences', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        id: 'pref-1',
        userId: 'user-1',
        cookTimePreference: 30
      });

      const userId = 'user-1';

      // First call should fetch from source
      const result1 = await recommendationCache.getUserPreferences(userId, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await recommendationCache.getUserPreferences(userId, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Still only called once
      expect(result1).toEqual(result2);
    });
  });

  describe('getUserBehavioralData', () => {
    it('should cache and return behavioral data', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        likedRecipes: [],
        dislikedRecipes: [],
        savedRecipes: [],
        consumedRecipes: []
      });

      const userId = 'user-1';

      // First call should fetch from source
      const result1 = await recommendationCache.getUserBehavioralData(userId, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await recommendationCache.getUserBehavioralData(userId, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Still only called once
      expect(result1).toEqual(result2);
    });
  });

  describe('getDailySuggestions', () => {
    it('should cache and return daily suggestions', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({
        breakfast: { id: 'recipe-1', title: 'Breakfast' },
        lunch: { id: 'recipe-2', title: 'Lunch' },
        dinner: { id: 'recipe-3', title: 'Dinner' },
        snack: { id: 'recipe-4', title: 'Snack' },
        totalMacros: { calories: 2000, protein: 150, carbs: 200, fat: 67 }
      });

      const userId = 'user-1';
      const date = '2024-01-01';

      // First call should fetch from source
      const result1 = await recommendationCache.getDailySuggestions(userId, date, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await recommendationCache.getDailySuggestions(userId, date, mockFetcher);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Still only called once
      expect(result1).toEqual(result2);
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all caches for a specific user', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ data: 'test' });

      const userId = 'user-1';

      // Populate cache
      await recommendationCache.getSuggestedRecipes(
        { userId, filters: {} }, 
        mockFetcher
      );
      await recommendationCache.getRandomRecipe(userId, mockFetcher);
      await recommendationCache.getUserPreferences(userId, mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(3);

      // Invalidate user cache
      recommendationCache.invalidateUserCache(userId);

      // Next calls should fetch from source again
      await recommendationCache.getSuggestedRecipes(
        { userId, filters: {} }, 
        mockFetcher
      );
      await recommendationCache.getRandomRecipe(userId, mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(5); // 3 + 2 more
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = recommendationCache.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('activeSize');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('expiredEntries');
      expect(stats).toHaveProperty('keys');
      
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.activeSize).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
      expect(typeof stats.expiredEntries).toBe('number');
      expect(Array.isArray(stats.keys)).toBe(true);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ data: 'test' });

      const userId = 'user-1';

      // Populate cache
      await recommendationCache.getSuggestedRecipes(
        { userId, filters: {} }, 
        mockFetcher
      );
      await recommendationCache.getRandomRecipe(userId, mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(2);

      // Clear all caches
      recommendationCache.clearAllCaches();

      // Next calls should fetch from source again
      await recommendationCache.getSuggestedRecipes(
        { userId, filters: {} }, 
        mockFetcher
      );
      await recommendationCache.getRandomRecipe(userId, mockFetcher);

      expect(mockFetcher).toHaveBeenCalledTimes(4); // 2 + 2 more
    });
  });

  describe('error handling', () => {
    it('should handle fetcher errors gracefully', async () => {
      const mockFetcher = jest.fn().mockRejectedValue(new Error('Fetcher error'));

      const params = {
        userId: 'user-1',
        filters: {}
      };

      await expect(
        recommendationCache.getSuggestedRecipes(params, mockFetcher)
      ).rejects.toThrow('Fetcher error');
    });
  });
});
