// frontend/components/meal-plan/DuplicateModal.tsx
// Modal for duplicating meals: copy last week, copy a day, or copy a meal to multiple days

import React, { useState } from 'react';
import { View, Text, Modal, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import PulsingLoader from '../ui/PulsingLoader';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';

interface DuplicateModalProps {
  visible: boolean;
  duplicating: boolean;
  isDark: boolean;
  weekDates: Date[];
  weeklyPlan: any;
  onClose: () => void;
  onCopyLastWeek: () => void;
  onCopyDay: (sourceDate: string, targetDate: string) => void;
  onCopyMealToDays: (sourceMealId: string, targetDates: string[], targetMealType?: string) => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};
const MEAL_TYPE_EMOJIS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

function getDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function hasMealsOnDay(weeklyPlan: any, dateStr: string): boolean {
  const day = weeklyPlan?.[dateStr];
  if (!day?.meals) return false;
  const { breakfast, lunch, dinner, snacks } = day.meals;
  return !!(breakfast || lunch || dinner || (snacks && snacks.length > 0));
}

function getMealForDay(weeklyPlan: any, dateStr: string, mealType: string): any {
  const day = weeklyPlan?.[dateStr];
  if (!day?.meals) return null;
  if (mealType === 'snack') {
    return day.meals.snacks?.[0] || null;
  }
  return day.meals[mealType] || null;
}

function getMealName(meal: any): string {
  if (!meal) return '';
  if (meal.recipe?.title) return meal.recipe.title;
  if (meal.customName) return meal.customName;
  return 'Custom meal';
}

export default function DuplicateModal({
  visible,
  duplicating,
  isDark,
  weekDates,
  weeklyPlan,
  onClose,
  onCopyLastWeek,
  onCopyDay,
  onCopyMealToDays,
}: DuplicateModalProps) {
  // Copy Day state
  const [copyDaySource, setCopyDaySource] = useState<number | null>(null);
  const [copyDayTarget, setCopyDayTarget] = useState<number | null>(null);

  // Copy Meal state
  const [mealSourceDay, setMealSourceDay] = useState<number | null>(null);
  const [mealSourceType, setMealSourceType] = useState<string | null>(null);
  const [mealCheckedDays, setMealCheckedDays] = useState<Set<number>>(new Set());

  const handleClose = () => {
    setCopyDaySource(null);
    setCopyDayTarget(null);
    setMealSourceDay(null);
    setMealSourceType(null);
    setMealCheckedDays(new Set());
    onClose();
  };

  const handleCopyDay = () => {
    if (copyDaySource === null || copyDayTarget === null) return;
    const sourceDate = getDateStr(weekDates[copyDaySource]);
    const targetDate = getDateStr(weekDates[copyDayTarget]);
    onCopyDay(sourceDate, targetDate);
  };

  const handleCopyMeal = () => {
    if (mealSourceDay === null || !mealSourceType || mealCheckedDays.size === 0) return;
    const dateStr = getDateStr(weekDates[mealSourceDay]);
    const meal = getMealForDay(weeklyPlan, dateStr, mealSourceType);
    if (!meal?.id) return;
    const targetDates = Array.from(mealCheckedDays).map(i => getDateStr(weekDates[i]));
    onCopyMealToDays(meal.id, targetDates, mealSourceType);
  };

  // When meal source day changes, auto-check all other days
  const handleMealSourceDaySelect = (dayIndex: number) => {
    setMealSourceDay(dayIndex);
    setMealSourceType(null);
    const allDays = new Set<number>();
    for (let i = 0; i < 7; i++) {
      if (i !== dayIndex) allDays.add(i);
    }
    setMealCheckedDays(allDays);
  };

  const toggleMealCheckedDay = (dayIndex: number) => {
    setMealCheckedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayIndex)) {
        next.delete(dayIndex);
      } else {
        next.add(dayIndex);
      }
      return next;
    });
  };

  // Get meal preview for section 3
  const mealPreview = mealSourceDay !== null && mealSourceType
    ? getMealForDay(weeklyPlan, getDateStr(weekDates[mealSourceDay]), mealSourceType)
    : null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 justify-end">
        <View
          className="bg-white dark:bg-gray-800 rounded-t-2xl"
          style={{ maxHeight: '85%' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Duplicate Meals
            </Text>
            <HapticTouchableOpacity onPress={handleClose}>
              <Icon
                name={Icons.CLOSE}
                size={24}
                color={isDark ? '#9CA3AF' : '#6B7280'}
                accessibilityLabel="Close"
              />
            </HapticTouchableOpacity>
          </View>

          {/* Duplicating indicator */}
          {duplicating && (
            <View className="flex-row items-center justify-center py-3 mx-4 mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <PulsingLoader size={14} color={isDark ? '#34D399' : '#059669'} />
              <Text className="text-emerald-700 dark:text-emerald-300 font-medium ml-2 text-sm">
                Copying meals...
              </Text>
            </View>
          )}

          <ScrollView
            className="px-4 py-3"
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Section 1: Copy Last Week */}
            <View
              className="mb-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}
            >
              <View className="flex-row items-center mb-2">
                <Text className="text-lg mr-2">📋</Text>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Copy Last Week
                </Text>
              </View>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Duplicate last week's entire meal plan to this week
              </Text>
              <HapticTouchableOpacity
                onPress={onCopyLastWeek}
                disabled={duplicating}
                className={`py-2.5 rounded-lg items-center ${duplicating ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? '#065F46' : '#059669' }}
              >
                <Text className="text-white font-semibold text-sm">
                  Copy Last Week
                </Text>
              </HapticTouchableOpacity>
            </View>

            {/* Section 2: Copy a Day */}
            <View
              className="mb-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}
            >
              <View className="flex-row items-center mb-2">
                <Text className="text-lg mr-2">📅</Text>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Copy a Day
                </Text>
              </View>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Copy all meals from one day to another
              </Text>

              {/* From row */}
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                From
              </Text>
              <View className="flex-row mb-3" style={{ gap: 6 }}>
                {weekDates.map((date, i) => {
                  const dateStr = getDateStr(date);
                  const hasMeals = hasMealsOnDay(weeklyPlan, dateStr);
                  const isActive = copyDaySource === i;
                  return (
                    <HapticTouchableOpacity
                      key={`from-${i}`}
                      onPress={() => {
                        setCopyDaySource(i);
                        if (copyDayTarget === i) setCopyDayTarget(null);
                      }}
                      disabled={!hasMeals || duplicating}
                      className={`flex-1 py-2 rounded-lg items-center ${!hasMeals ? 'opacity-30' : ''}`}
                      style={{
                        backgroundColor: isActive
                          ? (isDark ? '#065F46' : '#059669')
                          : (isDark ? '#374151' : '#F3F4F6'),
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{
                          color: isActive ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                        }}
                      >
                        {DAY_LABELS[i]}
                      </Text>
                    </HapticTouchableOpacity>
                  );
                })}
              </View>

              {/* To row */}
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                To
              </Text>
              <View className="flex-row mb-3" style={{ gap: 6 }}>
                {weekDates.map((_, i) => {
                  const isActive = copyDayTarget === i;
                  const isSource = copyDaySource === i;
                  return (
                    <HapticTouchableOpacity
                      key={`to-${i}`}
                      onPress={() => setCopyDayTarget(i)}
                      disabled={isSource || duplicating}
                      className={`flex-1 py-2 rounded-lg items-center ${isSource ? 'opacity-30' : ''}`}
                      style={{
                        backgroundColor: isActive
                          ? (isDark ? '#1E40AF' : '#3B82F6')
                          : (isDark ? '#374151' : '#F3F4F6'),
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{
                          color: isActive ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                        }}
                      >
                        {DAY_LABELS[i]}
                      </Text>
                    </HapticTouchableOpacity>
                  );
                })}
              </View>

              <HapticTouchableOpacity
                onPress={handleCopyDay}
                disabled={copyDaySource === null || copyDayTarget === null || duplicating}
                className={`py-2.5 rounded-lg items-center ${(copyDaySource === null || copyDayTarget === null || duplicating) ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? '#065F46' : '#059669' }}
              >
                <Text className="text-white font-semibold text-sm">
                  Copy Day
                </Text>
              </HapticTouchableOpacity>
            </View>

            {/* Section 3: Same Meal All Week */}
            <View
              className="p-4 rounded-xl border border-gray-200 dark:border-gray-700"
              style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}
            >
              <View className="flex-row items-center mb-2">
                <Text className="text-lg mr-2">🔁</Text>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Same Meal All Week
                </Text>
              </View>
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Copy one meal to multiple days (e.g., same breakfast all week)
              </Text>

              {/* Source day */}
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Copy from
              </Text>
              <View className="flex-row mb-3" style={{ gap: 6 }}>
                {weekDates.map((date, i) => {
                  const dateStr = getDateStr(date);
                  const hasMeals = hasMealsOnDay(weeklyPlan, dateStr);
                  const isActive = mealSourceDay === i;
                  return (
                    <HapticTouchableOpacity
                      key={`meal-from-${i}`}
                      onPress={() => handleMealSourceDaySelect(i)}
                      disabled={!hasMeals || duplicating}
                      className={`flex-1 py-2 rounded-lg items-center ${!hasMeals ? 'opacity-30' : ''}`}
                      style={{
                        backgroundColor: isActive
                          ? (isDark ? '#065F46' : '#059669')
                          : (isDark ? '#374151' : '#F3F4F6'),
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{
                          color: isActive ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                        }}
                      >
                        {DAY_LABELS[i]}
                      </Text>
                    </HapticTouchableOpacity>
                  );
                })}
              </View>

              {/* Meal type picker */}
              {mealSourceDay !== null && (
                <>
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Meal type
                  </Text>
                  <View className="flex-row mb-3" style={{ gap: 6 }}>
                    {MEAL_TYPES.map((type) => {
                      const dateStr = getDateStr(weekDates[mealSourceDay]);
                      const meal = getMealForDay(weeklyPlan, dateStr, type);
                      const hasMeal = !!meal;
                      const isActive = mealSourceType === type;
                      return (
                        <HapticTouchableOpacity
                          key={type}
                          onPress={() => setMealSourceType(type)}
                          disabled={!hasMeal || duplicating}
                          className={`flex-1 py-2 rounded-lg items-center ${!hasMeal ? 'opacity-30' : ''}`}
                          style={{
                            backgroundColor: isActive
                              ? (isDark ? '#7C3AED' : '#8B5CF6')
                              : (isDark ? '#374151' : '#F3F4F6'),
                          }}
                        >
                          <Text className="text-xs">
                            {MEAL_TYPE_EMOJIS[type]}
                          </Text>
                          <Text
                            className="text-xs font-medium mt-0.5"
                            style={{
                              color: isActive ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                            }}
                          >
                            {MEAL_TYPE_LABELS[type]}
                          </Text>
                        </HapticTouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Meal preview */}
                  {mealPreview && (
                    <View className="mb-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <Text className="text-sm text-gray-700 dark:text-gray-300" numberOfLines={1}>
                        {MEAL_TYPE_EMOJIS[mealSourceType || 'breakfast']} {getMealName(mealPreview)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Target days checkboxes */}
              {mealSourceDay !== null && mealSourceType && (
                <>
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                    Copy to
                  </Text>
                  <View className="flex-row mb-3" style={{ gap: 6 }}>
                    {weekDates.map((_, i) => {
                      const isSource = mealSourceDay === i;
                      const isChecked = mealCheckedDays.has(i);
                      return (
                        <HapticTouchableOpacity
                          key={`target-${i}`}
                          onPress={() => toggleMealCheckedDay(i)}
                          disabled={isSource || duplicating}
                          className={`flex-1 py-2 rounded-lg items-center ${isSource ? 'opacity-30' : ''}`}
                          style={{
                            backgroundColor: isChecked
                              ? (isDark ? '#1E40AF' : '#3B82F6')
                              : (isDark ? '#374151' : '#F3F4F6'),
                          }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{
                              color: isChecked ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563'),
                            }}
                          >
                            {DAY_LABELS[i]}
                          </Text>
                        </HapticTouchableOpacity>
                      );
                    })}
                  </View>

                  <HapticTouchableOpacity
                    onPress={handleCopyMeal}
                    disabled={mealCheckedDays.size === 0 || duplicating || !mealPreview}
                    className={`py-2.5 rounded-lg items-center ${(mealCheckedDays.size === 0 || duplicating || !mealPreview) ? 'opacity-50' : ''}`}
                    style={{ backgroundColor: isDark ? '#065F46' : '#059669' }}
                  >
                    <Text className="text-white font-semibold text-sm">
                      Copy to {mealCheckedDays.size} Day{mealCheckedDays.size !== 1 ? 's' : ''}
                    </Text>
                  </HapticTouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
