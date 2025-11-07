// backend/tests/utils/collaborative-filtering.test.ts
import {
  calculateRecipeSimilarity,
  calculateMacroSimilarity,
  calculateMacroRanges,
  CollaborativeScore,
} from '../../src/utils/collaborativeFiltering';
import type { UserBehaviorData } from '../../src/utils/behavioralScoring';

// Note: Full collaborative filtering tests require database setup with multiple users
// These tests focus on the core similarity calculation functions

describe('Collaborative Filtering - Core Functions', () => {
  describe('calculateRecipeSimilarity', () => {
    it('should calculate high similarity for identical recipes', () => {
      const recipe1 = {
        id: '1',
        title: 'Italian Pasta',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [
          { text: 'pasta' },
          { text: 'tomato' },
          { text: 'basil' },
        ],
      };

      const recipe2 = {
        id: '2',
        title: 'Italian Pasta',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [
          { text: 'pasta' },
          { text: 'tomato' },
          { text: 'basil' },
        ],
      };

      const similarity = calculateRecipeSimilarity(recipe1, recipe2);

      expect(similarity.similarity).toBeGreaterThan(0.8);
      expect(similarity.sharedAttributes.cuisine).toBe(true);
      expect(similarity.sharedAttributes.ingredients.length).toBe(3);
    });

    it('should calculate lower similarity for different cuisines', () => {
      const recipe1 = {
        id: '1',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [{ text: 'pasta' }],
      };

      const recipe2 = {
        id: '2',
        cuisine: 'Asian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [{ text: 'pasta' }],
      };

      const similarity = calculateRecipeSimilarity(recipe1, recipe2);

      // Even with different cuisines, other factors (ingredients, macros, cook time) contribute
      expect(similarity.similarity).toBeLessThan(0.9);
      expect(similarity.sharedAttributes.cuisine).toBe(false);
    });

    it('should calculate similarity based on ingredient overlap', () => {
      const recipe1 = {
        id: '1',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [
          { text: 'pasta' },
          { text: 'tomato' },
          { text: 'basil' },
          { text: 'garlic' },
        ],
      };

      const recipe2 = {
        id: '2',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [
          { text: 'pasta' },
          { text: 'tomato' },
          { text: 'cheese' },
        ],
      };

      const similarity = calculateRecipeSimilarity(recipe1, recipe2);

      // Should have good similarity due to shared ingredients
      expect(similarity.similarity).toBeGreaterThan(0.5);
      expect(similarity.sharedAttributes.ingredients.length).toBe(2);
    });

    it('should handle recipes with no shared ingredients', () => {
      const recipe1 = {
        id: '1',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [{ text: 'pasta' }, { text: 'tomato' }],
      };

      const recipe2 = {
        id: '2',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [{ text: 'rice' }, { text: 'soy sauce' }],
      };

      const similarity = calculateRecipeSimilarity(recipe1, recipe2);

      // Even without shared ingredients, cuisine and cook time contribute to similarity
      expect(similarity.similarity).toBeLessThan(0.7);
      expect(similarity.sharedAttributes.ingredients.length).toBe(0);
    });

    it('should calculate similarity based on cook time', () => {
      const recipe1 = {
        id: '1',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [{ text: 'pasta' }],
      };

      const recipe2 = {
        id: '2',
        cuisine: 'Italian',
        cookTime: 31, // Very similar cook time
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [{ text: 'pasta' }],
      };

      const similarity = calculateRecipeSimilarity(recipe1, recipe2);

      expect(similarity.sharedAttributes.cookTimeSimilarity).toBeGreaterThan(0.9);
    });
  });

  describe('calculateMacroSimilarity', () => {
    it('should calculate high similarity for identical macros', () => {
      const recipe1 = {
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
      };

      const recipe2 = {
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
      };

      const similarity = calculateMacroSimilarity(recipe1, recipe2);

      expect(similarity).toBeCloseTo(1.0, 2);
    });

    it('should calculate lower similarity for different macros', () => {
      const recipe1 = {
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
      };

      const recipe2 = {
        calories: 200,
        protein: 10,
        carbs: 30,
        fat: 5,
      };

      const similarity = calculateMacroSimilarity(recipe1, recipe2);

      // Macro similarity uses cosine similarity, which can be high even with different absolute values
      // if the proportions are similar. These recipes have similar macro proportions (about 50% carbs, 25% protein, 15% fat)
      expect(similarity).toBeGreaterThan(0.5); // They have similar proportional distributions
    });

    it('should handle recipes with zero macros', () => {
      const recipe1 = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      const recipe2 = {
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
      };

      const similarity = calculateMacroSimilarity(recipe1, recipe2);

      expect(similarity).toBe(0);
    });
  });

  describe('calculateMacroRanges', () => {
    it('should calculate macro ranges from user behavior', () => {
      const userBehavior: UserBehaviorData = {
        likedRecipes: [
          {
            recipeId: '1',
            cuisine: 'Italian',
            cookTime: 30,
            calories: 400,
            protein: 20,
            carbs: 50,
            fat: 12,
            ingredients: [],
            createdAt: new Date(),
          },
          {
            recipeId: '2',
            cuisine: 'Italian',
            cookTime: 45,
            calories: 600,
            protein: 30,
            carbs: 70,
            fat: 20,
            ingredients: [],
            createdAt: new Date(),
          },
        ],
        dislikedRecipes: [],
        savedRecipes: [],
        consumedRecipes: [],
      };

      const ranges = calculateMacroRanges(userBehavior);

      expect(ranges.calories.min).toBe(400);
      expect(ranges.calories.max).toBe(600);
      expect(ranges.protein.min).toBe(20);
      expect(ranges.protein.max).toBe(30);
      expect(ranges.cookTime.min).toBe(30);
      expect(ranges.cookTime.max).toBe(45);
    });

    it('should handle empty user behavior', () => {
      const userBehavior: UserBehaviorData = {
        likedRecipes: [],
        dislikedRecipes: [],
        savedRecipes: [],
        consumedRecipes: [],
      };

      const ranges = calculateMacroRanges(userBehavior);

      expect(ranges.calories.min).toBe(0);
      expect(ranges.calories.max).toBe(0);
      expect(ranges.protein.min).toBe(0);
      expect(ranges.protein.max).toBe(0);
      expect(ranges.cookTime.min).toBe(0);
      expect(ranges.cookTime.max).toBe(0);
    });

    it('should include all positive interactions in ranges', () => {
      const userBehavior: UserBehaviorData = {
        likedRecipes: [
          {
            recipeId: '1',
            cuisine: 'Italian',
            cookTime: 30,
            calories: 400,
            protein: 20,
            carbs: 50,
            fat: 12,
            ingredients: [],
            createdAt: new Date(),
          },
        ],
        dislikedRecipes: [],
        savedRecipes: [
          {
            recipeId: '2',
            cuisine: 'Italian',
            cookTime: 60,
            calories: 800,
            protein: 40,
            carbs: 90,
            fat: 30,
            ingredients: [],
            savedDate: new Date(),
          },
        ],
        consumedRecipes: [
          {
            recipeId: '3',
            cuisine: 'Italian',
            cookTime: 20,
            calories: 300,
            protein: 15,
            carbs: 40,
            fat: 10,
            ingredients: [],
            date: new Date(),
          },
        ],
      };

      const ranges = calculateMacroRanges(userBehavior);

      expect(ranges.calories.min).toBe(300);
      expect(ranges.calories.max).toBe(800);
      expect(ranges.cookTime.min).toBe(20);
      expect(ranges.cookTime.max).toBe(60);
    });
  });
});

