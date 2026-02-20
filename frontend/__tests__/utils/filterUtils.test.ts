// frontend/__tests__/utils/filterUtils.test.ts

import {
  buildFilterParams,
  getActiveFilterLabels,
  hasActiveFilters,
  countActiveFilters,
  getQuickFilterParams,
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
      expect(buildFilterParams(defaultFilters)).toEqual({});
    });

    it('should include cuisines when set', () => {
      const filters = { ...defaultFilters, cuisines: ['Italian', 'Thai'] };
      expect(buildFilterParams(filters).cuisines).toEqual(['Italian', 'Thai']);
    });

    it('should include dietaryRestrictions when set', () => {
      const filters = { ...defaultFilters, dietaryRestrictions: ['Vegan', 'Gluten-Free'] };
      expect(buildFilterParams(filters).dietaryRestrictions).toEqual(['Vegan', 'Gluten-Free']);
    });

    it('should include maxCookTime when not null', () => {
      const filters = { ...defaultFilters, maxCookTime: 30 };
      expect(buildFilterParams(filters).maxCookTime).toBe(30);
    });

    it('should not include maxCookTime when null', () => {
      expect(buildFilterParams(defaultFilters).maxCookTime).toBeUndefined();
    });

    it('should include difficulty when set', () => {
      const filters = { ...defaultFilters, difficulty: ['Easy'] };
      expect(buildFilterParams(filters).difficulty).toEqual(['Easy']);
    });

    it('should include mealPrepMode from options', () => {
      expect(buildFilterParams(defaultFilters, { mealPrepMode: true }).mealPrepMode).toBe(true);
    });

    it('should include timeAwareMode as useTimeAwareDefaults', () => {
      expect(buildFilterParams(defaultFilters, { timeAwareMode: true }).useTimeAwareDefaults).toBe(true);
    });

    it('should include mood from options', () => {
      expect(buildFilterParams(defaultFilters, { mood: 'adventurous' }).mood).toBe('adventurous');
    });

    it('should include macro filter params', () => {
      const params = buildFilterParams(defaultFilters, { minProtein: 30, maxCarbs: 50, maxCalories: 400 });
      expect(params.minProtein).toBe(30);
      expect(params.maxCarbs).toBe(50);
      expect(params.maxCalories).toBe(400);
    });

    it('should include shuffle and search from options', () => {
      const params = buildFilterParams(defaultFilters, { shuffle: true, searchQuery: 'chicken' });
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
      const labels = getActiveFilterLabels({ ...defaultFilters, cuisines: ['Italian', 'Mexican'] });
      expect(labels).toContain('Italian');
      expect(labels).toContain('Mexican');
    });

    it('should include dietary restriction labels', () => {
      expect(getActiveFilterLabels({ ...defaultFilters, dietaryRestrictions: ['Vegan'] })).toContain('Vegan');
    });

    it('should include cook time label with prefix', () => {
      expect(getActiveFilterLabels({ ...defaultFilters, maxCookTime: 30 })).toContain('≤30 min');
    });

    it('should include difficulty labels', () => {
      const labels = getActiveFilterLabels({ ...defaultFilters, difficulty: ['Easy', 'Medium'] });
      expect(labels).toContain('Easy');
      expect(labels).toContain('Medium');
    });

    it('should combine all filter types', () => {
      const labels = getActiveFilterLabels({
        cuisines: ['Thai'],
        dietaryRestrictions: ['Keto'],
        maxCookTime: 15,
        difficulty: ['Easy'],
      });
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

    it('should count each category once regardless of items', () => {
      expect(countActiveFilters({ ...defaultFilters, cuisines: ['Italian', 'Mexican', 'Thai'] })).toBe(1);
    });

    it('should count all active categories', () => {
      expect(countActiveFilters({
        cuisines: ['Italian'],
        dietaryRestrictions: ['Vegan'],
        maxCookTime: 30,
        difficulty: ['Easy'],
      })).toBe(4);
    });
  });

  // ── getQuickFilterParams ───────────────────────────────────────────

  describe('getQuickFilterParams', () => {
    it('should return empty object for no filters', () => {
      expect(getQuickFilterParams([])).toEqual({});
    });

    it('should map high-protein filter', () => {
      expect(getQuickFilterParams(['high-protein']).minProtein).toBe(30);
    });

    it('should map low-carb filter', () => {
      expect(getQuickFilterParams(['low-carb']).maxCarbs).toBe(30);
    });

    it('should map low-calorie filter', () => {
      expect(getQuickFilterParams(['low-calorie']).maxCalories).toBe(400);
    });

    it('should map quick filter', () => {
      expect(getQuickFilterParams(['quick']).maxCookTime).toBe(20);
    });

    it('should combine multiple filters', () => {
      const params = getQuickFilterParams(['high-protein', 'low-calorie']);
      expect(params.minProtein).toBe(30);
      expect(params.maxCalories).toBe(400);
    });

    it('should ignore unknown filter IDs', () => {
      expect(getQuickFilterParams(['unknown-filter'])).toEqual({});
    });
  });
});
