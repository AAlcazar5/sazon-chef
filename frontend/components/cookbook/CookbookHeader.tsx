import React from 'react';
// frontend/components/cookbook/CookbookHeader.tsx
// Compact header: title + search + icon actions in FrostedHeader, quick filter chips below

import { View, Text, ScrollView, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import FrostedHeader from '../ui/FrostedHeader';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { HapticPatterns } from '../../constants/Haptics';
import type { CookbookFilters } from './CookbookFilterModal';

interface CookbookHeaderProps {
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
  /** Called when import from URL button is pressed */
  onImportPress?: () => void;
  /** Current display mode */
  displayMode?: 'grid' | 'list';
  /** Called when display mode changes */
  onDisplayModeChange?: (mode: 'grid' | 'list') => void;
}

/**
 * Compact cookbook header: title row with action icons + search bar in FrostedHeader,
 * then quick filter chips directly below (no label — chips are self-explanatory).
 */
function CookbookHeader({
  filters,
  onFilterChange,
  onAdvancedFilterPress,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onImportPress,
  displayMode = 'list',
  onDisplayModeChange,
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

  // Count active filters for badge
  const activeFilterCount = [
    filters.maxCookTime !== null,
    filters.difficulty.length > 0,
    filters.mealPrepOnly,
    filters.highProtein,
    filters.lowCal,
    filters.budget,
    filters.onePot,
  ].filter(Boolean).length;

  return (
    <>
      {/* Compact FrostedHeader: title + icons */}
      <FrostedHeader paddingBottom={8} withTopInset={false}>
        <View className="flex-row items-center justify-between" style={{ height: 28 }}>
          <View className="flex-row items-center flex-1">
            <Text className="text-2xl mr-2" style={{ lineHeight: 28 }}>📚</Text>
            <Text
              className="text-2xl font-black text-gray-900 dark:text-gray-100"
              accessibilityRole="header"
              style={{ lineHeight: 28 }}
            >
              My Cookbook
            </Text>
          </View>

          {/* Grid / List toggle */}
          {onDisplayModeChange && (
            <View
              className="flex-row items-center rounded-lg p-0.5 ml-2"
              style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
            >
              {(['list', 'grid'] as const).map((mode) => (
                <HapticTouchableOpacity
                  key={mode}
                  onPress={() => onDisplayModeChange(mode)}
                  className="px-2.5 py-1.5 rounded-md"
                  style={displayMode === mode ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  } : undefined}
                >
                  <Icon
                    name={mode === 'list' ? Icons.SHOPPING_LIST : Icons.GRID_OUTLINE}
                    size={14}
                    color={displayMode === mode ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')}
                    accessibilityLabel={mode === 'list' ? 'List view' : 'Grid view'}
                  />
                </HapticTouchableOpacity>
              ))}
            </View>
          )}

          {/* Import from URL — icon only, no bg box */}
          {onImportPress && (
            <HapticTouchableOpacity
              onPress={() => { onImportPress(); HapticPatterns.buttonPress(); }}
              className="p-2"
              accessibilityLabel="Import recipe from URL"
            >
              <Icon
                name={Icons.LINK_OUTLINE}
                size={IconSizes.SM}
                color={isDark ? DarkColors.primary : Colors.primary}
              />
            </HapticTouchableOpacity>
          )}

          {/* Advanced filters — icon with badge */}
          <HapticTouchableOpacity
            onPress={() => { onAdvancedFilterPress(); HapticPatterns.buttonPress(); }}
            className="p-2"
            accessibilityLabel="Advanced filters"
          >
            <Icon
              name={Icons.RECIPE_FILTER}
              size={IconSizes.MD}
              color={isDark ? DarkColors.primary : Colors.primary}
            />
            {activeFilterCount > 0 && (
              <View style={{
                position: 'absolute', top: 2, right: 2,
                backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                width: 16, height: 16, borderRadius: 8,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{activeFilterCount}</Text>
              </View>
            )}
          </HapticTouchableOpacity>
        </View>

        {/* Search bar — inside FrostedHeader for compact feel */}
        <View
          className="flex-row items-center mt-2 px-3 py-2"
          style={{
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            borderRadius: 12,
          }}
        >
          <Icon
            name={Icons.SEARCH}
            size={IconSizes.SM}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            accessibilityLabel="Search"
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search recipes..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            className="flex-1 text-sm"
            style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <HapticTouchableOpacity
              onPress={() => { onSearchChange(''); HapticPatterns.buttonPress(); }}
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
      </FrostedHeader>

      {/* Quick Filter Chips — directly below header, no label (P7: chips are self-explanatory) */}
      <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF', paddingVertical: 8 }}>
        <ScrollView
          horizontal
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row' }}
        >
          <QuickFilterChip
            label="Quick"
            emoji={null}
            icon={Icons.COOK_TIME}
            isActive={filters.maxCookTime === 30}
            onPress={() => handleQuickFilterToggle('maxCookTime', 30)}
            isDark={isDark}
          />
          <QuickFilterChip
            label="Easy"
            emoji="✨"
            isActive={filters.difficulty.includes('Easy')}
            onPress={() => handleQuickFilterToggle('difficulty', 'Easy')}
            isDark={isDark}
          />
          <QuickFilterChip
            label="High Protein"
            emoji="💪"
            isActive={filters.highProtein}
            onPress={() => handleQuickFilterToggle('highProtein')}
            isDark={isDark}
          />
          <QuickFilterChip
            label="Low Cal"
            emoji="🥗"
            isActive={filters.lowCal}
            onPress={() => handleQuickFilterToggle('lowCal')}
            isDark={isDark}
          />
          <QuickFilterChip
            label="Meal Prep"
            emoji="🍱"
            isActive={filters.mealPrepOnly}
            onPress={() => handleQuickFilterToggle('mealPrepOnly')}
            isDark={isDark}
          />
          <QuickFilterChip
            label="Budget"
            emoji="💰"
            isActive={filters.budget}
            onPress={() => handleQuickFilterToggle('budget')}
            isDark={isDark}
          />
          <QuickFilterChip
            label="One Pot"
            emoji="🍲"
            isActive={filters.onePot}
            onPress={() => handleQuickFilterToggle('onePot')}
            isDark={isDark}
          />
        </ScrollView>
      </View>
    </>
  );
}

// Quick filter chip with spring scale animation (P3 + P6)
interface QuickFilterChipProps {
  label: string;
  emoji?: string | null;
  icon?: string;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
}

function QuickFilterChip({ label, emoji, icon, isActive, onPress, isDark }: QuickFilterChipProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 10, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  };

  return (
    <Animated.View style={animStyle}>
      <HapticTouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="px-4 py-2 rounded-full flex-row items-center"
        style={isActive ? {
          backgroundColor: isDark ? DarkColors.primary : Colors.primary,
          ...Shadows.SM,
        } : {
          backgroundColor: isDark ? '#374151' : '#F3F4F6',
        }}
      >
        {icon && !emoji && (
          <Icon
            name={icon as any}
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
    </Animated.View>
  );
}

export default React.memo(CookbookHeader);
