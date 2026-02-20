// frontend/components/meal-plan/TotalPrepTimeCard.tsx
// Card showing total preparation time for the day

import React from 'react';
import { View, Text } from 'react-native';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

interface TotalPrepTimeCardProps {
  /** Total prep time in minutes */
  totalPrepTime: number;
  /** Whether dark mode is active */
  isDark: boolean;
}

function TotalPrepTimeCard({
  totalPrepTime,
  isDark,
}: TotalPrepTimeCardProps) {
  if (totalPrepTime <= 0) return null;

  return (
    <View className="px-4 mb-4">
      <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Icon name={Icons.COOK_TIME} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Total prep time" />
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 ml-2">
              Total Prep Time
            </Text>
          </View>
          <Text className="text-lg font-bold" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
            {totalPrepTime} min
          </Text>
        </View>
        <Text className="text-sm text-gray-600 dark:text-gray-200 mt-1">
          Combined cooking time for all meals today
        </Text>
      </View>
    </View>
  );
}


export default React.memo(TotalPrepTimeCard);
