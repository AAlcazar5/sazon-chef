// backend/tests/enhanced-scoring.test.ts
import { calculateEnhancedScore } from '../src/utils/enhancedScoring';

describe('Enhanced Scoring', () => {
  const mockRecipe = {
    id: 'recipe-1',
    title: 'Quick Pasta',
    cuisine: 'Italian',
    cookTime: 20,
    calories: 400,
    protein: 20,
    carbs: 50,
    fat: 15,
    ingredients: [
      { text: 'pasta' },
      { text: 'tomato sauce' },
      { text: 'cheese' }
    ],
    difficulty: 'easy'
  };

  const mockCookTimeContext = {
    availableTime: 30,
    timeOfDay: 'evening' as const,
    dayOfWeek: 'weekday' as const,
    urgency: 'medium' as const
  };

  const mockUserKitchenProfile = {
    cookingSkill: 'intermediate' as const,
    preferredCookTime: 25,
    kitchenEquipment: [
      'stovetop', 'oven', 'microwave', 'refrigerator', 'freezer',
      'knife', 'cutting board', 'mixing bowl', 'measuring cups',
      'measuring spoons', 'whisk', 'spatula', 'tongs'
    ],
    dietaryRestrictions: [],
    budget: 'medium' as const
  };

  describe('calculateEnhancedScore', () => {
    it('should return high score for recipes matching cook time', () => {
      const score = calculateEnhancedScore(mockRecipe, mockCookTimeContext, mockUserKitchenProfile);
      
      expect(score.total).toBeGreaterThan(70);
      expect(score.cookTimeScore).toBeGreaterThan(0);
      expect(score.convenienceScore).toBeGreaterThan(0);
      expect(score.breakdown.cookTimeMatch).toBeGreaterThan(0);
      expect(score.breakdown.convenienceFactor).toBeGreaterThan(0);
      expect(score.breakdown.timeEfficiency).toBeGreaterThan(0);
    });

    it('should penalize recipes that exceed available time', () => {
      const longRecipe = {
        ...mockRecipe,
        cookTime: 60 // Exceeds available time of 30 minutes
      };

      const score = calculateEnhancedScore(longRecipe, mockCookTimeContext, mockUserKitchenProfile);
      
      expect(score.total).toBeLessThan(50);
      expect(score.cookTimeScore).toBeLessThan(50);
    });

    it('should give bonus for quick recipes when user has limited time', () => {
      const urgentContext = {
        ...mockCookTimeContext,
        availableTime: 15,
        urgency: 'high' as const
      };

      const quickRecipe = {
        ...mockRecipe,
        cookTime: 10
      };

      const score = calculateEnhancedScore(quickRecipe, urgentContext, mockUserKitchenProfile);
      
      expect(score.total).toBeGreaterThan(80);
      expect(score.cookTimeScore).toBeGreaterThan(80);
    });

    it('should consider cooking skill level', () => {
      const beginnerProfile = {
        ...mockUserKitchenProfile,
        cookingSkill: 'beginner' as const
      };

      const complexRecipe = {
        ...mockRecipe,
        cookTime: 45,
        ingredients: Array.from({ length: 15 }, (_, i) => ({ text: `ingredient-${i}` }))
      };

      const score = calculateEnhancedScore(complexRecipe, mockCookTimeContext, beginnerProfile);
      
      expect(score.convenienceScore).toBeLessThan(70); // Should penalize complex recipes for beginners
    });

    it('should consider time of day preferences', () => {
      const morningContext = {
        ...mockCookTimeContext,
        timeOfDay: 'morning' as const
      };

      const breakfastRecipe = {
        ...mockRecipe,
        cookTime: 10,
        title: 'Quick Breakfast'
      };

      const score = calculateEnhancedScore(breakfastRecipe, morningContext, mockUserKitchenProfile);
      
      expect(score.total).toBeGreaterThan(70);
    });

    it('should consider day of week preferences', () => {
      const weekendContext = {
        ...mockCookTimeContext,
        dayOfWeek: 'weekend' as const
      };

      const elaborateRecipe = {
        ...mockRecipe,
        cookTime: 45,
        title: 'Weekend Special'
      };

      const score = calculateEnhancedScore(elaborateRecipe, weekendContext, mockUserKitchenProfile);
      
      expect(score.total).toBeGreaterThan(60); // Should be more lenient on weekends
    });

    it('should handle missing equipment gracefully', () => {
      const limitedEquipmentProfile = {
        ...mockUserKitchenProfile,
        kitchenEquipment: ['stovetop', 'knife'] // Missing some equipment
      };

      const score = calculateEnhancedScore(mockRecipe, mockCookTimeContext, limitedEquipmentProfile);
      
      expect(score.total).toBeGreaterThan(0);
      expect(score.total).toBeLessThanOrEqual(100);
    });

    it('should return score between 0 and 100', () => {
      const score = calculateEnhancedScore(mockRecipe, mockCookTimeContext, mockUserKitchenProfile);
      
      expect(score.total).toBeGreaterThanOrEqual(0);
      expect(score.total).toBeLessThanOrEqual(100);
      expect(score.cookTimeScore).toBeGreaterThanOrEqual(0);
      expect(score.cookTimeScore).toBeLessThanOrEqual(100);
      expect(score.convenienceScore).toBeGreaterThanOrEqual(0);
      expect(score.convenienceScore).toBeLessThanOrEqual(100);
    });
  });
});
