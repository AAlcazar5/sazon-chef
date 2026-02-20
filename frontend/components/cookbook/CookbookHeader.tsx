import React from 'react';
// frontend/components/cookbook/CookbookHeader.tsx
// Header component with title, display mode toggle, quick filters, and search

import { View, Text, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import type { CookbookFilters } from './CookbookFilterModal';

interface CookbookHeaderProps {
  /** Current display mode (grid or list) */
  displayMode: 'grid' | 'list';
  /** Called when display mode changes */
  onDisplayModeChange: (mode: 'grid' | 'list') => void;
  /** Current cookbook filters */
  filters: CookbookFilters;
  /** Called when filters change */
  onFilterChange: (filters: CookbookFilters) => void;
  /** Called when advanced filter button is pressed */
  onAdvancedFilterPress: () => void;
  /** Current search query */
  searchQuery: string;
  /** Called when search query changes */
  onSearchChange: (query: string) => void;
  /** Called when search input is focused */
  onSearchFocus?: () => void;
  /** Called when search input is blurred */
  onSearchBlur?: () => void;
}

/**
 * Cookbook header with title, display mode toggle, quick filters, and search bar
 */
function CookbookHeader({
  displayMode,
  onDisplayModeChange,
  filters,
  onFilterChange,
  onAdvancedFilterPress,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
}: CookbookHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleQuickFilterToggle = (key: keyof CookbookFilters, value?: any) => {
    if (key === 'maxCookTime') {
      const isActive = filters.maxCookTime === value;
      onFilterChange({ ...filters, maxCookTime: isActive ? null : value });
    } else if (key === 'difficulty') {
      const isActive = filters.difficulty.includes(value);
      onFilterChange({
        ...filters,
        difficulty: isActive
          ? filters.difficulty.filter(d => d !== value)
          : [...filters.difficulty, value],
      });
    } else {
      onFilterChange({ ...filters, [key]: !filters[key] });
    }
    HapticPatterns.buttonPress();
  };

  return (
    <>
      {/* Title and Display Toggle */}
      <View
        className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700"
        style={{ minHeight: 56 }}
      >
        <View className="flex-row items-center justify-between" style={{ height: 28 }}>
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-2" style={{ lineHeight: 28 }}>📚</Text>
            <Text
              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
              accessibilityRole="header"
              style={{ lineHeight: 28 }}
            >
              My Cookbook
            </Text>
          </View>
          {/* View Mode Toggle */}
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <HapticTouchableOpacity
              onPress={() => onDisplayModeChange('list')}
              className="px-3 py-1.5 rounded"
              style={displayMode === 'list' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
            >
              <Ionicons
                name="list"
                size={18}
                color={displayMode === 'list' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')}
              />
            </HapticTouchableOpacity>
            <HapticTouchableOpacity
              onPress={() => onDisplayModeChange('grid')}
              className="px-3 py-1.5 rounded"
              style={displayMode === 'grid' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
            >
              <Ionicons
                name="grid"
                size={18}
                color={displayMode === 'grid' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')}
              />
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filters & Preferences */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Header with Filter Button */}
        <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Filters & Preferences
          </Text>
          <HapticTouchableOpacity
            onPress={() => {
              onAdvancedFilterPress();
              HapticPatterns.buttonPress();
            }}
            className="px-3 py-1.5 rounded-lg flex-row items-center"
            style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryDark }}
          >
            <Icon
              name={Icons.RECIPE_FILTER}
              size={IconSizes.SM}
              color={isDark ? DarkColors.primary : '#FFFFFF'}
              accessibilityLabel="Advanced filters"
            />
            <Text
              className="text-sm font-semibold ml-1.5"
              style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}
            >
              Advanced
            </Text>
          </HapticTouchableOpacity>
        </View>

        {/* Quick Filter Chips */}
        <View className="px-4 pb-3">
          <ScrollView
            horizontal
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              {/* Quick (<30min) */}
              <QuickFilterChip
                label="Quick"
                emoji={null}
                icon={Icons.COOK_TIME}
                isActive={filters.maxCookTime === 30}
                onPress={() => handleQuickFilterToggle('maxCookTime', 30)}
                isDark={isDark}
              />

              {/* Easy Difficulty */}
              <QuickFilterChip
                label="Easy"
                emoji="✨"
                isActive={filters.difficulty.includes('Easy')}
                onPress={() => handleQuickFilterToggle('difficulty', 'Easy')}
                isDark={isDark}
              />

              {/* High Protein */}
              <QuickFilterChip
                label="High Protein"
                emoji="💪"
                isActive={filters.highProtein}
                onPress={() => handleQuickFilterToggle('highProtein')}
                isDark={isDark}
              />

              {/* Low Cal */}
              <QuickFilterChip
                label="Low Cal"
                emoji="🥗"
                isActive={filters.lowCal}
                onPress={() => handleQuickFilterToggle('lowCal')}
                isDark={isDark}
              />

              {/* Meal Prep */}
              <QuickFilterChip
                label="Meal Prep"
                emoji="🍱"
                isActive={filters.mealPrepOnly}
                onPress={() => handleQuickFilterToggle('mealPrepOnly')}
                isDark={isDark}
              />

              {/* Budget Friendly */}
              <QuickFilterChip
                label="Budget"
                emoji="💰"
                isActive={filters.budget}
                onPress={() => handleQuickFilterToggle('budget')}
                isDark={isDark}
              />

              {/* One Pot */}
              <QuickFilterChip
                label="One Pot"
                emoji="🍲"
                isActive={filters.onePot}
                onPress={() => handleQuickFilterToggle('onePot')}
                isDark={isDark}
              />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Search Bar */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2.5">
          <Icon
            name={Icons.SEARCH}
            size={IconSizes.MD}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            accessibilityLabel="Search"
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search recipes, ingredients, tags..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            className="flex-1 text-gray-900 dark:text-gray-100 text-base"
            style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <HapticTouchableOpacity
              onPress={() => {
                onSearchChange('');
                HapticPatterns.buttonPress();
              }}
              className="ml-2"
            >
              <Icon
                name={Icons.CLOSE_CIRCLE}
                size={IconSizes.SM}
                color={isDark ? '#9CA3AF' : '#6B7280'}
                accessibilityLabel="Clear search"
              />
            </HapticTouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2 ml-1">
            Results for "{searchQuery}"
          </Text>
        )}
      </View>
    </>
  );
}

// Quick filter chip sub-component
interface QuickFilterChipProps {
  label: string;
  emoji?: string | null;
  icon?: string;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
}

function QuickFilterChip({ label, emoji, icon, isActive, onPress, isDark }: QuickFilterChipProps) {
  return (
    <HapticTouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full flex-row items-center ${
        isActive ? '' : 'bg-gray-100 dark:bg-gray-700'
      }`}
      style={isActive ? {
        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
      } : undefined}
    >
      {icon && !emoji && (
        <Icon
          name={icon}
          size={14}
          color={isActive ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')}
          accessibilityLabel={label}
        />
      )}
      {emoji && <Text className="text-base">{emoji}</Text>}
      <Text
        className={`text-sm font-semibold ${icon || emoji ? 'ml-1.5' : ''} ${
          isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {label}
      </Text>
    </HapticTouchableOpacity>
  );
}

export default React.memo(CookbookHeader);
