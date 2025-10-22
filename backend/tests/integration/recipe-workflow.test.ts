import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

// Mock Prisma for integration tests
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    savedRecipe: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    },
    recipeFeedback: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn()
    },
    macroGoals: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    },
    userPhysicalProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn()
    }
  }
}));

describe('Recipe Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Recipe CRUD Operations', () => {
    test('should complete full recipe lifecycle', async () => {
      const recipeData = {
        title: 'Integration Test Recipe',
        description: 'Test Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        ingredients: ['pasta', 'sauce'],
        instructions: ['Cook pasta', 'Add sauce']
      };

      const mockRecipe = {
        id: 'recipe-1',
        ...recipeData,
        userId: 'temp-user-id',
        isUserCreated: true,
        ingredients: [
          { id: 'ing-1', text: 'pasta', order: 0 },
          { id: 'ing-2', text: 'sauce', order: 1 }
        ],
        instructions: [
          { id: 'inst-1', text: 'Cook pasta', step: 1 },
          { id: 'inst-2', text: 'Add sauce', step: 2 }
        ]
      };

      // Mock recipe creation
      (prisma.recipe.create as jest.Mock).mockResolvedValue(mockRecipe);

      // 1. Create recipe
      const createResponse = await request(app)
        .post('/api/recipes')
        .send(recipeData)
        .expect(201);

      expect(createResponse.body.message).toBe('Recipe created successfully');
      expect(createResponse.body.recipe.id).toBe('recipe-1');

      // Mock recipe retrieval
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);

      // 2. Get recipe
      const getResponse = await request(app)
        .get('/api/recipes/recipe-1')
        .expect(200);

      expect(getResponse.body.id).toBe('recipe-1');
      expect(getResponse.body.title).toBe('Integration Test Recipe');

      // Mock save recipe
      const mockSavedRecipe = {
        id: 'saved-1',
        recipeId: 'recipe-1',
        userId: 'temp-user-id',
        savedDate: new Date(),
        recipe: mockRecipe
      };
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.savedRecipe.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.savedRecipe.create as jest.Mock).mockResolvedValue(mockSavedRecipe);

      // 3. Save recipe
      await request(app)
        .post('/api/recipes/recipe-1/save')
        .expect(200);

      // Mock like recipe
      const mockFeedback = {
        id: 'feedback-1',
        recipeId: 'recipe-1',
        userId: 'temp-user-id',
        liked: true
      };
      (prisma.recipeFeedback.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.recipeFeedback.create as jest.Mock).mockResolvedValue(mockFeedback);

      // 4. Like recipe
      await request(app)
        .post('/api/recipes/recipe-1/like')
        .expect(200);

      // Mock get saved recipes
      (prisma.savedRecipe.findMany as jest.Mock).mockResolvedValue([mockSavedRecipe]);
      (prisma.recipe.findMany as jest.Mock).mockResolvedValue([]);

      // 5. Get saved recipes
      const savedResponse = await request(app)
        .get('/api/recipes/saved')
        .expect(200);

      expect(savedResponse.body).toHaveLength(1);
      expect(savedResponse.body[0].id).toBe('recipe-1');

      // Mock recipe update
      const updatedRecipe = {
        ...mockRecipe,
        title: 'Updated Recipe'
      };
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.recipe.update as jest.Mock).mockResolvedValue(updatedRecipe);

      // 6. Update recipe
      const updateResponse = await request(app)
        .put('/api/recipes/recipe-1')
        .send({ title: 'Updated Recipe' })
        .expect(200);

      expect(updateResponse.body.message).toBe('Recipe updated successfully');
      expect(updateResponse.body.recipe.title).toBe('Updated Recipe');

      // Mock recipe deletion
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);
      (prisma.recipe.delete as jest.Mock).mockResolvedValue({});

      // 7. Delete recipe
      await request(app)
        .delete('/api/recipes/recipe-1')
        .expect(200);

      // 8. Verify deletion
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);
      await request(app)
        .get('/api/recipes/recipe-1')
        .expect(404);
    });

    test('should handle recipe creation with validation errors', async () => {
      const invalidRecipeData = {
        title: 'Test Recipe'
        // Missing required fields
      };

      await request(app)
        .post('/api/recipes')
        .send(invalidRecipeData)
        .expect(400);
    });

    test('should handle unauthorized recipe updates', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        userId: 'other-user-id', // Different user
        title: 'Original Recipe'
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);

      await request(app)
        .put('/api/recipes/recipe-1')
        .send({ title: 'Updated Recipe' })
        .expect(403);
    });

    test('should handle unauthorized recipe deletion', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        userId: 'other-user-id', // Different user
        title: 'Original Recipe'
      };

      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockRecipe);

      await request(app)
        .delete('/api/recipes/recipe-1')
        .expect(403);
    });
  });

  describe('User Profile Workflow', () => {
    test('should complete user profile setup', async () => {
      const mockUser = {
        id: 'temp-user-id',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockPreferences = {
        id: 'pref-1',
        userId: 'temp-user-id',
        cookTimePreference: 30,
        spiceLevel: 'medium',
        bannedIngredients: [],
        likedCuisines: [],
        dietaryRestrictions: []
      };

      const mockPhysicalProfile = {
        id: 'profile-1',
        userId: 'temp-user-id',
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain',
        bmr: 1800,
        tdee: 2300
      };

      const mockMacroGoals = {
        id: 'goals-1',
        userId: 'temp-user-id',
        calories: 2300,
        protein: 128,
        carbs: 230,
        fat: 77
      };

      // Mock user profile
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // 1. Get user profile
      const profileResponse = await request(app)
        .get('/api/user/profile')
        .expect(200);

      expect(profileResponse.body.id).toBe('temp-user-id');

      // Mock preferences
      (prisma.userPreferences.findUnique as jest.Mock).mockResolvedValue(mockPreferences);

      // 2. Get user preferences
      const preferencesResponse = await request(app)
        .get('/api/user/preferences')
        .expect(200);

      expect(preferencesResponse.body.userId).toBe('temp-user-id');

      // Mock physical profile
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(mockPhysicalProfile);

      // 3. Get physical profile
      const physicalResponse = await request(app)
        .get('/api/user/physical-profile')
        .expect(200);

      expect(physicalResponse.body.userId).toBe('temp-user-id');
      expect(physicalResponse.body.bmr).toBe(1800);

      // Mock macro goals
      (prisma.macroGoals.findUnique as jest.Mock).mockResolvedValue(mockMacroGoals);

      // 4. Get macro goals
      const macroResponse = await request(app)
        .get('/api/user/macro-goals')
        .expect(200);

      expect(macroResponse.body.userId).toBe('temp-user-id');
      expect(macroResponse.body.calories).toBe(2300);
    });

    test('should handle physical profile creation and macro calculation', async () => {
      const profileData = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };

      const mockProfile = {
        id: 'profile-1',
        userId: 'temp-user-id',
        ...profileData,
        bmr: 1800,
        tdee: 2300
      };

      // Mock physical profile creation
      (prisma.userPhysicalProfile.upsert as jest.Mock).mockResolvedValue(mockProfile);

      // 1. Create physical profile
      const createResponse = await request(app)
        .put('/api/user/physical-profile')
        .send(profileData)
        .expect(200);

      expect(createResponse.body.message).toBe('Physical profile saved successfully');
      expect(createResponse.body.profile.bmr).toBe(1800);

      // Mock macro calculation
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      // 2. Calculate recommended macros
      const calcResponse = await request(app)
        .get('/api/user/calculate-macros')
        .expect(200);

      expect(calcResponse.body.bmr).toBe(1780);
      expect(calcResponse.body.tdee).toBe(2759);

      // Mock macro goals update
      const mockMacroGoals = {
        id: 'goals-1',
        userId: 'temp-user-id',
        calories: 2300,
        protein: 128,
        carbs: 230,
        fat: 77
      };

      (prisma.macroGoals.upsert as jest.Mock).mockResolvedValue(mockMacroGoals);

      // 3. Apply calculated macros
      const applyResponse = await request(app)
        .post('/api/user/apply-calculated-macros')
        .expect(200);

      expect(applyResponse.body.message).toBe('Macro goals updated successfully');
      expect(applyResponse.body.macroGoals.calories).toBe(2300);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      (prisma.recipe.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await request(app)
        .get('/api/recipes')
        .expect(500);
    });

    test('should handle invalid recipe ID', async () => {
      (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get('/api/recipes/invalid-id')
        .expect(404);
    });

    test('should handle missing physical profile for macro calculation', async () => {
      (prisma.userPhysicalProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get('/api/user/calculate-macros')
        .expect(400);
    });
  });
});
