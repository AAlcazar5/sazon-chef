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

describe('AIRecipeService - Recipe Generation', () => {
  let aiService: AIRecipeService;

  const mockRecipeResponse = {
    title: 'Test Recipe',
    description: 'A delicious test recipe that meets all requirements',
    cuisine: 'Italian',
    cookTime: 30,
    difficulty: 'medium',
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
      { step: 1, instruction: 'Cook pasta in boiling water for 10 minutes until al dente' },
      { step: 2, instruction: 'Heat tomato sauce in a pan over medium heat' },
      { step: 3, instruction: 'Combine pasta with sauce and serve immediately' }
    ],
    tips: ['Add fresh basil for extra flavor'],
    tags: ['high-protein', 'quick']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    aiService = new AIRecipeService();

    // Mock OpenAI response
    (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify(mockRecipeResponse)
        }
      }]
    });

    // Mock Prisma responses
    (mockPrisma.recipe.create as jest.Mock).mockResolvedValue({
      id: 'recipe-123',
      ...mockRecipeResponse,
      userId: 'test-user'
    });
    (mockPrisma.recipe.update as jest.Mock).mockResolvedValue({
      id: 'recipe-123',
      ...mockRecipeResponse,
      imageUrl: 'https://example.com/image.jpg'
    });
    (mockPrisma.recipe.findUnique as jest.Mock).mockResolvedValue({
      id: 'recipe-123',
      ...mockRecipeResponse,
      ingredients: [],
      instructions: []
    });
    (mockPrisma.recipeIngredient.create as jest.Mock).mockResolvedValue({ id: 'ing-1' });
    (mockPrisma.recipeInstruction.create as jest.Mock).mockResolvedValue({ id: 'inst-1' });
  });

  describe('generateRecipe', () => {
    test('should generate recipe with user preferences', async () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: ['Italian'],
          dietaryRestrictions: ['Vegetarian'],
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

      const result = await aiService.generateRecipe(params);

      expect(result.title).toBe('Test Recipe');
      expect(result.cuisine).toBe('Italian');
      expect(result.calories).toBe(500);
      
      // Verify OpenAI was called
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      const callArgs = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0];
      
      expect(callArgs.model).toBe('gpt-4o');
      expect(callArgs.temperature).toBe(1.1);
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');
    });

    test('should include dietary restrictions in prompt', async () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: ['Vegan', 'Gluten-Free'],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };

      await aiService.generateRecipe(params);

      const userPrompt = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('Vegan');
      expect(userPrompt).toContain('Gluten-Free');
    });

    test('should include banned ingredients in prompt', async () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: ['Peanuts', 'Shellfish'],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };

      await aiService.generateRecipe(params);

      const userPrompt = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('NEVER');
      expect(userPrompt).toContain('Peanuts');
      expect(userPrompt).toContain('Shellfish');
    });

    test('should handle macro goals correctly', async () => {
      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 600,
          protein: 40,
          carbs: 60,
          fat: 25
        }
      };

      await aiService.generateRecipe(params);

      const userPrompt = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('600');
      expect(userPrompt).toContain('40');
      expect(userPrompt).toContain('60');
      expect(userPrompt).toContain('25');
    });

    test('should handle physical profile and fitness goals', async () => {
      const params = {
        userId: 'test-user',
        physicalProfile: {
          gender: 'male',
          age: 30,
          activityLevel: 'active',
          fitnessGoal: 'gain_muscle'
        }
      };

      await aiService.generateRecipe(params);

      const userPrompt = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0].messages[1].content;
      expect(userPrompt).toContain('muscle');
      expect(userPrompt).toContain('protein');
    });

    test('should throw error if OpenAI API key is missing', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => {
        new AIRecipeService();
      }).toThrow('OPENAI_API_KEY is not set');
    });

    test('should throw error if OpenAI returns no content', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      const params = {
        userId: 'test-user'
      };

      await expect(aiService.generateRecipe(params)).rejects.toThrow('No content received');
    });

    test('should throw error if OpenAI returns invalid JSON', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON {'
          }
        }]
      });

      const params = {
        userId: 'test-user'
      };

      await expect(aiService.generateRecipe(params)).rejects.toThrow();
    });
  });

  describe('generateDailyMealPlan', () => {
    test('should generate all four meals', async () => {
      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 70
        }
      };

      const result = await aiService.generateDailyMealPlan(params);

      expect(result.breakfast).toBeDefined();
      expect(result.lunch).toBeDefined();
      expect(result.dinner).toBeDefined();
      expect(result.snack).toBeDefined();

      // Should call OpenAI 4 times (one per meal)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(4);
    });

    test('should distribute macros across meals correctly', async () => {
      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 70
        }
      };

      await aiService.generateDailyMealPlan(params);

      const calls = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls;
      
      // Check breakfast (25%)
      const breakfastPrompt = calls[0][0].messages[1].content;
      expect(breakfastPrompt).toContain('500'); // 2000 * 0.25 = 500
      
      // Check lunch (30%)
      const lunchPrompt = calls[1][0].messages[1].content;
      expect(lunchPrompt).toContain('600'); // 2000 * 0.30 = 600
      
      // Check dinner (35%)
      const dinnerPrompt = calls[2][0].messages[1].content;
      expect(dinnerPrompt).toContain('700'); // 2000 * 0.35 = 700
      
      // Check snack (10%)
      const snackPrompt = calls[3][0].messages[1].content;
      expect(snackPrompt).toContain('200'); // 2000 * 0.10 = 200
    });

    test('should pass user preferences to all meals', async () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: ['Italian', 'Mexican'],
          dietaryRestrictions: ['Vegetarian'],
          bannedIngredients: ['Peanuts'],
          spiceLevel: 'medium',
          cookTimePreference: 30
        },
        macroGoals: {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 70
        }
      };

      await aiService.generateDailyMealPlan(params);

      const calls = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls;
      
      // All meals should have the same preferences
      calls.forEach(call => {
        const prompt = call[0].messages[1].content;
        expect(prompt).toContain('Vegetarian');
        expect(prompt).toContain('NEVER');
        expect(prompt).toContain('Peanuts');
      });
    });
  });

  describe('saveGeneratedRecipe', () => {
    test('should save recipe to database with all fields', async () => {
      const recipe = {
        title: 'Test Recipe',
        description: 'A test recipe',
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
          { name: 'Pasta', amount: 100, unit: 'g' }
        ],
        instructions: [
          { step: 1, instruction: 'Cook pasta' }
        ]
      };

      const result = await aiService.saveGeneratedRecipe(recipe, 'test-user');

      expect(mockPrisma.recipe.create).toHaveBeenCalled();
      expect(mockPrisma.recipeIngredient.create).toHaveBeenCalled();
      expect(mockPrisma.recipeInstruction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should handle image fetch failure gracefully', async () => {
      const { imageService } = require('../../src/services/imageService');
      (imageService.searchFoodImage as jest.Mock).mockRejectedValue(new Error('Image fetch failed'));

      const recipe = {
        title: 'Test Recipe',
        description: 'A test recipe',
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

      // Should not throw, just continue without image
      await expect(aiService.saveGeneratedRecipe(recipe, 'test-user')).resolves.toBeDefined();
    });
  });
});

