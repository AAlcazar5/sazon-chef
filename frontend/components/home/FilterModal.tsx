// frontend/components/home/FilterModal.tsx
// Filter bottom sheet for recipe search filters

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
import { AnimatedLogoMascot } from '../mascot';
import { Colors, DarkColors } from '../../constants/Colors';
import { FilterState } from '../../lib/filterStorage';
import {
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  DIFFICULTY_OPTIONS,
} from '../../utils/filterUtils';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  filters: FilterState;
  onFilterChange: (type: keyof FilterState, value: any) => void;
}

export default function FilterModal({
  visible,
  onClose,
  onApply,
  filters,
  onFilterChange,
}: FilterModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const totalFilters =
    filters.cuisines.length +
    filters.dietaryRestrictions.length +
    (filters.maxCookTime ? 1 : 0) +
    filters.difficulty.length;
  const isRestrictive = totalFilters >= 5;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filter Recipes"
      snapPoints={['75%', '92%']}
      scrollable
    >
      {/* Apply / Cancel row */}
      <View className="flex-row items-center justify-between px-4 pb-2">
        <HapticTouchableOpacity onPress={onClose} style={{ paddingVertical: 8 }}>
          <Text
            className="font-medium"
            style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
          >
            Cancel
          </Text>
        </HapticTouchableOpacity>
        <HapticTouchableOpacity onPress={onApply} style={{ paddingVertical: 8 }}>
          <Text
            className="font-medium"
            style={{ color: isDark ? DarkColors.primary : Colors.primary }}
          >
            Apply
          </Text>
        </HapticTouchableOpacity>
      </View>

      <View className="px-4 pb-6">
        {/* Cuisine */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Cuisine
          </Text>
          <View className="flex-row flex-wrap">
            {CUISINE_OPTIONS.map((cuisine) => (
              <HapticTouchableOpacity
                key={cuisine}
                onPress={() => onFilterChange('cuisines', cuisine)}
                className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                  filters.cuisines.includes(cuisine)
                    ? ''
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                style={
                  filters.cuisines.includes(cuisine)
                    ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.cuisines.includes(cuisine)
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-100'
                  }`}
                >
                  {cuisine}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dietary */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Dietary
          </Text>
          <View className="flex-row flex-wrap">
            {DIETARY_OPTIONS.map((dietary) => (
              <HapticTouchableOpacity
                key={dietary}
                onPress={() => onFilterChange('dietaryRestrictions', dietary)}
                className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                  filters.dietaryRestrictions.includes(dietary)
                    ? ''
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                style={
                  filters.dietaryRestrictions.includes(dietary)
                    ? {
                        backgroundColor: isDark
                          ? DarkColors.tertiaryGreen
                          : Colors.tertiaryGreen,
                        borderColor: isDark
                          ? DarkColors.tertiaryGreen
                          : Colors.tertiaryGreen,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.dietaryRestrictions.includes(dietary)
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-100'
                  }`}
                >
                  {dietary}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cook Time */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Max Cook Time
          </Text>
          <View className="flex-row flex-wrap">
            {[15, 30, 45, 60, 90].map((time) => (
              <HapticTouchableOpacity
                key={time}
                onPress={() => onFilterChange('maxCookTime', time)}
                className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                  filters.maxCookTime === time
                    ? ''
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                style={
                  filters.maxCookTime === time
                    ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.maxCookTime === time
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-100'
                  }`}
                >
                  ≤{time} min
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Difficulty */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Difficulty
          </Text>
          <View className="flex-row flex-wrap">
            {DIFFICULTY_OPTIONS.map((difficulty) => (
              <HapticTouchableOpacity
                key={difficulty}
                onPress={() => onFilterChange('difficulty', difficulty)}
                className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                  filters.difficulty.includes(difficulty)
                    ? ''
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
                style={
                  filters.difficulty.includes(difficulty)
                    ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary,
                      }
                    : undefined
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    filters.difficulty.includes(difficulty)
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-100'
                  }`}
                >
                  {difficulty}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        </View>

        {/* Guidance when many filters selected */}
        {isRestrictive && (
          <View
            className="mb-4 p-4 rounded-lg border"
            style={{
              borderColor: isDark ? '#7c3421' : '#fed7aa',
              backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
            }}
          >
            <View className="flex-row items-start">
              <View className="mr-3">
                <AnimatedLogoMascot
                  expression="thinking"
                  size="small"
                  animationType="idle"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="font-semibold mb-1"
                  style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}
                >
                  Many filters selected
                </Text>
                <Text
                  className="text-sm"
                  style={{ color: isDark ? DarkColors.primary : Colors.primary }}
                >
                  You've selected {totalFilters} filter
                  {totalFilters !== 1 ? 's' : ''}. This might limit your recipe options.
                  Consider removing some to see more suggestions!
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
