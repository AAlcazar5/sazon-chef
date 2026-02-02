// frontend/components/meal-plan/MealSnackSelectorModal.tsx
// Modal for selecting number of meals, snacks, prep time, and budget

import React from 'react';
import { View, Text, Modal } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';

interface MealSnackSelectorModalProps {
  visible: boolean;
  generationType: 'fullDay' | 'weekly' | null;
  selectedMeals: number;
  selectedSnacks: number;
  maxTotalPrepTime: number;
  maxWeeklyBudget: number | null;
  targetMacros: { calories: number };
  isDark: boolean;
  onClose: () => void;
  onConfirm: () => void;
  setSelectedMeals: (count: number) => void;
  setSelectedSnacks: (count: number) => void;
  setMaxTotalPrepTime: (minutes: number) => void;
  setMaxWeeklyBudget: (amount: number | null) => void;
  calculateRecommendedMealsAndSnacks: (calories: number) => { meals: number; snacks: number };
}

function MealSnackSelectorModal({
  visible,
  generationType,
  selectedMeals,
  selectedSnacks,
  maxTotalPrepTime,
  maxWeeklyBudget,
  targetMacros,
  isDark,
  onClose,
  onConfirm,
  setSelectedMeals,
  setSelectedSnacks,
  setMaxTotalPrepTime,
  setMaxWeeklyBudget,
  calculateRecommendedMealsAndSnacks,
}: MealSnackSelectorModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 justify-end">
        <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-6">
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Select Meals & Snacks
          </Text>
          <View className="mb-4 p-3 rounded-lg" style={{ backgroundColor: isDark ? `${Colors.primaryLight}20` : Colors.primaryLight }}>
            <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              💡 Recommended for {targetMacros.calories} calories/day:
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {calculateRecommendedMealsAndSnacks(targetMacros.calories).meals} meals, {calculateRecommendedMealsAndSnacks(targetMacros.calories).snacks} snacks
            </Text>
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Choose how many meals and snacks to create for {generationType === 'fullDay' ? 'today' : 'each day this week'}. You can adjust these values.
          </Text>

          {/* Meals Selector */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Number of Meals
            </Text>
            <View className="flex-row justify-between">
              {[0, 1, 2, 3, 4].map((count) => (
                <HapticTouchableOpacity
                  key={count}
                  onPress={() => setSelectedMeals(count)}
                  className={`flex-1 mx-1 py-4 rounded-lg border-2 ${
                    selectedMeals === count
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                  }`}
                  style={
                    selectedMeals === count
                      ? { borderColor: isDark ? DarkColors.primary : Colors.primary }
                      : undefined
                  }
                >
                  <Text
                    className={`text-center text-lg font-semibold ${
                      selectedMeals === count
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    style={
                      selectedMeals === count
                        ? { color: isDark ? DarkColors.primary : Colors.primary }
                        : undefined
                    }
                  >
                    {count}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
          </View>

          {/* Snacks Selector */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Number of Snacks/Dessert
            </Text>
            <View className="flex-row justify-between">
              {[0, 1, 2, 3, 4].map((count) => (
                <HapticTouchableOpacity
                  key={count}
                  onPress={() => setSelectedSnacks(count)}
                  className={`flex-1 mx-1 py-4 rounded-lg border-2 ${
                    selectedSnacks === count
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                  }`}
                  style={
                    selectedSnacks === count
                      ? { borderColor: isDark ? DarkColors.primary : Colors.primary }
                      : undefined
                  }
                >
                  <Text
                    className={`text-center text-lg font-semibold ${
                      selectedSnacks === count
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    style={
                      selectedSnacks === count
                        ? { color: isDark ? DarkColors.primary : Colors.primary }
                        : undefined
                    }
                  >
                    {count}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
          </View>

          {/* Total Prep Time Selector */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Max Total Prep Time
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Keep total meal prep time under this limit for {generationType === 'fullDay' ? 'today' : 'each day'}
            </Text>
            <View className="flex-row justify-between flex-wrap">
              {[30, 45, 60, 90, 120].map((minutes) => (
                <HapticTouchableOpacity
                  key={minutes}
                  onPress={() => setMaxTotalPrepTime(minutes)}
                  className={`flex-1 mx-1 py-3 rounded-lg border-2 mb-2 ${
                    maxTotalPrepTime === minutes
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                  }`}
                  style={
                    maxTotalPrepTime === minutes
                      ? { borderColor: isDark ? DarkColors.primary : Colors.primary }
                      : undefined
                  }
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      maxTotalPrepTime === minutes
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    style={
                      maxTotalPrepTime === minutes
                        ? { color: isDark ? DarkColors.primary : Colors.primary }
                        : undefined
                    }
                  >
                    {minutes} min
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
          </View>

          {/* Weekly Budget Selector */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Max Weekly Budget
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Keep total meal plan cost under this amount for {generationType === 'fullDay' ? 'today' : 'the week'}
            </Text>
            <View className="flex-row justify-between flex-wrap">
              {[50, 75, 100, 150, 200, 250].map((amount) => (
                <HapticTouchableOpacity
                  key={amount}
                  onPress={() => setMaxWeeklyBudget(amount)}
                  className={`flex-1 mx-1 py-3 rounded-lg border-2 mb-2 ${
                    maxWeeklyBudget === amount
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                  }`}
                  style={
                    maxWeeklyBudget === amount
                      ? { borderColor: isDark ? DarkColors.primary : Colors.primary }
                      : undefined
                  }
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      maxWeeklyBudget === amount
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    style={
                      maxWeeklyBudget === amount
                        ? { color: isDark ? DarkColors.primary : Colors.primary }
                        : undefined
                    }
                  >
                    ${amount}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </View>
            <HapticTouchableOpacity
              onPress={() => setMaxWeeklyBudget(null)}
              className="mt-2 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600"
            >
              <Text className="text-center text-sm text-gray-600 dark:text-gray-400">
                No Budget Limit
              </Text>
            </HapticTouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3">
            <HapticTouchableOpacity
              onPress={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              onPress={onConfirm}
              className="flex-1 py-3 px-4 rounded-lg"
              style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
            >
              <Text className="text-white font-medium text-center">Create</Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default MealSnackSelectorModal;
