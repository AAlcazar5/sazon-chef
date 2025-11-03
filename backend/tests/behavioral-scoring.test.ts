// backend/tests/behavioral-scoring.test.ts
import { calculateBehavioralScore } from '../src/utils/behavioralScoring';

describe('Behavioral Scoring', () => {
  const mockRecipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    cuisine: 'Italian',
    cookTime: 30,
    calories: 500,
    protein: 25,
    carbs: 40,
    fat: 20,
    ingredients: [
      { text: 'pasta' },
      { text: 'tomato sauce' },
      { text: 'cheese' }
    ],
    createdAt: new Date('2024-01-01')
  };

  const mockUserBehavior = {
    likedRecipes: [
      {
        recipeId: 'liked-1',
        cuisine: 'Italian',
        cookTime: 25,
        calories: 450,
        protein: 20,
        carbs: 35,
        fat: 18,
        ingredients: [{ text: 'pasta' }],
        createdAt: new Date('2024-01-01')
      }
    ],
    dislikedRecipes: [
      {
        recipeId: 'disliked-1',
        cuisine: 'Mexican',
        cookTime: 45,
        calories: 600,
        protein: 30,
        carbs: 50,
        fat: 25,
        ingredients: [{ text: 'spicy peppers' }],
        createdAt: new Date('2024-01-01')
      }
    ],
    savedRecipes: [
      {
        recipeId: 'saved-1',
        cuisine: 'Italian',
        cookTime: 20,
        calories: 400,
        protein: 15,
        carbs: 30,
        fat: 15,
        ingredients: [{ text: 'pasta' }],
        savedDate: new Date('2024-01-01')
      }
    ],
    consumedRecipes: [
      {
        recipeId: 'consumed-1',
        cuisine: 'Italian',
        cookTime: 35,
        calories: 550,
        protein: 28,
        carbs: 45,
        fat: 22,
        ingredients: [{ text: 'pasta' }],
        date: new Date('2024-01-01')
      }
    ]
  };

  describe('calculateBehavioralScore', () => {
    it('should return high score for recipes matching user preferences', () => {
      const score = calculateBehavioralScore(mockRecipe, mockUserBehavior);
      
      expect(score.total).toBeGreaterThan(70);
      expect(score.cuisinePreference).toBeGreaterThan(0);
      expect(score.cookTimePreference).toBeGreaterThan(0);
      expect(score.macroPreference).toBeGreaterThan(0);
    });

    it('should return low score for recipes not matching user preferences', () => {
      const dislikedRecipe = {
        ...mockRecipe,
        cuisine: 'Mexican',
        cookTime: 60,
        calories: 800
      };

      const score = calculateBehavioralScore(dislikedRecipe, mockUserBehavior);
      
      expect(score.total).toBeLessThan(50);
    });

    it('should handle empty user behavior data', () => {
      const emptyBehavior = {
        likedRecipes: [],
        dislikedRecipes: [],
        savedRecipes: [],
        consumedRecipes: []
      };

      const score = calculateBehavioralScore(mockRecipe, emptyBehavior);
      
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
    });

    it('should give bonus for recent recipes', () => {
      const recentRecipe = {
        ...mockRecipe,
        createdAt: new Date() // Very recent
      };

      const score = calculateBehavioralScore(recentRecipe, mockUserBehavior);
      
      expect(score.recencyBonus).toBeGreaterThan(0);
    });

    it('should penalize recipes with disliked ingredients', () => {
      const recipeWithDislikedIngredient = {
        ...mockRecipe,
        ingredients: [
          { text: 'spicy peppers' }, // User dislikes this
          { text: 'pasta' }
        ]
      };

      const scoreWithDisliked = calculateBehavioralScore(recipeWithDislikedIngredient, mockUserBehavior);
      
      // Compare with recipe without disliked ingredients
      const recipeWithoutDisliked = {
        ...mockRecipe,
        ingredients: [
          { text: 'pasta' },
          { text: 'tomato' }
        ]
      };
      const scoreWithoutDisliked = calculateBehavioralScore(recipeWithoutDisliked, mockUserBehavior);
      
      // Recipe with disliked ingredients should have lower ingredient preference score
      expect(scoreWithDisliked.ingredientPreference).toBeLessThanOrEqual(scoreWithoutDisliked.ingredientPreference);
    });
  });
});
