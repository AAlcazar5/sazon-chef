// frontend/components/meal-plan/CollapsibleWeekView.tsx
// Collapsible weekly view showing all days with expandable details

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

interface CollapsibleWeekViewProps {
  /** Week dates array (7 days) */
  weekDates: Date[];
  /** Selected date */
  selectedDate: Date;
  /** Set of expanded day date strings */
  expandedDays: Set<string>;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Get meals for a given date */
  getMealsForDate: (date: Date) => any[];
  /** Set selected date */
  onSelectDate: (date: Date) => void;
  /** Toggle expanded state for a day */
  onToggleDay: (dateStr: string) => void;
}

function CollapsibleWeekView({
  weekDates,
  selectedDate,
  expandedDays,
  isDark,
  getMealsForDate,
  onSelectDate,
  onToggleDay,
}: CollapsibleWeekViewProps) {
  return (
    <View className="px-4 mb-4" style={{ width: '100%' }}>
      <View className="space-y-3">
        {weekDates.map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const isExpanded = expandedDays.has(dateStr);
          const meals = getMealsForDate(date);
          const dateIsSelected = date.toDateString() === selectedDate.toDateString();

          return (
            <View
              key={dateStr}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border"
              style={{ borderColor: dateIsSelected ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? '#374151' : '#E5E7EB') }}
            >
              <HapticTouchableOpacity
                onPress={() => {
                  onToggleDay(dateStr);
                  if (date.toDateString() !== selectedDate.toDateString()) {
                    onSelectDate(date);
                  }
                }}
                className="flex-row items-center justify-between p-4"
              >
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mr-2">
                      {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                    {date.toDateString() === new Date().toDateString() && (
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? `${Colors.secondaryRed}33` : Colors.secondaryRedLight }}>
                        <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRedDark }}>Today</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {meals.length} meal{meals.length !== 1 ? 's' : ''} planned
                  </Text>
                </View>
                <Icon
                  name={isExpanded ? Icons.CHEVRON_UP : Icons.CHEVRON_DOWN}
                  size={IconSizes.MD}
                  color="#6B7280"
                  accessibilityLabel={isExpanded ? "Collapse" : "Expand"}
                />
              </HapticTouchableOpacity>

              {isExpanded && (
                <View className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                  {meals.length > 0 ? (
                    <View className="space-y-2">
                      {meals.map((meal, index) => {
                        const isSnack = meal.mealType === 'snack' || meal.mealType === 'dessert';
                        const backgroundColor = isSnack
                          ? (isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight)
                          : (isDark ? `${Colors.primaryLight}22` : Colors.primaryLight);
                        const borderColor = isSnack
                          ? (isDark ? DarkColors.secondaryRedDark : Colors.secondaryRedDark)
                          : (isDark ? DarkColors.primaryDark : Colors.primaryDark);

                        return (
                          <HapticTouchableOpacity
                            key={index}
                            onPress={() => router.push(`/modal?id=${meal.id}&source=meal-plan`)}
                            className="flex-row items-center p-3 rounded-lg border"
                            style={{ backgroundColor, borderColor }}
                          >
                            {meal.imageUrl ? (
                              <Image
                                source={{ uri: optimizedImageUrl(meal.imageUrl) }}
                                className="w-12 h-12 rounded-lg mr-3"
                                style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
                              />
                            ) : (
                              <View className="w-12 h-12 rounded-lg mr-3 items-center justify-center" style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}>
                                <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.SM} color="#9CA3AF" />
                              </View>
                            )}
                            <View className="flex-1">
                              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {meal.title || meal.name}
                              </Text>
                              <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {meal.mealType} • {meal.calories} cal
                              </Text>
                            </View>
                          </HapticTouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View className="py-4">
                      <AnimatedEmptyState
                        config={MealPlanEmptyStates.emptyDay}
                        title=""
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}


export default React.memo(CollapsibleWeekView);
