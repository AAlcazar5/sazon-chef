import React from 'react';
// frontend/components/home/QuickFiltersBar.tsx
// Quick filters bar with mood, macro filters, and meal prep toggle

import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { HapticPatterns } from '../../constants/Haptics';
import { Colors, DarkColors } from '../../constants/Colors';
import type { Mood } from '../../lib/moodStorage';
import type { FilterState } from '../../lib/filterStorage';

export interface QuickMacroFilters {
  highProtein: boolean;
  lowCarb: boolean;
  lowCalorie: boolean;
}

interface QuickFiltersBarProps {
  /** Selected mood */
  selectedMood: Mood | null;
  /** Called when mood chip is pressed */
  onMoodPress: () => void;
  /** Called when mood clear button is pressed */
  onClearMood: () => void;
  /** Current filter state */
  filters: FilterState;
  /** Quick macro filter state */
  quickMacroFilters: QuickMacroFilters;
  /** Whether meal prep mode is enabled */
  mealPrepMode: boolean;
  /** Handle quick filter changes */
  handleQuickFilter: (type: keyof FilterState, value: string | number | null | string[]) => void;
  /** Handle quick macro filter changes */
  handleQuickMacroFilter: (filterKey: keyof QuickMacroFilters) => void;
  /** Handle meal prep mode toggle */
  handleToggleMealPrepMode: (enabled: boolean) => void;
  /** Called when advanced filter button is pressed */
  onAdvancedFilterPress: () => void;
}

/**
 * Quick filters bar component for the home screen
 * Includes mood selector, macro filters, and meal prep toggle
 */
function QuickFiltersBar({
  selectedMood,
  onMoodPress,
  onClearMood,
  filters,
  quickMacroFilters,
  mealPrepMode,
  handleQuickFilter,
  handleQuickMacroFilter,
  handleToggleMealPrepMode,
  onAdvancedFilterPress,
}: QuickFiltersBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <View className="px-4 pt-3 pb-2">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Filters & Preferences
          </Text>
          <HapticTouchableOpacity
            onPress={onAdvancedFilterPress}
            className="flex-row items-center px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700"
          >
            <Ionicons name="options" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1.5">
              Advanced
            </Text>
          </HapticTouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {/* Mood Selector */}
            <HapticTouchableOpacity
              onPress={onMoodPress}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                selectedMood ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={selectedMood ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">{selectedMood?.emoji || '😊'}</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                selectedMood ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {selectedMood?.label || 'Mood'}
              </Text>
              {selectedMood && (
                <HapticTouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    onClearMood();
                  }}
                  className="ml-2 w-4 h-4 rounded-full bg-white/30 items-center justify-center"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={12} color="white" />
                </HapticTouchableOpacity>
              )}
            </HapticTouchableOpacity>

            {/* Quick (<30min) */}
            <HapticTouchableOpacity
              onPress={() => {
                const isActive = filters.maxCookTime === 30;
                handleQuickFilter('maxCookTime', isActive ? null : 30);
                HapticPatterns.buttonPress();
              }}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                filters.maxCookTime === 30 ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={filters.maxCookTime === 30 ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">⚡</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                filters.maxCookTime === 30 ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Quick
              </Text>
            </HapticTouchableOpacity>

            {/* Easy */}
            <HapticTouchableOpacity
              onPress={() => {
                const isActive = filters.difficulty.includes('Easy');
                handleQuickFilter('difficulty',
                  isActive
                    ? filters.difficulty.filter(d => d !== 'Easy')
                    : [...filters.difficulty, 'Easy']
                );
                HapticPatterns.buttonPress();
              }}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                filters.difficulty.includes('Easy') ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={filters.difficulty.includes('Easy') ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">👍</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                filters.difficulty.includes('Easy') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Easy
              </Text>
            </HapticTouchableOpacity>

            {/* High Protein - Home Page 2.0 Macro Filter */}
            <HapticTouchableOpacity
              onPress={() => handleQuickMacroFilter('highProtein')}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                quickMacroFilters.highProtein ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={quickMacroFilters.highProtein ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">💪</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                quickMacroFilters.highProtein ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                High Protein
              </Text>
            </HapticTouchableOpacity>

            {/* Low Carb - Home Page 2.0 Macro Filter */}
            <HapticTouchableOpacity
              onPress={() => handleQuickMacroFilter('lowCarb')}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                quickMacroFilters.lowCarb ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={quickMacroFilters.lowCarb ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">🥩</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                quickMacroFilters.lowCarb ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Low Carb
              </Text>
            </HapticTouchableOpacity>

            {/* Low Calorie (<400) - Home Page 2.0 Macro Filter */}
            <HapticTouchableOpacity
              onPress={() => handleQuickMacroFilter('lowCalorie')}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                quickMacroFilters.lowCalorie ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={quickMacroFilters.lowCalorie ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">🥗</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                quickMacroFilters.lowCalorie ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Low Cal
              </Text>
            </HapticTouchableOpacity>

            {/* Meal Prep */}
            <HapticTouchableOpacity
              onPress={() => {
                handleToggleMealPrepMode(!mealPrepMode);
                HapticPatterns.buttonPress();
              }}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                mealPrepMode ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={mealPrepMode ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">🍱</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                mealPrepMode ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Meal Prep
              </Text>
            </HapticTouchableOpacity>

            {/* Budget Friendly */}
            <HapticTouchableOpacity
              onPress={() => {
                const isActive = filters.dietaryRestrictions.includes('Budget-Friendly');
                handleQuickFilter('dietaryRestrictions',
                  isActive
                    ? filters.dietaryRestrictions.filter(d => d !== 'Budget-Friendly')
                    : [...filters.dietaryRestrictions, 'Budget-Friendly']
                );
                HapticPatterns.buttonPress();
              }}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                filters.dietaryRestrictions.includes('Budget-Friendly') ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={filters.dietaryRestrictions.includes('Budget-Friendly') ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">💰</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                filters.dietaryRestrictions.includes('Budget-Friendly') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                Budget
              </Text>
            </HapticTouchableOpacity>

            {/* One Pot */}
            <HapticTouchableOpacity
              onPress={() => {
                const isActive = filters.dietaryRestrictions.includes('One-Pot');
                handleQuickFilter('dietaryRestrictions',
                  isActive
                    ? filters.dietaryRestrictions.filter(d => d !== 'One-Pot')
                    : [...filters.dietaryRestrictions, 'One-Pot']
                );
                HapticPatterns.buttonPress();
              }}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                filters.dietaryRestrictions.includes('One-Pot') ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={filters.dietaryRestrictions.includes('One-Pot') ? {
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              } : undefined}
            >
              <Text className="text-base">🍲</Text>
              <Text className={`text-sm font-semibold ml-1.5 ${
                filters.dietaryRestrictions.includes('One-Pot') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}>
                One Pot
              </Text>
            </HapticTouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default React.memo(QuickFiltersBar);
