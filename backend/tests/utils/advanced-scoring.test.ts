// backend/tests/utils/advanced-scoring.test.ts
import {
  detectSpiceLevel,
  calculateSpiceLevelMatch,
  assessRecipeComplexity,
  calculateSkillLevelMatch,
  checkDietaryCompliance,
  SpiceLevelDetection,
  ComplexityAssessment,
  DietaryCompliance
} from '../../src/utils/advancedScoring';

describe('Advanced Scoring', () => {
  describe('Spice Level Detection', () => {
    describe('detectSpiceLevel', () => {
      it('should detect mild spice level', () => {
        const recipe = {
          title: 'Garlic Bread',
          description: 'Simple bread with garlic and herbs',
          ingredients: [
            { text: 'bread' },
            { text: 'garlic' },
            { text: 'butter' },
            { text: 'black pepper' }
          ],
          instructions: [
            { text: 'Spread butter on bread' },
            { text: 'Add garlic and herbs' }
          ],
          cuisine: 'Italian'
        };

        const result = detectSpiceLevel(recipe);

        expect(result.detectedLevel).toBe('mild');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.indicators).toContain('garlic');
        expect(result.indicators).toContain('black pepper');
      });

      it('should detect medium spice level', () => {
        const recipe = {
          title: 'Jalapeño Poppers',
          description: 'Jalapeños with cayenne',
          ingredients: [
            { text: 'jalapeño peppers' },
            { text: 'cayenne pepper' },
            { text: 'cheese' }
          ],
          instructions: [
            { text: 'Stuff jalapeños with cheese' },
            { text: 'Add cayenne' }
          ],
          cuisine: 'American' // Not a spicy cuisine to avoid extra points
        };

        const result = detectSpiceLevel(recipe);

        // Jalapeño (3) + cayenne (3) = 6 points, which should be medium (4-6 range)
        expect(result.detectedLevel).toBe('medium');
        expect(result.indicators.some((ind: string) => ind.includes('jalapeño') || ind.includes('jalapeno') || ind.includes('cayenne'))).toBe(true);
      });

      it('should detect spicy level', () => {
        const recipe = {
          title: 'Habanero Hot Sauce',
          description: 'Hot sauce with habanero peppers',
          ingredients: [
            { text: 'habanero peppers' },
            { text: 'vinegar' }
          ],
          instructions: [
            { text: 'Blend habaneros with vinegar' }
          ],
          cuisine: 'American' // Not a spicy cuisine to avoid extra points
        };

        const result = detectSpiceLevel(recipe);

        // Habanero alone gives 5 points, which should be spicy (6-10 range)
        expect(result.detectedLevel).toBe('spicy');
        expect(result.indicators.some((ind: string) => ind.includes('habanero'))).toBe(true);
      });

      it('should detect very spicy level', () => {
        const recipe = {
          title: 'Ghost Pepper Curry',
          description: 'Extreme heat curry with ghost pepper',
          ingredients: [
            { text: 'ghost pepper' },
            { text: 'carolina reaper' },
            { text: 'curry powder' }
          ],
          instructions: [
            { text: 'Use extreme caution with ghost peppers' },
            { text: 'Add carolina reaper for maximum heat' }
          ],
          cuisine: 'Indian'
        };

        const result = detectSpiceLevel(recipe);

        expect(result.detectedLevel).toBe('very_spicy');
        expect(result.indicators.some((ind: string) => ind.includes('ghost pepper'))).toBe(true);
      });

      it('should use cuisine context for inference', () => {
        const recipe = {
          title: 'Thai Curry',
          ingredients: [{ text: 'coconut milk' }],
          instructions: [{ text: 'Cook curry' }],
          cuisine: 'Thai'
        };

        const result = detectSpiceLevel(recipe);

        // Thai cuisine should add to spice score
        expect(result.detectedLevel).toBe('mild'); // At minimum mild due to cuisine
        expect(result.confidence).toBeGreaterThan(0);
      });

      it('should handle recipes with no spice indicators', () => {
        const recipe = {
          title: 'Plain Rice',
          ingredients: [{ text: 'rice' }, { text: 'water' }],
          instructions: [{ text: 'Cook rice' }],
          cuisine: 'General'
        };

        const result = detectSpiceLevel(recipe);

        expect(result.detectedLevel).toBe('mild');
        expect(result.indicators.length).toBe(0);
      });
    });

    describe('calculateSpiceLevelMatch', () => {
      it('should return high score for perfect match', () => {
        const recipe = {
          title: 'Jalapeño Poppers',
          ingredients: [{ text: 'jalapeño peppers' }],
          instructions: [{ text: 'Cook peppers' }],
          cuisine: 'Mexican'
        };

        const score = calculateSpiceLevelMatch(recipe, 'medium');

        expect(score).toBeGreaterThanOrEqual(75); // Should be close or perfect match
      });

      it('should return lower score for mismatch', () => {
        const recipe = {
          title: 'Habanero Hot Sauce',
          ingredients: [{ text: 'habanero peppers' }],
          instructions: [{ text: 'Make sauce' }],
          cuisine: 'Thai'
        };

        const score = calculateSpiceLevelMatch(recipe, 'mild');

        expect(score).toBeLessThan(60); // Should be penalized for mismatch
      });

      it('should return neutral score when no user preference', () => {
        const recipe = {
          title: 'Spicy Curry',
          ingredients: [{ text: 'chili' }],
          instructions: [{ text: 'Cook curry' }],
          cuisine: 'Indian'
        };

        const score = calculateSpiceLevelMatch(recipe, null);

        expect(score).toBe(50);
      });

      it('should handle close matches (e.g., mild vs medium)', () => {
        const recipe = {
          title: 'Mild Curry',
          ingredients: [{ text: 'cumin' }, { text: 'coriander' }],
          instructions: [{ text: 'Cook curry' }],
          cuisine: 'Indian'
        };

        const score = calculateSpiceLevelMatch(recipe, 'medium');

        expect(score).toBeGreaterThan(60); // Close match should score well
        // Note: If detected level is medium, it could be a perfect match (95)
        // So we just check it's a reasonable score
        expect(score).toBeGreaterThanOrEqual(45);
        expect(score).toBeLessThanOrEqual(95);
      });
    });
  });

  describe('Recipe Complexity Assessment', () => {
    describe('assessRecipeComplexity', () => {
      it('should classify easy recipes correctly', () => {
        const recipe = {
          cookTime: 10,
          ingredients: Array.from({ length: 3 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 2 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'easy'
        };

        const result = assessRecipeComplexity(recipe);

        expect(result.overallDifficulty).toBe('easy');
        expect(result.complexityScore).toBeLessThanOrEqual(30);
      });

      it('should classify medium recipes correctly', () => {
        const recipe = {
          cookTime: 30,
          ingredients: Array.from({ length: 8 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 5 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'medium'
        };

        const result = assessRecipeComplexity(recipe);

        expect(result.overallDifficulty).toBe('medium');
        expect(result.complexityScore).toBeGreaterThan(30);
        expect(result.complexityScore).toBeLessThanOrEqual(60);
      });

      it('should classify hard recipes correctly', () => {
        const recipe = {
          cookTime: 90,
          ingredients: Array.from({ length: 15 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 12 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'hard'
        };

        const result = assessRecipeComplexity(recipe);

        expect(result.overallDifficulty).toBe('hard');
        expect(result.complexityScore).toBeGreaterThan(60);
      });

      it('should detect complex cooking techniques', () => {
        const recipe = {
          cookTime: 45,
          ingredients: Array.from({ length: 8 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: [
            { text: 'Braise the meat for 2 hours' },
            { text: 'Temper the chocolate carefully' },
            { text: 'Emulsify the sauce' }
          ],
          difficulty: 'medium'
        };

        const result = assessRecipeComplexity(recipe);

        expect(result.factors.techniqueComplexity).toBeGreaterThan(15);
        expect(result.complexityScore).toBeGreaterThan(50);
      });

      it('should respect recipe difficulty field when more complex', () => {
        const recipe = {
          cookTime: 10,
          ingredients: Array.from({ length: 3 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 2 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'hard' // Explicitly marked as hard
        };

        const result = assessRecipeComplexity(recipe);

        // Should use the explicit difficulty if it's more complex than calculated
        expect(result.overallDifficulty).toBe('hard');
      });

      it('should calculate all complexity factors', () => {
        const recipe = {
          cookTime: 60,
          ingredients: Array.from({ length: 12 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 8 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'medium'
        };

        const result = assessRecipeComplexity(recipe);

        expect(result.factors.cookTime).toBeGreaterThan(0);
        expect(result.factors.ingredientCount).toBeGreaterThan(0);
        expect(result.factors.instructionCount).toBeGreaterThan(0);
        expect(result.factors.techniqueComplexity).toBeGreaterThanOrEqual(0);
        expect(result.complexityScore).toBe(
          result.factors.cookTime +
          result.factors.ingredientCount +
          result.factors.instructionCount +
          result.factors.techniqueComplexity
        );
      });
    });

    describe('calculateSkillLevelMatch', () => {
      it('should return high score for perfect skill-difficulty match', () => {
        const recipe = {
          cookTime: 30,
          ingredients: Array.from({ length: 8 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 5 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'medium'
        };

        const score = calculateSkillLevelMatch(recipe, 'intermediate');

        expect(score).toBeGreaterThanOrEqual(85);
      });

      it('should reward recipes slightly easier than skill level', () => {
        const recipe = {
          cookTime: 15,
          ingredients: Array.from({ length: 5 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 3 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'easy'
        };

        const score = calculateSkillLevelMatch(recipe, 'intermediate');

        expect(score).toBeGreaterThanOrEqual(75); // Should be good for learning
      });

      it('should penalize recipes much harder than skill level', () => {
        const recipe = {
          cookTime: 90,
          ingredients: Array.from({ length: 15 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 12 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'hard'
        };

        const score = calculateSkillLevelMatch(recipe, 'beginner');

        expect(score).toBeLessThan(40); // Should be penalized
      });

      it('should handle moderate difficulty differences', () => {
        const recipe = {
          cookTime: 45,
          ingredients: Array.from({ length: 10 }, (_, i) => ({ text: `ingredient-${i}` })),
          instructions: Array.from({ length: 6 }, (_, i) => ({ text: `step-${i}` })),
          difficulty: 'hard'
        };

        const score = calculateSkillLevelMatch(recipe, 'intermediate');

        expect(score).toBeGreaterThan(50); // Challenging but doable
        expect(score).toBeLessThan(80);
      });

      it('should return neutral score when no skill level specified', () => {
        const recipe = {
          cookTime: 30,
          ingredients: [{ text: 'ingredient' }],
          instructions: [{ text: 'step' }],
          difficulty: 'medium'
        };

        const score = calculateSkillLevelMatch(recipe, undefined);

        expect(score).toBe(50);
      });
    });
  });

  describe('Dietary Compliance Checking', () => {
    describe('checkDietaryCompliance', () => {
      it('should pass vegetarian recipes', () => {
        const recipe = {
          title: 'Vegetable Stir Fry',
          ingredients: [
            { text: 'broccoli' },
            { text: 'carrots' },
            { text: 'tofu' }
          ],
          instructions: [{ text: 'Stir fry vegetables' }],
          description: 'Healthy vegetable dish'
        };

        const result = checkDietaryCompliance(recipe, ['vegetarian']);

        expect(result.isCompliant).toBe(true);
        expect(result.violations.length).toBe(0);
        expect(result.complianceScore).toBe(100);
      });

      it('should fail vegetarian recipes with meat', () => {
        const recipe = {
          title: 'Chicken Stir Fry',
          ingredients: [
            { text: 'chicken breast' },
            { text: 'broccoli' },
            { text: 'carrots' }
          ],
          instructions: [{ text: 'Cook chicken and vegetables' }],
          description: 'Chicken dish'
        };

        const result = checkDietaryCompliance(recipe, ['vegetarian']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.complianceScore).toBeLessThan(100);
      });

      it('should pass vegan recipes', () => {
        const recipe = {
          title: 'Vegan Pasta',
          ingredients: [
            { text: 'pasta' },
            { text: 'tomato sauce' },
            { text: 'vegetables' }
          ],
          instructions: [{ text: 'Cook pasta' }],
          description: 'Plant-based pasta'
        };

        const result = checkDietaryCompliance(recipe, ['vegan']);

        expect(result.isCompliant).toBe(true);
        expect(result.complianceScore).toBe(100);
      });

      it('should fail vegan recipes with dairy', () => {
        const recipe = {
          title: 'Cheese Pasta',
          ingredients: [
            { text: 'pasta' },
            { text: 'cheese' },
            { text: 'milk' }
          ],
          instructions: [{ text: 'Add cheese and milk' }],
          description: 'Creamy pasta'
        };

        const result = checkDietaryCompliance(recipe, ['vegan']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.some((v: string) => v.includes('cheese') || v.includes('milk'))).toBe(true);
      });

      it('should pass gluten-free recipes', () => {
        const recipe = {
          title: 'Rice Bowl',
          ingredients: [
            { text: 'rice' },
            { text: 'vegetables' },
            { text: 'chicken' }
          ],
          instructions: [{ text: 'Cook rice and vegetables' }],
          description: 'Gluten-free meal'
        };

        const result = checkDietaryCompliance(recipe, ['gluten-free']);

        expect(result.isCompliant).toBe(true);
        expect(result.complianceScore).toBe(100);
      });

      it('should fail gluten-free recipes with wheat', () => {
        const recipe = {
          title: 'Pasta Dish',
          ingredients: [
            { text: 'wheat flour' },
            { text: 'pasta' },
            { text: 'bread crumbs' }
          ],
          instructions: [{ text: 'Cook pasta' }],
          description: 'Pasta dish'
        };

        const result = checkDietaryCompliance(recipe, ['gluten-free']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should check multiple dietary restrictions', () => {
        const recipe = {
          title: 'Vegetable Salad',
          ingredients: [
            { text: 'lettuce' },
            { text: 'tomatoes' },
            { text: 'cucumber' }
          ],
          instructions: [{ text: 'Mix vegetables' }],
          description: 'Healthy salad'
        };

        const result = checkDietaryCompliance(recipe, ['vegetarian', 'vegan', 'gluten-free']);

        expect(result.isCompliant).toBe(true);
        expect(result.complianceScore).toBe(100);
      });

      it('should fail when any restriction is violated', () => {
        const recipe = {
          title: 'Cheese Sandwich',
          ingredients: [
            { text: 'bread' },
            { text: 'cheese' },
            { text: 'butter' }
          ],
          instructions: [{ text: 'Make sandwich' }],
          description: 'Cheese sandwich'
        };

        const result = checkDietaryCompliance(recipe, ['vegan', 'gluten-free']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should handle nut-free restrictions', () => {
        const recipe = {
          title: 'Almond Cookies',
          ingredients: [
            { text: 'almonds' },
            { text: 'flour' },
            { text: 'sugar' }
          ],
          instructions: [{ text: 'Bake cookies' }],
          description: 'Nut cookies'
        };

        const result = checkDietaryCompliance(recipe, ['nut-free']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.some((v: string) => v.includes('almond'))).toBe(true);
      });

      it('should handle shellfish-free restrictions', () => {
        const recipe = {
          title: 'Shrimp Pasta',
          ingredients: [
            { text: 'shrimp' },
            { text: 'pasta' },
            { text: 'garlic' }
          ],
          instructions: [{ text: 'Cook shrimp and pasta' }],
          description: 'Seafood pasta'
        };

        const result = checkDietaryCompliance(recipe, ['shellfish-free']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.some((v: string) => v.includes('shrimp'))).toBe(true);
      });

      it('should handle keto restrictions', () => {
        const recipe = {
          title: 'Rice Bowl',
          ingredients: [
            { text: 'rice' },
            { text: 'vegetables' }
          ],
          instructions: [{ text: 'Cook rice' }],
          description: 'High carb meal'
        };

        const result = checkDietaryCompliance(recipe, ['keto']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should handle paleo restrictions', () => {
        const recipe = {
          title: 'Pasta Dish',
          ingredients: [
            { text: 'pasta' },
            { text: 'cheese' },
            { text: 'beans' }
          ],
          instructions: [{ text: 'Cook pasta' }],
          description: 'Pasta with beans'
        };

        const result = checkDietaryCompliance(recipe, ['paleo']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });

      it('should return perfect score when no restrictions', () => {
        const recipe = {
          title: 'Any Recipe',
          ingredients: [{ text: 'anything' }],
          instructions: [{ text: 'Cook' }],
          description: 'Any dish'
        };

        const result = checkDietaryCompliance(recipe, []);

        expect(result.isCompliant).toBe(true);
        expect(result.violations.length).toBe(0);
        expect(result.complianceScore).toBe(100);
      });

      it('should use word boundaries to avoid false positives', () => {
        const recipe = {
          title: 'Butterfly Pasta',
          ingredients: [
            { text: 'pasta shaped like butterflies' },
            { text: 'tomato sauce' }
          ],
          instructions: [{ text: 'Cook pasta' }],
          description: 'Butterfly-shaped pasta'
        };

        const result = checkDietaryCompliance(recipe, ['vegan']);

        // Should not flag "butterfly" as containing "butter"
        expect(result.isCompliant).toBe(true);
      });

      it('should check title and description for violations', () => {
        const recipe = {
          title: 'Chicken Salad',
          description: 'Delicious chicken dish with vegetables',
          ingredients: [
            { text: 'lettuce' },
            { text: 'tomatoes' }
          ],
          instructions: [{ text: 'Mix salad' }]
        };

        const result = checkDietaryCompliance(recipe, ['vegetarian']);

        expect(result.isCompliant).toBe(false);
        expect(result.violations.some((v: string) => v.includes('chicken'))).toBe(true);
      });
    });
  });
});

