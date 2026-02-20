// frontend/__tests__/hooks/useRecipeFilters.test.ts

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock filterStorage — use jest.fn() inside factory to avoid hoisting issues
jest.mock('../../lib/filterStorage', () => ({
  filterStorage: {
    getDefaultFilters: jest.fn(() => ({
      cuisines: [],
      dietaryRestrictions: [],
      maxCookTime: null,
      difficulty: [],
    })),
    loadFilters: jest.fn(() => Promise.resolve(null)),
    saveFilters: jest.fn(() => Promise.resolve()),
    clearFilters: jest.fn(() => Promise.resolve()),
  },
}));

// Mock filterUtils
jest.mock('../../utils/filterUtils', () => ({
  getActiveFilterLabels: jest.fn(() => []),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRecipeFilters } from '../../hooks/useRecipeFilters';
import { getActiveFilterLabels } from '../../utils/filterUtils';
import { filterStorage } from '../../lib/filterStorage';

const mockGetActiveFilterLabels = getActiveFilterLabels as jest.Mock;
const mockFilterStorage = filterStorage as jest.Mocked<typeof filterStorage>;

describe('useRecipeFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockFilterStorage.getDefaultFilters as jest.Mock).mockReturnValue({
      cuisines: [],
      dietaryRestrictions: [],
      maxCookTime: null,
      difficulty: [],
    });
    (mockFilterStorage.loadFilters as jest.Mock).mockResolvedValue(null);
    mockGetActiveFilterLabels.mockReturnValue([]);
  });

  // ── Initialization ─────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize with default filters', () => {
      const { result } = renderHook(() => useRecipeFilters());

      expect(result.current.filters).toEqual({
        cuisines: [],
        dietaryRestrictions: [],
        maxCookTime: null,
        difficulty: [],
      });
      expect(result.current.activeFilters).toEqual([]);
      expect(result.current.showFilterModal).toBe(false);
    });

    it('should set filtersLoaded to true after mount', async () => {
      const { result } = renderHook(() => useRecipeFilters());

      await waitFor(() => {
        expect(result.current.filtersLoaded).toBe(true);
      });
    });

    it('should load saved filters from storage on mount', async () => {
      const savedFilters = {
        cuisines: ['Italian'],
        dietaryRestrictions: ['Vegetarian'],
        maxCookTime: 30,
        difficulty: ['Easy'],
      };
      (mockFilterStorage.loadFilters as jest.Mock).mockResolvedValueOnce(savedFilters);
      mockGetActiveFilterLabels.mockReturnValue(['Italian', '≤30 min']);

      const { result } = renderHook(() => useRecipeFilters());

      await waitFor(() => {
        expect(result.current.filtersLoaded).toBe(true);
      });

      expect(result.current.filters).toEqual(savedFilters);
      expect(result.current.activeFilters).toEqual(['Italian', '≤30 min']);
    });

    it('should handle storage load error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (mockFilterStorage.loadFilters as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const { result } = renderHook(() => useRecipeFilters());

      await waitFor(() => {
        expect(result.current.filtersLoaded).toBe(true);
      });

      // Should still have default filters
      expect(result.current.filters.cuisines).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  // ── Filter Modal ───────────────────────────────────────────────────

  describe('filter modal', () => {
    it('should open and close filter modal', () => {
      const { result } = renderHook(() => useRecipeFilters());

      expect(result.current.showFilterModal).toBe(false);

      act(() => {
        result.current.openFilterModal();
      });
      expect(result.current.showFilterModal).toBe(true);

      act(() => {
        result.current.closeFilterModal();
      });
      expect(result.current.showFilterModal).toBe(false);
    });
  });

  // ── handleFilterChange ─────────────────────────────────────────────

  describe('handleFilterChange', () => {
    it('should toggle a cuisine filter (add)', () => {
      const { result } = renderHook(() => useRecipeFilters());

      act(() => {
        result.current.handleFilterChange('cuisines', 'Italian');
      });

      expect(result.current.filters.cuisines).toContain('Italian');
    });

    it('should toggle a cuisine filter (remove)', () => {
      const { result } = renderHook(() => useRecipeFilters());

      act(() => {
        result.current.handleFilterChange('cuisines', 'Italian');
      });
      expect(result.current.filters.cuisines).toContain('Italian');

      act(() => {
        result.current.handleFilterChange('cuisines', 'Italian');
      });
      expect(result.current.filters.cuisines).not.toContain('Italian');
    });

    it('should set maxCookTime', () => {
      const { result } = renderHook(() => useRecipeFilters());

      act(() => {
        result.current.handleFilterChange('maxCookTime', 30);
      });

      expect(result.current.filters.maxCookTime).toBe(30);
    });

    it('should clear maxCookTime with null', () => {
      const { result } = renderHook(() => useRecipeFilters());

      act(() => {
        result.current.handleFilterChange('maxCookTime', 30);
      });
      expect(result.current.filters.maxCookTime).toBe(30);

      act(() => {
        result.current.handleFilterChange('maxCookTime', null);
      });
      expect(result.current.filters.maxCookTime).toBeNull();
    });

    it('should accept array values directly for difficulty', () => {
      const { result } = renderHook(() => useRecipeFilters());

      act(() => {
        result.current.handleFilterChange('difficulty', ['Easy', 'Medium']);
      });

      expect(result.current.filters.difficulty).toEqual(['Easy', 'Medium']);
    });

    it('should toggle dietary restrictions', () => {
      const { result } = renderHook(() => useRecipeFilters());

      act(() => {
        result.current.handleFilterChange('dietaryRestrictions', 'Vegetarian');
      });
      expect(result.current.filters.dietaryRestrictions).toContain('Vegetarian');

      act(() => {
        result.current.handleFilterChange('dietaryRestrictions', 'Vegan');
      });
      expect(result.current.filters.dietaryRestrictions).toEqual(['Vegetarian', 'Vegan']);
    });
  });

  // ── resetFilters ───────────────────────────────────────────────────

  describe('resetFilters', () => {
    it('should reset filters to defaults', async () => {
      const { result } = renderHook(() => useRecipeFilters());

      // Set some filters first
      act(() => {
        result.current.handleFilterChange('cuisines', 'Italian');
        result.current.handleFilterChange('maxCookTime', 30);
      });

      expect(result.current.filters.cuisines).toContain('Italian');

      await act(async () => {
        await result.current.resetFilters();
      });

      expect(result.current.filters).toEqual({
        cuisines: [],
        dietaryRestrictions: [],
        maxCookTime: null,
        difficulty: [],
      });
      expect(result.current.activeFilters).toEqual([]);
    });

    it('should clear storage on reset', async () => {
      const { result } = renderHook(() => useRecipeFilters());

      await act(async () => {
        await result.current.resetFilters();
      });

      expect(mockFilterStorage.clearFilters).toHaveBeenCalled();
    });
  });

  // ── saveFilters ────────────────────────────────────────────────────

  describe('saveFilters', () => {
    it('should save current filters to storage', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const { result } = renderHook(() => useRecipeFilters());

      act(() => {
        result.current.handleFilterChange('cuisines', 'Mexican');
      });

      await act(async () => {
        await result.current.saveFilters();
      });

      expect(mockFilterStorage.saveFilters).toHaveBeenCalledWith(
        expect.objectContaining({ cuisines: ['Mexican'] })
      );
      consoleSpy.mockRestore();
    });
  });

  // ── updateActiveFilters ────────────────────────────────────────────

  describe('updateActiveFilters', () => {
    it('should update active filter labels from current filters', () => {
      mockGetActiveFilterLabels.mockReturnValue(['Italian', '≤30 min']);

      const { result } = renderHook(() => useRecipeFilters());

      act(() => {
        result.current.handleFilterChange('cuisines', 'Italian');
        result.current.handleFilterChange('maxCookTime', 30);
      });

      act(() => {
        result.current.updateActiveFilters();
      });

      expect(result.current.activeFilters).toEqual(['Italian', '≤30 min']);
    });
  });

  // ── setFilters ─────────────────────────────────────────────────────

  describe('setFilters', () => {
    it('should set filters directly', () => {
      const { result } = renderHook(() => useRecipeFilters());

      const newFilters = {
        cuisines: ['Thai', 'Japanese'],
        dietaryRestrictions: ['Gluten-Free'],
        maxCookTime: 45,
        difficulty: ['Medium'],
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
    });
  });
});
