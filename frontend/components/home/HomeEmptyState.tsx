// frontend/components/home/HomeEmptyState.tsx
// Contextual empty state with suggestions for home screen

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedLogoMascot } from '../mascot';
import { LogoMascot } from '../mascot';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { HapticPatterns } from '../../constants/Haptics';

interface FilterState {
  cuisines: string[];
  dietaryRestrictions: string[];
  maxCookTime: number | null;
  difficulty: string[];
}

interface HomeEmptyStateProps {
  filters: FilterState;
  activeFilters: string[];
  mealPrepMode: boolean;
  searchQuery: string;
  onClearFilters: () => void;
  onDisableMealPrep: () => void;
  onClearSearch: () => void;
  onRefresh: () => void;
}

function HomeEmptyState({
  filters,
  activeFilters,
  mealPrepMode,
  searchQuery,
  onClearFilters,
  onDisableMealPrep,
  onClearSearch,
  onRefresh,
}: HomeEmptyStateProps) {
  const hasActiveFilters = activeFilters.length > 0 || mealPrepMode;
  const hasCuisineFilters = filters.cuisines.length > 0;
  const hasDietaryFilters = filters.dietaryRestrictions.length > 0;
  const hasCookTimeFilter = filters.maxCookTime !== null && filters.maxCookTime !== undefined;
  const hasDifficultyFilter = filters.difficulty.length > 0;
  const hasSearchQuery = searchQuery && searchQuery.trim().length > 0;

  // Generate contextual title
  let emptyStateTitle = "No recipes found";
  if (hasSearchQuery) {
    emptyStateTitle = `No recipes found for "${searchQuery}"`;
  } else if (mealPrepMode) {
    emptyStateTitle = "No meal prep recipes found";
  } else if (hasActiveFilters) {
    emptyStateTitle = "No recipes match your filters";
  } else {
    emptyStateTitle = "No recipes available";
  }

  // Generate contextual description with suggestions
  let emptyStateDescription = "";
  const suggestions: string[] = [];

  if (hasSearchQuery) {
    emptyStateDescription = `We couldn't find any recipes matching "${searchQuery}".`;
    suggestions.push("Try a different search term");
    suggestions.push("Check your spelling");
    if (hasActiveFilters) {
      suggestions.push("Remove some filters to broaden your search");
    }
  } else if (mealPrepMode) {
    emptyStateDescription = "We couldn't find any recipes suitable for meal prep right now.";
    suggestions.push("Disable meal prep mode to see all recipes");
    suggestions.push("Try removing other filters");
    suggestions.push("Check back later as we add more meal prep-friendly recipes");
  } else if (hasActiveFilters) {
    emptyStateDescription = "Your current filters are too restrictive.";

    if (hasCuisineFilters && filters.cuisines.length === 1) {
      suggestions.push(`Try a different cuisine (currently: ${filters.cuisines[0]})`);
    } else if (hasCuisineFilters) {
      suggestions.push(`Try removing some cuisines (${filters.cuisines.length} selected)`);
    }

    if (hasDietaryFilters && filters.dietaryRestrictions.length > 2) {
      suggestions.push(`Try removing some dietary restrictions (${filters.dietaryRestrictions.length} selected)`);
    }

    if (hasCookTimeFilter && filters.maxCookTime && filters.maxCookTime < 30) {
      suggestions.push(`Try increasing cook time limit (currently: ${filters.maxCookTime} min)`);
    }

    if (hasDifficultyFilter && filters.difficulty.length === 1) {
      suggestions.push(`Try including other difficulty levels`);
    }

    if (suggestions.length === 0) {
      suggestions.push("Clear all filters to see more recipes");
      suggestions.push("Try adjusting your preferences");
    }
  } else {
    emptyStateDescription = "We couldn't find any recipes to suggest at the moment.";
    suggestions.push("Pull down to refresh");
    suggestions.push("Check your internet connection");
    suggestions.push("Try again in a moment");
  }

  const emptyStateExpression = mealPrepMode ? 'thinking' : (hasActiveFilters ? 'thinking' : 'curious');

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center">
          <AnimatedLogoMascot
            expression={emptyStateExpression}
            size="xsmall"
            animationType="idle"
          />
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ marginLeft: -2 }} accessibilityRole="header">Sazon Chef</Text>
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center p-8">
          <LogoMascot
            expression={emptyStateExpression}
            size="large"
          />
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 text-center">
            {emptyStateTitle}
          </Text>
          <Text className="text-gray-600 dark:text-gray-300 text-center mt-3 text-base leading-6 max-w-sm">
            {emptyStateDescription}
          </Text>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View className="mt-6 w-full max-w-sm">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
                💡 Suggestions:
              </Text>
              <View className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <View key={index} className="flex-row items-start bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                    <Text className="text-gray-500 dark:text-gray-400 mr-2">•</Text>
                    <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {suggestion}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="mt-8 w-full max-w-sm space-y-3">
            {hasActiveFilters && (
              <HapticTouchableOpacity
                onPress={() => {
                  onClearFilters();
                  HapticPatterns.buttonPressPrimary();
                }}
                className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">Clear All Filters</Text>
              </HapticTouchableOpacity>
            )}

            {mealPrepMode && (
              <HapticTouchableOpacity
                onPress={() => {
                  onDisableMealPrep();
                  HapticPatterns.buttonPressPrimary();
                }}
                className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">Disable Meal Prep Mode</Text>
              </HapticTouchableOpacity>
            )}

            {hasSearchQuery && (
              <HapticTouchableOpacity
                onPress={() => {
                  onClearSearch();
                  HapticPatterns.buttonPressPrimary();
                }}
                className="bg-gray-200 dark:bg-gray-700 px-6 py-3 rounded-lg"
              >
                <Text className="text-gray-900 dark:text-gray-100 font-semibold text-center">Clear Search</Text>
              </HapticTouchableOpacity>
            )}

            {!hasActiveFilters && !hasSearchQuery && (
              <HapticTouchableOpacity
                onPress={() => {
                  onRefresh();
                  HapticPatterns.buttonPressPrimary();
                }}
                className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">Refresh Recipes</Text>
              </HapticTouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default HomeEmptyState;
