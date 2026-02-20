// frontend/components/cookbook/CookbookFilterModal.tsx
// Full-screen filter modal for cookbook with view mode, collection, sort, and dietary filters

import { View, Text, ScrollView, Modal, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useRef, useEffect } from 'react';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Icons } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration, Spring } from '../../constants/Animations';

export interface CookbookFilters {
  maxCookTime: number | null;
  difficulty: Array<'Easy' | 'Medium' | 'Hard'>;
  mealPrepOnly: boolean;
  highProtein: boolean;
  lowCal: boolean;
  budget: boolean;
  onePot: boolean;
}

// Collection type re-exported from global types
export type { Collection } from '../../types';

export type ViewMode = 'saved' | 'liked' | 'disliked';
export type SortOption = 'recent' | 'alphabetical' | 'cuisine' | 'matchScore' | 'cookTime' | 'rating' | 'mostCooked';

interface CookbookFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: CookbookFilters;
  onFilterChange: (filters: CookbookFilters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  collections: Collection[];
  selectedListId: string | null;
  onSelectList: (id: string | null) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
}

/**
 * Full-screen filter modal for cookbook
 * Includes view mode, collection, sort, cook time, difficulty, and dietary filters
 */
export default function CookbookFilterModal({
  visible,
  onClose,
  filters,
  onFilterChange,
  collections,
  selectedListId,
  onSelectList,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
}: CookbookFilterModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(-300);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: Spring.default.friction,
          tension: Spring.default.tension,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -300,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  const handleApply = () => {
    onFilterChange(filters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View
        className="flex-1 bg-black/50"
        style={{ opacity }}
      >
        <Animated.View
          className="flex-1 bg-gray-50 dark:bg-gray-900"
          style={{
            transform: [{ translateY }],
          }}
        >
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            {/* Modal Header */}
            <View
              className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between"
              style={{ minHeight: 60, paddingTop: insets.top }}
            >
              <HapticTouchableOpacity
                onPress={onClose}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text className="font-medium" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
                  Cancel
                </Text>
              </HapticTouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Filter Recipes
              </Text>
              <HapticTouchableOpacity
                onPress={handleApply}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text className="font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                  Apply
                </Text>
              </HapticTouchableOpacity>
            </View>

            <ScrollView
              scrollEventThrottle={16}
              className="flex-1 px-4 py-4"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* View Mode */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">View Mode</Text>
                <View className="flex-row flex-wrap">
                  {[
                    { value: 'saved' as const, label: 'Saved', icon: Icons.BOOKMARK },
                    { value: 'liked' as const, label: 'Liked', icon: Icons.LIKE },
                    { value: 'disliked' as const, label: 'Disliked', icon: Icons.DISLIKE },
                  ].map((option) => (
                    <HapticTouchableOpacity
                      key={option.value}
                      onPress={() => onViewModeChange(option.value)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        viewMode === option.value
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={viewMode === option.value ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        viewMode === option.value ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {option.label}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Collections */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Collection</Text>
                <View className="flex-row flex-wrap">
                  <HapticTouchableOpacity
                    onPress={() => onSelectList(null)}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                      selectedListId === null
                        ? ''
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }`}
                    style={selectedListId === null ? {
                      backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                      borderColor: isDark ? DarkColors.primary : Colors.primary
                    } : undefined}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedListId === null ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                    }`}>
                      All
                    </Text>
                  </HapticTouchableOpacity>
                  {collections.map((collection) => (
                    <HapticTouchableOpacity
                      key={collection.id}
                      onPress={() => onSelectList(collection.id)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        selectedListId === collection.id
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={selectedListId === collection.id ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        selectedListId === collection.id ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {collection.name}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Sort</Text>
                <View className="flex-row flex-wrap">
                  {[
                    { value: 'recent' as const, label: 'Recently Added' },
                    { value: 'alphabetical' as const, label: 'Alphabetical' },
                    { value: 'cuisine' as const, label: 'By Cuisine' },
                    { value: 'matchScore' as const, label: 'Match Score' },
                    { value: 'cookTime' as const, label: 'Cook Time' },
                  ].map((option) => (
                    <HapticTouchableOpacity
                      key={option.value}
                      onPress={() => onSortChange(option.value)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        sortBy === option.value
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={sortBy === option.value ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        sortBy === option.value ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {option.label}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cook Time Filter */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Max Cook Time</Text>
                <View className="flex-row flex-wrap">
                  {[15, 30, 45, 60, 90].map((time) => (
                    <HapticTouchableOpacity
                      key={time}
                      onPress={() => onFilterChange({ ...filters, maxCookTime: filters.maxCookTime === time ? null : time })}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        filters.maxCookTime === time
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={filters.maxCookTime === time ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        filters.maxCookTime === time ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        ≤{time} min
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Difficulty Filter */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Difficulty</Text>
                <View className="flex-row flex-wrap">
                  {(['Easy', 'Medium', 'Hard'] as const).map((difficulty) => (
                    <HapticTouchableOpacity
                      key={difficulty}
                      onPress={() => {
                        const has = filters.difficulty.includes(difficulty);
                        onFilterChange({
                          ...filters,
                          difficulty: has
                            ? filters.difficulty.filter(d => d !== difficulty)
                            : [...filters.difficulty, difficulty]
                        });
                      }}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        filters.difficulty.includes(difficulty)
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={filters.difficulty.includes(difficulty) ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        filters.difficulty.includes(difficulty) ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {difficulty}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dietary Filters */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Dietary</Text>
                <View className="flex-row flex-wrap">
                  {[
                    { key: 'mealPrepOnly', label: 'Meal Prep', emoji: '🍱' },
                    { key: 'highProtein', label: 'High Protein', emoji: '💪' },
                    { key: 'lowCal', label: 'Low Calorie', emoji: '🥗' },
                    { key: 'budget', label: 'Budget Friendly', emoji: '💰' },
                    { key: 'onePot', label: 'One Pot', emoji: '🍲' },
                  ].map(({ key, label, emoji }) => (
                    <HapticTouchableOpacity
                      key={key}
                      onPress={() => onFilterChange({ ...filters, [key]: !filters[key as keyof CookbookFilters] as boolean })}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        filters[key as keyof CookbookFilters]
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={filters[key as keyof CookbookFilters] ? {
                        backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                        borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        filters[key as keyof CookbookFilters] ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {emoji} {label}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
