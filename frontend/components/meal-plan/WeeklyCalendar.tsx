// frontend/components/meal-plan/WeeklyCalendar.tsx
// Weekly calendar view with date selection and navigation

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { FontSize } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';

interface DayPillProps {
  date: Date;
  index: number;
  isDark: boolean;
  isSelected: boolean;
  isToday: boolean;
  mealsCount: number;
  hasMealPrep: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function DayPill({ date, isDark, isSelected, isToday, mealsCount, hasMealPrep, onPress, onLongPress }: DayPillProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(1.1, { damping: 5, stiffness: 400 }),
        withSpring(1, { damping: 8, stiffness: 260 }),
      );
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 260 });
    }
  }, [isSelected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1, marginHorizontal: 3 }, animStyle]}>
      <HapticTouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        style={[{
          borderRadius: 14,
          overflow: 'hidden',
        }, Shadows.SM]}
      >
        {isSelected ? (
          <LinearGradient
            colors={['#fa7e12', '#f59e0b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginBottom: 2 }}>
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>
              {date.getDate()}
            </Text>
            {mealsCount > 0 && (
              <View style={{
                marginTop: 4, minWidth: 22, height: 22, borderRadius: 11,
                backgroundColor: 'rgba(255,255,255,0.9)',
                alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
              }}>
                <Text style={{ color: Colors.primaryDark, fontSize: 11, fontWeight: '800' }}>{mealsCount}</Text>
              </View>
            )}
            {hasMealPrep && (
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', marginTop: 2, fontWeight: '700' }}>🍱 Prep</Text>
            )}
          </LinearGradient>
        ) : (
          <View style={{
            paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center',
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 2 }}>
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text style={{
              fontSize: 18, fontWeight: '800',
              color: isToday ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed) : (isDark ? DarkColors.text.primary : Colors.text.primary),
            }}>
              {date.getDate()}
            </Text>
            {isToday && (
              <View style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                position: 'absolute',
                top: 6,
                right: 6,
              }} />
            )}
            {mealsCount > 0 && (
              <View style={{
                marginTop: 4, minWidth: 22, height: 22, borderRadius: 11,
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{mealsCount}</Text>
              </View>
            )}
            {hasMealPrep && (
              <Text style={{ fontSize: 9, color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed, marginTop: 2, fontWeight: '700' }}>🍱 Prep</Text>
            )}
          </View>
        )}
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

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
  /** Regenerate a single day (long press) */
  onRegenerateDay?: (date: Date) => void;
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
  onRegenerateDay,
}: WeeklyCalendarProps) {
  return (
    <View className="px-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Weekly Meal Plan</Text>
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
          const dateStr = date.toISOString().split('T')[0];
          const dayMeals = weeklyPlan?.weeklyPlan?.[dateStr]?.meals || {};
          let mealsCount = 0;
          if (dayMeals.breakfast) mealsCount++;
          if (dayMeals.lunch) mealsCount++;
          if (dayMeals.dinner) mealsCount++;
          if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) mealsCount += dayMeals.snacks.length;
          const mealPrepSessions = weeklyPlan?.weeklyPlan?.[dateStr]?.mealPrepSessions || [];

          return (
            <DayPill
              key={index}
              date={date}
              index={index}
              isDark={isDark}
              isSelected={isSelected(date)}
              isToday={isToday(date)}
              mealsCount={mealsCount}
              hasMealPrep={mealPrepSessions.length > 0}
              onPress={() => {
                try {
                  HapticPatterns.buttonPress();
                  onSelectDate(new Date(date));
                  if (mealsCount > 0) onShowDayMeals(new Date(date));
                } catch (error) {
                  console.error('Error selecting date:', error);
                }
              }}
              onLongPress={() => {
                if (onRegenerateDay && mealsCount > 0) onRegenerateDay(new Date(date));
              }}
            />
          );
        })}
      </View>
    </View>
  );
}


export default React.memo(WeeklyCalendar);
