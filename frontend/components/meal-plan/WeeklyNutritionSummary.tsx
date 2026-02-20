// frontend/components/meal-plan/WeeklyNutritionSummary.tsx
// Weekly nutrition summary with progress charts

import React from 'react';
import { View, Text } from 'react-native';
import { Colors, DarkColors } from '../../constants/Colors';

interface WeeklyNutritionSummaryProps {
  /** Weekly nutrition data */
  weeklyNutrition: any;
  /** Whether dark mode is active */
  isDark: boolean;
}

export default function WeeklyNutritionSummary({
  weeklyNutrition,
  isDark,
}: WeeklyNutritionSummaryProps) {
  if (!weeklyNutrition) return null;

  return (
    <View className="px-4 mb-4">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Weekly Nutrition Summary
      </Text>
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-sm text-gray-600 dark:text-gray-200">
            {weeklyNutrition.period.days} days
          </Text>
          <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
            {weeklyNutrition.completed.completionRate.toFixed(0)}% Complete
          </Text>
        </View>

        {/* Calories Progress Chart */}
        {weeklyNutrition.goals && (
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">Weekly Calories</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {weeklyNutrition.totals.calories.toLocaleString()} / {weeklyNutrition.goals.weeklyCalories.toLocaleString()}
              </Text>
            </View>
            <View className="relative w-full" style={{ height: 12, borderRadius: 6, overflow: 'hidden' }}>
              <View
                className="absolute rounded-full"
                style={{
                  width: '100%',
                  height: 12,
                  backgroundColor: isDark ? '#374151' : '#E5E7EB',
                  borderRadius: 6
                }}
              />
              <View
                className="absolute rounded-full"
                style={{
                  height: 12,
                  width: `${Math.min((weeklyNutrition.totals.calories / weeklyNutrition.goals.weeklyCalories) * 100, 100)}%`,
                  backgroundColor: weeklyNutrition.totals.calories > weeklyNutrition.goals.weeklyCalories
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                    : (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen),
                  borderRadius: 6
                }}
              />
            </View>
          </View>
        )}

        {/* Daily Average Calories Chart */}
        {weeklyNutrition.goals && (
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">Daily Average</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {weeklyNutrition.averages.dailyCalories.toFixed(0)} / {weeklyNutrition.goals.dailyCalories}
              </Text>
            </View>
            <View className="relative w-full" style={{ height: 12, borderRadius: 6, overflow: 'hidden' }}>
              <View
                className="absolute rounded-full"
                style={{
                  width: '100%',
                  height: 12,
                  backgroundColor: isDark ? '#374151' : '#E5E7EB',
                  borderRadius: 6
                }}
              />
              <View
                className="absolute rounded-full"
                style={{
                  height: 12,
                  width: `${Math.min((weeklyNutrition.averages.dailyCalories / weeklyNutrition.goals.dailyCalories) * 100, 100)}%`,
                  backgroundColor: weeklyNutrition.averages.dailyCalories > weeklyNutrition.goals.dailyCalories
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                    : (isDark ? DarkColors.primary : Colors.primary),
                  borderRadius: 6
                }}
              />
            </View>
          </View>
        )}

        {/* Macro Breakdown Chart */}
        <View className="mb-4">
          <Text className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-3">Macro Breakdown</Text>
          <View className="flex-row justify-between space-x-2">
            {/* Protein */}
            <View className="flex-1 items-center">
              <View className="relative w-full mb-2" style={{ height: 80 }}>
                <View
                  className="absolute bottom-0 w-full rounded-t-lg"
                  style={{
                    height: `${Math.min((weeklyNutrition.totals.protein / (weeklyNutrition.goals?.weeklyProtein || weeklyNutrition.totals.protein * 1.2)) * 100, 100)}%`,
                    backgroundColor: '#3B82F6',
                    borderRadius: 4
                  }}
                />
                <View
                  className="absolute bottom-0 w-full rounded-t-lg opacity-20"
                  style={{
                    height: '100%',
                    backgroundColor: '#3B82F6',
                    borderRadius: 4
                  }}
                />
              </View>
              <Text className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {weeklyNutrition.totals.protein.toFixed(0)}g
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Protein</Text>
            </View>

            {/* Carbs */}
            <View className="flex-1 items-center">
              <View className="relative w-full mb-2" style={{ height: 80 }}>
                <View
                  className="absolute bottom-0 w-full rounded-t-lg"
                  style={{
                    height: `${Math.min((weeklyNutrition.totals.carbs / (weeklyNutrition.goals?.weeklyCarbs || weeklyNutrition.totals.carbs * 1.2)) * 100, 100)}%`,
                    backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                    borderRadius: 4
                  }}
                />
                <View
                  className="absolute bottom-0 w-full rounded-t-lg opacity-20"
                  style={{
                    height: '100%',
                    backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                    borderRadius: 4
                  }}
                />
              </View>
              <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                {weeklyNutrition.totals.carbs.toFixed(0)}g
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Carbs</Text>
            </View>

            {/* Fat */}
            <View className="flex-1 items-center">
              <View className="relative w-full mb-2" style={{ height: 80 }}>
                <View
                  className="absolute bottom-0 w-full rounded-t-lg"
                  style={{
                    height: `${Math.min((weeklyNutrition.totals.fat / (weeklyNutrition.goals?.weeklyFat || weeklyNutrition.totals.fat * 1.2)) * 100, 100)}%`,
                    backgroundColor: '#8B5CF6',
                    borderRadius: 4
                  }}
                />
                <View
                  className="absolute bottom-0 w-full rounded-t-lg opacity-20"
                  style={{
                    height: '100%',
                    backgroundColor: '#8B5CF6',
                    borderRadius: 4
                  }}
                />
              </View>
              <Text className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                {weeklyNutrition.totals.fat.toFixed(0)}g
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Fat</Text>
            </View>
          </View>
        </View>

        {/* Completion Progress Chart */}
        <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-medium text-gray-700 dark:text-gray-200">Meal Completion</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {weeklyNutrition.completed.mealsCompleted} / {weeklyNutrition.completed.totalMeals}
            </Text>
          </View>
          <View className="relative w-full" style={{ height: 8, borderRadius: 4, overflow: 'hidden' }}>
            <View
              className="absolute rounded-full"
              style={{
                width: '100%',
                height: 8,
                backgroundColor: isDark ? '#374151' : '#E5E7EB',
                borderRadius: 4
              }}
            />
            <View
              className="absolute rounded-full"
              style={{
                height: 8,
                width: `${weeklyNutrition.completed.completionRate}%`,
                backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                borderRadius: 4
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
