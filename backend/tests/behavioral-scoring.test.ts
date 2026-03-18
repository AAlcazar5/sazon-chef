// backend/tests/behavioral-scoring.test.ts
import { calculateBehavioralScore, buildUserTasteProfile, calculateBehavioralScoreFromProfile } from '../src/utils/behavioralScoring';

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

  describe('dislikeReason and complexityAversion', () => {
    it('should compute complexityAversion from "too_complex" dislike reasons', () => {
      const behaviorWithComplexDislikes = {
        likedRecipes: mockUserBehavior.likedRecipes,
        dislikedRecipes: [
          { ...mockUserBehavior.dislikedRecipes[0], dislikeReason: 'too_complex' },
          { ...mockUserBehavior.dislikedRecipes[0], recipeId: 'disliked-2', dislikeReason: 'too_complex' },
        ],
        savedRecipes: [],
        consumedRecipes: [],
      };

      const profile = buildUserTasteProfile(behaviorWithComplexDislikes);
      // All dislikes are "too_complex" → complexityAversion = 1.0
      expect(profile.complexityAversion).toBe(1);
    });

    it('should compute partial complexityAversion for mixed reasons', () => {
      const behaviorWithMixedDislikes = {
        likedRecipes: mockUserBehavior.likedRecipes,
        dislikedRecipes: [
          { ...mockUserBehavior.dislikedRecipes[0], dislikeReason: 'too_complex' },
          { ...mockUserBehavior.dislikedRecipes[0], recipeId: 'disliked-2', dislikeReason: 'not_my_style' },
        ],
        savedRecipes: [],
        consumedRecipes: [],
      };

      const profile = buildUserTasteProfile(behaviorWithMixedDislikes);
      expect(profile.complexityAversion).toBe(0.5);
    });

    it('should have zero complexityAversion when no dislikes are "too_complex"', () => {
      const behaviorNoComplexDislikes = {
        likedRecipes: mockUserBehavior.likedRecipes,
        dislikedRecipes: [
          { ...mockUserBehavior.dislikedRecipes[0], dislikeReason: 'not_my_style' },
        ],
        savedRecipes: [],
        consumedRecipes: [],
      };

      const profile = buildUserTasteProfile(behaviorNoComplexDislikes);
      expect(profile.complexityAversion).toBe(0);
    });

    it('should have zero complexityAversion with no dislikes at all', () => {
      const emptyBehavior = {
        likedRecipes: [],
        dislikedRecipes: [],
        savedRecipes: [],
        consumedRecipes: [],
      };

      const profile = buildUserTasteProfile(emptyBehavior);
      expect(profile.complexityAversion).toBe(0);
    });

    it('should shift scoring weight from macro to cookTime when complexityAversion is high', () => {
      const profileNoAversion = buildUserTasteProfile({
        likedRecipes: mockUserBehavior.likedRecipes,
        dislikedRecipes: [{ ...mockUserBehavior.dislikedRecipes[0], dislikeReason: 'not_my_style' }],
        savedRecipes: mockUserBehavior.savedRecipes,
        consumedRecipes: mockUserBehavior.consumedRecipes,
      });

      const profileHighAversion = buildUserTasteProfile({
        likedRecipes: mockUserBehavior.likedRecipes,
        dislikedRecipes: [
          { ...mockUserBehavior.dislikedRecipes[0], dislikeReason: 'too_complex' },
          { ...mockUserBehavior.dislikedRecipes[0], recipeId: 'd2', dislikeReason: 'too_complex' },
        ],
        savedRecipes: mockUserBehavior.savedRecipes,
        consumedRecipes: mockUserBehavior.consumedRecipes,
      });

      expect(profileNoAversion.complexityAversion).toBe(0);
      expect(profileHighAversion.complexityAversion).toBe(1);

      // Cook-time-matching recipe should score differently under different aversion levels
      const quickRecipe = {
        ...mockRecipe,
        cookTime: 15, // Very quick
      };

      const scoreNoAversion = calculateBehavioralScoreFromProfile(quickRecipe, profileNoAversion);
      const scoreHighAversion = calculateBehavioralScoreFromProfile(quickRecipe, profileHighAversion);

      // High aversion gives more weight to cook time — a quick recipe gets a
      // larger cook-time-preference contribution, so total should differ
      expect(scoreHighAversion.total).not.toBe(scoreNoAversion.total);
    });
  });
});
