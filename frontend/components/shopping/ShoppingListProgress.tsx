// frontend/components/shopping/ShoppingListProgress.tsx
// Progress bar component with estimated cost

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import AnimatedProgressBar from '../ui/AnimatedProgressBar';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { ShoppingListItem } from '../../types';

interface ShoppingListProgressProps {
  progressStats: {
    total: number;
    purchased: number;
    progress: number;
  };
  estimatedCost: number;
  spentSoFar: number;
  currentItems: ShoppingListItem[];
}

export default function ShoppingListProgress({
  progressStats,
  estimatedCost,
  spentSoFar,
  currentItems,
}: ShoppingListProgressProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (currentItems.length === 0) return null;

  return (
    <>
      {/* Progress Indicator */}
      <View className="mx-4 mt-4 mb-2">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {progressStats.purchased} of {progressStats.total} items purchased
          </Text>
          <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
            {Math.round(progressStats.progress)}%
          </Text>
        </View>
        <AnimatedProgressBar
          progress={progressStats.progress}
          height={8}
          backgroundColor={isDark ? '#374151' : '#E5E7EB'}
          progressColor={isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen}
          borderRadius={999}
        />
      </View>

      {/* Estimated Total Cost */}
      {estimatedCost > 0 && (
        <View className="mx-4 mb-4">
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Icon name={Icons.CART_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.accent : Colors.accent} accessibilityLabel="Estimated cost" style={{ marginRight: 8 }} />
                <View>
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">Estimated Total</Text>
                  <Text className="text-2xl font-bold" style={{ color: isDark ? DarkColors.accent : Colors.accent }}>
                    ${estimatedCost.toFixed(2)}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-400 italic">
                {currentItems.filter(item => !item.purchased).length} items
              </Text>
            </View>
            {spentSoFar > 0 && (
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">Spent so far</Text>
                <Text className="text-sm font-semibold text-green-600 dark:text-green-400">
                  ${spentSoFar.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </>
  );
}
