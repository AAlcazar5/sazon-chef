import { renderHook, act } from '@testing-library/react-native';
import { useApi } from '../../hooks/useApi';
import { recipeApi, userApi } from '../../lib/api';

// Mock the API
jest.mock('../../lib/api', () => ({
  recipeApi: {
    getRecipes: jest.fn(),
    getRecipe: jest.fn(),
    getSuggestedRecipes: jest.fn(),
    getSavedRecipes: jest.fn(),
    saveRecipe: jest.fn(),
    unsaveRecipe: jest.fn(),
    likeRecipe: jest.fn(),
    dislikeRecipe: jest.fn(),
    createRecipe: jest.fn(),
    updateRecipe: jest.fn(),
    deleteRecipe: jest.fn(),
    getUserRecipes: jest.fn()
  },
  userApi: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    getMacroGoals: jest.fn(),
    updateMacroGoals: jest.fn(),
    getPhysicalProfile: jest.fn(),
    updatePhysicalProfile: jest.fn(),
    getCalculatedMacros: jest.fn(),
    applyCalculatedMacros: jest.fn(),
    getNotifications: jest.fn(),
    updateNotifications: jest.fn()
  }
}));

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Recipe API', () => {
    test('should fetch recipes successfully', async () => {
      const mockRecipes = [
        { id: '1', title: 'Recipe 1' },
        { id: '2', title: 'Recipe 2' }
      ];

      (recipeApi.getRecipes as jest.Mock).mockResolvedValue({ data: mockRecipes });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const recipes = await result.current.recipeApi.getRecipes();
        expect(recipes.data).toEqual(mockRecipes);
      });
    });

    test('should handle recipe fetch errors', async () => {
      const error = new Error('Network error');
      (recipeApi.getRecipes as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useApi());

      await act(async () => {
        try {
          await result.current.recipeApi.getRecipes();
        } catch (e) {
          expect(e).toBe(error);
        }
      });
    });

    test('should save recipe successfully', async () => {
      const mockSavedRecipe = { id: '1', title: 'Saved Recipe' };
      (recipeApi.saveRecipe as jest.Mock).mockResolvedValue({ data: mockSavedRecipe });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const response = await result.current.recipeApi.saveRecipe('recipe-1');
        expect(response.data).toEqual(mockSavedRecipe);
      });
    });

    test('should create recipe successfully', async () => {
      const recipeData = {
        title: 'New Recipe',
        description: 'New Description',
        cookTime: 30,
        cuisine: 'Italian',
        calories: 500,
        protein: 25,
        carbs: 50,
        fat: 20,
        ingredients: ['pasta'],
        instructions: ['Cook pasta']
      };

      const mockCreatedRecipe = { id: 'new-1', ...recipeData };
      (recipeApi.createRecipe as jest.Mock).mockResolvedValue({ data: { recipe: mockCreatedRecipe } });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const response = await result.current.recipeApi.createRecipe(recipeData);
        expect(response.data.recipe).toEqual(mockCreatedRecipe);
      });
    });

    test('should update recipe successfully', async () => {
      const updateData = { title: 'Updated Recipe' };
      const mockUpdatedRecipe = { id: '1', title: 'Updated Recipe' };
      (recipeApi.updateRecipe as jest.Mock).mockResolvedValue({ data: { recipe: mockUpdatedRecipe } });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const response = await result.current.recipeApi.updateRecipe('recipe-1', updateData);
        expect(response.data.recipe).toEqual(mockUpdatedRecipe);
      });
    });

    test('should delete recipe successfully', async () => {
      (recipeApi.deleteRecipe as jest.Mock).mockResolvedValue({ data: { message: 'Recipe deleted successfully' } });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const response = await result.current.recipeApi.deleteRecipe('recipe-1');
        expect(response.data.message).toBe('Recipe deleted successfully');
      });
    });
  });

  describe('User API', () => {
    test('should fetch user profile successfully', async () => {
      const mockProfile = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        preferences: {},
        macroGoals: {}
      };

      (userApi.getProfile as jest.Mock).mockResolvedValue({ data: mockProfile });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const profile = await result.current.userApi.getProfile();
        expect(profile.data).toEqual(mockProfile);
      });
    });

    test('should fetch user preferences successfully', async () => {
      const mockPreferences = {
        cookTimePreference: 30,
        spiceLevel: 'medium',
        bannedIngredients: [],
        likedCuisines: [],
        dietaryRestrictions: []
      };

      (userApi.getPreferences as jest.Mock).mockResolvedValue({ data: mockPreferences });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const preferences = await result.current.userApi.getPreferences();
        expect(preferences.data).toEqual(mockPreferences);
      });
    });

    test('should update user preferences successfully', async () => {
      const updateData = {
        cookTimePreference: 45,
        spiceLevel: 'spicy',
        bannedIngredients: ['mushrooms'],
        likedCuisines: ['Italian'],
        dietaryRestrictions: ['vegetarian']
      };

      const mockUpdatedPreferences = { ...updateData };
      (userApi.updatePreferences as jest.Mock).mockResolvedValue({ data: { preferences: mockUpdatedPreferences } });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const response = await result.current.userApi.updatePreferences(updateData);
        expect(response.data.preferences).toEqual(mockUpdatedPreferences);
      });
    });

    test('should fetch physical profile successfully', async () => {
      const mockPhysicalProfile = {
        id: 'profile-1',
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain',
        bmr: 1800,
        tdee: 2300
      };

      (userApi.getPhysicalProfile as jest.Mock).mockResolvedValue({ data: mockPhysicalProfile });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const profile = await result.current.userApi.getPhysicalProfile();
        expect(profile.data).toEqual(mockPhysicalProfile);
      });
    });

    test('should update physical profile successfully', async () => {
      const profileData = {
        gender: 'male',
        age: 30,
        heightCm: 180,
        weightKg: 80,
        activityLevel: 'moderately_active',
        fitnessGoal: 'maintain'
      };

      const mockUpdatedProfile = {
        ...profileData,
        bmr: 1800,
        tdee: 2300
      };

      (userApi.updatePhysicalProfile as jest.Mock).mockResolvedValue({
        data: { profile: mockUpdatedProfile }
      });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const response = await result.current.userApi.updatePhysicalProfile(profileData);
        expect(response.data.profile).toEqual(mockUpdatedProfile);
      });
    });

    test('should calculate macros successfully', async () => {
      const mockCalculations = {
        calories: 2300,
        protein: 128,
        carbs: 230,
        fat: 77,
        bmr: 1800,
        tdee: 2300
      };

      (userApi.getCalculatedMacros as jest.Mock).mockResolvedValue({
        data: { calculations: mockCalculations }
      });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const response = await result.current.userApi.getCalculatedMacros();
        expect(response.data.calculations).toEqual(mockCalculations);
      });
    });

    test('should apply calculated macros successfully', async () => {
      const mockMacroGoals = {
        calories: 2300,
        protein: 128,
        carbs: 230,
        fat: 77
      };

      (userApi.applyCalculatedMacros as jest.Mock).mockResolvedValue({
        data: { macroGoals: mockMacroGoals }
      });

      const { result } = renderHook(() => useApi());

      await act(async () => {
        const response = await result.current.userApi.applyCalculatedMacros();
        expect(response.data.macroGoals).toEqual(mockMacroGoals);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      (recipeApi.getRecipes as jest.Mock).mockRejectedValue(networkError);

      const { result } = renderHook(() => useApi());

      await act(async () => {
        try {
          await result.current.recipeApi.getRecipes();
        } catch (error) {
          expect(error).toBe(networkError);
        }
      });
    });

    test('should handle server errors gracefully', async () => {
      const serverError = new Error('Internal server error');
      (userApi.getProfile as jest.Mock).mockRejectedValue(serverError);

      const { result } = renderHook(() => useApi());

      await act(async () => {
        try {
          await result.current.userApi.getProfile();
        } catch (error) {
          expect(error).toBe(serverError);
        }
      });
    });

    test('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      (recipeApi.saveRecipe as jest.Mock).mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useApi());

      await act(async () => {
        try {
          await result.current.recipeApi.saveRecipe('recipe-1');
        } catch (error) {
          expect(error).toBe(timeoutError);
        }
      });
    });
  });

  describe('Loading States', () => {
    test('should handle loading states properly', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (recipeApi.getRecipes as jest.Mock).mockReturnValue(promise);

      const { result } = renderHook(() => useApi());

      // Start the request
      act(() => {
        result.current.recipeApi.getRecipes();
      });

      // Resolve the promise
      await act(async () => {
        resolvePromise!({ data: [] });
      });

      // Should complete without errors
      expect(recipeApi.getRecipes).toHaveBeenCalled();
    });
  });
});
