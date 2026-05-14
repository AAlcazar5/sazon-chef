// frontend/components/meal-plan/WeeklyCalendar.tsx
// Weekly calendar view with date selection and navigation

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark, PastelsJewelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { FontSize } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';

// Alternating pastel tints for each day of the week (Mon=0 → Sun=6)
// Light: pastel rotation. Dark: jewel-tone tiles per COLORS.md → PastelsJewelDark.
const DAY_TINTS = [
  { light: Pastel.peach,    dark: PastelsJewelDark.amber.bg }, // Mon
  { light: Pastel.sage,     dark: PastelsJewelDark.green.bg }, // Tue
  { light: Pastel.sky,      dark: PastelsJewelDark.blue.bg },  // Wed
  { light: Pastel.golden,   dark: PastelsJewelDark.amber.bg }, // Thu
  { light: Pastel.lavender, dark: PastelsJewelDark.lilac.bg }, // Fri
  { light: Pastel.blush,    dark: PastelsJewelDark.pink.bg },  // Sat
  { light: Pastel.orange,   dark: PastelsJewelDark.blue.bg },  // Sun
];

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
          borderWidth: isSelected ? 2 : 0,
          borderColor: isSelected ? (isDark ? DarkColors.text.primary : '#111827') : 'transparent',
        }, Shadows.SM]}
      >
        {isSelected ? (
          <View style={{
            paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center',
            // Dark active state per COLORS.md: warm surface card with ivory border
            backgroundColor: isDark ? DarkColors.card : Pastel.peach,
          }}>
            <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: isDark ? DarkColors.text.primary : '#111827', marginBottom: 2 }}>
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDark ? DarkColors.text.primary : '#111827' }}>
              {date.getDate()}
            </Text>
            {isToday && (
              <View style={{
                width: 5, height: 5, borderRadius: 3,
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                marginTop: 4,
              }} />
            )}
            {mealsCount > 0 && (
              <View style={{
                marginTop: 4, minWidth: 22, height: 22, borderRadius: 11,
                backgroundColor: isDark ? DarkColors.primary : '#111827',
                alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
              }}>
                <Text style={{ color: isDark ? DarkColors.text.inverse : '#fff', fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{mealsCount}</Text>
              </View>
            )}
            {hasMealPrep && (
              <Text style={{ fontSize: 9, color: isDark ? DarkColors.primary : Colors.primary, marginTop: 2, fontFamily: 'PlusJakartaSans_700Bold' }}>🍱 Prep</Text>
            )}
          </View>
        ) : (
          <View style={{
            paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center',
            backgroundColor: isDark
              ? DAY_TINTS[date.getDay() === 0 ? 6 : date.getDay() - 1].dark
              : DAY_TINTS[date.getDay() === 0 ? 6 : date.getDay() - 1].light,
          }}>
            <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 2 }}>
              {date.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text style={{
              fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold',
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
                <Text style={{ color: '#fff', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>{mealsCount}</Text>
              </View>
            )}
            {hasMealPrep && (
              <Text style={{ fontSize: 9, color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed, marginTop: 2, fontFamily: 'PlusJakartaSans_700Bold' }}>🍱 Prep</Text>
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
  /** Pre-formatted date range (e.g. "Apr 28 – May 4") shown alongside
   *  the section title. */
  dateRange?: string;
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
  dateRange,
}: WeeklyCalendarProps) {
  const swipeTranslateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.translationX < -50) {
        runOnJS(onNextWeek)();
        swipeTranslateX.value = -20;
        swipeTranslateX.value = withSpring(0, { damping: 12, stiffness: 200 });
      } else if (event.translationX > 50) {
        runOnJS(onPreviousWeek)();
        swipeTranslateX.value = 20;
        swipeTranslateX.value = withSpring(0, { damping: 12, stiffness: 200 });
      }
    });

  const swipeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }));

  return (
    <View className="px-4 mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <View style={{ flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: isDark ? DarkColors.text.primary : Colors.text.primary }}
          >
            Weekly Meal Plan
          </Text>
          {dateRange && (
            <Text
              testID="weekly-meal-plan-date-range"
              numberOfLines={1}
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontFamily: 'PlusJakartaSans_600SemiBold',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: isDark ? DarkColors.text.tertiary : '#6B6B6B',
              }}
            >
              {dateRange}
            </Text>
          )}
        </View>
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
      <GestureDetector gesture={panGesture}>
      <Animated.View className="flex-row mb-2" style={swipeAnimStyle}>
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
      </Animated.View>
      </GestureDetector>
    </View>
  );
}


export default React.memo(WeeklyCalendar);
