// frontend/components/meal-plan/CompactMealView.tsx
// Compact view grouping meals by type (breakfast, lunch, dinner, snacks)

import React from 'react';
import { View, Text, Image } from 'react-native';
import { optimizedImageUrl } from '../../utils/imageUtils';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import AnimatedEmptyState from '../ui/AnimatedEmptyState';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { MealPlanEmptyStates } from '../../constants/EmptyStates';
import type { GroupedMeals } from '../../hooks/useMealPlanUI';

interface CompactMealViewProps {
  /** Meals organized by hour */
  hourlyMeals: Record<number, any[]>;
  /** Grouped meals by type */
  groupedMeals: GroupedMeals;
  /** Whether a plan is being generated */
  generatingPlan: boolean;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Format time from hour and minute */
  formatTime: (hour: number, minute: number) => string;
  /** Add meal to a specific hour */
  onAddMealToHour: (hour: number) => void;
  /** Remove a meal */
  onRemoveMeal: (hour: number, mealIndex: number) => void;
  /** Generate full day meals */
  onGenerateFullDay: () => void;
}

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅', defaultHour: 7 },
  { key: 'lunch', label: 'Lunch', icon: '☀️', defaultHour: 12 },
  { key: 'dinner', label: 'Dinner', icon: '🌙', defaultHour: 18 },
  { key: 'snacks', label: 'Snacks', icon: '🍎', defaultHour: 15 },
];

function getMealTypeColor(key: string, isDark: boolean): string {
  switch (key) {
    case 'breakfast': return isDark ? DarkColors.primary : Colors.primary;
    case 'lunch': return isDark ? DarkColors.secondaryRed : Colors.secondaryRed;
    case 'dinner': return isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen;
    case 'snacks': return isDark ? DarkColors.accent : Colors.accent;
    default: return isDark ? DarkColors.primary : Colors.primary;
  }
}

function CompactMealView({
  hourlyMeals,
  groupedMeals,
  generatingPlan,
  isDark,
  formatTime,
  onAddMealToHour,
  onRemoveMeal,
  onGenerateFullDay,
}: CompactMealViewProps) {
  return (
    <View className="px-4 mb-4" style={{ width: '100%' }}>
      <View className="space-y-3">
        {MEAL_TYPES.map((mealType) => {
          const meals = groupedMeals[mealType.key as keyof GroupedMeals];
          const color = getMealTypeColor(mealType.key, isDark);
          if (meals.length === 0) return null;

          return (
            <View key={mealType.key} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <View className="flex-row items-center mb-3">
                <Text className="text-2xl mr-2">{mealType.icon}</Text>
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                  {mealType.label}
                </Text>
                <HapticTouchableOpacity
                  onPress={() => onAddMealToHour(mealType.defaultHour)}
                  className="px-3 py-1 rounded-lg"
                  style={{ backgroundColor: color }}
                >
                  <Text className="text-white text-sm font-semibold">+ Add</Text>
                </HapticTouchableOpacity>
              </View>
              <View className="space-y-2">
                {meals.map((meal, index) => {
                  const hour = meal.hour;
                  const mealIndex = hourlyMeals[hour]?.findIndex(m => m.id === meal.id) || 0;
                  const isSnack = mealType.key === 'snacks';
                  const backgroundColor = isSnack
                    ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
                    : (isDark ? `${color}22` : `${color}11`);
                  const borderColor = isSnack
                    ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
                    : color;

                  return (
                    <HapticTouchableOpacity
                      key={`${mealType.key}-${index}`}
                      onPress={() => router.push(`/modal?id=${meal.id}&source=meal-plan`)}
                      onLongPress={() => onRemoveMeal(hour, mealIndex)}
                      className="flex-row items-center p-3 rounded-lg border"
                      style={{ backgroundColor, borderColor }}
                    >
                      {meal.imageUrl ? (
                        <Image
                          source={{ uri: optimizedImageUrl(meal.imageUrl) }}
                          className="w-16 h-16 rounded-lg mr-3"
                          style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
                        />
                      ) : (
                        <View className="w-16 h-16 rounded-lg mr-3 items-center justify-center" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                          <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.MD} color="#9CA3AF" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {meal.name || meal.title}
                        </Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {formatTime(hour, 0)} • {meal.calories} cal
                        </Text>
                      </View>
                    </HapticTouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {Object.values(groupedMeals).flat().length === 0 && (
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <AnimatedEmptyState
              config={MealPlanEmptyStates.emptyDay}
              title=""
              actionLabel="Create Full Day"
              onAction={() => {
                if (!generatingPlan) {
                  onGenerateFullDay();
                }
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}


export default React.memo(CompactMealView);
