import { AIRecipeService } from '../../src/services/aiRecipeService';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
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
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
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
  }
}));

describe('AIRecipeService - Recipe Validation and Safety Checks', () => {
  let aiService: AIRecipeService;
  const mockParams = {
    userId: 'test-user',
    userPreferences: {
      likedCuisines: ['Italian'],
      dietaryRestrictions: [],
      bannedIngredients: [],
      spiceLevel: 'medium',
      cookTimePreference: 30
    },
    macroGoals: {
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20
    },
    mealType: 'lunch' as const
  };

  beforeEach(() => {
    // Reset environment
    process.env.OPENAI_API_KEY = 'test-key';
    aiService = new AIRecipeService();
  });

  describe('validateAndNormalizeRecipe', () => {
    const baseRecipe = {
      title: 'Test Recipe',
      description: 'This is a test recipe description that is long enough',
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
        { name: 'Pasta', amount: 100, unit: 'g' },
        { name: 'Tomato Sauce', amount: 200, unit: 'ml' }
      ],
      instructions: [
        { step: 1, instruction: 'Cook pasta in boiling water for 10 minutes' },
        { step: 2, instruction: 'Heat tomato sauce in a pan' }
      ],
      tips: [],
      tags: []
    };

    test('should validate and normalize a valid recipe', () => {
      const recipe = { ...baseRecipe };
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      
      expect(result.title).toBe('Test Recipe');
      expect(result.cookTime).toBe(30);
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(2);
    });

    test('should throw error for missing required fields', () => {
      const invalidRecipe = { ...baseRecipe };
      delete (invalidRecipe as any).title;
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(invalidRecipe);
      }).toThrow('missing required fields');
    });

    test('should validate title length (too short)', () => {
      const recipe = { ...baseRecipe, title: 'Ab' };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('title must be between 3 and 100 characters');
    });

    test('should validate title length (too long)', () => {
      const recipe = { ...baseRecipe, title: 'A'.repeat(101) };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('title must be between 3 and 100 characters');
    });

    test('should validate description length (too short)', () => {
      const recipe = { ...baseRecipe, description: 'Short' };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('description must be between 10 and 500 characters');
    });

    test('should normalize difficulty to medium if invalid', () => {
      const recipe = { ...baseRecipe, difficulty: 'invalid' as any };
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      
      expect(result.difficulty).toBe('medium');
    });

    test('should clamp cook time to reasonable bounds', () => {
      const recipe1 = { ...baseRecipe, cookTime: 2 }; // Too low
      const result1 = (aiService as any).validateAndNormalizeRecipe(recipe1);
      expect(result1.cookTime).toBe(5); // Clamped to min

      const recipe2 = { ...baseRecipe, cookTime: 600 }; // Too high
      const result2 = (aiService as any).validateAndNormalizeRecipe(recipe2);
      expect(result2.cookTime).toBe(480); // Clamped to max
    });

    test('should clamp servings to reasonable bounds', () => {
      const recipe1 = { ...baseRecipe, servings: 0 };
      const result1 = (aiService as any).validateAndNormalizeRecipe(recipe1);
      expect(result1.servings).toBe(1); // Clamped to min

      const recipe2 = { ...baseRecipe, servings: 25 };
      const result2 = (aiService as any).validateAndNormalizeRecipe(recipe2);
      expect(result2.servings).toBe(20); // Clamped to max
    });

    test('should validate macro accuracy and auto-correct if needed', () => {
      // Recipe with incorrect calories (should be 380 but says 500)
      const recipe = {
        ...baseRecipe,
        calories: 500,
        protein: 30, // 30 * 4 = 120
        carbs: 50,   // 50 * 4 = 200
        fat: 20      // 20 * 9 = 180
        // Total should be 500, which matches, so no correction
      };
      
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.calories).toBe(500); // Should match calculated
    });

    test('should auto-correct calories when difference is >25%', () => {
      // Recipe with very incorrect calories
      const recipe = {
        ...baseRecipe,
        calories: 1000, // Way too high
        protein: 30,   // 30 * 4 = 120
        carbs: 50,     // 50 * 4 = 200
        fat: 20        // 20 * 9 = 180
        // Calculated: 500
      };
      
      const result = (aiService as any).validateAndNormalizeRecipe(recipe);
      expect(result.calories).toBe(500); // Should be auto-corrected
    });

    test('should throw error for too few ingredients', () => {
      const recipe = { ...baseRecipe, ingredients: [{ name: 'Pasta', amount: 100, unit: 'g' }] };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('must have at least 2 ingredients');
    });

    test('should throw error for too many ingredients', () => {
      const ingredients = Array(31).fill({ name: 'Ingredient', amount: 10, unit: 'g' });
      const recipe = { ...baseRecipe, ingredients };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('cannot have more than 30 ingredients');
    });

    test('should throw error for invalid ingredient name', () => {
      const recipe = {
        ...baseRecipe,
        ingredients: [
          { name: '', amount: 100, unit: 'g' }, // Empty name
          { name: 'Valid', amount: 200, unit: 'ml' }
        ]
      };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('has invalid name');
    });

    test('should throw error for too few instructions', () => {
      const recipe = { ...baseRecipe, instructions: [{ step: 1, instruction: 'Single step' }] };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('must have at least 2 instruction steps');
    });

    test('should throw error for too many instructions', () => {
      const instructions = Array(21).fill({ step: 1, instruction: 'Step description that is long enough' });
      const recipe = { ...baseRecipe, instructions };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('cannot have more than 20 instruction steps');
    });

    test('should throw error for instruction too short', () => {
      const recipe = {
        ...baseRecipe,
        instructions: [
          { step: 1, instruction: 'Short' }, // Too short
          { step: 2, instruction: 'Valid instruction that is long enough' }
        ]
      };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('must be at least 10 characters');
    });

    test('should throw error for calories per serving too low', () => {
      const recipe = { ...baseRecipe, calories: 5, servings: 1 }; // 5 cal per serving
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('outside reasonable range');
    });

    test('should throw error for calories per serving too high', () => {
      const recipe = { ...baseRecipe, calories: 2500, servings: 1 }; // 2500 cal per serving
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('outside reasonable range');
    });

    test('should throw error if calories exist but no macros', () => {
      const recipe = {
        ...baseRecipe,
        calories: 500,
        protein: 0,
        carbs: 0,
        fat: 0
      };
      
      expect(() => {
        (aiService as any).validateAndNormalizeRecipe(recipe);
      }).toThrow('calories but no macro nutrients');
    });
  });

  describe('performSafetyChecks', () => {
    const baseRecipe = {
      title: 'Test Recipe',
      description: 'This is a test recipe description',
      cuisine: 'Italian',
      cookTime: 30,
      difficulty: 'medium' as const,
      servings: 1,
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20,
      ingredients: [
        { name: 'Pasta', amount: 100, unit: 'g' },
        { name: 'Tomato Sauce', amount: 200, unit: 'ml' }
      ],
      instructions: [
        { step: 1, instruction: 'Cook pasta in boiling water' },
        { step: 2, instruction: 'Heat tomato sauce in a pan' }
      ]
    };

    test('should pass safety checks for valid recipe', () => {
      const recipe = { ...baseRecipe };
      const params = { ...mockParams };
      
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).not.toThrow();
    });

    test('should throw error for banned ingredients', () => {
      const recipe = {
        ...baseRecipe,
        ingredients: [
          { name: 'Peanuts', amount: 50, unit: 'g' },
          { name: 'Tomato Sauce', amount: 200, unit: 'ml' }
        ]
      };
      const params = {
        ...mockParams,
        userPreferences: {
          ...mockParams.userPreferences!,
          bannedIngredients: ['peanuts', 'nuts']
        }
      };
      
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).toThrow('banned ingredients');
    });

    test('should warn about raw fish', () => {
      const recipe = {
        ...baseRecipe,
        ingredients: [
          { name: 'Raw Salmon', amount: 100, unit: 'g' },
          { name: 'Rice', amount: 200, unit: 'g' }
        ]
      };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      (aiService as any).performSafetyChecks(recipe, mockParams);
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Recipe Safety Warnings'),
        expect.arrayContaining([
          expect.stringContaining('raw fish')
        ])
      );
      
      consoleWarn.mockRestore();
    });

    test('should warn about raw eggs', () => {
      const recipe = {
        ...baseRecipe,
        ingredients: [
          { name: 'Mayonnaise', amount: 50, unit: 'ml' },
          { name: 'Bread', amount: 100, unit: 'g' }
        ]
      };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      (aiService as any).performSafetyChecks(recipe, mockParams);
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Recipe Safety Warnings'),
        expect.arrayContaining([
          expect.stringContaining('raw eggs')
        ])
      );
      
      consoleWarn.mockRestore();
    });

    test('should warn about excessive cook time for breakfast', () => {
      const recipe = { ...baseRecipe, cookTime: 60 };
      const params = { ...mockParams, mealType: 'breakfast' as const };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      (aiService as any).performSafetyChecks(recipe, params);
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Recipe Safety Warnings'),
        expect.arrayContaining([
          expect.stringContaining('breakfast typically takes less than 45 minutes')
        ])
      );
      
      consoleWarn.mockRestore();
    });

    test('should throw error for vegetarian violation', () => {
      const recipe = {
        ...baseRecipe,
        ingredients: [
          { name: 'Chicken Breast', amount: 200, unit: 'g' },
          { name: 'Rice', amount: 200, unit: 'g' }
        ]
      };
      const params = {
        ...mockParams,
        userPreferences: {
          ...mockParams.userPreferences!,
          dietaryRestrictions: ['Vegetarian']
        }
      };
      
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).toThrow('contains meat but user requires vegetarian');
    });

    test('should throw error for vegan violation', () => {
      const recipe = {
        ...baseRecipe,
        ingredients: [
          { name: 'Cheese', amount: 100, unit: 'g' },
          { name: 'Pasta', amount: 200, unit: 'g' }
        ]
      };
      const params = {
        ...mockParams,
        userPreferences: {
          ...mockParams.userPreferences!,
          dietaryRestrictions: ['Vegan']
        }
      };
      
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).toThrow('contains animal products but user requires vegan');
    });

    test('should throw error for dairy-free violation', () => {
      const recipe = {
        ...baseRecipe,
        ingredients: [
          { name: 'Butter', amount: 50, unit: 'g' },
          { name: 'Flour', amount: 200, unit: 'g' }
        ]
      };
      const params = {
        ...mockParams,
        userPreferences: {
          ...mockParams.userPreferences!,
          dietaryRestrictions: ['Dairy-Free']
        }
      };
      
      expect(() => {
        (aiService as any).performSafetyChecks(recipe, params);
      }).toThrow('contains dairy but user requires dairy-free');
    });

    test('should warn when calories are significantly off target', () => {
      const recipe = { ...baseRecipe, calories: 800 }; // Target is 500
      const params = {
        ...mockParams,
        macroGoals: {
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20
        }
      };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      (aiService as any).performSafetyChecks(recipe, params);
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Recipe Safety Warnings'),
        expect.arrayContaining([
          expect.stringContaining('Calories')
        ])
      );
      
      consoleWarn.mockRestore();
    });

    test('should warn when protein is significantly off target', () => {
      const recipe = { ...baseRecipe, protein: 50 }; // Target is 30
      const params = {
        ...mockParams,
        macroGoals: {
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20
        }
      };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      (aiService as any).performSafetyChecks(recipe, params);
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Recipe Safety Warnings'),
        expect.arrayContaining([
          expect.stringContaining('Protein')
        ])
      );
      
      consoleWarn.mockRestore();
    });

    test('should pass when macros are within tolerance', () => {
      const recipe = { ...baseRecipe, calories: 550, protein: 35 }; // Within 20% tolerance
      const params = {
        ...mockParams,
        macroGoals: {
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20
        }
      };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      (aiService as any).performSafetyChecks(recipe, params);
      
      // Should not warn about macro misalignment
      const warnCalls = consoleWarn.mock.calls;
      const macroWarnings = warnCalls.filter(call => 
        call[1]?.some((msg: string) => msg.includes('Calories') || msg.includes('Protein'))
      );
      
      expect(macroWarnings).toHaveLength(0);
      
      consoleWarn.mockRestore();
    });
  });
});

