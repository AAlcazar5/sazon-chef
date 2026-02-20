// frontend/components/meal-plan/QuickActionsBar.tsx
// Horizontal scrollable quick action badges for meal plan

import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';

interface QuickActionsBarProps {
  /** Whether a plan is being generated */
  generatingPlan: boolean;
  /** Whether a shopping list is being generated */
  generatingShoppingList: boolean;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Generate full day meals */
  onGenerateFullDay: () => void;
  /** Generate remaining meals */
  onGenerateRemainingMeals: () => void;
  /** Generate weekly plan */
  onGenerateWeeklyPlan: () => void;
  /** Show shopping list name modal */
  onShowShoppingListModal: () => void;
  /** Clear all meals for the day */
  onClearAll: () => void;
  /** Open duplicate modal */
  onDuplicate: () => void;
  /** Save current week as template */
  onSaveAsTemplate: () => void;
  /** Open template picker */
  onUseTemplate: () => void;
  /** Open recurring meals manager */
  onRecurring: () => void;
}

export default function QuickActionsBar({
  generatingPlan,
  generatingShoppingList,
  isDark,
  onGenerateFullDay,
  onGenerateRemainingMeals,
  onGenerateWeeklyPlan,
  onShowShoppingListModal,
  onClearAll,
  onDuplicate,
  onSaveAsTemplate,
  onUseTemplate,
  onRecurring,
}: QuickActionsBarProps) {
  return (
    <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Header */}
      <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Quick Actions Menu</Text>
      </View>

      {/* Quick Action Badges */}
      <View className="px-4 pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          style={{ flexGrow: 0 }}
          nestedScrollEnabled={true}
        >
          <View className="flex-row items-center" style={{ gap: 8, flexWrap: 'nowrap' }}>
            {/* Create Full Day */}
            <HapticTouchableOpacity
              onPress={() => {
                if (!generatingPlan) {
                  onGenerateFullDay();
                }
              }}
              disabled={generatingPlan}
              className={`px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700 ${generatingPlan ? 'opacity-50' : ''}`}
            >
              <Text className="text-base">🤖</Text>
              <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                {generatingPlan ? 'Creating...' : 'Create Full Day'}
              </Text>
            </HapticTouchableOpacity>

            {/* Create Remaining Meals */}
            <HapticTouchableOpacity
              onPress={() => {
                if (!generatingPlan) {
                  onGenerateRemainingMeals();
                }
              }}
              disabled={generatingPlan}
              className={`px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700 ${generatingPlan ? 'opacity-50' : ''}`}
            >
              <Text className="text-base">🍽️</Text>
              <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                Remaining Meals
              </Text>
            </HapticTouchableOpacity>

            {/* Create Weekly Plan */}
            <HapticTouchableOpacity
              onPress={() => {
                if (!generatingPlan) {
                  onGenerateWeeklyPlan();
                }
              }}
              disabled={generatingPlan}
              className={`px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700 ${generatingPlan ? 'opacity-50' : ''}`}
            >
              <Text className="text-base">📅</Text>
              <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                {generatingPlan ? 'Creating...' : 'Weekly Plan'}
              </Text>
            </HapticTouchableOpacity>

            {/* Create Shopping List */}
            <HapticTouchableOpacity
              onPress={onShowShoppingListModal}
              disabled={generatingShoppingList}
              className={`px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700 ${generatingShoppingList ? 'opacity-50' : ''}`}
            >
              <Text className="text-base">🛒</Text>
              <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                {generatingShoppingList ? 'Creating...' : 'Shopping List'}
              </Text>
            </HapticTouchableOpacity>

            {/* Duplicate */}
            <HapticTouchableOpacity
              onPress={onDuplicate}
              className="px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700"
            >
              <Text className="text-base">📑</Text>
              <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                Duplicate
              </Text>
            </HapticTouchableOpacity>

            {/* Use Template */}
            <HapticTouchableOpacity
              onPress={onUseTemplate}
              className="px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700"
            >
              <Text className="text-base">📋</Text>
              <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                Use Template
              </Text>
            </HapticTouchableOpacity>

            {/* Save as Template */}
            <HapticTouchableOpacity
              onPress={onSaveAsTemplate}
              className="px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700"
            >
              <Text className="text-base">🔖</Text>
              <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                Save Template
              </Text>
            </HapticTouchableOpacity>

            {/* Recurring Meals */}
            <HapticTouchableOpacity
              onPress={onRecurring}
              className="px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700"
            >
              <Text className="text-base">🔁</Text>
              <Text className="text-sm font-semibold ml-1.5 text-gray-700 dark:text-gray-300">
                Recurring
              </Text>
            </HapticTouchableOpacity>

            {/* Clear All Meals */}
            <HapticTouchableOpacity
              onPress={() => {
                HapticPatterns.buttonPress();
                Alert.alert('Clear Day', 'Clear all meals for this day?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: onClearAll,
                  },
                ]);
              }}
              className="px-4 py-2 rounded-full flex-row items-center bg-gray-100 dark:bg-gray-700"
            >
              <Text className="text-base">🗑️</Text>
              <Text className="text-sm font-semibold ml-1.5" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>
                Clear All
              </Text>
            </HapticTouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
