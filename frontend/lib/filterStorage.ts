// frontend/lib/filterStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FilterState {
  cuisines: string[];
  dietaryRestrictions: string[];
  maxCookTime: number | null;
  difficulty: string[];
}

const FILTER_STORAGE_KEY = 'sazon_filter_preferences';

export const filterStorage = {
  // Save filter preferences to AsyncStorage
  async saveFilters(filters: FilterState): Promise<void> {
    try {
      const filterData = JSON.stringify(filters);
      await AsyncStorage.setItem(FILTER_STORAGE_KEY, filterData);
      console.log('💾 Filters saved to storage:', filters);
    } catch (error) {
      console.error('❌ Error saving filters:', error);
      throw error;
    }
  },

  // Load filter preferences from AsyncStorage
  async loadFilters(): Promise<FilterState | null> {
    try {
      const filterData = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
      if (filterData) {
        const filters = JSON.parse(filterData) as FilterState;
        console.log('📂 Filters loaded from storage:', filters);
        return filters;
      }
      return null;
    } catch (error) {
      console.error('❌ Error loading filters:', error);
      return null;
    }
  },

  // Clear saved filter preferences
  async clearFilters(): Promise<void> {
    try {
      await AsyncStorage.removeItem(FILTER_STORAGE_KEY);
      console.log('🗑️ Filters cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing filters:', error);
      throw error;
    }
  },

  // Get default filter state
  getDefaultFilters(): FilterState {
    return {
      cuisines: [],
      dietaryRestrictions: [],
      maxCookTime: null,
      difficulty: []
    };
  }
};
