// backend/tests/utils/health-metrics-scoring.test.ts
import {
  calculateHealthMetricsScore,
  analyzeHealthTrends,
  HealthMetrics,
} from '../../src/utils/healthMetricsScoring';

describe('Health Metrics Scoring - Fitness Goal Based', () => {
  const mockPhysicalProfile = {
    weightKg: 70,
    heightCm: 175,
    age: 30,
    gender: 'male',
    activityLevel: 'moderately_active',
    fitnessGoal: 'maintain',
  };

  describe('calculateHealthMetricsScore', () => {
    it('should return neutral score when no health metrics and no physical profile', () => {
      const recipe = {
        calories: 500,
        protein: 25,
      };

      const score = calculateHealthMetricsScore(recipe, null, null);

      expect(score.total).toBe(50);
      expect(score.breakdown.expenditureAdjustment).toBe(0);
      expect(score.details.steps).toBe(0);
      expect(score.details.calculatedExpenditure).toBe(0);
      expect(score.details.recommendedCalorieRange.min).toBe(0);
      expect(score.details.recommendedCalorieRange.max).toBe(0);
    });

    it('should return neutral score when no physical profile available', () => {
      const recipe = {
        calories: 500,
        protein: 25,
      };

      const healthMetrics: HealthMetrics = {
        steps: 10000,
      };

      const score = calculateHealthMetricsScore(recipe, healthMetrics, null);

      expect(score.total).toBe(50);
      expect(score.details.steps).toBe(0); // Steps not used for recipe scoring
      expect(score.details.calculatedExpenditure).toBe(0);
      expect(score.details.recommendedCalorieRange.min).toBe(0);
      expect(score.details.recommendedCalorieRange.max).toBe(0);
    });

    it('should use fitness goal for recommendations even without step data', () => {
      const recipe = {
        calories: 500,
        protein: 25,
      };

      // Maintain goal should recommend 250-850 calories (lenient range for daily totals)
      const score = calculateHealthMetricsScore(recipe, null, mockPhysicalProfile);

      expect(score.details.recommendedCalorieRange.min).toBe(250);
      expect(score.details.recommendedCalorieRange.max).toBe(850);
      expect(score.details.fitnessGoalBased).toBe(true);
      // Recipe with 500 calories should score well for maintain goal (within range)
      expect(score.total).toBe(100); // Should be 100 since it's within the lenient range
    });

    it('should use lose_weight goal for lower calorie recommendations', () => {
      const recipe = {
        calories: 400,
        protein: 25,
      };

      const profileWithWeightLoss = {
        ...mockPhysicalProfile,
        fitnessGoal: 'lose_weight',
      };

      const score = calculateHealthMetricsScore(recipe, null, profileWithWeightLoss);

      // Lose weight should recommend 200-800 calories (lenient range)
      expect(score.details.recommendedCalorieRange.min).toBe(200);
      expect(score.details.recommendedCalorieRange.max).toBe(800);
      expect(score.details.fitnessGoalBased).toBe(true);
      // Recipe with 400 calories should score well (within range)
      expect(score.total).toBe(100);
    });

    it('should use gain_muscle goal for higher calorie recommendations', () => {
      const recipe = {
        calories: 600,
        protein: 30,
      };

      const profileWithMuscleGain = {
        ...mockPhysicalProfile,
        fitnessGoal: 'gain_muscle',
      };

      const score = calculateHealthMetricsScore(recipe, null, profileWithMuscleGain);

      // Gain muscle should recommend 300-900 calories (lenient range)
      expect(score.details.recommendedCalorieRange.min).toBe(300);
      expect(score.details.recommendedCalorieRange.max).toBe(900);
      expect(score.details.fitnessGoalBased).toBe(true);
      // Recipe with 600 calories should score well (within range)
      expect(score.total).toBe(100);
    });

    it('should use gain_weight goal for highest calorie recommendations', () => {
      const recipe = {
        calories: 650,
        protein: 25,
      };

      const profileWithWeightGain = {
        ...mockPhysicalProfile,
        fitnessGoal: 'gain_weight',
      };

      const score = calculateHealthMetricsScore(recipe, null, profileWithWeightGain);

      // Gain weight should recommend 300-1000 calories (lenient range)
      expect(score.details.recommendedCalorieRange.min).toBe(300);
      expect(score.details.recommendedCalorieRange.max).toBe(1000);
      expect(score.details.fitnessGoalBased).toBe(true);
      // Recipe with 650 calories should score well (within range)
      expect(score.total).toBe(100);
    });

    it('should NOT adjust range based on step count (steps only used for expenditure calculation)', () => {
      const recipe = {
        calories: 600,
        protein: 30,
      };

      const healthMetrics: HealthMetrics = {
        steps: 15000, // High step count - but not used for recipe scoring
      };

      // Step count is NOT used for recipe recommendations
      const score = calculateHealthMetricsScore(recipe, healthMetrics, mockPhysicalProfile);

      // Step count and expenditure should be 0 (not used for scoring)
      expect(score.details.calculatedExpenditure).toBe(0);
      // Should use maintain goal range (250-850) regardless of steps
      expect(score.details.recommendedCalorieRange.min).toBe(250);
      expect(score.details.recommendedCalorieRange.max).toBe(850);
      // Recipe with 600 calories should score well (within range)
      expect(score.total).toBe(100);
    });

    it('should use macro goals if available', () => {
      const recipe = {
        calories: 500,
        protein: 25,
      };

      const macroGoals = { calories: 2400 }; // 2400 calories per day

      const score = calculateHealthMetricsScore(recipe, null, mockPhysicalProfile, macroGoals);

      // Should use macro goals (10-50% of 2400 = 240-1200 calories per meal)
      expect(score.details.recommendedCalorieRange.min).toBe(240); // 10% of 2400
      expect(score.details.recommendedCalorieRange.max).toBe(1200); // 50% of 2400
      expect(score.details.fitnessGoalBased).toBe(true);
      // Recipe with 500 calories should score well (within range)
      expect(score.total).toBe(100);
    });

    it('should only slightly penalize recipes WAY outside recommended calorie range', () => {
      const recipe = {
        calories: 1500, // Very high for lose_weight (200-800 range)
        protein: 25,
      };

      const profileWithWeightLoss = {
        ...mockPhysicalProfile,
        fitnessGoal: 'lose_weight',
      };

      const score = calculateHealthMetricsScore(recipe, null, profileWithWeightLoss);

      // Recipe is way outside recommended range (1500 vs 800 max), should score lower
      // But still lenient - only penalizes if > 150% of max
      expect(score.total).toBeLessThan(100);
    });

    it('should only penalize extremely high calorie meals for lose_weight goal', () => {
      const recipe = {
        calories: 500, // Within lose_weight range (200-800)
        protein: 25,
      };

      const profileWithWeightLoss = {
        ...mockPhysicalProfile,
        fitnessGoal: 'lose_weight',
      };

      const score = calculateHealthMetricsScore(recipe, null, profileWithWeightLoss);

      // Recipe is within range, should score well
      expect(score.total).toBe(100);
      
      // Test with extremely high calorie meal (1500+)
      const highCalorieRecipe = { calories: 1600, protein: 25 };
      const highScore = calculateHealthMetricsScore(highCalorieRecipe, null, profileWithWeightLoss);
      // Should penalize extremely high calorie meals
      expect(highScore.total).toBeLessThan(100);
    });

    it('should adjust for gain_muscle fitness goal with protein bonus', () => {
      const recipe = {
        calories: 600,
        protein: 30, // High protein
      };

      const profileWithMuscleGain = {
        ...mockPhysicalProfile,
        fitnessGoal: 'gain_muscle',
      };

      const score = calculateHealthMetricsScore(recipe, null, profileWithMuscleGain);

      // High protein meal should score well for muscle gain (within range, gets protein bonus)
      expect(score.total).toBe(100); // 100 base + 5 protein bonus = 100 (capped)
    });

    it('should handle edge cases', () => {
      const recipe = {
        calories: 500,
        protein: 25,
      };

      // Zero steps - should still use fitness goal (steps not used for scoring)
      const zeroSteps = calculateHealthMetricsScore(recipe, { steps: 0 }, mockPhysicalProfile);
      expect(zeroSteps.total).toBe(100); // Should use maintain goal, recipe within range
      expect(zeroSteps.details.calculatedExpenditure).toBe(0); // Not calculated for scoring

      // Very high steps - should NOT adjust range (steps not used for scoring)
      const highSteps = calculateHealthMetricsScore(recipe, { steps: 30000 }, mockPhysicalProfile);
      expect(highSteps.details.calculatedExpenditure).toBe(0); // Not used for scoring
      expect(highSteps.details.recommendedCalorieRange.min).toBe(250); // Maintain goal range (lenient)
      expect(highSteps.details.recommendedCalorieRange.max).toBe(850); // Maintain goal range (lenient)
      expect(highSteps.total).toBe(100); // Recipe within range
    });
  });

  describe('analyzeHealthTrends', () => {
    it('should detect increasing activity trend', () => {
      const recentMetrics: HealthMetrics[] = [
        { steps: 5000 },
        { steps: 6000 },
        { steps: 7000 },
        { steps: 8000 },
      ];

      const trends = analyzeHealthTrends(recentMetrics);

      expect(trends.activityTrend).toBe('increasing');
      expect(trends.avgSteps).toBeGreaterThan(0);
      expect(trends.totalSteps).toBe(26000);
    });

    it('should detect decreasing activity trend', () => {
      const recentMetrics: HealthMetrics[] = [
        { steps: 10000 },
        { steps: 9000 },
        { steps: 8000 },
        { steps: 7000 },
      ];

      const trends = analyzeHealthTrends(recentMetrics);

      expect(trends.activityTrend).toBe('decreasing');
      expect(trends.avgSteps).toBe(8500);
    });

    it('should detect stable activity trend', () => {
      const recentMetrics: HealthMetrics[] = [
        { steps: 5000 },
        { steps: 5100 },
        { steps: 4900 },
        { steps: 5000 },
      ];

      const trends = analyzeHealthTrends(recentMetrics);

      expect(trends.activityTrend).toBe('stable');
    });

    it('should return stable trends for insufficient data', () => {
      const recentMetrics: HealthMetrics[] = [
        { steps: 5000 },
      ];

      const trends = analyzeHealthTrends(recentMetrics);

      expect(trends.activityTrend).toBe('stable');
      expect(trends.avgSteps).toBe(5000);
      expect(trends.totalSteps).toBe(5000);
    });
  });
});
