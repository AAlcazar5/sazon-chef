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
        mealPeriod: 'breakfast',
        season: 'spring',
        isWeekend: false
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
        mealPeriod: 'dinner',
        season: 'spring',
        isWeekend: false
      };

      const score = calculateTemporalScore(mockRecipe, eveningContext, mockUserTemporalPatterns);
      
      expect(score.total).toBeLessThan(50);
    });

    it('should consider weekend preferences', () => {
      const weekendContext = {
        currentHour: 10,
        currentDay: 0, // Sunday
        mealPeriod: 'breakfast',
        season: 'spring',
        isWeekend: true
      };

      const score = calculateTemporalScore(mockRecipe, weekendContext, mockUserTemporalPatterns);
      
      expect(score.dayOfWeekScore).toBeGreaterThan(0);
    });

    it('should consider seasonal preferences', () => {
      const summerContext = {
        currentHour: 12,
        currentDay: 1,
        mealPeriod: 'lunch',
        season: 'summer',
        isWeekend: false
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
      
      expect(patterns).toHaveProperty('preferredBreakfastTime');
      expect(patterns).toHaveProperty('preferredLunchTime');
      expect(patterns).toHaveProperty('preferredDinnerTime');
      expect(patterns).toHaveProperty('weekendPreferences');
      expect(patterns).toHaveProperty('seasonalPreferences');
    });

    it('should handle empty meal history', () => {
      const patterns = analyzeUserTemporalPatterns([]);
      
      expect(patterns.preferredBreakfastTime).toBe(7); // Default
      expect(patterns.preferredLunchTime).toBe(12); // Default
      expect(patterns.preferredDinnerTime).toBe(18); // Default
    });
  });
});
