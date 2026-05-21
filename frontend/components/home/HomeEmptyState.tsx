// frontend/components/home/HomeEmptyState.tsx
// ROADMAP 4.0 FX1.2 — body-only contextual empty state.
//
// The persistent home chrome (HomeHeader + FilterRow) lives in app/(tabs)/index.tsx
// and renders above this body in all states so the user can always reach a chip
// to deselect a filter that produced zero results.

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { LogoMascot } from '../mascot';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import GradientButton from '../ui/GradientButton';
import { HapticPatterns } from '../../constants/Haptics';

interface FilterState {
  cuisines: string[];
  dietaryRestrictions: string[];
  maxCookTime: number | null;
  difficulty: string[];
}

// ROADMAP 4.0 FX3.2 — yield rows from POST /api/recipes/filter-yields.
export interface FilterYieldRow {
  filterId: string;
  label: string;
  remainingIfRemoved: number;
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
  /** FX3.2 — top-N relax suggestions returned by the backend. When present
   *  and non-empty, the component renders tappable rows above the static
   *  "Clear All Filters" CTA. */
  yields?: FilterYieldRow[];
  /** FX3.2 — single-clear handler invoked when the user taps a yield row. */
  onClearFilter?: (filterId: string) => void;
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
  yields,
  onClearFilter,
}: HomeEmptyStateProps) {
  const hasActiveFilters = activeFilters.length > 0 || mealPrepMode;
  const hasCuisineFilters = filters.cuisines.length > 0;
  const hasDietaryFilters = filters.dietaryRestrictions.length > 0;
  const hasCookTimeFilter = filters.maxCookTime !== null && filters.maxCookTime !== undefined;
  const hasDifficultyFilter = filters.difficulty.length > 0;
  const hasSearchQuery = searchQuery && searchQuery.trim().length > 0;

  // Y-Voice-5 (founder 2026-05-21): Sazon-direct fallback titles —
  // drop the dry "No recipes found" boilerplate.
  let emptyStateTitle = "Nothing here yet";
  if (hasSearchQuery) {
    emptyStateTitle = `Couldn't find anything for "${searchQuery}"`;
  } else if (mealPrepMode) {
    emptyStateTitle = "No meal prep matches yet";
  } else if (hasActiveFilters) {
    emptyStateTitle = "Nothing fits those filters";
  } else {
    emptyStateTitle = "Kitchen's empty for now";
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

          {/* ROADMAP 4.0 FX3.2 — "Relax this filter" yield rows.
              Renders above the static suggestions when the backend has
              returned per-filter yields. Each row single-clears the named
              filter via `onClearFilter`. */}
          {yields && yields.length > 0 && onClearFilter && (
            <View className="mt-6 w-full max-w-sm" testID="filter-yield-rows">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
                Loosen your filters?
              </Text>
              {yields.slice(0, 2).map((row) => (
                <HapticTouchableOpacity
                  key={row.filterId}
                  testID={`filter-yield-row-${row.filterId}`}
                  onPress={() => {
                    onClearFilter(row.filterId);
                    HapticPatterns.buttonPressPrimary();
                  }}
                  className="flex-row items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-2"
                >
                  <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Remove {row.label}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    gains {row.remainingIfRemoved} recipe{row.remainingIfRemoved === 1 ? '' : 's'}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
          )}

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
              <GradientButton
                label="Clear All Filters"
                onPress={() => {
                  onClearFilters();
                  HapticPatterns.buttonPressPrimary();
                }}
              />
            )}

            {mealPrepMode && (
              <GradientButton
                label="Disable Meal Prep Mode"
                onPress={() => {
                  onDisableMealPrep();
                  HapticPatterns.buttonPressPrimary();
                }}
              />
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
              <GradientButton
                label="Refresh Recipes"
                onPress={() => {
                  onRefresh();
                  HapticPatterns.buttonPressPrimary();
                }}
                icon="refresh"
              />
            )}
          </View>
        </View>
    </ScrollView>
  );
}

export default HomeEmptyState;
