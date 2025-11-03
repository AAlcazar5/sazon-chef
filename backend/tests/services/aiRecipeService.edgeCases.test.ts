import { AIRecipeService } from '../../src/services/aiRecipeService';
import OpenAI from 'openai';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockOpenAI)
  };
});

// Mock imageService
jest.mock('../../src/services/imageService', () => ({
  imageService: {
    searchFoodImage: jest.fn().mockResolvedValue({
      id: 'test-photo-id',
      url: 'https://example.com/image.jpg',
      downloadLocation: 'https://api.unsplash.com/download/test',
      photographer: { name: 'Test Photographer', username: 'testuser' },
      attributionText: 'Photo by Test Photographer on Unsplash',
      unsplashUrl: 'https://unsplash.com/photos/test'
    })
  }
}));

// Mock Prisma
const mockPrisma = {
  recipe: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn()
  },
  recipeIngredient: {
    create: jest.fn()
  },
  recipeInstruction: {
    create: jest.fn()
  }
};

jest.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma
}));

describe('AIRecipeService - Edge Cases', () => {
  let aiService: AIRecipeService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    aiService = new AIRecipeService();
  });

  describe('Validation Edge Cases', () => {
    const baseValidRecipe = {
      title: 'Test Recipe',
      description: 'This is a valid test recipe description that is long enough',
      cuisine: 'Italian',
      cookTime: 30,
      difficulty: 'medium' as const,
      servings: 1,
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20,
      fiber: 5,
      ingredients: [
        { name: 'Ingredient 1', amount: 100, unit: 'g' },
        { name: 'Ingredient 2', amount: 200, unit: 'ml' }
      ],
      instructions: [
        { step: 1, instruction: 'First instruction that is long enough to pass validation' },
        { step: 2, instruction: 'Second instruction that is also long enough to pass validation' }
      ]
    };

    test('should handle title at exact minimum length (3 chars)', () => {
      const recipe = { ...baseValidRecipe, title: 'ABC' };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).not.toThrow();
    });

    test('should handle title at exact maximum length (100 chars)', () => {
      const recipe = { ...baseValidRecipe, title: 'A'.repeat(100) };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).not.toThrow();
    });

    test('should reject title at 2 characters (below minimum)', () => {
      const recipe = { ...baseValidRecipe, title: 'AB' };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('title must be between 3 and 100 characters');
    });

    test('should handle description at exact minimum length (10 chars)', () => {
      const recipe = { ...baseValidRecipe, description: '1234567890' };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).not.toThrow();
    });

    test('should handle Unicode characters in title', () => {
      const recipe = { ...baseValidRecipe, title: 'Pasta 🍝 Italiana 意大利' };
      
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.title).toBe('Pasta 🍝 Italiana 意大利');
    });

    test('should handle special characters in ingredient names', () => {
      const recipe = {
        ...baseValidRecipe,
        ingredients: [
          { name: "O'Brien's Special Sauce", amount: 100, unit: 'ml' },
          { name: 'Tomato-Cheese Mix', amount: 200, unit: 'g' }
        ]
      };
      
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.ingredients[0].name).toBe("O'Brien's Special Sauce");
    });

    test('should handle very large calorie values', () => {
      const recipe = {
        ...baseValidRecipe,
        calories: 99999,
        servings: 10 // Should result in reasonable per-serving
      };
      
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.calories).toBe(99999);
    });

    test('should handle zero calories with zero macros', () => {
      const recipe = {
        ...baseValidRecipe,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };
      
      // This should pass validation (zero is valid)
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.calories).toBe(0);
    });

    test('should handle negative values by clamping to zero', () => {
      const recipe = {
        ...baseValidRecipe,
        calories: -100,
        protein: -10,
        carbs: -20,
        fat: -5
      };
      
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });

    test('should handle cook time at exact boundaries', () => {
      const recipe1 = { ...baseValidRecipe, cookTime: 5 }; // Minimum
      const result1 = (aiService as any).validateAndNormalizeRecipe(recipe1);
      expect(result1.cookTime).toBe(5);

      const recipe2 = { ...baseValidRecipe, cookTime: 480 }; // Maximum
      const result2 = (aiService as any).validateAndNormalizeRecipe(recipe2);
      expect(result2.cookTime).toBe(480);
    });

    test('should handle servings at exact boundaries', () => {
      const recipe1 = { ...baseValidRecipe, servings: 1 }; // Minimum
      const result1 = (aiService as any).validateAndNormalizeRecipe(recipe1);
      expect(result1.servings).toBe(1);

      const recipe2 = { ...baseValidRecipe, servings: 20 }; // Maximum
      const result2 = (aiService as any).validateAndNormalizeRecipe(recipe2);
      expect(result2.servings).toBe(20);
    });

    test('should handle exactly 2 ingredients (minimum)', () => {
      const recipe = {
        ...baseValidRecipe,
        ingredients: [
          { name: 'Ingredient 1', amount: 100, unit: 'g' },
          { name: 'Ingredient 2', amount: 200, unit: 'ml' }
        ]
      };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).not.toThrow();
    });

    test('should handle exactly 30 ingredients (maximum)', () => {
      const ingredients = Array(30).fill(null).map((_, i) => ({
        name: `Ingredient ${i + 1}`,
        amount: 100,
        unit: 'g'
      }));
      
      const recipe = { ...baseValidRecipe, ingredients };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).not.toThrow();
    });

    test('should handle instruction at exact minimum length (10 chars)', () => {
      const recipe = {
        ...baseValidRecipe,
        instructions: [
          { step: 1, instruction: '1234567890' }, // Exactly 10
          { step: 2, instruction: 'Another instruction that is long enough' }
        ]
      };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).not.toThrow();
    });

    test('should handle instruction at exact maximum length (1000 chars)', () => {
      const longInstruction = 'A'.repeat(1000);
      const recipe = {
        ...baseValidRecipe,
        instructions: [
          { step: 1, instruction: longInstruction },
          { step: 2, instruction: 'Another instruction' }
        ]
      };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).not.toThrow();
    });

    test('should trim whitespace from ingredient names', () => {
      const recipe = {
        ...baseValidRecipe,
        ingredients: [
          { name: '  Pasta  ', amount: 100, unit: 'g' },
          { name: '  Tomato Sauce  ', amount: 200, unit: 'ml' }
        ]
      };
      
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.ingredients[0].name).toBe('Pasta');
      expect(result.ingredients[1].name).toBe('Tomato Sauce');
    });
  });

  describe('Macro Calculation Edge Cases', () => {
    test('should handle macro calculation with very large values', () => {
      const recipe = {
        title: 'Test',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 5000, // Very large
        protein: 200,
        carbs: 300,
        fat: 100,
        ingredients: [
          { name: 'Ingredient 1', amount: 100, unit: 'g' },
          { name: 'Ingredient 2', amount: 200, unit: 'ml' }
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ]
      };
      
      // Should auto-correct if calculation is way off
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      
      // Calculated: (200*4) + (300*4) + (100*9) = 800 + 1200 + 900 = 2900
      // Since 5000 - 2900 = 2100 > 25% of 5000 (1250), it should auto-correct
      expect(result.calories).toBe(2900);
    });

    test('should handle fractional macro values', () => {
      const recipe = {
        title: 'Test',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 500,
        protein: 30.5,
        carbs: 50.7,
        fat: 20.3,
        ingredients: [
          { name: 'Ingredient 1', amount: 100, unit: 'g' },
          { name: 'Ingredient 2', amount: 200, unit: 'ml' }
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ]
      };
      
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.protein).toBe(31); // Rounded
      expect(result.carbs).toBe(51); // Rounded
      expect(result.fat).toBe(20); // Rounded
    });

    test('should handle calories per serving at boundary values', () => {
      // Minimum: 10 cal per serving
      const recipe1 = {
        title: 'Test',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 10,
        protein: 1,
        carbs: 1,
        fat: 0.5,
        ingredients: [
          { name: 'Ingredient 1', amount: 100, unit: 'g' },
          { name: 'Ingredient 2', amount: 200, unit: 'ml' }
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ]
      };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe1);
      }).not.toThrow();

      // Maximum: 2000 cal per serving
      const recipe2 = {
        ...recipe1,
        calories: 2000,
        servings: 1
      };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe2);
      }).not.toThrow();
    });
  });

  describe('User Preferences Edge Cases', () => {
    test('should handle empty liked cuisines array', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      // Should still generate a valid prompt
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    test('should handle very long list of liked cuisines', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: Array(50).fill(null).map((_, i) => `Cuisine${i}`),
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('Cuisine');
    });

    test('should handle duplicate cuisines gracefully', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: ['Italian', 'Italian', 'Mexican', 'Mexican'],
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('Italian');
      expect(prompt).toContain('Mexican');
    });

    test('should handle case-insensitive banned ingredient matching', () => {
      const recipe = {
        title: 'Test Recipe',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        ingredients: [
          { name: 'PEANUTS', amount: 50, unit: 'g' }, // Uppercase
          { name: 'Peanut Butter', amount: 100, unit: 'g' } // Contains "peanut"
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ]
      };
      
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: ['peanuts'], // Lowercase
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).toThrow('banned ingredients');
    });

    test('should handle very long banned ingredients list', () => {
      const recipe = {
        title: 'Test Recipe',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        ingredients: [
          { name: 'Ingredient 1', amount: 100, unit: 'g' },
          { name: 'Ingredient 2', amount: 200, unit: 'ml' }
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ]
      };
      
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: Array(100).fill(null).map((_, i) => `Ingredient${i}`),
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      // Should not throw for long list
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).not.toThrow();
    });
  });

  describe('Macro Distribution Edge Cases', () => {
    test('should handle zero daily calories', async () => {
      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        },
        mealType: 'breakfast' as const
      };
      
      // Should not crash, but might generate invalid recipe
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toBeDefined();
    });

    test('should handle very large daily calories', async () => {
      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 10000,
          protein: 500,
          carbs: 1000,
          fat: 400
        },
        mealType: 'breakfast' as const
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('10000');
      
      // Breakfast should be 25% = 2500 calories
      const breakfastParams = {
        ...params,
        macroGoals: {
          calories: Math.round(10000 * 0.25),
          protein: Math.round(500 * 0.25),
          carbs: Math.round(1000 * 0.25),
          fat: Math.round(400 * 0.25)
        }
      };
      
      const breakfastPrompt = (aiService as any).buildRecipePrompt(breakfastParams);
      expect(breakfastPrompt).toContain('2500');
    });

    test('should handle meal type "any"', async () => {
      const params = {
        userId: 'test-user',
        mealType: 'any' as const
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).not.toContain('any');
      expect(prompt).toContain('delicious recipe');
    });

    test('should handle fractional macro distribution', async () => {
      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 100,
          protein: 7,
          carbs: 10,
          fat: 3
        },
        mealType: 'breakfast' as const
      };
      
      // 25% of 100 = 25 calories (fractional)
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toBeDefined();
    });
  });

  describe('Cook Time Edge Cases', () => {
    test('should handle zero cook time preference', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 0
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('0');
    });

    test('should handle very large cook time preference', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 500
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('500');
    });

    test('should handle undefined cook time preference', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'medium'
        }
      };
      
      // Should not crash
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toBeDefined();
    });
  });

  describe('Dietary Restriction Edge Cases', () => {
    test('should handle multiple overlapping dietary restrictions', () => {
      const recipe = {
        title: 'Test Recipe',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        ingredients: [
          { name: 'Chicken', amount: 200, unit: 'g' },
          { name: 'Cheese', amount: 100, unit: 'g' },
          { name: 'Milk', amount: 200, unit: 'ml' }
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ]
      };
      
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: ['Vegetarian', 'Vegan', 'Dairy-Free'],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      // Should catch multiple violations
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).toThrow();
    });

    test('should handle case-insensitive dietary restriction matching', () => {
      const recipe = {
        title: 'Test Recipe',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        ingredients: [
          { name: 'CHICKEN BREAST', amount: 200, unit: 'g' }
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ]
      };
      
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: ['vegetarian'], // Lowercase
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).toThrow('vegetarian');
    });
  });

  describe('OpenAI Response Edge Cases', () => {
    test('should handle malformed JSON from OpenAI', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: '{ "title": "Incomplete JSON", "calories": ' // Malformed
          }
        }]
      });

      const params = {
        userId: 'test-user'
      };

      await expect(aiService.generateRecipe(params)).rejects.toThrow();
    });

    test('should handle empty JSON object from OpenAI', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: '{}'
          }
        }]
      });

      const params = {
        userId: 'test-user'
      };

      await expect(aiService.generateRecipe(params)).rejects.toThrow('missing required fields');
    });

    test('should handle JSON with extra fields', async () => {
      const recipeWithExtra = {
        title: 'Test Recipe',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium',
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        ingredients: [
          { name: 'Pasta', amount: 100, unit: 'g' },
          { name: 'Sauce', amount: 200, unit: 'ml' }
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ],
        extraField: 'should be ignored',
        anotherField: 123
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(recipeWithExtra)
          }
        }]
      });

      const params = {
        userId: 'test-user'
      };

      // Should handle extra fields gracefully
      const result = await aiService.generateRecipe(params);
      expect(result.title).toBe('Test Recipe');
      expect((result as any).extraField).toBeUndefined();
    });

    test('should handle null values in OpenAI response', async () => {
      const recipeWithNulls = {
        title: 'Test Recipe',
        description: 'This is a valid test recipe description',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium',
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        fiber: null,
        ingredients: [
          { name: 'Pasta', amount: 100, unit: 'g' },
          { name: 'Sauce', amount: 200, unit: 'ml' }
        ],
        instructions: [
          { step: 1, instruction: 'First instruction that is long enough' },
          { step: 2, instruction: 'Second instruction that is also long enough' }
        ],
        tips: null,
        tags: null
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(recipeWithNulls)
          }
        }]
      });

      const params = {
        userId: 'test-user'
      };

      const result = await aiService.generateRecipe(params);
      expect(result.fiber).toBeUndefined();
      expect(result.tips).toEqual([]);
      expect(result.tags).toEqual([]);
    });
  });

  describe('Physical Profile Edge Cases', () => {
    test('should handle missing physical profile', () => {
      const params = {
        userId: 'test-user'
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toBeDefined();
    });

    test('should handle unknown fitness goal', () => {
      const params = {
        userId: 'test-user',
        physicalProfile: {
          gender: 'male',
          age: 30,
          activityLevel: 'active',
          fitnessGoal: 'unknown_goal'
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      // Should use default context
      expect(prompt).toContain('balanced');
    });

    test('should handle extreme age values', () => {
      const params = {
        userId: 'test-user',
        physicalProfile: {
          gender: 'male',
          age: 150, // Unrealistic but should not crash
          activityLevel: 'active',
          fitnessGoal: 'maintain'
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toBeDefined();
    });
  });

  describe('Daily Meal Plan Edge Cases', () => {
    test('should handle partial failures in daily meal plan', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce({
          choices: [{
            message: { content: JSON.stringify({ title: 'Breakfast', calories: 500, protein: 30, carbs: 50, fat: 20 }) }
          }]
        })
        .mockRejectedValueOnce(new Error('Lunch generation failed'))
        .mockResolvedValueOnce({
          choices: [{
            message: { content: JSON.stringify({ title: 'Dinner', calories: 700, protein: 40, carbs: 60, fat: 25 }) }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: { content: JSON.stringify({ title: 'Snack', calories: 200, protein: 10, carbs: 20, fat: 8 }) }
          }]
        });

      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 70
        }
      };

      await expect(aiService.generateDailyMealPlan(params)).rejects.toThrow();
    });

    test('should handle zero macros in daily plan', async () => {
      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      };

      // Should not crash but might produce invalid recipes
      await expect(aiService.generateDailyMealPlan(params)).rejects.toThrow();
    });
  });

  describe('Image Service Edge Cases', () => {
    test('should handle slow image fetch', async () => {
      const { imageService } = require('../../src/services/imageService');
      
      // Mock a slow response
      (imageService.searchFoodImage as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          id: 'test-photo-id',
          url: 'https://example.com/image.jpg',
          downloadLocation: 'https://api.unsplash.com/download/test',
          photographer: { name: 'Test Photographer', username: 'testuser' },
          attributionText: 'Photo by Test Photographer on Unsplash',
          unsplashUrl: 'https://unsplash.com/photos/test'
        }), 100))
      );

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Test Recipe',
              description: 'This is a valid test recipe description',
              cuisine: 'Italian',
              cookTime: 30,
              difficulty: 'medium',
              servings: 1,
              calories: 500,
              protein: 30,
              carbs: 50,
              fat: 20,
              ingredients: [
                { name: 'Pasta', amount: 100, unit: 'g' },
                { name: 'Sauce', amount: 200, unit: 'ml' }
              ],
              instructions: [
                { step: 1, instruction: 'First instruction that is long enough' },
                { step: 2, instruction: 'Second instruction that is also long enough' }
              ]
            })
          }
        }]
      });

      const recipe = {
        title: 'Test Recipe',
        description: 'Test',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        ingredients: [
          { name: 'Pasta', amount: 100, unit: 'g' }
        ],
        instructions: [
          { step: 1, instruction: 'Cook pasta' }
        ]
      };

      (mockPrisma.recipe.create as jest.Mock).mockResolvedValue({ id: 'recipe-123' });
      (mockPrisma.recipe.update as jest.Mock).mockResolvedValue({ id: 'recipe-123' });
      (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({ id: 'recipe-123' });

      // Should complete successfully despite slow image
      await expect(
        aiService.saveGeneratedRecipe(recipe, 'test-user')
      ).resolves.toBeDefined();
    });
  });

  describe('Database Edge Cases', () => {
    test('should handle database connection failure gracefully', async () => {
      (mockPrisma.recipe.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const recipe = {
        title: 'Test Recipe',
        description: 'Test',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        ingredients: [
          { name: 'Pasta', amount: 100, unit: 'g' }
        ],
        instructions: [
          { step: 1, instruction: 'Cook pasta' }
        ]
      };

      await expect(
        aiService.saveGeneratedRecipe(recipe, 'test-user')
      ).rejects.toThrow('Database connection failed');
    });

    test('should handle duplicate recipe creation', async () => {
      (mockPrisma.recipe.create as jest.Mock).mockRejectedValue({
        code: 'P2002', // Prisma unique constraint error
        message: 'Unique constraint failed'
      });

      const recipe = {
        title: 'Test Recipe',
        description: 'Test',
        cuisine: 'Italian',
        cookTime: 30,
        difficulty: 'medium' as const,
        servings: 1,
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        ingredients: [
          { name: 'Pasta', amount: 100, unit: 'g' }
        ],
        instructions: [
          { step: 1, instruction: 'Cook pasta' }
        ]
      };

      await expect(
        aiService.saveGeneratedRecipe(recipe, 'test-user')
      ).rejects.toThrow();
    });
  });
});

