// backend/tests/daily-suggestions.test.ts
import { generateDailySuggestions } from '../src/utils/dailySuggestions';

// Mock the dependencies
jest.mock('../src/utils/behavioralScoring', () => ({
  calculateBehavioralScore: jest.fn(() => ({
    total: 75,
    cuisinePreference: 20,
    cookTimePreference: 15,
    macroPreference: 25,
    ingredientPreference: 10,
    recencyBonus: 5
  }))
}));

jest.mock('../src/utils/temporalScoring', () => ({
  getCurrentTemporalContext: jest.fn(() => ({
    currentHour: 12,
    currentDay: 1,
    mealPeriod: 'lunch',
    season: 'spring',
    isWeekend: false
  })),
  calculateTemporalScore: jest.fn(() => ({
    total: 80,
    timeOfDayScore: 20,
    dayOfWeekScore: 15,
    seasonalScore: 25,
    mealPeriodScore: 20
  })),
  analyzeUserTemporalPatterns: jest.fn(() => ({
    preferredBreakfastTime: 7,
    preferredLunchTime: 12,
    preferredDinnerTime: 18,
    weekendPreferences: {
      breakfast: 'later',
      lunch: 'casual',
      dinner: 'elaborate'
    },
    seasonalPreferences: {
      summer: ['grilled', 'cold'],
      winter: ['soup', 'hot']
    }
  }))
}));

jest.mock('../src/utils/scoring', () => ({
  calculateRecipeScore: jest.fn(() => ({
    total: 85,
    macroScore: 20,
    preferenceScore: 25,
    healthScore: 15,
    tasteScore: 25
  }))
}));

jest.mock('../src/utils/enhancedScoring', () => ({
  calculateEnhancedScore: jest.fn(() => ({
    total: 70,
    cookTimeScore: 80,
    convenienceScore: 60,
    breakdown: {
      cookTimeMatch: 80,
      convenienceFactor: 60,
      timeEfficiency: 75
    }
  }))
}));

