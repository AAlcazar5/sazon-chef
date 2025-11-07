// backend/tests/utils/predictive-scoring.test.ts
import {
  calculatePredictiveScore,
  PredictiveScore
} from '../../src/utils/predictiveScoring';
import type { UserBehaviorData } from '../../src/utils/behavioralScoring';

describe('Predictive Scoring', () => {
  const createMockUserBehavior = (): UserBehaviorData => ({
    likedRecipes: [
      {
        recipeId: '1',
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
        ingredients: [{ text: 'pasta' }, { text: 'tomato' }],
        createdAt: new Date('2024-01-15'),
      },
      {
        recipeId: '2',
        cuisine: 'Italian',
        cookTime: 45,
        calories: 600,
        protein: 30,
        carbs: 70,
        fat: 20,
        ingredients: [{ text: 'pasta' }, { text: 'cheese' }],
        createdAt: new Date('2024-02-10'),
      },
      {
        recipeId: '3',
        cuisine: 'Mediterranean',
        cookTime: 25,
        calories: 400,
        protein: 20,
        carbs: 50,
        fat: 12,
        ingredients: [{ text: 'chicken' }, { text: 'olive oil' }],
        createdAt: new Date('2024-03-05'),
      },
    ],
    dislikedRecipes: [
      {
        recipeId: '4',
        cuisine: 'Asian',
        cookTime: 20,
        calories: 300,
        protein: 15,
        carbs: 40,
        fat: 8,
        ingredients: [{ text: 'rice' }, { text: 'soy sauce' }],
        createdAt: new Date('2024-01-20'),
      },
    ],
    savedRecipes: [
      {
        recipeId: '5',
        cuisine: 'Italian',
        cookTime: 35,
        calories: 550,
        protein: 28,
        carbs: 65,
        fat: 18,
        ingredients: [{ text: 'pasta' }, { text: 'basil' }],
        savedDate: new Date('2024-04-01'),
      },
    ],
    consumedRecipes: [
      {
        recipeId: '6',
        cuisine: 'Mediterranean',
        cookTime: 30,
        calories: 450,
        protein: 22,
        carbs: 55,
        fat: 14,
        ingredients: [{ text: 'salmon' }, { text: 'vegetables' }],
        date: new Date('2024-04-15'),
      },
    ],
  });

  describe('calculatePredictiveScore', () => {
    it('should calculate predictive score for recipe matching historical patterns', () => {
      const userBehavior = createMockUserBehavior();
      const recipe = {
        title: 'Italian Pasta',
        cuisine: 'Italian',
        cookTime: 35,
        calories: 550,
        protein: 28,
        carbs: 65,
        fat: 18,
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
      expect(score.breakdown.historicalPatternMatch).toBeGreaterThanOrEqual(0);
      expect(score.breakdown.trendAnalysis).toBeGreaterThanOrEqual(0);
      expect(score.breakdown.successProbability).toBeGreaterThanOrEqual(0);
    });

    it('should give high score to recipes matching preferred cuisine', () => {
      const userBehavior = createMockUserBehavior();
      const recipe = {
        cuisine: 'Italian',
        cookTime: 35,
        calories: 550,
        protein: 28,
        carbs: 65,
        fat: 18,
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      // Italian cuisine should score well based on historical data
      expect(score.details.patternMatches.cuisine).toBeGreaterThan(50);
    });

    it('should give low score to recipes with disliked cuisine', () => {
      const userBehavior = createMockUserBehavior();
      const recipe = {
        cuisine: 'Asian',
        cookTime: 20,
        calories: 300,
        protein: 15,
        carbs: 40,
        fat: 8,
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      // Asian cuisine should score lower (disliked in history)
      expect(score.details.patternMatches.cuisine).toBeLessThan(50);
    });

    it('should match recipes within historical macro ranges', () => {
      const userBehavior = createMockUserBehavior();
      const recipe = {
        cuisine: 'Italian',
        cookTime: 35,
        calories: 550, // Within range (400-600)
        protein: 28,   // Within range (20-30)
        carbs: 65,    // Within range (50-70)
        fat: 18,       // Within range (12-20)
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      expect(score.details.patternMatches.macroRange).toBeGreaterThan(50);
    });

    it('should match recipes within historical cook time range', () => {
      const userBehavior = createMockUserBehavior();
      const recipe = {
        cuisine: 'Italian',
        cookTime: 35, // Within range (25-45)
        calories: 550,
        protein: 28,
        carbs: 65,
        fat: 18,
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      expect(score.details.patternMatches.cookTime).toBeGreaterThan(50);
    });

    it('should handle recipes with no historical data', () => {
      const emptyUserBehavior: UserBehaviorData = {
        likedRecipes: [],
        dislikedRecipes: [],
        savedRecipes: [],
        consumedRecipes: [],
      };

      const recipe = {
        cuisine: 'Italian',
        cookTime: 30,
        calories: 500,
        protein: 25,
        carbs: 60,
        fat: 15,
      };

      const score = calculatePredictiveScore(recipe, emptyUserBehavior);

      // Should return neutral/moderate scores when no data
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
    });

    it('should identify recent trends', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

      const userBehavior: UserBehaviorData = {
        likedRecipes: [
          {
            recipeId: '1',
            cuisine: 'Italian',
            cookTime: 30,
            calories: 500,
            protein: 25,
            carbs: 60,
            fat: 15,
            ingredients: [],
            createdAt: oldDate,
          },
        ],
        dislikedRecipes: [],
        savedRecipes: [
          {
            recipeId: '2',
            cuisine: 'Mediterranean',
            cookTime: 25,
            calories: 400,
            protein: 30, // High protein
            carbs: 50,
            fat: 12,
            ingredients: [],
            savedDate: recentDate,
          },
          {
            recipeId: '3',
            cuisine: 'Mediterranean',
            cookTime: 20,
            calories: 350,
            protein: 28, // High protein
            carbs: 45,
            fat: 10,
            ingredients: [],
            savedDate: recentDate,
          },
        ],
        consumedRecipes: [],
      };

      const recipe = {
        cuisine: 'Mediterranean',
        cookTime: 25,
        calories: 400,
        protein: 29, // High protein trend
        carbs: 50,
        fat: 12,
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      // Should reward recent trend (Mediterranean + high protein)
      expect(score.breakdown.trendAnalysis).toBeGreaterThan(10);
    });

    it('should calculate success probability based on historical engagement', () => {
      const userBehavior = createMockUserBehavior();
      const recipe = {
        cuisine: 'Italian', // High engagement rate
        cookTime: 35,
        calories: 550,
        protein: 28,
        carbs: 65,
        fat: 18,
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      expect(score.breakdown.successProbability).toBeGreaterThanOrEqual(0);
      expect(score.breakdown.successProbability).toBeLessThanOrEqual(30);
    });

    it('should handle edge cases with extreme values', () => {
      const userBehavior = createMockUserBehavior();
      const recipe = {
        cuisine: 'Italian',
        cookTime: 120, // Very long (outside range)
        calories: 1000, // Very high (outside range)
        protein: 50,   // Very high (outside range)
        carbs: 150,     // Very high (outside range)
        fat: 50,       // Very high (outside range)
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
      // Should still give some credit for cuisine match
      expect(score.details.patternMatches.cuisine).toBeGreaterThan(0);
    });

    it('should provide detailed breakdown', () => {
      const userBehavior = createMockUserBehavior();
      const recipe = {
        cuisine: 'Italian',
        cookTime: 35,
        calories: 550,
        protein: 28,
        carbs: 65,
        fat: 18,
      };

      const score = calculatePredictiveScore(recipe, userBehavior);

      expect(score.details).toBeDefined();
      expect(score.details.patternMatches).toBeDefined();
      expect(score.details.patternMatches.cuisine).toBeGreaterThanOrEqual(0);
      expect(score.details.patternMatches.macroRange).toBeGreaterThanOrEqual(0);
      expect(score.details.patternMatches.cookTime).toBeGreaterThanOrEqual(0);
      expect(score.details.trendStrength).toBeGreaterThanOrEqual(0);
      expect(score.details.engagementProbability).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Score Ranges', () => {
    it('should always return scores between 0 and 100', () => {
      const userBehavior = createMockUserBehavior();
      const recipes = [
        { cuisine: 'Italian', cookTime: 35, calories: 550, protein: 28, carbs: 65, fat: 18 },
        { cuisine: 'Asian', cookTime: 20, calories: 300, protein: 15, carbs: 40, fat: 8 },
        { cuisine: 'Mediterranean', cookTime: 30, calories: 450, protein: 22, carbs: 55, fat: 14 },
        { cuisine: 'Mexican', cookTime: 40, calories: 600, protein: 30, carbs: 70, fat: 20 },
      ];

      recipes.forEach(recipe => {
        const score = calculatePredictiveScore(recipe, userBehavior);
        expect(score.total).toBeGreaterThanOrEqual(0);
        expect(score.total).toBeLessThanOrEqual(100);
        expect(score.breakdown.historicalPatternMatch).toBeGreaterThanOrEqual(0);
        expect(score.breakdown.historicalPatternMatch).toBeLessThanOrEqual(40);
        expect(score.breakdown.trendAnalysis).toBeGreaterThanOrEqual(0);
        expect(score.breakdown.trendAnalysis).toBeLessThanOrEqual(30);
        expect(score.breakdown.successProbability).toBeGreaterThanOrEqual(0);
        expect(score.breakdown.successProbability).toBeLessThanOrEqual(30);
      });
    });
  });
});

