// frontend/components/meal-plan/WeeklyCalendar.tsx
// Weekly calendar view with date selection and navigation

import React from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';
interface WeeklyCalendarProps {
  /** Week dates array (7 days) */
  weekDates: Date[];
  /** Selected date */
  selectedDate: Date;
  /** Weekly plan data */
  weeklyPlan: any;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Check if a date is today */
  isToday: (date: Date) => boolean;
  /** Check if a date is selected */
  isSelected: (date: Date) => boolean;
  /** Set the selected date */
  onSelectDate: (date: Date) => void;
  /** Navigate to previous week */
  onPreviousWeek: () => void;
  /** Navigate to next week */
  onNextWeek: () => void;
  /** Show day meals modal */
  onShowDayMeals: (date: Date) => void;
}

function WeeklyCalendar({
  weekDates,
  selectedDate,
  weeklyPlan,
  isDark,
  isToday,
  isSelected,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  onShowDayMeals,
}: WeeklyCalendarProps) {
  return (
    <View className="px-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Meal Plan</Text>
        <View className="flex-row items-center space-x-2">
          <HapticTouchableOpacity
            onPress={onPreviousWeek}
            className="p-2"
          >
            <Icon name={Icons.CHEVRON_BACK} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Previous week" />
          </HapticTouchableOpacity>
          <HapticTouchableOpacity
            onPress={onNextWeek}
            className="p-2"
          >
            <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Next week" />
          </HapticTouchableOpacity>
        </View>
      </View>

      {/* Week Dates */}
      <View className="flex-row mb-2">
        {weekDates.map((date, index) => {
          const dateIsSelected = isSelected(date);
          const isTodayDate = isToday(date);
          const dateStr = date.toISOString().split('T')[0];
          const dayMeals = weeklyPlan?.weeklyPlan?.[dateStr]?.meals || {};

          // Count total meals
          let mealsCount = 0;
          if (dayMeals.breakfast) mealsCount++;
          if (dayMeals.lunch) mealsCount++;
          if (dayMeals.dinner) mealsCount++;
          if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) {
            mealsCount += dayMeals.snacks.length;
          }

          // Check if day has passed
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const checkDate = new Date(date);
          checkDate.setHours(0, 0, 0, 0);

          const mealPrepSessions = weeklyPlan?.weeklyPlan?.[dateStr]?.mealPrepSessions || [];
          const hasMealPrep = mealPrepSessions.length > 0;

          return (
            <HapticTouchableOpacity
              key={index}
              onPress={() => {
                try {
                  HapticPatterns.buttonPress();
                  onSelectDate(new Date(date));
                  if (mealsCount > 0) {
                    onShowDayMeals(new Date(date));
                  }
                } catch (error) {
                  console.error('Error selecting date:', error);
                }
              }}
              className={`flex-1 mx-1 rounded-lg p-3 ${
                dateIsSelected ? '' : 'bg-white dark:bg-gray-800'
              } ${isTodayDate ? 'border-2' : ''}`}
              style={{
                ...(dateIsSelected ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary } : {}),
                ...(isTodayDate ? { borderColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed } : {})
              }}
            >
              <Text className={`text-xs text-center font-medium ${
                dateIsSelected ? 'text-white' : 'text-gray-500 dark:text-gray-200'
              }`}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text className={`text-lg text-center font-bold mt-1 ${
                dateIsSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'
              }`} style={!dateIsSelected && isTodayDate ? { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed } : undefined}>
                {date.getDate()}
              </Text>
              {mealsCount > 0 && (
                <View className="mt-1.5 self-center" style={{
                  minWidth: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: dateIsSelected
                    ? 'rgba(255, 255, 255, 0.95)'
                    : (isDark ? DarkColors.primary : Colors.primary),
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 7,
                  borderWidth: dateIsSelected ? 2 : 0,
                  borderColor: dateIsSelected ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 3,
                }}>
                  <Text className="font-bold" style={{
                    color: dateIsSelected
                      ? (isDark ? DarkColors.primaryDark : Colors.primary)
                      : '#FFFFFF',
                    fontSize: FontSize.sm,
                    fontWeight: '700',
                  }}>
                    {mealsCount}
                  </Text>
                </View>
              )}
              {hasMealPrep && (
                <View className={`mt-1 rounded-full px-2 py-0.5 ${
                  dateIsSelected ? 'bg-white bg-opacity-30' : ''
                }`} style={!dateIsSelected ? { backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight } : undefined}>
                  <Text className={`text-xs text-center font-semibold ${
                    dateIsSelected ? 'text-white' : ''
                  }`} style={!dateIsSelected ? { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed } : undefined}>
                    🍱 Prep
                  </Text>
                </View>
              )}
            </HapticTouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}


export default React.memo(WeeklyCalendar);