describe('Daily Suggestions', () => {
  const mockUserPreferences = {
    id: 'pref-1',
    userId: 'user-1',
    cookTimePreference: 30,
    spiceLevel: 'medium',
    bannedIngredients: [
      { id: 'ban-1', name: 'nuts', userId: 'user-1' }
    ],
    likedCuisines: [
      { id: 'cuisine-1', name: 'Italian', userId: 'user-1' }
    ],
    dietaryRestrictions: [
      { id: 'diet-1', name: 'vegetarian', userId: 'user-1' }
    ]
  };

  const mockMacroGoals = {
    id: 'macro-1',
    userId: 'user-1',
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 67
  };

  const mockRecipes = [
    {
      id: 'recipe-1',
      title: 'Breakfast Bowl',
      cuisine: 'American',
      cookTime: 15,
      calories: 400,
      protein: 20,
      carbs: 30,
      fat: 15,
      difficulty: 'easy',
      ingredients: [{ text: 'eggs' }, { text: 'avocado' }],
      instructions: [{ step: 1, text: 'Cook eggs' }]
    },
    {
      id: 'recipe-2',
      title: 'Lunch Salad',
      cuisine: 'Mediterranean',
      cookTime: 10,
      calories: 300,
      protein: 15,
      carbs: 25,
      fat: 12,
      difficulty: 'easy',
      ingredients: [{ text: 'lettuce' }, { text: 'tomato' }],
      instructions: [{ step: 1, text: 'Mix ingredients' }]
    },
    {
      id: 'recipe-3',
      title: 'Dinner Pasta',
      cuisine: 'Italian',
      cookTime: 25,
      calories: 500,
      protein: 25,
      carbs: 60,
      fat: 20,
      difficulty: 'medium',
      ingredients: [{ text: 'pasta' }, { text: 'tomato sauce' }],
      instructions: [{ step: 1, text: 'Boil pasta' }]
    },
    {
      id: 'recipe-4',
      title: 'Healthy Snack',
      cuisine: 'American',
      cookTime: 5,
      calories: 150,
      protein: 8,
      carbs: 15,
      fat: 6,
      difficulty: 'easy',
      ingredients: [{ text: 'apple' }, { text: 'almonds' }],
      instructions: [{ step: 1, text: 'Slice apple' }]
    }
  ];

  describe('generateDailySuggestions', () => {
    it('should generate suggestions for all meal types', async () => {
      const suggestions = await generateDailySuggestions(
        'user-1',
        new Date('2024-01-01'),
        mockUserPreferences,
        mockMacroGoals,
        mockRecipes,
        { likedRecipes: [], dislikedRecipes: [], savedRecipes: [], consumedRecipes: [] }
      );

      expect(suggestions).toHaveProperty('breakfast');
      expect(suggestions).toHaveProperty('lunch');
      expect(suggestions).toHaveProperty('dinner');
      expect(suggestions).toHaveProperty('snack');
      expect(suggestions).toHaveProperty('totalMacros');
    });

    it('should calculate total macros correctly', async () => {
      const suggestions = await generateDailySuggestions(
        'user-1',
        new Date('2024-01-01'),
        mockUserPreferences,
        mockMacroGoals,
        mockRecipes,
        { likedRecipes: [], dislikedRecipes: [], savedRecipes: [], consumedRecipes: [] }
      );

      const expectedCalories = suggestions.breakfast.calories + 
                              suggestions.lunch.calories + 
                              suggestions.dinner.calories + 
                              suggestions.snack.calories;

      expect(suggestions.totalMacros.calories).toBe(expectedCalories);
      expect(suggestions.totalMacros.protein).toBeGreaterThan(0);
      expect(suggestions.totalMacros.carbs).toBeGreaterThan(0);
      expect(suggestions.totalMacros.fat).toBeGreaterThan(0);
    });

    it('should respect user preferences', async () => {
      const suggestions = await generateDailySuggestions(
        'user-1',
        new Date('2024-01-01'),
        mockUserPreferences,
        mockMacroGoals,
        mockRecipes,
        { likedRecipes: [], dislikedRecipes: [], savedRecipes: [], consumedRecipes: [] }
      );

      // Should not include banned ingredients
      const allIngredients = [
        ...suggestions.breakfast.ingredients,
        ...suggestions.lunch.ingredients,
        ...suggestions.dinner.ingredients,
        ...suggestions.snack.ingredients
      ];

      const hasBannedIngredients = allIngredients.some(ingredient => 
        ingredient.text.toLowerCase().includes('nuts')
      );

      expect(hasBannedIngredients).toBe(false);
    });

    it('should handle empty recipe list', async () => {
      const suggestions = await generateDailySuggestions(
        'user-1',
        new Date('2024-01-01'),
        mockUserPreferences,
        mockMacroGoals,
        [],
        { likedRecipes: [], dislikedRecipes: [], savedRecipes: [], consumedRecipes: [] }
      );

      expect(suggestions.breakfast).toBeNull();
      expect(suggestions.lunch).toBeNull();
      expect(suggestions.dinner).toBeNull();
      expect(suggestions.snack).toBeNull();
      expect(suggestions.totalMacros.calories).toBe(0);
    });

    it('should consider meal-specific criteria', async () => {
      const suggestions = await generateDailySuggestions(
        'user-1',
        new Date('2024-01-01'),
        mockUserPreferences,
        mockMacroGoals,
        mockRecipes,
        { likedRecipes: [], dislikedRecipes: [], savedRecipes: [], consumedRecipes: [] }
      );

      // Breakfast should be quick
      if (suggestions.breakfast) {
        expect(suggestions.breakfast.cookTime).toBeLessThanOrEqual(30);
      }

      // Dinner can be more elaborate
      if (suggestions.dinner) {
        expect(suggestions.dinner.cookTime).toBeGreaterThanOrEqual(15);
      }
    });

    it('should return valid macro distribution', async () => {
      const suggestions = await generateDailySuggestions(
        'user-1',
        new Date('2024-01-01'),
        mockUserPreferences,
        mockMacroGoals,
        mockRecipes,
        { likedRecipes: [], dislikedRecipes: [], savedRecipes: [], consumedRecipes: [] }
      );

      expect(suggestions.totalMacros.calories).toBeGreaterThan(0);
      expect(suggestions.totalMacros.protein).toBeGreaterThan(0);
      expect(suggestions.totalMacros.carbs).toBeGreaterThan(0);
      expect(suggestions.totalMacros.fat).toBeGreaterThan(0);

      // Check that macros are reasonable
      expect(suggestions.totalMacros.calories).toBeLessThan(3000);
      expect(suggestions.totalMacros.protein).toBeLessThan(300);
      expect(suggestions.totalMacros.carbs).toBeLessThan(400);
      expect(suggestions.totalMacros.fat).toBeLessThan(150);
    });
  });
});
