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

describe('AIRecipeService - Prompt Engineering', () => {
  let aiService: AIRecipeService;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    aiService = new AIRecipeService();
  });

  describe('buildRecipePrompt', () => {
    test('should include meal type in prompt', () => {
      const params = {
        userId: 'test-user',
        mealType: 'breakfast' as const
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('breakfast');
    });

    test('should include cuisine preference when provided', () => {
      const params = {
        userId: 'test-user',
        cuisineOverride: 'Italian'
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('Italian');
      expect(prompt).toContain('cuisine');
    });

    test('should include user liked cuisines when no override', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: ['Italian', 'Mexican', 'Thai'],
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('Italian');
      expect(prompt).toContain('Mexican');
      expect(prompt).toContain('Thai');
    });

    test('should include macro goals with tolerance ranges', () => {
      const params = {
        userId: 'test-user',
        macroGoals: {
          calories: 500,
          protein: 30,
          carbs: 50,
          fat: 20
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('500');
      expect(prompt).toContain('30');
      expect(prompt).toContain('50');
      expect(prompt).toContain('20');
      expect(prompt).toContain('±');
    });

    test('should include dietary restrictions', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: ['Vegetarian', 'Dairy-Free'],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 30
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('Vegetarian');
      expect(prompt).toContain('Dairy-Free');
    });

    test('should include banned ingredients with NEVER prefix', () => {
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
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('NEVER');
      expect(prompt).toContain('Peanuts');
      expect(prompt).toContain('Shellfish');
    });

    test('should include cook time preference', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'medium',
          cookTimePreference: 45
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('45');
      expect(prompt).toContain('minutes');
    });

    test('should include spice level', () => {
      const params = {
        userId: 'test-user',
        userPreferences: {
          likedCuisines: [],
          dietaryRestrictions: [],
          bannedIngredients: [],
          spiceLevel: 'high',
          cookTimePreference: 30
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('high');
    });

    test('should include fitness goal context', () => {
      const params = {
        userId: 'test-user',
        physicalProfile: {
          gender: 'male',
          age: 30,
          activityLevel: 'moderate',
          fitnessGoal: 'lose_weight'
        }
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('lose');
    });

    test('should include quality requirements', () => {
      const params = {
        userId: 'test-user'
      };
      
      const prompt = (aiService as any).buildRecipePrompt(params);
      expect(prompt).toContain('Creative');
      expect(prompt).toContain('unique');
      expect(prompt).toContain('delicious');
    });
  });

  describe('getSystemPrompt', () => {
    test('should return system prompt with JSON schema', () => {
      const systemPrompt = (aiService as any).getSystemPrompt();
      
      expect(systemPrompt).toContain('JSON');
      expect(systemPrompt).toContain('title');
      expect(systemPrompt).toContain('calories');
      expect(systemPrompt).toContain('protein');
      expect(systemPrompt).toContain('ingredients');
      expect(systemPrompt).toContain('instructions');
    });

    test('should include macro fields in schema', () => {
      const systemPrompt = (aiService as any).getSystemPrompt();
      
      expect(systemPrompt).toContain('calories');
      expect(systemPrompt).toContain('protein');
      expect(systemPrompt).toContain('carbs');
      expect(systemPrompt).toContain('fat');
      expect(systemPrompt).toContain('fiber');
    });

    test('should include quality rules', () => {
      const systemPrompt = (aiService as any).getSystemPrompt();
      
      expect(systemPrompt).toContain('Accurate macros');
      expect(systemPrompt).toContain('clear steps');
      expect(systemPrompt).toContain('delicious');
    });
  });

  describe('getFitnessGoalContext', () => {
    test('should return weight loss context', () => {
      const context = (aiService as any).getFitnessGoalContext('lose_weight');
      
      expect(context).toContain('weight');
      expect(context).toContain('satiety');
      expect(context).toContain('protein');
    });

    test('should return muscle gain context', () => {
      const context = (aiService as any).getFitnessGoalContext('gain_muscle');
      
      expect(context).toContain('muscle');
      expect(context).toContain('protein');
    });

    test('should return maintenance context', () => {
      const context = (aiService as any).getFitnessGoalContext('maintain');
      
      expect(context).toContain('balanced');
      expect(context).toContain('sustainable');
    });

    test('should return default context for unknown goal', () => {
      const context = (aiService as any).getFitnessGoalContext('unknown');
      
      expect(context).toContain('balanced');
      expect(context).toContain('sustainable');
    });
  });
});

