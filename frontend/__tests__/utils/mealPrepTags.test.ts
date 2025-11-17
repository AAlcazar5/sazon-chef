import {
  getMealPrepTags,
  getMealPrepSuitabilityBadge,
  getPrimaryMealPrepCategory,
} from '../../utils/mealPrepTags';
import type { Recipe } from '../../types';

describe('Meal Prep Tags', () => {
  describe('getMealPrepTags', () => {
    test('should return tags for freezable recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        freezable: true,
      };

      const tags = getMealPrepTags(recipe);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.some(tag => tag.id === 'freezable')).toBe(true);
    });

    test('should return tags for batch-friendly recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        batchFriendly: true,
      };

      const tags = getMealPrepTags(recipe);
      expect(tags.some(tag => tag.id === 'batch-friendly')).toBe(true);
    });

    test('should return tags for weekly prep recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        weeklyPrepFriendly: true,
      };

      const tags = getMealPrepTags(recipe);
      expect(tags.some(tag => tag.id === 'weekly-prep')).toBe(true);
    });

    test('should return "Great for Meal Prep" tag for high score', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepScore: 85,
      };

      const tags = getMealPrepTags(recipe);
      expect(tags.some(tag => tag.id === 'great-for-meal-prep')).toBe(true);
    });

    test('should return "Good for Meal Prep" tag for medium score', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepScore: 70,
      };

      const tags = getMealPrepTags(recipe);
      expect(tags.some(tag => tag.id === 'good-for-meal-prep')).toBe(true);
    });

    test('should return empty array for non-meal-prep recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Fresh Salad',
        description: 'Test',
        cookTime: 10,
        cuisine: 'American',
        calories: 200,
        protein: 5,
        carbs: 30,
        fat: 5,
        mealPrepSuitable: false,
        freezable: false,
        batchFriendly: false,
        weeklyPrepFriendly: false,
        mealPrepScore: 20,
      };

      const tags = getMealPrepTags(recipe);
      // Should not have great/good tags, but might have other tags if score-based
      expect(tags.length).toBe(0);
    });

    test('should sort tags by priority', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepScore: 85,
        freezable: true,
        batchFriendly: true,
        weeklyPrepFriendly: true,
      };

      const tags = getMealPrepTags(recipe);
      
      // Higher priority tags should come first
      const priorities = tags.map(tag => tag.priority);
      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i + 1]);
      }
    });
  });

  describe('getMealPrepSuitabilityBadge', () => {
    test('should return "Great for Meal Prep" for score >= 80', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepScore: 85,
      };

      const badge = getMealPrepSuitabilityBadge(recipe);
      expect(badge).toBe('Great for Meal Prep');
    });

    test('should return "Good for Meal Prep" for score 60-79', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepScore: 70,
      };

      const badge = getMealPrepSuitabilityBadge(recipe);
      expect(badge).toBe('Good for Meal Prep');
    });

    test('should return "Okay for Meal Prep" for score 40-59', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepScore: 50,
      };

      const badge = getMealPrepSuitabilityBadge(recipe);
      expect(badge).toBe('Okay for Meal Prep');
    });

    test('should return "Not Recommended for Meal Prep" for score < 40', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepScore: 30,
      };

      const badge = getMealPrepSuitabilityBadge(recipe);
      expect(badge).toBe('Not Recommended for Meal Prep');
    });

    test('should fallback to boolean flags when score is undefined', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepSuitable: true,
      };

      const badge = getMealPrepSuitabilityBadge(recipe);
      expect(badge).toBe('Meal Prep Suitable');
    });

    test('should return null for non-meal-prep recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Fresh Salad',
        description: 'Test',
        cookTime: 10,
        cuisine: 'American',
        calories: 200,
        protein: 5,
        carbs: 30,
        fat: 5,
        mealPrepSuitable: false,
        freezable: false,
        batchFriendly: false,
        weeklyPrepFriendly: false,
      };

      const badge = getMealPrepSuitabilityBadge(recipe);
      expect(badge).toBeNull();
    });
  });

  describe('getPrimaryMealPrepCategory', () => {
    test('should return primary category for meal prep recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Test Recipe',
        description: 'Test',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 15,
        mealPrepScore: 85,
        freezable: true,
      };

      const category = getPrimaryMealPrepCategory(recipe);
      expect(category).toBe('great-for-meal-prep');
    });

    test('should return null for non-meal-prep recipe', () => {
      const recipe: Recipe = {
        id: 'recipe-1',
        title: 'Fresh Salad',
        description: 'Test',
        cookTime: 10,
        cuisine: 'American',
        calories: 200,
        protein: 5,
        carbs: 30,
        fat: 5,
      };

      const category = getPrimaryMealPrepCategory(recipe);
      expect(category).toBeNull();
    });
  });
});

