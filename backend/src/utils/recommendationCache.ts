// backend/src/utils/recommendationCache.ts

import { cacheService } from './cacheService';

interface RecipeFilters {
  cuisines?: string[];
  dietaryRestrictions?: string[];
  maxCookTime?: number;
  difficulty?: string[];
}

interface CacheKeyParams {
  userId: string;
  filters: RecipeFilters;
  limit?: number;
  offset?: number;
}

interface TemporalCacheParams {
  userId: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  date?: string;
}

interface DailySuggestionsCacheParams {
  userId: string;
  date: string;
}

class RecommendationCacheService {
  private readonly CACHE_TTL = {
    RECIPES: 5 * 60 * 1000, // 5 minutes
    RANDOM_RECIPE: 2 * 60 * 1000, // 2 minutes
    DAILY_SUGGESTIONS: 10 * 60 * 1000, // 10 minutes
    MEAL_SUGGESTIONS: 5 * 60 * 1000, // 5 minutes
    USER_PREFERENCES: 30 * 60 * 1000, // 30 minutes
    BEHAVIORAL_DATA: 15 * 60 * 1000, // 15 minutes
  };

  /**
   * Cache suggested recipes
   */
  async getSuggestedRecipes<T>(
    params: CacheKeyParams,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cacheKey = this.generateRecipeCacheKey(params);
    return cacheService.getOrSet(
      'suggested_recipes',
      { ...params },
      fetchFn,
      this.CACHE_TTL.RECIPES
    );
  }

  /**
   * Cache random recipe
   */
  async getRandomRecipe<T>(
    userId: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    return cacheService.getOrSet(
      'random_recipe',
      { userId },
      fetchFn,
      this.CACHE_TTL.RANDOM_RECIPE
    );
  }

  /**
   * Cache daily suggestions
   */
  async getDailySuggestions<T>(
    params: DailySuggestionsCacheParams,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    return cacheService.getOrSet(
      'daily_suggestions',
      params,
      fetchFn,
      this.CACHE_TTL.DAILY_SUGGESTIONS
    );
  }

  /**
   * Cache meal-specific suggestions
   */
  async getMealSuggestions<T>(
    params: TemporalCacheParams,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    return cacheService.getOrSet(
      'meal_suggestions',
      params,
      fetchFn,
      this.CACHE_TTL.MEAL_SUGGESTIONS
    );
  }

  /**
   * Cache user preferences
   */
  async getUserPreferences<T>(
    userId: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    return cacheService.getOrSet(
      'user_preferences',
      { userId },
      fetchFn,
      this.CACHE_TTL.USER_PREFERENCES
    );
  }

  /**
   * Cache behavioral data
   */
  async getBehavioralData<T>(
    userId: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    return cacheService.getOrSet(
      'behavioral_data',
      { userId },
      fetchFn,
      this.CACHE_TTL.BEHAVIORAL_DATA
    );
  }

  /**
   * Invalidate user-specific caches
   */
  invalidateUserCache(userId: string): void {
    const prefixes = [
      'suggested_recipes',
      'random_recipe',
      'daily_suggestions',
      'meal_suggestions',
      'user_preferences',
      'behavioral_data'
    ];

    prefixes.forEach(prefix => {
      // Invalidate all entries that contain this userId
      const keysToDelete: string[] = [];
      for (const key of cacheService['cache'].keys()) {
        if (key.includes(userId)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => cacheService['cache'].delete(key));
    });

    console.log(`🗑️ Invalidated all caches for user ${userId}`);
  }

  /**
   * Invalidate recipe-related caches
   */
  invalidateRecipeCache(): void {
    const prefixes = [
      'suggested_recipes',
      'random_recipe',
      'daily_suggestions',
      'meal_suggestions'
    ];

    prefixes.forEach(prefix => {
      cacheService.invalidate(prefix);
    });

    console.log('🗑️ Invalidated all recipe caches');
  }

  /**
   * Generate cache key for recipes
   */
  private generateRecipeCacheKey(params: CacheKeyParams): string {
    const { userId, filters, limit = 10, offset = 0 } = params;
    
    return `suggested_recipes:${userId}:${JSON.stringify({
      cuisines: filters.cuisines?.sort(),
      dietaryRestrictions: filters.dietaryRestrictions?.sort(),
      maxCookTime: filters.maxCookTime,
      difficulty: filters.difficulty?.sort(),
      limit,
      offset
    })}`;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cacheService.getStats();
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    cacheService.clear();
  }
}

// Create singleton instance
export const recommendationCache = new RecommendationCacheService();

export default recommendationCache;
