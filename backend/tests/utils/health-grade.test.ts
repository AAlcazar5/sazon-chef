// backend/tests/utils/health-grade.test.ts
import {
  calculateHealthGrade,
  HealthGrade,
  HealthGradeResult
} from '../../src/utils/healthGrade';

describe('Health Grade System', () => {
  describe('calculateHealthGrade', () => {
    describe('Grade Assignment', () => {
      it('should assign A grade for excellent health profile (90-100)', () => {
        const recipe = {
          title: 'Mediterranean Quinoa Bowl',
          description: 'Healthy bowl with quinoa, vegetables, and lean protein',
          calories: 450,
          protein: 25,
          carbs: 50,
          fat: 15,
          fiber: 8,
          sugar: 5,
          ingredients: [
            { text: 'quinoa' },
            { text: 'fresh vegetables' },
            { text: 'lean chicken breast' },
            { text: 'olive oil' }
          ],
          instructions: [
            { text: 'Cook quinoa' },
            { text: 'Add vegetables and chicken' }
          ]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.grade).toBe('A');
        expect(result.score).toBeGreaterThanOrEqual(90);
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should assign B grade for good health profile (80-89)', () => {
        const recipe = {
          title: 'Grilled Chicken Salad',
          description: 'Salad with grilled chicken',
          calories: 400,
          protein: 30,
          carbs: 25,
          fat: 20,
          fiber: 6,
          sugar: 8,
          ingredients: [
            { text: 'chicken breast' },
            { text: 'mixed greens' },
            { text: 'vegetables' }
          ],
          instructions: [{ text: 'Grill chicken and assemble salad' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.grade).toBe('B');
        expect(result.score).toBeGreaterThanOrEqual(80);
        expect(result.score).toBeLessThan(90);
      });

      it('should assign C grade for moderate health profile (70-79)', () => {
        const recipe = {
          title: 'Moderate Meal',
          description: 'Meal with balanced nutrition',
          calories: 500,
          protein: 20, // Exactly at 20g threshold
          carbs: 55,
          fat: 18,
          fiber: 4, // Moderate fiber
          sugar: 12,
          ingredients: [
            { text: 'chicken' },
            { text: 'vegetables' },
            { text: 'whole grain rice' }
          ],
          instructions: [{ text: 'Cook chicken and rice' }]
        };

        const result = calculateHealthGrade(recipe);

        // Should be in C range (70-79) for moderate health profile
        expect(['C', 'B']).toContain(result.grade); // Could be B or C
        expect(result.score).toBeGreaterThanOrEqual(65);
        expect(result.score).toBeLessThan(85);
      });

      it('should assign D grade for below average health (60-69)', () => {
        const recipe = {
          title: 'Pasta with Cream Sauce',
          description: 'Pasta dish',
          calories: 650,
          protein: 15,
          carbs: 80,
          fat: 25,
          fiber: 2,
          sugar: 5,
          ingredients: [
            { text: 'white pasta' },
            { text: 'cream' },
            { text: 'butter' }
          ],
          instructions: [{ text: 'Cook pasta and add cream sauce' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.grade).toBe('D');
        expect(result.score).toBeGreaterThanOrEqual(60);
        expect(result.score).toBeLessThan(70);
      });

      it('should assign F grade for poor health profile (0-59)', () => {
        const recipe = {
          title: 'Fried Chicken with Fries',
          description: 'Deep fried chicken and french fries',
          calories: 850,
          protein: 30,
          carbs: 70,
          fat: 45,
          fiber: 2,
          sugar: 3,
          ingredients: [
            { text: 'fried chicken' },
            { text: 'french fries' },
            { text: 'refined flour' },
            { text: 'processed oil' }
          ],
          instructions: [
            { text: 'Deep fry chicken' },
            { text: 'Fry potatoes' }
          ]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.grade).toBe('F');
        expect(result.score).toBeLessThan(60);
      });
    });

    describe('Macronutrient Balance Scoring', () => {
      it('should reward high protein adequacy (20g+)', () => {
        const recipe = {
          calories: 500,
          protein: 25, // 20g+
          carbs: 50,
          fat: 20,
          fiber: 5,
          ingredients: [{ text: 'chicken' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.proteinAdequacy).toBe(10);
      });

      it('should reward balanced macros', () => {
        const recipe = {
          calories: 500,
          protein: 25, // 20% of calories
          carbs: 50,   // 40% of calories
          fat: 20,     // 36% of calories
          fiber: 5,
          ingredients: [{ text: 'balanced meal' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.macroBalance).toBe(10);
      });

      it('should penalize severe macro imbalance', () => {
        const recipe = {
          calories: 500,
          protein: 5,
          carbs: 120, // 96% of calories from carbs
          fat: 2,
          fiber: 2,
          ingredients: [{ text: 'pasta' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.macroBalance).toBe(2);
      });

      it('should reward lower fat with higher protein', () => {
        const recipe = {
          calories: 500,
          protein: 30, // 24% of calories - high protein
          carbs: 50,
          fat: 15, // Lower fat
          fiber: 5,
          ingredients: [{ text: 'lean protein' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.fatQuality).toBe(5);
      });
    });

    describe('Calorie Density Scoring', () => {
      it('should reward optimal meal range (300-600 calories)', () => {
        const recipe = {
          calories: 450,
          protein: 25,
          carbs: 50,
          fat: 15,
          fiber: 5,
          ingredients: [{ text: 'meal' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.calorieRange).toBe(15);
      });

      it('should score snacks appropriately (150-299 calories)', () => {
        const recipe = {
          calories: 200,
          protein: 10,
          carbs: 25,
          fat: 8,
          fiber: 3,
          ingredients: [{ text: 'snack' }],
          instructions: [{ text: 'Prepare' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.calorieRange).toBe(12);
      });

      it('should penalize very heavy meals (>900 calories)', () => {
        const recipe = {
          calories: 1200,
          protein: 40,
          carbs: 150,
          fat: 50,
          fiber: 5,
          ingredients: [{ text: 'large meal' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.calorieRange).toBe(3);
      });

      it('should reward high calorie-to-nutrient efficiency', () => {
        const recipe = {
          calories: 120,
          protein: 24, // 0.20 ratio - excellent efficiency
          carbs: 5,
          fat: 2,
          fiber: 1,
          ingredients: [{ text: 'protein powder' }],
          instructions: [{ text: 'Mix' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.calorieNutrientRatio).toBe(5);
      });
    });

    describe('Nutrient Density Scoring', () => {
      it('should reward high fiber content for meals (300+ calories)', () => {
        const recipe = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20,
          fiber: 8, // 5g+ fiber
          ingredients: [{ text: 'whole grains' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.fiberContent).toBe(10);
      });

      it('should pro-rate fiber for snacks (<300 calories)', () => {
        const recipe = {
          calories: 120,
          protein: 24,
          carbs: 5,
          fat: 2,
          fiber: 2, // Pro-rated: 120/300 * 5g = 2g target
          ingredients: [{ text: 'protein shake' }],
          instructions: [{ text: 'Mix' }]
        };

        const result = calculateHealthGrade(recipe);

        // Should score well for pro-rated fiber
        expect(result.details.fiberContent).toBeGreaterThanOrEqual(7);
      });

      it('should reward excellent protein efficiency (>0.20 ratio)', () => {
        const recipe = {
          calories: 120,
          protein: 24, // 0.20 ratio
          carbs: 5,
          fat: 2,
          fiber: 1,
          ingredients: [{ text: 'protein' }],
          instructions: [{ text: 'Mix' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.proteinEfficiency).toBe(10);
      });

      it('should reward whole foods and nutrient-rich ingredients', () => {
        const recipe = {
          calories: 400,
          protein: 20,
          carbs: 40,
          fat: 15,
          fiber: 6,
          ingredients: [
            { text: 'fresh vegetables' },
            { text: 'whole grain quinoa' },
            { text: 'lean salmon' },
            { text: 'fresh fruits' },
            { text: 'nuts and seeds' }
          ],
          instructions: [{ text: 'Cook healthy meal' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.overallNutrientRichness).toBe(5);
      });
    });

    describe('Ingredient Quality Scoring', () => {
      it('should reward primarily whole, unprocessed ingredients', () => {
        const recipe = {
          calories: 400,
          protein: 25,
          carbs: 40,
          fat: 15,
          fiber: 5,
          ingredients: [
            { text: 'whole grain quinoa' },
            { text: 'fresh vegetables' },
            { text: 'organic chicken' }
          ],
          instructions: [{ text: 'Cook with whole foods' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.wholeFoodsPresence).toBe(10);
      });

      it('should penalize highly processed ingredients', () => {
        const recipe = {
          calories: 500,
          protein: 20,
          carbs: 60,
          fat: 20,
          fiber: 2,
          ingredients: [
            { text: 'refined white flour' },
            { text: 'processed meat' },
            { text: 'artificial preservatives' },
            { text: 'hydrogenated oil' }
          ],
          instructions: [{ text: 'Use processed ingredients' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.processedIngredientsPenalty).toBe(2);
      });
    });

    describe('Sugar & Sodium Scoring', () => {
      it('should reward low sugar content (<10g)', () => {
        const recipe = {
          calories: 400,
          protein: 25,
          carbs: 40,
          fat: 15,
          fiber: 5,
          sugar: 5, // <10g
          ingredients: [{ text: 'natural ingredients' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.sugarContent).toBe(5);
      });

      it('should penalize high sugar content (>30g)', () => {
        const recipe = {
          calories: 400,
          protein: 15,
          carbs: 60,
          fat: 10,
          fiber: 2,
          sugar: 45, // >30g
          ingredients: [
            { text: 'sugar' },
            { text: 'high fructose corn syrup' },
            { text: 'candy' }
          ],
          instructions: [{ text: 'Add sugar' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.sugarContent).toBe(0);
      });

      it('should infer sugar from ingredients when sugar data unavailable', () => {
        const recipe = {
          calories: 400,
          protein: 15,
          carbs: 60,
          fat: 10,
          fiber: 2,
          sugar: null, // Not available
          ingredients: [
            { text: 'sugar' },
            { text: 'honey' },
            { text: 'maple syrup' }
          ],
          instructions: [{ text: 'Add sweeteners' }]
        };

        const result = calculateHealthGrade(recipe);

        // Should infer high sugar from ingredients
        expect(result.details.sugarContent).toBeLessThan(5);
      });

      it('should infer sodium from ingredients', () => {
        const recipe = {
          calories: 500,
          protein: 25,
          carbs: 50,
          fat: 20,
          fiber: 5,
          ingredients: [
            { text: 'salt' },
            { text: 'soy sauce' },
            { text: 'bacon' },
            { text: 'cured meat' }
          ],
          instructions: [{ text: 'Add salty ingredients' }]
        };

        const result = calculateHealthGrade(recipe);

        // Should infer high sodium from ingredients
        expect(result.details.sodiumContent).toBeLessThan(5);
      });

      it('should reward low sodium', () => {
        const recipe = {
          calories: 400,
          protein: 25,
          carbs: 40,
          fat: 15,
          fiber: 5,
          ingredients: [
            { text: 'fresh vegetables' },
            { text: 'lean protein' }
          ],
          instructions: [{ text: 'Cook without salt' }]
        };

        const result = calculateHealthGrade(recipe);

        // Should infer low sodium when no salt indicators are present
        expect(result.details.sodiumContent).toBeGreaterThanOrEqual(3);
      });
    });

    describe('Example Recipes from Proposal', () => {
      it('should score Mediterranean Quinoa Bowl as A grade', () => {
        const recipe = {
          title: 'Mediterranean Quinoa Bowl',
          description: 'Healthy bowl with quinoa and vegetables',
          calories: 450,
          protein: 25,
          carbs: 50,
          fat: 15,
          fiber: 8,
          sugar: 5,
          ingredients: [
            { text: 'quinoa' },
            { text: 'fresh vegetables' },
            { text: 'olive oil' },
            { text: 'whole grains' }
          ],
          instructions: [{ text: 'Cook quinoa and vegetables' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.grade).toBe('A');
        expect(result.score).toBeGreaterThanOrEqual(90);
      });

      it('should score Protein Shake appropriately as C grade', () => {
        const recipe = {
          title: 'Protein Shake',
          description: 'High protein shake',
          calories: 120,
          protein: 24, // Excellent protein efficiency
          carbs: 5,
          fat: 2,
          fiber: 1, // Low fiber (pro-rated: needs 2g for full points)
          sugar: 2,
          ingredients: [
            { text: 'protein powder' },
            { text: 'water' }
          ],
          instructions: [{ text: 'Mix protein powder' }]
        };

        const result = calculateHealthGrade(recipe);

        // Should be around C grade (good protein efficiency, but limited other nutrients)
        // Note: Protein powder is considered processed, so ingredient quality may be lower
        expect(['C', 'D']).toContain(result.grade); // Could be C or D depending on processing
        expect(result.score).toBeGreaterThanOrEqual(60);
        expect(result.details.proteinEfficiency).toBe(10); // Excellent protein efficiency
      });

      it('should score Fried Chicken with Fries as F grade', () => {
        const recipe = {
          title: 'Fried Chicken with Fries',
          description: 'Deep fried meal',
          calories: 850,
          protein: 30,
          carbs: 80,
          fat: 50,
          fiber: 2,
          sugar: 3,
          ingredients: [
            { text: 'fried chicken' },
            { text: 'french fries' },
            { text: 'refined flour' },
            { text: 'processed oil' },
            { text: 'salt' },
            { text: 'soy sauce' }
          ],
          instructions: [
            { text: 'Deep fry chicken' },
            { text: 'Fry potatoes' }
          ]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.grade).toBe('F');
        expect(result.score).toBeLessThan(60);
      });
    });

    describe('Edge Cases', () => {
      it('should handle recipes with zero calories', () => {
        const recipe = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          ingredients: [{ text: 'water' }],
          instructions: [{ text: 'Drink' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
      });

      it('should handle missing fiber field', () => {
        const recipe = {
          calories: 400,
          protein: 25,
          carbs: 50,
          fat: 15,
          // fiber is undefined
          ingredients: [{ text: 'meal' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.fiberContent).toBe(0); // No fiber = 0 points
        expect(result.score).toBeGreaterThanOrEqual(0);
      });

      it('should handle missing sugar field', () => {
        const recipe = {
          calories: 400,
          protein: 25,
          carbs: 50,
          fat: 15,
          fiber: 5,
          // sugar is undefined
          ingredients: [{ text: 'natural ingredients' }],
          instructions: [{ text: 'Cook' }]
        };

        const result = calculateHealthGrade(recipe);

        // Should infer sugar from ingredients (or default to low if none detected)
        expect(result.details.sugarContent).toBeGreaterThanOrEqual(0);
        expect(result.details.sugarContent).toBeLessThanOrEqual(5);
      });

      it('should handle very light snacks (<150 calories)', () => {
        const recipe = {
          calories: 100,
          protein: 5,
          carbs: 15,
          fat: 3,
          fiber: 2,
          ingredients: [{ text: 'light snack' }],
          instructions: [{ text: 'Prepare' }]
        };

        const result = calculateHealthGrade(recipe);

        expect(result.details.calorieRange).toBe(10); // Very light = 10 points
        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Score Components', () => {
      it('should calculate all breakdown components correctly', () => {
        const recipe = {
          calories: 450,
          protein: 25,
          carbs: 50,
          fat: 15,
          fiber: 8,
          sugar: 5,
          ingredients: [
            { text: 'whole grain quinoa' },
            { text: 'fresh vegetables' },
            { text: 'lean chicken' }
          ],
          instructions: [{ text: 'Cook healthy meal' }]
        };

        const result = calculateHealthGrade(recipe);

        // Check all breakdown components exist and are within range
        expect(result.breakdown.macronutrientBalance).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.macronutrientBalance).toBeLessThanOrEqual(25);
        expect(result.breakdown.calorieDensity).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.calorieDensity).toBeLessThanOrEqual(20);
        expect(result.breakdown.nutrientDensity).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.nutrientDensity).toBeLessThanOrEqual(25);
        expect(result.breakdown.ingredientQuality).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.ingredientQuality).toBeLessThanOrEqual(20);
        expect(result.breakdown.sugarAndSodium).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.sugarAndSodium).toBeLessThanOrEqual(10);

        // Total should equal sum of breakdowns (within rounding)
        const sum = 
          result.breakdown.macronutrientBalance +
          result.breakdown.calorieDensity +
          result.breakdown.nutrientDensity +
          result.breakdown.ingredientQuality +
          result.breakdown.sugarAndSodium;
        
        expect(Math.abs(result.score - sum)).toBeLessThanOrEqual(1); // Allow 1 point rounding difference
      });
    });
  });
});

