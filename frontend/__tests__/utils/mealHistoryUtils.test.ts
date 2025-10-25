// frontend/__tests__/utils/mealHistoryUtils.test.ts
import {
  calculateMealHistoryStats,
  getFavoriteCuisines,
  getMostConsumedRecipes,
  getWeeklyPattern,
  getNutritionalInsights,
  formatMealHistoryData
} from '../../utils/mealHistoryUtils';

describe('Meal History Utils', () => {
  const mockMealHistory = [
    {
      id: 'meal-1',
      date: new Date('2024-01-01'),
      recipe: {
        id: 'recipe-1',
        title: 'Italian Pasta',
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15
      },
      feedback: 'delicious'
    },
    {
      id: 'meal-2',
      date: new Date('2024-01-02'),
      recipe: {
        id: 'recipe-2',
        title: 'Mexican Tacos',
        cuisine: 'Mexican',
        calories: 400,
        protein: 20,
        carbs: 45,
        fat: 18
      },
      feedback: 'good'
    },
    {
      id: 'meal-3',
      date: new Date('2024-01-03'),
      recipe: {
        id: 'recipe-1',
        title: 'Italian Pasta',
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15
      },
      feedback: 'excellent'
    },
    {
      id: 'meal-4',
      date: new Date('2024-01-04'),
      recipe: {
        id: 'recipe-3',
        title: 'American Burger',
        cuisine: 'American',
        calories: 600,
        protein: 30,
        carbs: 35,
        fat: 25
      },
      feedback: 'okay'
    }
  ];

  describe('calculateMealHistoryStats', () => {
    it('should calculate basic meal history statistics', () => {
      const stats = calculateMealHistoryStats(mockMealHistory);

      expect(stats.totalMeals).toBe(4);
      expect(stats.averageCalories).toBe(500); // (500 + 400 + 500 + 600) / 4
      expect(stats.averageProtein).toBe(25); // (25 + 20 + 25 + 30) / 4
      expect(stats.averageCarbs).toBe(50); // (60 + 45 + 60 + 35) / 4
      expect(stats.averageFat).toBe(18.25); // (15 + 18 + 15 + 25) / 4
    });

    it('should handle empty meal history', () => {
      const stats = calculateMealHistoryStats([]);

      expect(stats.totalMeals).toBe(0);
      expect(stats.averageCalories).toBe(0);
      expect(stats.averageProtein).toBe(0);
      expect(stats.averageCarbs).toBe(0);
      expect(stats.averageFat).toBe(0);
    });

    it('should handle null meal history', () => {
      const stats = calculateMealHistoryStats(null);

      expect(stats.totalMeals).toBe(0);
      expect(stats.averageCalories).toBe(0);
      expect(stats.averageProtein).toBe(0);
      expect(stats.averageCarbs).toBe(0);
      expect(stats.averageFat).toBe(0);
    });
  });

  describe('getFavoriteCuisines', () => {
    it('should return favorite cuisines sorted by frequency', () => {
      const favorites = getFavoriteCuisines(mockMealHistory);

      expect(favorites).toEqual([
        { cuisine: 'Italian', count: 2, percentage: 50 },
        { cuisine: 'Mexican', count: 1, percentage: 25 },
        { cuisine: 'American', count: 1, percentage: 25 }
      ]);
    });

    it('should handle empty meal history', () => {
      const favorites = getFavoriteCuisines([]);

      expect(favorites).toEqual([]);
    });

    it('should limit results to top N cuisines', () => {
      const favorites = getFavoriteCuisines(mockMealHistory, 2);

      expect(favorites).toHaveLength(2);
      expect(favorites[0].cuisine).toBe('Italian');
      expect(favorites[1].cuisine).toBe('Mexican');
    });
  });

  describe('getMostConsumedRecipes', () => {
    it('should return most consumed recipes sorted by frequency', () => {
      const mostConsumed = getMostConsumedRecipes(mockMealHistory);

      expect(mostConsumed).toEqual([
        {
          recipeId: 'recipe-1',
          title: 'Italian Pasta',
          count: 2,
          percentage: 50,
          averageRating: 4.5 // (5 + 4) / 2
        },
        {
          recipeId: 'recipe-2',
          title: 'Mexican Tacos',
          count: 1,
          percentage: 25,
          averageRating: 4
        },
        {
          recipeId: 'recipe-3',
          title: 'American Burger',
          count: 1,
          percentage: 25,
          averageRating: 3
        }
      ]);
    });

    it('should handle empty meal history', () => {
      const mostConsumed = getMostConsumedRecipes([]);

      expect(mostConsumed).toEqual([]);
    });

    it('should limit results to top N recipes', () => {
      const mostConsumed = getMostConsumedRecipes(mockMealHistory, 2);

      expect(mostConsumed).toHaveLength(2);
      expect(mostConsumed[0].recipeId).toBe('recipe-1');
      expect(mostConsumed[1].recipeId).toBe('recipe-2');
    });
  });

  describe('getWeeklyPattern', () => {
    it('should return weekly consumption pattern', () => {
      const pattern = getWeeklyPattern(mockMealHistory);

      expect(pattern).toHaveProperty('monday');
      expect(pattern).toHaveProperty('tuesday');
      expect(pattern).toHaveProperty('wednesday');
      expect(pattern).toHaveProperty('thursday');
      expect(pattern).toHaveProperty('friday');
      expect(pattern).toHaveProperty('saturday');
      expect(pattern).toHaveProperty('sunday');

      // Check that all days are represented
      Object.values(pattern).forEach(count => {
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty meal history', () => {
      const pattern = getWeeklyPattern([]);

      expect(pattern.monday).toBe(0);
      expect(pattern.tuesday).toBe(0);
      expect(pattern.wednesday).toBe(0);
      expect(pattern.thursday).toBe(0);
      expect(pattern.friday).toBe(0);
      expect(pattern.saturday).toBe(0);
      expect(pattern.sunday).toBe(0);
    });
  });

  describe('getNutritionalInsights', () => {
    it('should return nutritional insights', () => {
      const insights = getNutritionalInsights(mockMealHistory);

      expect(insights).toHaveProperty('totalCalories');
      expect(insights).toHaveProperty('totalProtein');
      expect(insights).toHaveProperty('totalCarbs');
      expect(insights).toHaveProperty('totalFat');
      expect(insights).toHaveProperty('averageDailyCalories');
      expect(insights).toHaveProperty('macroDistribution');

      expect(insights.totalCalories).toBe(2000); // 500 + 400 + 500 + 600
      expect(insights.totalProtein).toBe(100); // 25 + 20 + 25 + 30
      expect(insights.totalCarbs).toBe(200); // 60 + 45 + 60 + 35
      expect(insights.totalFat).toBe(73); // 15 + 18 + 15 + 25
    });

    it('should calculate macro distribution correctly', () => {
      const insights = getNutritionalInsights(mockMealHistory);

      expect(insights.macroDistribution).toHaveProperty('protein');
      expect(insights.macroDistribution).toHaveProperty('carbs');
      expect(insights.macroDistribution).toHaveProperty('fat');

      // Protein: 100g * 4 cal/g = 400 cal
      // Carbs: 200g * 4 cal/g = 800 cal  
      // Fat: 73g * 9 cal/g = 657 cal
      // Total: 400 + 800 + 657 = 1857 cal
      expect(insights.macroDistribution.protein).toBeCloseTo(21.5, 1); // 400/1857 * 100
      expect(insights.macroDistribution.carbs).toBeCloseTo(43.1, 1); // 800/1857 * 100
      expect(insights.macroDistribution.fat).toBeCloseTo(35.4, 1); // 657/1857 * 100
    });

    it('should handle empty meal history', () => {
      const insights = getNutritionalInsights([]);

      expect(insights.totalCalories).toBe(0);
      expect(insights.totalProtein).toBe(0);
      expect(insights.totalCarbs).toBe(0);
      expect(insights.totalFat).toBe(0);
      expect(insights.averageDailyCalories).toBe(0);
    });
  });

  describe('formatMealHistoryData', () => {
    it('should format meal history data for display', () => {
      const formatted = formatMealHistoryData(mockMealHistory);

      expect(formatted).toHaveLength(4);
      expect(formatted[0]).toHaveProperty('id');
      expect(formatted[0]).toHaveProperty('date');
      expect(formatted[0]).toHaveProperty('recipe');
      expect(formatted[0]).toHaveProperty('feedback');
      expect(formatted[0]).toHaveProperty('formattedDate');
      expect(formatted[0]).toHaveProperty('formattedTime');
    });

    it('should format dates correctly', () => {
      const formatted = formatMealHistoryData(mockMealHistory);

      expect(formatted[0].formattedDate).toBe('Jan 1, 2024');
      expect(formatted[1].formattedDate).toBe('Jan 2, 2024');
    });

    it('should handle empty meal history', () => {
      const formatted = formatMealHistoryData([]);

      expect(formatted).toEqual([]);
    });

    it('should handle null meal history', () => {
      const formatted = formatMealHistoryData(null);

      expect(formatted).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle meals with missing nutritional data', () => {
      const incompleteMealHistory = [
        {
          id: 'meal-1',
          date: new Date('2024-01-01'),
          recipe: {
            id: 'recipe-1',
            title: 'Incomplete Recipe',
            cuisine: 'Unknown',
            calories: null,
            protein: null,
            carbs: null,
            fat: null
          },
          feedback: 'unknown'
        }
      ];

      const stats = calculateMealHistoryStats(incompleteMealHistory);
      expect(stats.totalMeals).toBe(1);
      expect(stats.averageCalories).toBe(0);
    });

    it('should handle meals with zero nutritional values', () => {
      const zeroMealHistory = [
        {
          id: 'meal-1',
          date: new Date('2024-01-01'),
          recipe: {
            id: 'recipe-1',
            title: 'Zero Recipe',
            cuisine: 'Unknown',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
          },
          feedback: 'zero'
        }
      ];

      const stats = calculateMealHistoryStats(zeroMealHistory);
      expect(stats.totalMeals).toBe(1);
      expect(stats.averageCalories).toBe(0);
    });
  });
});
