// frontend/components/meal-plan/DayMealsModal.tsx
// Modal showing all meals for a selected day

import React from 'react';
import { View, Text, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';

interface DayMealsModalProps {
  visible: boolean;
  selectedDay: Date | null;
  weeklyPlan: any;
  isDark: boolean;
  onClose: () => void;
  isToday: (date: Date) => boolean;
}

function DayMealsModal({
  visible,
  selectedDay,
  weeklyPlan,
  isDark,
  onClose,
  isToday,
}: DayMealsModalProps) {
  if (!visible || !selectedDay) {
    return null;
  }

  // Extract meals for the selected day
  const getMealsForDay = () => {
    if (!(selectedDay instanceof Date)) {
      return [];
    }

    const dateStr = selectedDay.toISOString().split('T')[0];
    const dayMeals = weeklyPlan?.weeklyPlan?.[dateStr]?.meals || {};
    const allMeals: Array<any> = [];

    // Extract breakfast
    if (dayMeals.breakfast) {
      const recipe = dayMeals.breakfast.recipe || dayMeals.breakfast;
      if (recipe && (recipe.id || recipe.title || recipe.name || recipe.calories)) {
        allMeals.push({
          id: recipe.id,
          mealType: 'Breakfast',
          name: recipe.title || recipe.name || 'Breakfast',
          calories: recipe.calories,
          cookTime: recipe.cookTime,
          isCompleted: dayMeals.breakfast.isCompleted || false,
        });
      }
    }

    // Extract lunch
    if (dayMeals.lunch) {
      const recipe = dayMeals.lunch.recipe || dayMeals.lunch;
      if (recipe && (recipe.id || recipe.title || recipe.name || recipe.calories)) {
        allMeals.push({
          id: recipe.id,
          mealType: 'Lunch',
          name: recipe.title || recipe.name || 'Lunch',
          calories: recipe.calories,
          cookTime: recipe.cookTime,
          isCompleted: dayMeals.lunch.isCompleted || false,
        });
      }
    }

    // Extract dinner
    if (dayMeals.dinner) {
      const recipe = dayMeals.dinner.recipe || dayMeals.dinner;
      if (recipe && (recipe.id || recipe.title || recipe.name || recipe.calories)) {
        allMeals.push({
          id: recipe.id,
          mealType: 'Dinner',
          name: recipe.title || recipe.name || 'Dinner',
          calories: recipe.calories,
          cookTime: recipe.cookTime,
          isCompleted: dayMeals.dinner.isCompleted || false,
        });
      }
    }

    // Extract snacks
    if (dayMeals.snacks && Array.isArray(dayMeals.snacks)) {
      dayMeals.snacks.forEach((snack: any) => {
        const recipe = snack?.recipe || snack;
        if (recipe && (recipe.id || recipe.title || recipe.name || recipe.calories)) {
          allMeals.push({
            id: recipe.id,
            mealType: 'Snack',
            name: recipe.title || recipe.name || 'Snack',
            calories: recipe.calories,
            cookTime: recipe.cookTime,
            isCompleted: snack.isCompleted || false,
          });
        }
      });
    }

    return allMeals;
  };

  const meals = getMealsForDay();
  const dateStr = selectedDay.toISOString().split('T')[0];

  const mealColors: Record<string, { bg: string; text: string }> = {
    'Breakfast': { bg: isDark ? '#FF914D33' : Colors.primaryLight, text: isDark ? DarkColors.primary : Colors.primary },
    'Lunch': { bg: isDark ? '#10B98133' : Colors.tertiaryGreenLight, text: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen },
    'Dinner': { bg: isDark ? '#EF444433' : Colors.secondaryRedLight, text: isDark ? DarkColors.secondaryRed : Colors.secondaryRed },
    'Snack': { bg: isDark ? '#374151' : '#F3F4F6', text: isDark ? '#9CA3AF' : '#4B5563' },
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden w-full" style={{ maxHeight: '80%', maxWidth: '100%' }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-1">
              <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {"📅 Day's Meals at a Glance"}
              </Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              {isToday(selectedDay) && (
                <View className="mt-1">
                  <View className="px-2 py-0.5 rounded-full self-start" style={{ backgroundColor: isDark ? '#EF444433' : Colors.secondaryRedLight }}>
                    <Text className="text-xs font-semibold" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
                      {"Today"}
                    </Text>
                  </View>
                </View>
              )}
            </View>
            <HapticTouchableOpacity
              onPress={onClose}
              className="p-2 -mr-2"
            >
              <Icon
                name={Icons.CLOSE}
                size={IconSizes.LG}
                color={isDark ? DarkColors.text.primary : Colors.text.primary}
                accessibilityLabel="Close"
              />
            </HapticTouchableOpacity>
          </View>

          {/* Meals Content */}
          <ScrollView
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {meals.length === 0 ? (
              <View className="py-8 items-center px-4">
                <Text className="text-gray-500 dark:text-gray-400 text-center mb-2">
                  {"No meals planned for this day"}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  {`Date: ${dateStr}`}
                </Text>
                {weeklyPlan && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {`Weekly plan has ${Object.keys(weeklyPlan.weeklyPlan || {}).length} days`}
                  </Text>
                )}
              </View>
            ) : (
              <View>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {`${meals.length} meal${meals.length !== 1 ? 's' : ''} planned`}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {meals.map((meal, index) => {
                    const colors = mealColors[meal.mealType] || mealColors['Snack'];
                    const isEven = index % 2 === 0;

                    return (
                      <HapticTouchableOpacity
                        key={`modal-meal-${meal.id || index}`}
                        onPress={() => {
                          if (meal.id) {
                            HapticPatterns.buttonPress();
                            router.push(`/modal?id=${meal.id}&source=meal-plan`);
                            onClose();
                          }
                        }}
                        activeOpacity={0.7}
                        style={{
                          width: '47%',
                          padding: 14,
                          borderRadius: 12,
                          backgroundColor: colors.bg,
                          marginRight: isEven ? '6%' : 0,
                          marginBottom: 12,
                        }}
                      >
                        <Text className="text-xs font-semibold mb-1" style={{ color: colors.text }}>
                          {meal.mealType}
                        </Text>
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2" numberOfLines={2}>
                          {meal.name}
                        </Text>
                        <View className="flex-row items-center">
                          {meal.calories && (
                            <Text className="text-xs text-gray-600 dark:text-gray-400 mr-2">
                              {`${meal.calories} cal`}
                            </Text>
                          )}
                          {meal.cookTime && (
                            <Text className="text-xs text-gray-500 dark:text-gray-400">
                              {meal.cookTime < 60 ? `${meal.cookTime}m` : `${Math.floor(meal.cookTime / 60)}h ${meal.cookTime % 60}m`}
                            </Text>
                          )}
                        </View>
                        {meal.isCompleted && (
                          <View style={{ position: 'absolute', top: 8, right: 8 }}>
                            <Icon name={Icons.CHECKMARK_CIRCLE} size={16} color={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen} />
                          </View>
                        )}
                        {meal.id && (
                          <View style={{ position: 'absolute', bottom: 8, right: 8 }}>
                            <Icon name={Icons.CHEVRON_FORWARD} size={IconSizes.XS} color={colors.text} accessibilityLabel="View recipe" />
                          </View>
                        )}
                      </HapticTouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default DayMealsModal;
