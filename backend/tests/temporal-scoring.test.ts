// backend/tests/temporal-scoring.test.ts
import { 
  getCurrentTemporalContext, 
  calculateTemporalScore, 
  analyzeUserTemporalPatterns 
} from '../src/utils/temporalScoring';

describe('Temporal Scoring', () => {
  const mockRecipe = {
    id: 'recipe-1',
    title: 'Breakfast Recipe',
    cuisine: 'American',
    cookTime: 15,
    calories: 300,
    protein: 15,
    carbs: 30,
    fat: 10,
    ingredients: [
      { text: 'eggs' },
      { text: 'bread' }
    ],
    createdAt: new Date()
  };

  const mockUserTemporalPatterns = {
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
  };

  describe('getCurrentTemporalContext', () => {
    it('should return current temporal context', () => {
      const context = getCurrentTemporalContext();
      
      expect(context).toHaveProperty('currentHour');
      expect(context).toHaveProperty('currentDay');
      expect(context).toHaveProperty('mealPeriod');
      expect(context).toHaveProperty('season');
      expect(context).toHaveProperty('isWeekend');
      
      expect(context.currentHour).toBeGreaterThanOrEqual(0);
      expect(context.currentHour).toBeLessThan(24);
      expect(typeof context.isWeekend).toBe('boolean');
    });
  });

  describe('calculateTemporalScore', () => {
    it('should return high score for breakfast recipes in morning', () => {
      const morningContext = {
        currentHour: 8,
        currentDay: 1, // Monday
        currentMonth: 3, // April
        isWeekend: false,
        isWeekday: true,
        mealPeriod: 'breakfast' as const,
        season: 'spring' as const
      };

      const score = calculateTemporalScore(mockRecipe, morningContext, mockUserTemporalPatterns);
      
      expect(score.total).toBeGreaterThan(70);
      expect(score.timeOfDayScore).toBeGreaterThan(0);
      expect(score.mealPeriodScore).toBeGreaterThan(0);
    });

    it('should return lower score for breakfast recipes in evening', () => {
      const eveningContext = {
        currentHour: 19,
        currentDay: 1, // Monday
        currentMonth: 3, // April
        isWeekend: false,
        isWeekday: true,
        mealPeriod: 'dinner' as const,
        season: 'spring' as const
      };

      const score = calculateTemporalScore(mockRecipe, eveningContext, mockUserTemporalPatterns);
      
      expect(score.total).toBeLessThan(50);
    });

    it('should consider weekend preferences', () => {
      const weekendContext = {
        currentHour: 10,
        currentDay: 0, // Sunday
        currentMonth: 3, // April
        isWeekend: true,
        isWeekday: false,
        mealPeriod: 'breakfast' as const,
        season: 'spring' as const
      };

      const score = calculateTemporalScore(mockRecipe, weekendContext, mockUserTemporalPatterns);
      
      expect(score.dayOfWeekScore).toBeGreaterThan(0);
    });

    it('should consider seasonal preferences', () => {
      const summerContext = {
        currentHour: 12,
        currentDay: 1,
        currentMonth: 7, // August
        isWeekend: false,
        isWeekday: true,
        mealPeriod: 'lunch' as const,
        season: 'summer' as const
      };

      const score = calculateTemporalScore(mockRecipe, summerContext, mockUserTemporalPatterns);
      
      expect(score.seasonalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeUserTemporalPatterns', () => {
    it('should analyze user temporal patterns from meal history', () => {
      const consumedRecipes = [
        {
          recipeId: 'recipe-1',
          cuisine: 'American',
          cookTime: 15,
          calories: 300,
          protein: 15,
          carbs: 30,
          fat: 10,
          ingredients: [{ text: 'eggs' }],
          date: new Date('2024-01-01T08:00:00Z') // 8 AM
        },
        {
          recipeId: 'recipe-2',
          cuisine: 'Italian',
          cookTime: 30,
          calories: 500,
          protein: 25,
          carbs: 40,
          fat: 20,
          ingredients: [{ text: 'pasta' }],
          date: new Date('2024-01-01T19:00:00Z') // 7 PM
        }
      ];

      const patterns = analyzeUserTemporalPatterns(consumedRecipes);
      
      expect(patterns).toHaveProperty('preferredBreakfastTimes');
      expect(patterns).toHaveProperty('preferredLunchTimes');
      expect(patterns).toHaveProperty('preferredDinnerTimes');
      expect(patterns).toHaveProperty('weekendPreferences');
      expect(patterns).toHaveProperty('seasonalPreferences');
    });

    it('should handle empty meal history', () => {
      const patterns = analyzeUserTemporalPatterns([]);
      
      expect(patterns.preferredBreakfastTimes).toBeInstanceOf(Array);
      expect(patterns.preferredLunchTimes).toBeInstanceOf(Array);
      expect(patterns.preferredDinnerTimes).toBeInstanceOf(Array);
    });
  });
});
