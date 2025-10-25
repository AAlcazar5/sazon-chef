// frontend/__tests__/hooks/useRecommendations.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useRecommendations } from '../../hooks/useRecommendations';

// Mock the API
jest.mock('../../lib/api', () => ({
  recipeApi: {
    getSuggestedRecipes: jest.fn(),
    getRandomRecipe: jest.fn(),
    getRecipes: jest.fn()
  }
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

describe('useRecommendations Hook', () => {
  const mockApi = require('../../lib/api').recipeApi;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useSuggestedRecipes', () => {
    it('should fetch suggested recipes successfully', async () => {
      const mockRecipes = [
        { id: 'recipe-1', title: 'Test Recipe 1' },
        { id: 'recipe-2', title: 'Test Recipe 2' }
      ];

      mockApi.getSuggestedRecipes.mockResolvedValue({ data: mockRecipes });

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.fetchSuggestedRecipes();
      });

      expect(result.current.suggestedRecipes).toEqual(mockRecipes);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockApi.getSuggestedRecipes.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.fetchSuggestedRecipes();
      });

      expect(result.current.suggestedRecipes).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('API Error');
    });

    it('should apply filters when fetching', async () => {
      const mockRecipes = [{ id: 'recipe-1', title: 'Filtered Recipe' }];
      mockApi.getSuggestedRecipes.mockResolvedValue({ data: mockRecipes });

      const { result } = renderHook(() => useRecommendations());

      const filters = {
        cuisines: ['Italian'],
        maxCookTime: 30,
        difficulty: ['easy']
      };

      await act(async () => {
        await result.current.fetchSuggestedRecipes(filters);
      });

      expect(mockApi.getSuggestedRecipes).toHaveBeenCalledWith(filters);
    });

    it('should set loading state correctly', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApi.getSuggestedRecipes.mockReturnValue(promise);

      const { result } = renderHook(() => useRecommendations());

      act(() => {
        result.current.fetchSuggestedRecipes();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise({ data: [] });
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('useRandomRecipe', () => {
    it('should fetch random recipe successfully', async () => {
      const mockRecipe = { id: 'recipe-1', title: 'Random Recipe' };
      mockApi.getRandomRecipe.mockResolvedValue({ data: mockRecipe });

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.fetchRandomRecipe();
      });

      expect(result.current.randomRecipe).toEqual(mockRecipe);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle random recipe API errors', async () => {
      const mockError = new Error('Random Recipe Error');
      mockApi.getRandomRecipe.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.fetchRandomRecipe();
      });

      expect(result.current.randomRecipe).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Random Recipe Error');
    });
  });

  describe('useRecipeSearch', () => {
    it('should search recipes successfully', async () => {
      const mockRecipes = [
        { id: 'recipe-1', title: 'Search Result 1' },
        { id: 'recipe-2', title: 'Search Result 2' }
      ];
      mockApi.getRecipes.mockResolvedValue({ data: mockRecipes });

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.searchRecipes('pasta');
      });

      expect(result.current.searchResults).toEqual(mockRecipes);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle search errors', async () => {
      const mockError = new Error('Search Error');
      mockApi.getRecipes.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.searchRecipes('pasta');
      });

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Search Error');
    });

    it('should clear search results when query is empty', async () => {
      const { result } = renderHook(() => useRecommendations());

      act(() => {
        result.current.setSearchQuery('');
      });

      expect(result.current.searchResults).toEqual([]);
    });
  });

  describe('useFilterPersistence', () => {
    it('should load saved filters on mount', async () => {
      const mockFilters = {
        cuisines: ['Italian', 'Mexican'],
        maxCookTime: 30,
        difficulty: ['easy', 'medium']
      };

      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockFilters));

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.loadSavedFilters();
      });

      expect(result.current.savedFilters).toEqual(mockFilters);
    });

    it('should save filters when they change', async () => {
      const mockFilters = {
        cuisines: ['Italian'],
        maxCookTime: 45
      };

      const AsyncStorage = require('@react-native-async-storage/async-storage');

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.saveFilters(mockFilters);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'recipe_filters',
        JSON.stringify(mockFilters)
      );
    });

    it('should clear saved filters', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.clearSavedFilters();
      });

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('recipe_filters');
      expect(result.current.savedFilters).toEqual({});
    });
  });

  describe('useRecommendationCaching', () => {
    it('should cache recommendations and avoid duplicate API calls', async () => {
      const mockRecipes = [{ id: 'recipe-1', title: 'Cached Recipe' }];
      mockApi.getSuggestedRecipes.mockResolvedValue({ data: mockRecipes });

      const { result } = renderHook(() => useRecommendations());

      // First call
      await act(async () => {
        await result.current.fetchSuggestedRecipes();
      });

      // Second call should use cache
      await act(async () => {
        await result.current.fetchSuggestedRecipes();
      });

      expect(mockApi.getSuggestedRecipes).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when filters change', async () => {
      const mockRecipes = [{ id: 'recipe-1', title: 'Recipe' }];
      mockApi.getSuggestedRecipes.mockResolvedValue({ data: mockRecipes });

      const { result } = renderHook(() => useRecommendations());

      // First call with no filters
      await act(async () => {
        await result.current.fetchSuggestedRecipes();
      });

      // Second call with different filters
      await act(async () => {
        await result.current.fetchSuggestedRecipes({ cuisines: ['Italian'] });
      });

      expect(mockApi.getSuggestedRecipes).toHaveBeenCalledTimes(2);
    });
  });

  describe('useErrorHandling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      mockApi.getSuggestedRecipes.mockRejectedValue(networkError);

      const { result } = renderHook(() => useRecommendations());

      await act(async () => {
        await result.current.fetchSuggestedRecipes();
      });

      expect(result.current.error).toBe('Network Error');
      expect(result.current.suggestedRecipes).toEqual([]);
    });

    it('should clear errors when new request succeeds', async () => {
      const mockError = new Error('Initial Error');
      const mockRecipes = [{ id: 'recipe-1', title: 'Success Recipe' }];

      mockApi.getSuggestedRecipes
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ data: mockRecipes });

      const { result } = renderHook(() => useRecommendations());

      // First call fails
      await act(async () => {
        await result.current.fetchSuggestedRecipes();
      });

      expect(result.current.error).toBe('Initial Error');

      // Second call succeeds
      await act(async () => {
        await result.current.fetchSuggestedRecipes();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.suggestedRecipes).toEqual(mockRecipes);
    });
  });
});
