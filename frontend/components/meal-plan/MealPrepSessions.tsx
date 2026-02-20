// frontend/components/meal-plan/MealPrepSessions.tsx
// Section showing meal prep sessions for a selected date

import React from 'react';
import { View, Text } from 'react-native';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
interface MealPrepSessionsProps {
  /** Selected date */
  selectedDate: Date;
  /** Weekly plan data */
  weeklyPlan: any;
  /** Formatted date string for display */
  formattedDate: string;
  /** Whether dark mode is active */
  isDark: boolean;
}

export default function MealPrepSessions({
  selectedDate,
  weeklyPlan,
  formattedDate,
  isDark,
}: MealPrepSessionsProps) {
  const dateStr = selectedDate.toISOString().split('T')[0];
  const dayMealPrepSessions = weeklyPlan?.weeklyPlan?.[dateStr]?.mealPrepSessions || [];

  if (dayMealPrepSessions.length === 0) return null;

  return (
    <View className="px-4 mb-4">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        🍱 Meal Prep - {formattedDate}
      </Text>

      <View className="mb-3">
        {dayMealPrepSessions.map((session: any) => (
          <View key={session.id} className="rounded-lg p-4 mb-2 border" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight, borderColor: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Meal prep session" />
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 ml-2">
                  Meal Prep Session
                </Text>
              </View>
              {session.isCompleted && (
                <View className="px-2 py-1 rounded" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
                  <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark }}>Completed</Text>
                </View>
              )}
            </View>
            {session.scheduledTime && (
              <Text className="text-sm text-gray-600 dark:text-gray-100 mb-1">
                ⏰ {session.scheduledTime}
              </Text>
            )}
            {session.duration && (
              <Text className="text-sm text-gray-600 dark:text-gray-100 mb-1">
                ⏱️ {session.duration} minutes
              </Text>
            )}
            {session.recipes && session.recipes.length > 0 && (
              <Text className="text-sm text-gray-600 dark:text-gray-100">
                📋 {session.recipes.length} recipe{session.recipes.length > 1 ? 's' : ''} to prep
              </Text>
            )}
            {session.notes && (
              <Text className="text-sm text-gray-600 dark:text-gray-100 mt-1 italic">
                {session.notes}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
