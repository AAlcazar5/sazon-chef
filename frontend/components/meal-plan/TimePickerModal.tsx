// frontend/components/meal-plan/TimePickerModal.tsx
// Modal for selecting time when adding a recipe to meal plan

import React from 'react';
import { View, Text, TextInput } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import WheelPicker from './WheelPicker';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';

interface TimePickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Recipe title being scheduled */
  recipeTitle: string;
  /** Selected hour (0-23) */
  selectedHour: number;
  /** Selected minute (0-59) */
  selectedMinute: number;
  /** Formatted time string */
  formattedTime: string;
  /** Manual time input value */
  manualTimeInput: string;
  /** Whether manual input mode is active */
  showManualInput: boolean;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Set selected hour */
  onHourChange: (hour: number) => void;
  /** Set selected minute */
  onMinuteChange: (minute: number) => void;
  /** Handle manual time input */
  onManualTimeInput: (input: string) => void;
  /** Toggle manual input mode */
  onToggleManualInput: () => void;
  /** Cancel and close */
  onCancel: () => void;
  /** Confirm time selection */
  onConfirm: () => void;
}

export default function TimePickerModal({
  visible,
  recipeTitle,
  selectedHour,
  selectedMinute,
  formattedTime,
  manualTimeInput,
  showManualInput,
  isDark,
  onHourChange,
  onMinuteChange,
  onManualTimeInput,
  onToggleManualInput,
  onCancel,
  onConfirm,
}: TimePickerModalProps) {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <View className="bg-white dark:bg-gray-800 rounded-lg p-6 mx-4 w-full max-w-sm">
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Schedule Recipe
        </Text>
        <Text className="text-gray-600 dark:text-gray-100 mb-4">
          Choose a time for "{recipeTitle}":
        </Text>

        {/* Time Display */}
        <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-100">Selected Time</Text>
            <HapticTouchableOpacity
              onPress={onToggleManualInput}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
            >
              <Text className="text-sm font-medium" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                {showManualInput ? 'Use Picker' : 'Type Time'}
              </Text>
            </HapticTouchableOpacity>
          </View>

          {showManualInput ? (
            <View className="items-center">
              <TextInput
                value={manualTimeInput}
                onChangeText={onManualTimeInput}
                placeholder="2:30 PM"
                placeholderTextColor="#9CA3AF"
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center bg-white dark:bg-gray-800 rounded-lg px-4 py-2 border border-gray-300 dark:border-gray-600 w-full"
                keyboardType="default"
                autoFocus={true}
              />
              <Text className="text-xs text-gray-500 dark:text-gray-200 mt-1">
                Format: 2:30 PM or 14:30
              </Text>
            </View>
          ) : (
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formattedTime}
              </Text>
            </View>
          )}
        </View>

        {/* Time Picker Wheels */}
        <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <View className="flex-row justify-center items-center">
            {/* Hour Picker */}
            <View className="items-center mr-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Hour</Text>
              <WheelPicker
                data={Array.from({ length: 24 }, (_, i) => i)}
                selectedValue={selectedHour}
                onValueChange={onHourChange}
                width={90}
                isDark={isDark}
              />
            </View>

            {/* Separator */}
            <View className="items-center justify-center">
              <Text className="text-3xl font-bold text-gray-400 dark:text-gray-200">:</Text>
            </View>

            {/* Minute Picker */}
            <View className="items-center ml-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Min</Text>
              <WheelPicker
                data={Array.from({ length: 60 }, (_, i) => i)}
                selectedValue={selectedMinute}
                onValueChange={onMinuteChange}
                width={90}
                isDark={isDark}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row space-x-3">
          <HapticTouchableOpacity
            onPress={() => {
              HapticPatterns.buttonPress();
              onCancel();
            }}
            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
          </HapticTouchableOpacity>

          <HapticTouchableOpacity
            onPress={() => {
              HapticPatterns.buttonPressPrimary();
              onConfirm();
            }}
            className="flex-1 py-3 px-4 rounded-lg"
            style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
          >
            <Text className="text-white font-medium text-center">Add Recipe</Text>
          </HapticTouchableOpacity>
        </View>
      </View>
    </View>
  );
}
