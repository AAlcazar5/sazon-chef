// frontend/__tests__/hooks/useCookbookFilters.test.ts

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../components/cookbook/CookbookFilterModal', () => ({}));

import { renderHook, act } from '@testing-library/react-native';
import { useCookbookFilters } from '../../hooks/useCookbookFilters';
import type { SavedRecipe } from '../../types';

const makeRecipe = (overrides: Partial<SavedRecipe> = {}): SavedRecipe => ({
  id: `r-${Math.random().toString(36).slice(2, 7)}`,
  title: 'Test Recipe',
  cuisineType: 'Italian',
  description: 'A delicious test recipe',
  cookTime: 30,
  prepTime: 10,
  servings: 4,
  calories: 400,
  difficulty: 'Easy',
  notes: null,
  rating: null,
  matchScore: 75,
  cookCount: 0,
  mealPrepFriendly: false,
  budgetFriendly: false,
  onePot: false,
  macros: { protein: 25, carbs: 40, fat: 15, calories: 400 },
  savedAt: '2025-01-15T10:00:00Z',
  createdAt: '2025-01-10T10:00:00Z',
  ...overrides,
} as SavedRecipe);

describe('useCookbookFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── filterRecipes ──────────────────────────────────────────────────

  describe('filterRecipes', () => {
    it('should return all recipes with no filters', () => {
      const { result } = renderHook(() => useCookbookFilters());
      const recipes = [makeRecipe(), makeRecipe(), makeRecipe()];
      expect(result.current.filterRecipes(recipes)).toHaveLength(3);
    });

    it('should filter by cook time (prepTime + cookTime)', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({ ...result.current.filters, maxCookTime: 30 });
      });
      const recipes = [
        makeRecipe({ prepTime: 10, cookTime: 15 }), // 25 min - passes
        makeRecipe({ prepTime: 10, cookTime: 25 }), // 35 min - excluded
        makeRecipe({ prepTime: 5, cookTime: 20 }),   // 25 min - passes
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(2);
    });

    it('should filter by difficulty', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({ ...result.current.filters, difficulty: ['Easy'] });
      });
      const recipes = [
        makeRecipe({ difficulty: 'Easy' }),
        makeRecipe({ difficulty: 'Medium' }),
        makeRecipe({ difficulty: 'Hard' }),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(1);
    });

    it('should filter by multiple difficulties', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({ ...result.current.filters, difficulty: ['Easy', 'Medium'] });
      });
      const recipes = [
        makeRecipe({ difficulty: 'Easy' }),
        makeRecipe({ difficulty: 'Medium' }),
        makeRecipe({ difficulty: 'Hard' }),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(2);
    });

    it('should filter by meal prep friendly', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({ ...result.current.filters, mealPrepOnly: true });
      });
      const recipes = [
        makeRecipe({ mealPrepFriendly: true } as any),
        makeRecipe({ mealPrepFriendly: false } as any),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(1);
    });

    it('should filter by high protein (>= 30g)', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({ ...result.current.filters, highProtein: true });
      });
      const recipes = [
        makeRecipe({ macros: { protein: 35, carbs: 30, fat: 10, calories: 350 } } as any),
        makeRecipe({ macros: { protein: 20, carbs: 40, fat: 15, calories: 400 } } as any),
        makeRecipe({ macros: { protein: 30, carbs: 25, fat: 12, calories: 320 } } as any),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(2);
    });

    it('should filter by low calorie (< 500)', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({ ...result.current.filters, lowCal: true });
      });
      const recipes = [
        makeRecipe({ macros: { protein: 25, carbs: 30, fat: 10, calories: 300 } } as any),
        makeRecipe({ macros: { protein: 25, carbs: 30, fat: 10, calories: 500 } } as any),
        makeRecipe({ macros: { protein: 25, carbs: 30, fat: 10, calories: 600 } } as any),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(1);
    });

    it('should filter by budget friendly', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({ ...result.current.filters, budget: true });
      });
      const recipes = [
        makeRecipe({ budgetFriendly: true } as any),
        makeRecipe({ budgetFriendly: false } as any),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(1);
    });

    it('should filter by one pot', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({ ...result.current.filters, onePot: true });
      });
      const recipes = [
        makeRecipe({ onePot: true } as any),
        makeRecipe({ onePot: false } as any),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(1);
    });

    it('should filter by search query matching title', () => {
      const { result } = renderHook(() => useCookbookFilters());
      act(() => {
        result.current.setSearchQuery('chicken');
      });
      const recipes = [
        makeRecipe({ title: 'Chicken Parmesan' }),
        makeRecipe({ title: 'Beef Stew' }),
        makeRecipe({ title: 'Grilled Chicken Salad' }),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(2);
    });

    it('should filter by search query matching cuisine', () => {
      const { result } = renderHook(() => useCookbookFilters());
      act(() => {
        result.current.setSearchQuery('italian');
      });
      const recipes = [
        makeRecipe({ title: 'Pasta', cuisineType: 'Italian' }),
        makeRecipe({ title: 'Tacos', cuisineType: 'Mexican' }),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(1);
    });

    it('should filter by search query matching notes', () => {
      const { result } = renderHook(() => useCookbookFilters());
      act(() => {
        result.current.setSearchQuery('favorite');
      });
      const recipes = [
        makeRecipe({ notes: 'My favorite recipe!' } as any),
        makeRecipe({ notes: null } as any),
      ];
      expect(result.current.filterRecipes(recipes)).toHaveLength(1);
    });

    it('should combine multiple filters', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({
          ...result.current.filters,
          maxCookTime: 40,
          difficulty: ['Easy'],
          highProtein: true,
        });
      });
      const recipes = [
        makeRecipe({ prepTime: 5, cookTime: 20, difficulty: 'Easy', macros: { protein: 35, carbs: 20, fat: 10, calories: 300 } } as any),
        makeRecipe({ prepTime: 5, cookTime: 20, difficulty: 'Easy', macros: { protein: 15, carbs: 40, fat: 15, calories: 400 } } as any),
        makeRecipe({ prepTime: 10, cookTime: 35, difficulty: 'Easy', macros: { protein: 35, carbs: 20, fat: 10, calories: 300 } } as any),
        makeRecipe({ prepTime: 5, cookTime: 20, difficulty: 'Hard', macros: { protein: 35, carbs: 20, fat: 10, calories: 300 } } as any),
      ];
      // Only first recipe passes all 3 filters
      expect(result.current.filterRecipes(recipes)).toHaveLength(1);
    });
  });

  // ── sortRecipes ────────────────────────────────────────────────────

  describe('sortRecipes', () => {
    it('should sort by recent (default)', () => {
      const { result } = renderHook(() => useCookbookFilters());
      const recipes = [
        makeRecipe({ savedAt: '2025-01-10T00:00:00Z' } as any),
        makeRecipe({ savedAt: '2025-01-15T00:00:00Z' } as any),
        makeRecipe({ savedAt: '2025-01-12T00:00:00Z' } as any),
      ];
      const sorted = result.current.sortRecipes(recipes);
      expect(new Date(sorted[0].savedAt as any).getTime()).toBeGreaterThan(new Date(sorted[1].savedAt as any).getTime());
    });

    it('should sort alphabetically', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setSortBy('alphabetical');
      });
      const recipes = [
        makeRecipe({ title: 'Chicken' }),
        makeRecipe({ title: 'Apple Pie' }),
        makeRecipe({ title: 'Beef Stew' }),
      ];
      const sorted = result.current.sortRecipes(recipes);
      expect(sorted[0].title).toBe('Apple Pie');
      expect(sorted[1].title).toBe('Beef Stew');
      expect(sorted[2].title).toBe('Chicken');
    });

    it('should sort by cuisine', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setSortBy('cuisine');
      });
      const recipes = [
        makeRecipe({ cuisineType: 'Mexican' }),
        makeRecipe({ cuisineType: 'Italian' }),
        makeRecipe({ cuisineType: 'Asian' }),
      ];
      const sorted = result.current.sortRecipes(recipes);
      expect(sorted[0].cuisineType).toBe('Asian');
      expect(sorted[1].cuisineType).toBe('Italian');
      expect(sorted[2].cuisineType).toBe('Mexican');
    });

    it('should sort by match score descending', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setSortBy('matchScore');
      });
      const recipes = [
        makeRecipe({ matchScore: 60 } as any),
        makeRecipe({ matchScore: 90 } as any),
        makeRecipe({ matchScore: 75 } as any),
      ];
      const sorted = result.current.sortRecipes(recipes);
      expect((sorted[0] as any).matchScore).toBe(90);
      expect((sorted[1] as any).matchScore).toBe(75);
      expect((sorted[2] as any).matchScore).toBe(60);
    });

    it('should sort by cook time ascending', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setSortBy('cookTime');
      });
      const recipes = [
        makeRecipe({ prepTime: 10, cookTime: 30 }), // 40 total
        makeRecipe({ prepTime: 5, cookTime: 10 }),   // 15 total
        makeRecipe({ prepTime: 10, cookTime: 15 }),  // 25 total
      ];
      const sorted = result.current.sortRecipes(recipes);
      expect((sorted[0].prepTime || 0) + (sorted[0].cookTime || 0)).toBe(15);
      expect((sorted[2].prepTime || 0) + (sorted[2].cookTime || 0)).toBe(40);
    });

    it('should sort by rating descending', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setSortBy('rating');
      });
      const recipes = [
        makeRecipe({ rating: 3 } as any),
        makeRecipe({ rating: 5 } as any),
        makeRecipe({ rating: 4 } as any),
      ];
      const sorted = result.current.sortRecipes(recipes);
      expect((sorted[0] as any).rating).toBe(5);
      expect((sorted[2] as any).rating).toBe(3);
    });

    it('should sort by most cooked descending', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setSortBy('mostCooked');
      });
      const recipes = [
        makeRecipe({ cookCount: 2 } as any),
        makeRecipe({ cookCount: 10 } as any),
        makeRecipe({ cookCount: 5 } as any),
      ];
      const sorted = result.current.sortRecipes(recipes);
      expect((sorted[0] as any).cookCount).toBe(10);
      expect((sorted[2] as any).cookCount).toBe(2);
    });

    it('should handle null values gracefully in sort', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setSortBy('rating');
      });
      const recipes = [
        makeRecipe({ rating: null } as any),
        makeRecipe({ rating: 5 } as any),
        makeRecipe({ rating: undefined } as any),
      ];
      const sorted = result.current.sortRecipes(recipes);
      expect((sorted[0] as any).rating).toBe(5);
    });

    it('should not mutate original array', () => {
      const { result } = renderHook(() => useCookbookFilters());
      const recipes = [makeRecipe({ title: 'B' }), makeRecipe({ title: 'A' })];
      const original = [...recipes];
      result.current.sortRecipes(recipes);
      expect(recipes[0].title).toBe(original[0].title);
    });
  });

  // ── activeFilterCount ──────────────────────────────────────────────

  describe('activeFilterCount', () => {
    it('should be 0 with default filters', () => {
      const { result } = renderHook(() => useCookbookFilters());
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should count each boolean filter', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({
          ...result.current.filters,
          mealPrepOnly: true,
          highProtein: true,
          lowCal: true,
        });
      });
      expect(result.current.activeFilterCount).toBe(3);
    });

    it('should count each difficulty item individually', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({
          ...result.current.filters,
          difficulty: ['Easy', 'Medium'],
        });
      });
      expect(result.current.activeFilterCount).toBe(2);
    });

    it('should count maxCookTime as 1', async () => {
      const { result } = renderHook(() => useCookbookFilters());
      await act(async () => {
        result.current.setFilters({
          ...result.current.filters,
          maxCookTime: 30,
        });
      });
      expect(result.current.activeFilterCount).toBe(1);
    });
  });

  // ── getSortLabel ───────────────────────────────────────────────────

  describe('getSortLabel', () => {
    it('should return correct label for each sort option', async () => {
      const { result } = renderHook(() => useCookbookFilters());

      expect(result.current.getSortLabel()).toBe('Recently Added');

      await act(async () => { result.current.setSortBy('alphabetical'); });
      expect(result.current.getSortLabel()).toBe('Alphabetical');

      await act(async () => { result.current.setSortBy('matchScore'); });
      expect(result.current.getSortLabel()).toBe('Match Score');

      await act(async () => { result.current.setSortBy('cookTime'); });
      expect(result.current.getSortLabel()).toBe('Cook Time');

      await act(async () => { result.current.setSortBy('rating'); });
      expect(result.current.getSortLabel()).toBe('My Rating');

      await act(async () => { result.current.setSortBy('mostCooked'); });
      expect(result.current.getSortLabel()).toBe('Most Cooked');
    });
  });
});
