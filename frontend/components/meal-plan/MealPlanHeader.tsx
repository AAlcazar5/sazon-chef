// frontend/components/meal-plan/MealPlanHeader.tsx
// Header bar for the meal plan screen

import React from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import FrostedHeader from '../ui/FrostedHeader';
import { Colors, DarkColors } from '../../constants/Colors';

interface MealPlanHeaderProps {
  /** Formatted date range string */
  dateRange: string;
  /** Whether the selected date is today */
  isSelectedDateToday: boolean;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Jump to today callback */
  onJumpToToday: () => void;
}

export default function MealPlanHeader({
  dateRange,
  isSelectedDateToday,
  isDark,
  onJumpToToday,
}: MealPlanHeaderProps) {
  return (
    <FrostedHeader paddingBottom={12} withTopInset={false}>
      <View className="flex-row items-center justify-between" style={{ height: 28 }}>
        <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-2" style={{ lineHeight: 28 }}>🍽️</Text>
          <Text className="text-2xl font-black text-gray-900 dark:text-gray-100" accessibilityRole="header" style={{ lineHeight: 28 }}>Meal Plan</Text>
        </View>
        <View className="flex-row items-center" style={{ height: 28 }}>
          <Text className="text-base font-semibold text-gray-700 dark:text-gray-200 mr-2" numberOfLines={1} style={{ lineHeight: 20 }}>
            {dateRange}
          </Text>
          {!isSelectedDateToday && (
            <HapticTouchableOpacity
              onPress={onJumpToToday}
              className="px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: isDark ? `${Colors.primary}33` : Colors.primaryLight, height: 28, justifyContent: 'center' }}
            >
              <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.primary : Colors.primary, lineHeight: 16 }}>
                Today
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>
      </View>
    </FrostedHeader>
  );
}
