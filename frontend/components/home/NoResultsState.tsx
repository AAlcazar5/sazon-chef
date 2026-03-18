// frontend/components/home/NoResultsState.tsx
// Smart empty state for zero-result searches.
// Shows: fuzzy title matches, relax-filters suggestions, and a "Generate a recipe" CTA.

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import SazonMascot from '../mascot/SazonMascot';

interface NoResultsStateProps {
  searchQuery: string;
  /** Fuzzy title matches returned from the backend */
  suggestions: string[];
  /** Whether any filters are currently active */
  hasActiveFilters: boolean;
  onSelectSuggestion: (query: string) => void;
  onClearFilters: () => void;
  onClearSearch: () => void;
}

export default function NoResultsState({
  searchQuery,
  suggestions,
  hasActiveFilters,
  onSelectSuggestion,
  onClearFilters,
  onClearSearch,
}: NoResultsStateProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const primary = isDark ? DarkColors.primary : Colors.primary;

  const handleGenerateRecipe = () => {
    HapticPatterns.buttonPressPrimary();
    // Route to AI generation flow with the search query pre-filled
    router.push({ pathname: '/generate' as any, params: { prefill: searchQuery } });
  };

  return (
    <View className="flex-1 items-center px-6 pt-10 pb-6">
      <SazonMascot expression="thinking" size="medium" />

      <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-5 text-center">
        No recipes found for &ldquo;{searchQuery}&rdquo;
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 max-w-xs">
        We couldn't find an exact match — here are some ways to get unstuck.
      </Text>

      {/* Section 1: Similar recipe titles */}
      {suggestions.length > 0 && (
        <View className="w-full mt-6">
          <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Similar recipes
          </Text>
          {suggestions.slice(0, 4).map((title, idx) => (
            <HapticTouchableOpacity
              key={idx}
              onPress={() => onSelectSuggestion(title)}
              className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-800"
            >
              <Icon
                name={Icons.SEARCH as any}
                size={14}
                color={isDark ? '#6B7280' : '#9CA3AF'}
                style={{ marginRight: 10 }}
              />
              <Text className="flex-1 text-sm text-gray-800 dark:text-gray-200" numberOfLines={1}>
                {title}
              </Text>
              <Icon
                name={Icons.CHEVRON_FORWARD as any}
                size={14}
                color={isDark ? '#4B5563' : '#D1D5DB'}
              />
            </HapticTouchableOpacity>
          ))}
        </View>
      )}

      {/* Section 2: Relax filters */}
      {hasActiveFilters && (
        <View
          className="w-full mt-5 rounded-2xl p-4"
          style={{ backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }}
        >
          <View className="flex-row items-center mb-2">
            <Icon
              name={Icons.FILTER_OUTLINE as any}
              size={IconSizes.SM}
              color={primary}
              style={{ marginRight: 8 }}
            />
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Try relaxing your filters
            </Text>
          </View>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Your active filters may be narrowing results too much.
          </Text>
          <HapticTouchableOpacity
            onPress={onClearFilters}
            className="rounded-xl py-2.5 items-center"
            style={{ backgroundColor: primary }}
          >
            <Text className="text-white font-semibold text-sm">Clear all filters</Text>
          </HapticTouchableOpacity>
        </View>
      )}

      {/* Section 3: Generate a recipe CTA */}
      <View
        className="w-full mt-4 rounded-2xl p-4"
        style={{ backgroundColor: isDark ? '#1F2937' : '#FFF7ED' }}
      >
        <View className="flex-row items-center mb-2">
          <Icon
            name={Icons.STAR_OUTLINE as any}
            size={IconSizes.SM}
            color={primary}
            style={{ marginRight: 8 }}
          />
          <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Generate a recipe instead
          </Text>
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Let Sazon create a custom recipe for &ldquo;{searchQuery}&rdquo; in seconds.
        </Text>
        <HapticTouchableOpacity
          onPress={handleGenerateRecipe}
          className="rounded-xl py-2.5 items-center"
          style={{ backgroundColor: primary }}
        >
          <Text className="text-white font-semibold text-sm">
            Generate &ldquo;{searchQuery}&rdquo;
          </Text>
        </HapticTouchableOpacity>
      </View>

      {/* Clear search fallback */}
      <HapticTouchableOpacity onPress={onClearSearch} className="mt-5 py-2">
        <Text className="text-sm font-medium" style={{ color: isDark ? '#6B7280' : '#9CA3AF' }}>
          Clear search
        </Text>
      </HapticTouchableOpacity>
    </View>
  );
}
