import React, { useEffect } from 'react';
// frontend/components/home/QuickFiltersBar.tsx
// Quick filters bar with mood, macro filters, and meal prep toggle

import { View, Text, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { HapticPatterns } from '../../constants/Haptics';
import { Colors, DarkColors } from '../../constants/Colors';
import type { Mood } from '../ui/MoodSelector';
import type { FilterState } from '../../lib/filterStorage';

// Spring-animated filter chip
function FilterChip({
  active,
  emoji,
  label,
  onPress,
  children,
  isDark,
}: {
  active: boolean;
  emoji?: string;
  label?: string;
  onPress: () => void;
  children?: React.ReactNode;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withSpring(1.07, { damping: 12, stiffness: 280 });
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 260 });
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <HapticTouchableOpacity
        onPress={onPress}
        className="px-4 py-2 rounded-full flex-row items-center"
        style={{ backgroundColor: active ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? '#374151' : '#F3F4F6') }}
      >
        {children ?? (
          <>
            {emoji ? <Text className="text-base">{emoji}</Text> : null}
            <Text
              className="text-sm font-semibold ml-1.5"
              style={{ color: active ? '#FFF' : (isDark ? '#D1D5DB' : '#374151') }}
            >
              {label}
            </Text>
          </>
        )}
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

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

        {/* Filter Chips — spring-animated on selection */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
        >
          {/* Mood */}
          <FilterChip active={!!selectedMood} onPress={onMoodPress} isDark={isDark}>
            <Text className="text-base">{selectedMood?.emoji || '😊'}</Text>
            <Text className="text-sm font-semibold ml-1.5" style={{ color: selectedMood ? '#FFF' : (isDark ? '#D1D5DB' : '#374151') }}>
              {selectedMood?.label || 'Mood'}
            </Text>
            {selectedMood && (
              <HapticTouchableOpacity
                onPress={(e) => { e.stopPropagation(); onClearMood(); }}
                className="ml-2 w-4 h-4 rounded-full bg-white/30 items-center justify-center"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={12} color="white" />
              </HapticTouchableOpacity>
            )}
          </FilterChip>

          {/* Quick <30min */}
          <FilterChip
            active={filters.maxCookTime === 30}
            emoji="⚡"
            label="Quick"
            isDark={isDark}
            onPress={() => { handleQuickFilter('maxCookTime', filters.maxCookTime === 30 ? null : 30); HapticPatterns.buttonPress(); }}
          />

          {/* Easy */}
          <FilterChip
            active={filters.difficulty.includes('Easy')}
            emoji="👍"
            label="Easy"
            isDark={isDark}
            onPress={() => {
              const isActive = filters.difficulty.includes('Easy');
              handleQuickFilter('difficulty', isActive ? filters.difficulty.filter(d => d !== 'Easy') : [...filters.difficulty, 'Easy']);
              HapticPatterns.buttonPress();
            }}
          />

          {/* High Protein */}
          <FilterChip active={quickMacroFilters.highProtein} emoji="💪" label="High Protein" isDark={isDark} onPress={() => handleQuickMacroFilter('highProtein')} />

          {/* Low Carb */}
          <FilterChip active={quickMacroFilters.lowCarb} emoji="🥩" label="Low Carb" isDark={isDark} onPress={() => handleQuickMacroFilter('lowCarb')} />

          {/* Low Cal */}
          <FilterChip active={quickMacroFilters.lowCalorie} emoji="🥗" label="Low Cal" isDark={isDark} onPress={() => handleQuickMacroFilter('lowCalorie')} />

          {/* Meal Prep */}
          <FilterChip
            active={mealPrepMode}
            emoji="🍱"
            label="Meal Prep"
            isDark={isDark}
            onPress={() => { handleToggleMealPrepMode(!mealPrepMode); HapticPatterns.buttonPress(); }}
          />

          {/* Budget */}
          <FilterChip
            active={filters.dietaryRestrictions.includes('Budget-Friendly')}
            emoji="💰"
            label="Budget"
            isDark={isDark}
            onPress={() => {
              const isActive = filters.dietaryRestrictions.includes('Budget-Friendly');
              handleQuickFilter('dietaryRestrictions', isActive ? filters.dietaryRestrictions.filter(d => d !== 'Budget-Friendly') : [...filters.dietaryRestrictions, 'Budget-Friendly']);
              HapticPatterns.buttonPress();
            }}
          />

          {/* One Pot */}
          <FilterChip
            active={filters.dietaryRestrictions.includes('One-Pot')}
            emoji="🍲"
            label="One Pot"
            isDark={isDark}
            onPress={() => {
              const isActive = filters.dietaryRestrictions.includes('One-Pot');
              handleQuickFilter('dietaryRestrictions', isActive ? filters.dietaryRestrictions.filter(d => d !== 'One-Pot') : [...filters.dietaryRestrictions, 'One-Pot']);
              HapticPatterns.buttonPress();
            }}
          />
        </ScrollView>
      </View>
    </View>
  );
}

export default React.memo(QuickFiltersBar);
