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
    currentMonth: 3,
    isWeekend: false,
    isWeekday: true,
    mealPeriod: 'lunch' as const,
    season: 'spring' as const
  })),
  calculateTemporalScore: jest.fn(() => ({
    total: 80,
    timeOfDayScore: 20,
    dayOfWeekScore: 15,
    seasonalScore: 25,
    mealPeriodScore: 20
  })),
  analyzeUserTemporalPatterns: jest.fn(() => ({
    preferredBreakfastTimes: [7],
    preferredLunchTimes: [12],
    preferredDinnerTimes: [18],
    weekdayPreferences: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    },
    weekendPreferences: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    },
    seasonalPreferences: {
      spring: [],
      summer: ['grilled', 'cold'],
      fall: [],
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
    const createContext = (recipes: any[], userBehavior: any = { likedRecipes: [], dislikedRecipes: [], savedRecipes: [], consumedRecipes: [] }) => ({
      userPreferences: mockUserPreferences,
      macroGoals: mockMacroGoals,
      userBehavior,
      temporalContext: {
        currentHour: 12,
        currentDay: 1,
        currentMonth: 3,
        isWeekend: false,
        isWeekday: true,
        mealPeriod: 'lunch' as const,
        season: 'spring' as const
      },
      userTemporalPatterns: {
        preferredBreakfastTimes: [7],
        preferredLunchTimes: [12],
        preferredDinnerTimes: [18],
        weekdayPreferences: { breakfast: [], lunch: [], dinner: [], snack: [] },
        weekendPreferences: { breakfast: [], lunch: [], dinner: [], snack: [] },
        seasonalPreferences: { spring: [], summer: [], fall: [], winter: [] }
      },
      recentMeals: [],
      plannedMeals: [],
      availableIngredients: [],
      timeConstraints: {
        breakfastTime: 7,
        lunchTime: 12,
        dinnerTime: 18
      }
    });

    it('should generate suggestions for all meal types', () => {
      const context = createContext(mockRecipes);
      const suggestions = generateDailySuggestions(context);

      expect(suggestions).toHaveProperty('breakfast');
      expect(suggestions).toHaveProperty('lunch');
      expect(suggestions).toHaveProperty('dinner');
      expect(suggestions).toHaveProperty('snack');
      expect(suggestions).toHaveProperty('totalMacros');
    });

    it('should calculate total macros correctly', () => {
      const context = createContext(mockRecipes);
      const suggestions = generateDailySuggestions(context);

      if (suggestions.breakfast && suggestions.lunch && suggestions.dinner && suggestions.snack) {
        const expectedCalories = suggestions.breakfast.recipe.calories + 
                                suggestions.lunch.recipe.calories + 
                                suggestions.dinner.recipe.calories + 
                                suggestions.snack.recipe.calories;

        expect(suggestions.totalMacros.calories).toBe(expectedCalories);
      }
      
      expect(suggestions.totalMacros.protein).toBeGreaterThanOrEqual(0);
      expect(suggestions.totalMacros.carbs).toBeGreaterThanOrEqual(0);
      expect(suggestions.totalMacros.fat).toBeGreaterThanOrEqual(0);
    });

    it('should respect user preferences', () => {
      const context = createContext(mockRecipes);
      const suggestions = generateDailySuggestions(context);

      // Should not include banned ingredients
      const allIngredients: any[] = [];
      [suggestions.breakfast, suggestions.lunch, suggestions.dinner, suggestions.snack].forEach(meal => {
        if (meal?.recipe?.ingredients) {
          allIngredients.push(...meal.recipe.ingredients);
        }
      });

      const hasBannedIngredients = allIngredients.some(ingredient => 
        (ingredient.text || ingredient.name || '').toLowerCase().includes('nuts')
      );

      expect(hasBannedIngredients).toBe(false);
    });

    it('should handle empty recipe list', () => {
      const context = createContext([]);
      const suggestions = generateDailySuggestions(context);

      expect(suggestions.breakfast).toBeNull();
      expect(suggestions.lunch).toBeNull();
      expect(suggestions.dinner).toBeNull();
      expect(suggestions.snack).toBeNull();
      expect(suggestions.totalMacros.calories).toBe(0);
    });

    it('should consider meal-specific criteria', () => {
      const context = createContext(mockRecipes);
      const suggestions = generateDailySuggestions(context);

      // Breakfast should be quick
      if (suggestions.breakfast?.recipe) {
        expect(suggestions.breakfast.recipe.cookTime).toBeLessThanOrEqual(30);
      }

      // Dinner can be more elaborate
      if (suggestions.dinner?.recipe) {
        expect(suggestions.dinner.recipe.cookTime).toBeGreaterThanOrEqual(15);
      }
    });

    it('should return valid macro distribution', () => {
      const context = createContext(mockRecipes);
      const suggestions = generateDailySuggestions(context);

      expect(suggestions.totalMacros.calories).toBeGreaterThanOrEqual(0);
      expect(suggestions.totalMacros.protein).toBeGreaterThanOrEqual(0);
      expect(suggestions.totalMacros.carbs).toBeGreaterThanOrEqual(0);
      expect(suggestions.totalMacros.fat).toBeGreaterThanOrEqual(0);

      // Check that macros are reasonable
      expect(suggestions.totalMacros.calories).toBeLessThan(3000);
      expect(suggestions.totalMacros.protein).toBeLessThan(300);
      expect(suggestions.totalMacros.carbs).toBeLessThan(400);
      expect(suggestions.totalMacros.fat).toBeLessThan(150);
    });
  });
});
