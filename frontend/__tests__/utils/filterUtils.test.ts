// frontend/__tests__/utils/filterUtils.test.ts

import {
  buildFilterParams,
  getActiveFilterLabels,
  hasActiveFilters,
  countActiveFilters,
  getQuickFilterParams,
  QUICK_FILTER_DEFINITIONS,
} from '../../utils/filterUtils';
import type { FilterState } from '../../lib/filterStorage';

const defaultFilters: FilterState = {
  cuisines: [],
  dietaryRestrictions: [],
  maxCookTime: null,
  difficulty: [],
};

describe('filterUtils', () => {
  // ── buildFilterParams ──────────────────────────────────────────────

  describe('buildFilterParams', () => {
    it('should return empty object for default filters', () => {
      const params = buildFilterParams(defaultFilters);
      expect(params).toEqual({});
    });

    it('should include cuisines when set', () => {
      const filters = { ...defaultFilters, cuisines: ['Italian', 'Thai'] };
      const params = buildFilterParams(filters);
      expect(params.cuisines).toEqual(['Italian', 'Thai']);
    });

    it('should include dietaryRestrictions when set', () => {
      const filters = { ...defaultFilters, dietaryRestrictions: ['Vegan', 'Gluten-Free'] };
      const params = buildFilterParams(filters);
      expect(params.dietaryRestrictions).toEqual(['Vegan', 'Gluten-Free']);
    });

    it('should include maxCookTime when not null', () => {
      const filters = { ...defaultFilters, maxCookTime: 30 };
      const params = buildFilterParams(filters);
      expect(params.maxCookTime).toBe(30);
    });

    it('should not include maxCookTime when null', () => {
      const params = buildFilterParams(defaultFilters);
      expect(params.maxCookTime).toBeUndefined();
    });

    it('should include difficulty when set', () => {
      const filters = { ...defaultFilters, difficulty: ['Easy'] };
      const params = buildFilterParams(filters);
      expect(params.difficulty).toEqual(['Easy']);
    });

    it('should include mealPrepMode from options', () => {
      const params = buildFilterParams(defaultFilters, { mealPrepMode: true });
      expect(params.mealPrepMode).toBe(true);
    });

    it('should include timeAwareMode as useTimeAwareDefaults', () => {
      const params = buildFilterParams(defaultFilters, { timeAwareMode: true });
      expect(params.useTimeAwareDefaults).toBe(true);
    });

    it('should include mood from options', () => {
      const params = buildFilterParams(defaultFilters, { mood: 'adventurous' });
      expect(params.mood).toBe('adventurous');
    });

    it('should include macro filter params', () => {
      const params = buildFilterParams(defaultFilters, {
        minProtein: 30,
        maxCarbs: 50,
        maxCalories: 400,
      });
      expect(params.minProtein).toBe(30);
      expect(params.maxCarbs).toBe(50);
      expect(params.maxCalories).toBe(400);
    });

    it('should include shuffle and search from options', () => {
      const params = buildFilterParams(defaultFilters, {
        shuffle: true,
        searchQuery: 'chicken',
      });
      expect(params.shuffle).toBe(true);
      expect(params.search).toBe('chicken');
    });

    it('should combine filters and options', () => {
      const filters = { ...defaultFilters, cuisines: ['Mexican'], maxCookTime: 20 };
      const params = buildFilterParams(filters, { mealPrepMode: true, minProtein: 25 });
      expect(params.cuisines).toEqual(['Mexican']);
      expect(params.maxCookTime).toBe(20);
      expect(params.mealPrepMode).toBe(true);
      expect(params.minProtein).toBe(25);
    });
  });

  // ── getActiveFilterLabels ──────────────────────────────────────────

  describe('getActiveFilterLabels', () => {
    it('should return empty array for default filters', () => {
      expect(getActiveFilterLabels(defaultFilters)).toEqual([]);
    });

    it('should include cuisine labels', () => {
      const filters = { ...defaultFilters, cuisines: ['Italian', 'Mexican'] };
      const labels = getActiveFilterLabels(filters);
      expect(labels).toContain('Italian');
      expect(labels).toContain('Mexican');
    });

    it('should include dietary restriction labels', () => {
      const filters = { ...defaultFilters, dietaryRestrictions: ['Vegan'] };
      expect(getActiveFilterLabels(filters)).toContain('Vegan');
    });

    it('should include cook time label with ≤ prefix', () => {
      const filters = { ...defaultFilters, maxCookTime: 30 };
      expect(getActiveFilterLabels(filters)).toContain('≤30 min');
    });

    it('should include difficulty labels', () => {
      const filters = { ...defaultFilters, difficulty: ['Easy', 'Medium'] };
      const labels = getActiveFilterLabels(filters);
      expect(labels).toContain('Easy');
      expect(labels).toContain('Medium');
    });

    it('should combine all filter types', () => {
      const filters: FilterState = {
        cuisines: ['Thai'],
        dietaryRestrictions: ['Keto'],
        maxCookTime: 15,
        difficulty: ['Easy'],
      };
      const labels = getActiveFilterLabels(filters);
      expect(labels).toHaveLength(4);
    });
  });

  // ── hasActiveFilters ───────────────────────────────────────────────

  describe('hasActiveFilters', () => {
    it('should return false for default filters', () => {
      expect(hasActiveFilters(defaultFilters)).toBe(false);
    });

    it('should return true when cuisines are set', () => {
      expect(hasActiveFilters({ ...defaultFilters, cuisines: ['Italian'] })).toBe(true);
    });

    it('should return true when dietaryRestrictions are set', () => {
      expect(hasActiveFilters({ ...defaultFilters, dietaryRestrictions: ['Vegan'] })).toBe(true);
    });

    it('should return true when maxCookTime is set', () => {
      expect(hasActiveFilters({ ...defaultFilters, maxCookTime: 30 })).toBe(true);
    });

    it('should return true when difficulty is set', () => {
      expect(hasActiveFilters({ ...defaultFilters, difficulty: ['Easy'] })).toBe(true);
    });
  });

  // ── countActiveFilters ─────────────────────────────────────────────

  describe('countActiveFilters', () => {
    it('should return 0 for default filters', () => {
      expect(countActiveFilters(defaultFilters)).toBe(0);
    });

    it('should count each category once', () => {
      const filters: FilterState = {
        cuisines: ['Italian', 'Mexican', 'Thai'],
        dietaryRestrictions: [],
        maxCookTime: null,
        difficulty: [],
      };
      expect(countActiveFilters(filters)).toBe(1);
    });

    it('should count all categories', () => {
      const filters: FilterState = {
        cuisines: ['Italian'],
        dietaryRestrictions: ['Vegan'],
        maxCookTime: 30,
        difficulty: ['Easy'],
      };
      expect(countActiveFilters(filters)).toBe(4);
    });
  });

  // ── getQuickFilterParams ───────────────────────────────────────────

  describe('getQuickFilterParams', () => {
    it('should return empty object for no filters', () => {
      expect(getQuickFilterParams([])).toEqual({});
    });

    it('should map high-protein filter', () => {
      const params = getQuickFilterParams(['high-protein']);
      expect(params.minProtein).toBe(30);
    });

    it('should map low-carb filter', () => {
      const params = getQuickFilterParams(['low-carb']);
      expect(params.maxCarbs).toBe(30);
    });

    it('should map low-calorie filter', () => {
      const params = getQuickFilterParams(['low-calorie']);
      expect(params.maxCalories).toBe(400);
    });

    it('should map quick filter', () => {
      const params = getQuickFilterParams(['quick']);
      expect(params.maxCookTime).toBe(20);
    });

    it('should combine multiple filters', () => {
      const params = getQuickFilterParams(['high-protein', 'low-calorie']);
      expect(params.minProtein).toBe(30);
      expect(params.maxCalories).toBe(400);
    });

    it('should ignore unknown filter IDs', () => {
      const params = getQuickFilterParams(['unknown-filter']);
      expect(params).toEqual({});
    });
  });
});
