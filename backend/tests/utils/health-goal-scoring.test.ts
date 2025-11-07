// backend/tests/utils/health-goal-scoring.test.ts
import {
  calculateHealthGoalMatch,
  FitnessGoal,
  HealthGoalScore
} from '../../src/utils/healthGoalScoring';

describe('Health Goal Scoring', () => {
  describe('calculateHealthGoalMatch', () => {
    describe('Lose Weight Goal', () => {
      it('should reward lower calorie recipes', () => {
        const recipe = {
          calories: 400,
          protein: 25,
          carbs: 40,
          fat: 15,
          fiber: 5
        };

        const macroGoals = {
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20
        };

        const score = calculateHealthGoalMatch(recipe, 'lose_weight', macroGoals);

        expect(score.total).toBeGreaterThan(70);
        expect(score.breakdown.calorieAlignment).toBeGreaterThan(80); // Should reward being under target
      });

      it('should reward high protein for muscle preservation', () => {
        const recipe = {
          calories: 450,
          protein: 35, // High protein
          carbs: 30,
          fat: 15,
          fiber: 6
        };

        const macroGoals = {
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20
        };

        const score = calculateHealthGoalMatch(recipe, 'lose_weight', macroGoals);

        expect(score.breakdown.proteinAlignment).toBeGreaterThan(80); // Should reward high protein
      });

      it('should penalize high calorie recipes', () => {
        const recipe = {
          calories: 700, // High calories
          protein: 25,
          carbs: 60,
          fat: 25,
          fiber: 3
        };

        const macroGoals = {
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20
        };

        const score = calculateHealthGoalMatch(recipe, 'lose_weight', macroGoals);

        expect(score.breakdown.calorieAlignment).toBeLessThan(60); // Should penalize high calories
      });
    });

    describe('Gain Muscle Goal', () => {
      it('should reward high protein recipes', () => {
        const recipe = {
          calories: 600,
          protein: 40, // Very high protein
          carbs: 50,
          fat: 20,
          fiber: 4
        };

        const macroGoals = {
          calories: 600,
          protein: 35,
          carbs: 60,
          fat: 25
        };

        const score = calculateHealthGoalMatch(recipe, 'gain_muscle', macroGoals);

        expect(score.total).toBeGreaterThan(75);
        expect(score.breakdown.proteinAlignment).toBeGreaterThan(85); // Should reward high protein
      });

      it('should reward recipes at or slightly over calorie target', () => {
        const recipe = {
          calories: 630, // Slightly over target
          protein: 35,
          carbs: 55,
          fat: 23,
          fiber: 4
        };

        const macroGoals = {
          calories: 600,
          protein: 35,
          carbs: 60,
          fat: 25
        };

        const score = calculateHealthGoalMatch(recipe, 'gain_muscle', macroGoals);

        expect(score.breakdown.calorieAlignment).toBeGreaterThan(85); // Should reward being at/over target
      });

      it('should penalize low protein recipes', () => {
        const recipe = {
          calories: 600,
          protein: 15, // Low protein
          carbs: 70,
          fat: 20,
          fiber: 3
        };

        const macroGoals = {
          calories: 600,
          protein: 35,
          carbs: 60,
          fat: 25
        };

        const score = calculateHealthGoalMatch(recipe, 'gain_muscle', macroGoals);

        expect(score.breakdown.proteinAlignment).toBeLessThan(50); // Should penalize low protein
      });
    });

    describe('Gain Weight Goal', () => {
      it('should reward higher calorie recipes', () => {
        const recipe = {
          calories: 700, // High calories
          protein: 25,
          carbs: 70,
          fat: 30,
          fiber: 3
        };

        const macroGoals = {
          calories: 650,
          protein: 25,
          carbs: 70,
          fat: 28
        };

        const score = calculateHealthGoalMatch(recipe, 'gain_weight', macroGoals);

        expect(score.breakdown.calorieAlignment).toBeGreaterThan(80); // Should reward high calories
      });

      it('should reward recipes with higher carbs and fat', () => {
        const recipe = {
          calories: 700,
          protein: 25,
          carbs: 75, // Higher carbs
          fat: 32, // Higher fat
          fiber: 3
        };

        const macroGoals = {
          calories: 650,
          protein: 25,
          carbs: 70,
          fat: 28
        };

        const score = calculateHealthGoalMatch(recipe, 'gain_weight', macroGoals);

        expect(score.breakdown.macroBalance).toBeGreaterThan(70); // Should reward higher carbs/fat
      });
    });

    describe('Maintain Weight Goal', () => {
      it('should reward recipes close to calorie target', () => {
        const recipe = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20,
          fiber: 5
        };

        const macroGoals = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20
        };

        const score = calculateHealthGoalMatch(recipe, 'maintain', macroGoals);

        expect(score.total).toBeGreaterThan(80);
        expect(score.breakdown.calorieAlignment).toBeGreaterThan(90); // Should reward being close to target
      });

      it('should reward balanced macros', () => {
        const recipe = {
          calories: 500,
          protein: 25, // 20% of calories
          carbs: 50,   // 40% of calories
          fat: 20,     // 36% of calories
          fiber: 5
        };

        const macroGoals = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20
        };

        const score = calculateHealthGoalMatch(recipe, 'maintain', macroGoals);

        expect(score.breakdown.macroBalance).toBeGreaterThan(75); // Should reward balanced macros
      });
    });

    describe('No Fitness Goal', () => {
      it('should return neutral score when no fitness goal specified', () => {
        const recipe = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20,
          fiber: 5
        };

        const score = calculateHealthGoalMatch(recipe, null);

        expect(score.total).toBe(50);
        expect(score.breakdown.calorieAlignment).toBe(50);
        expect(score.breakdown.proteinAlignment).toBe(50);
        expect(score.breakdown.macroBalance).toBe(50);
        expect(score.breakdown.nutrientDensity).toBe(50);
      });
    });

    describe('General Guidelines (No Macro Goals)', () => {
      it('should use general guidelines for lose_weight when no macro goals', () => {
        const recipe = {
          calories: 400, // Good for weight loss
          protein: 25,   // High protein
          carbs: 35,
          fat: 15,
          fiber: 6
        };

        const score = calculateHealthGoalMatch(recipe, 'lose_weight', null);

        expect(score.total).toBeGreaterThan(70);
        expect(score.breakdown.calorieAlignment).toBeGreaterThan(80);
      });

      it('should use general guidelines for gain_muscle when no macro goals', () => {
        const recipe = {
          calories: 600, // Good for muscle gain
          protein: 35,   // Very high protein
          carbs: 50,
          fat: 20,
          fiber: 4
        };

        const score = calculateHealthGoalMatch(recipe, 'gain_muscle', null);

        expect(score.total).toBeGreaterThan(75);
        expect(score.breakdown.proteinAlignment).toBeGreaterThan(85);
      });
    });

    describe('Nutrient Density Scoring', () => {
      it('should reward high protein efficiency for all goals', () => {
        const recipe = {
          calories: 300,
          protein: 60, // Very high protein efficiency (0.20 ratio)
          carbs: 25,
          fat: 10,
          fiber: 5
        };

        const score = calculateHealthGoalMatch(recipe, 'lose_weight', null);

        expect(score.breakdown.nutrientDensity).toBeGreaterThan(70);
      });

      it('should reward high fiber for weight loss', () => {
        const recipe = {
          calories: 400,
          protein: 30, // High protein for bonus (0.075 efficiency)
          carbs: 40,
          fat: 15,
          fiber: 12 // High fiber (0.03 ratio)
        };

        const score = calculateHealthGoalMatch(recipe, 'lose_weight', null);

        // Protein gives 10 points, fiber gives 20 points = 50 + 10 + 20 = 80
        expect(score.breakdown.nutrientDensity).toBeGreaterThanOrEqual(70);
      });

      it('should reward fiber for maintenance goal', () => {
        const recipe = {
          calories: 500,
          protein: 30, // Higher protein for bonus
          carbs: 50,
          fat: 20,
          fiber: 10 // Good fiber content (0.02 ratio)
        };

        const score = calculateHealthGoalMatch(recipe, 'maintain', null);

        // Protein efficiency (0.06) gives 10 points, fiber gives 10 points = 50 + 10 + 10 = 70
        expect(score.breakdown.nutrientDensity).toBeGreaterThanOrEqual(60);
      });
    });

    describe('Macro Balance Scoring', () => {
      it('should reward high protein, moderate carbs for lose_weight', () => {
        const recipe = {
          calories: 500,
          protein: 35, // 28% of calories - high protein
          carbs: 50,   // 40% of calories - moderate carbs
          fat: 15,     // 27% of calories - lower fat
          fiber: 5
        };

        const score = calculateHealthGoalMatch(recipe, 'lose_weight', null);

        expect(score.breakdown.macroBalance).toBeGreaterThan(75);
      });

      it('should reward very high protein, high carbs for gain_muscle', () => {
        const recipe = {
          calories: 600,
          protein: 45, // 30% of calories - very high protein
          carbs: 60,  // 40% of calories - high carbs
          fat: 20,    // 30% of calories - moderate fat
          fiber: 4
        };

        const score = calculateHealthGoalMatch(recipe, 'gain_muscle', null);

        expect(score.breakdown.macroBalance).toBeGreaterThan(80);
      });

      it('should reward balanced macros for maintain', () => {
        const recipe = {
          calories: 500,
          protein: 25, // 20% of calories
          carbs: 50,  // 40% of calories
          fat: 20,    // 36% of calories
          fiber: 5
        };

        const score = calculateHealthGoalMatch(recipe, 'maintain', null);

        expect(score.breakdown.macroBalance).toBeGreaterThan(75);
      });
    });

    describe('Edge Cases', () => {
      it('should handle recipes with zero calories', () => {
        const recipe = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0
        };

        const score = calculateHealthGoalMatch(recipe, 'maintain', null);

        expect(score.total).toBeGreaterThanOrEqual(0);
        expect(score.total).toBeLessThanOrEqual(100);
      });

      it('should handle missing fiber field', () => {
        const recipe = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20
          // fiber is undefined
        };

        const score = calculateHealthGoalMatch(recipe, 'maintain', null);

        expect(score.total).toBeGreaterThanOrEqual(0);
        expect(score.total).toBeLessThanOrEqual(100);
      });

      it('should handle very high calorie recipes', () => {
        const recipe = {
          calories: 1200, // Very high
          protein: 40,
          carbs: 120,
          fat: 40,
          fiber: 5
        };

        const macroGoals = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20
        };

        const score = calculateHealthGoalMatch(recipe, 'lose_weight', macroGoals);

        expect(score.breakdown.calorieAlignment).toBeLessThan(40); // Should heavily penalize
      });

      it('should handle very low calorie recipes', () => {
        const recipe = {
          calories: 150, // Very low (snack)
          protein: 10,
          carbs: 15,
          fat: 5,
          fiber: 2
        };

        const macroGoals = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20
        };

        const score = calculateHealthGoalMatch(recipe, 'gain_muscle', macroGoals);

        expect(score.breakdown.calorieAlignment).toBeLessThan(50); // Should penalize for muscle gain
      });
    });

    describe('Score Ranges', () => {
      it('should always return scores between 0 and 100', () => {
        const recipes = [
          { calories: 200, protein: 10, carbs: 20, fat: 8, fiber: 2 },
          { calories: 500, protein: 25, carbs: 50, fat: 20, fiber: 5 },
          { calories: 800, protein: 40, carbs: 80, fat: 35, fiber: 8 },
          { calories: 1200, protein: 50, carbs: 120, fat: 50, fiber: 10 }
        ];

        const goals: FitnessGoal[] = ['lose_weight', 'gain_muscle', 'gain_weight', 'maintain'];

        recipes.forEach(recipe => {
          goals.forEach(goal => {
            const score = calculateHealthGoalMatch(recipe, goal, null);
            expect(score.total).toBeGreaterThanOrEqual(0);
            expect(score.total).toBeLessThanOrEqual(100);
            expect(score.breakdown.calorieAlignment).toBeGreaterThanOrEqual(0);
            expect(score.breakdown.calorieAlignment).toBeLessThanOrEqual(100);
            expect(score.breakdown.proteinAlignment).toBeGreaterThanOrEqual(0);
            expect(score.breakdown.proteinAlignment).toBeLessThanOrEqual(100);
            expect(score.breakdown.macroBalance).toBeGreaterThanOrEqual(0);
            expect(score.breakdown.macroBalance).toBeLessThanOrEqual(100);
            expect(score.breakdown.nutrientDensity).toBeGreaterThanOrEqual(0);
            expect(score.breakdown.nutrientDensity).toBeLessThanOrEqual(100);
          });
        });
      });
    });
  });
});

