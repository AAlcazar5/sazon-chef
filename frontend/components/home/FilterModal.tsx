// frontend/components/home/FilterModal.tsx
// Filter modal for recipe search filters

import { View, Text, ScrollView, Modal, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { AnimatedLogoMascot } from '../mascot';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration, Spring } from '../../constants/Animations';
import { FilterState } from '../../lib/filterStorage';
import {
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  DIFFICULTY_OPTIONS,
} from '../../utils/filterUtils';

interface FilterModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Called when filters should be applied */
  onApply: () => void;
  /** Current filter state */
  filters: FilterState;
  /** Called when a filter value changes */
  onFilterChange: (type: keyof FilterState, value: any) => void;
}

/**
 * Filter modal component with slide-in animation
 * Allows users to filter recipes by cuisine, dietary restrictions, cook time, and difficulty
 */
export default function FilterModal({
  visible,
  onClose,
  onApply,
  filters,
  onFilterChange,
}: FilterModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(-300);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: Spring.default.friction,
          tension: Spring.default.tension,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -300,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  // Calculate total filters for guidance message
  const totalFilters =
    filters.cuisines.length +
    filters.dietaryRestrictions.length +
    (filters.maxCookTime ? 1 : 0) +
    filters.difficulty.length;
  const isRestrictive = totalFilters >= 5;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View className="flex-1 bg-black/50" style={{ opacity }}>
        <Animated.View
          className="flex-1 bg-gray-50 dark:bg-gray-900"
          style={{ transform: [{ translateY }] }}
        >
          <SafeAreaView className="flex-1" edges={['bottom']}>
            {/* Modal Header */}
            <View
              className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between"
              style={{ minHeight: 60, paddingTop: insets.top }}
            >
              <HapticTouchableOpacity
                onPress={onClose}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text
                  className="font-medium"
                  style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}
                >
                  Cancel
                </Text>
              </HapticTouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Filter Recipes
              </Text>
              <HapticTouchableOpacity
                onPress={onApply}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text
                  className="font-medium"
                  style={{ color: isDark ? DarkColors.primary : Colors.primary }}
                >
                  Apply
                </Text>
              </HapticTouchableOpacity>
            </View>

            <ScrollView
              className="flex-1 px-4 py-4"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Cuisine Filter */}
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

              {/* Dietary Restrictions Filter */}
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

              {/* Cook Time Filter */}
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

              {/* Difficulty Filter */}
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

              {/* Filter Guidance - Show when many filters are selected */}
              {isRestrictive && (
                <View
                  className={`mt-4 mb-4 p-4 rounded-lg border ${
                    isDark ? 'border-orange-800' : 'border-orange-200'
                  }`}
                  style={{
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
                        Consider removing some filters to see more suggestions!
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
