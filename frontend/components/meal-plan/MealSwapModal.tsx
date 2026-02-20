// frontend/components/meal-plan/MealSwapModal.tsx
// Modal for displaying and selecting meal swap suggestions

import React from 'react';
import { View, Text, ScrollView, Modal, Alert } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

interface MealSwapModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Available swap suggestions */
  swapSuggestions: any[];
  /** The meal being swapped */
  selectedMealForSwap: any | null;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Close the modal */
  onClose: () => void;
}

export default function MealSwapModal({
  visible,
  swapSuggestions,
  selectedMealForSwap,
  isDark,
  onClose,
}: MealSwapModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Swap Suggestions
            </Text>
            <HapticTouchableOpacity onPress={onClose}>
              <Icon name={Icons.CLOSE} size={IconSizes.MD} color={isDark ? DarkColors.text.primary : Colors.text.primary} accessibilityLabel="Close" />
            </HapticTouchableOpacity>
          </View>

          {selectedMealForSwap && (
            <View className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-sm text-gray-600 dark:text-gray-200 mb-1">Current meal:</Text>
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {selectedMealForSwap.name}
              </Text>
            </View>
          )}

          <ScrollView className="max-h-96" nestedScrollEnabled={true}>
            {swapSuggestions.length > 0 ? (
              swapSuggestions.map((suggestion: any, index: number) => (
                <HapticTouchableOpacity
                  key={index}
                  onPress={() => {
                    Alert.alert(
                      'Swap Meal',
                      `Replace "${selectedMealForSwap?.name}" with "${suggestion.recipe.title}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Swap',
                          onPress: async () => {
                            Alert.alert('Coming Soon', 'Meal swap functionality will be available soon');
                          }
                        }
                      ]
                    );
                  }}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3"
                >
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {suggestion.recipe.title}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-200 mb-2">
                    {suggestion.reason}
                  </Text>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-xs text-gray-500 dark:text-gray-300">
                      {suggestion.recipe.calories} cal
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-300">
                      {suggestion.recipe.cookTime} min
                    </Text>
                  </View>
                </HapticTouchableOpacity>
              ))
            ) : (
              <Text className="text-gray-600 dark:text-gray-200 text-center py-4">
                No swap suggestions available
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
