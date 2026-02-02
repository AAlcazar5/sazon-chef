// frontend/components/meal-plan/AnimatedHourHeader.tsx
// Animated hour header with drag-over effects

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

interface AnimatedHourHeaderProps {
  hourData: any;
  hourlyMeals: { [key: number]: any[] };
  isDark: boolean;
  isDragOver: boolean;
  onAddMeal: (hour: number) => void;
}

const AnimatedHourHeader = ({
  hourData,
  hourlyMeals,
  isDark,
  isDragOver,
  onAddMeal,
}: AnimatedHourHeaderProps) => {
  const scale = useSharedValue(1);
  const borderWidth = useSharedValue(0);
  const backgroundColor = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isDragOver) {
      scale.value = withSpring(1.03);
      borderWidth.value = withSpring(3);
      backgroundColor.value = withSpring(1);
      opacity.value = withSpring(1);
      // Continuous pulsing animation
      pulseScale.value = withRepeat(
        withTiming(1.05, { duration: 600 }),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1);
      borderWidth.value = withSpring(0);
      backgroundColor.value = withSpring(0);
      opacity.value = withSpring(1);
      pulseScale.value = withSpring(1);
    }
  }, [isDragOver, scale, borderWidth, backgroundColor, pulseScale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    const bgColor = backgroundColor.value === 1
      ? (isDark ? `${Colors.primaryLight}40` : `${Colors.primaryLight}80`)
      : undefined;

    return {
      transform: [{ scale: scale.value * pulseScale.value }],
      borderWidth: borderWidth.value,
      borderColor: borderWidth.value > 0
        ? (isDark ? DarkColors.primary : Colors.primary)
        : 'transparent',
      borderStyle: borderWidth.value > 0 ? 'dashed' : 'solid',
      backgroundColor: bgColor,
      opacity: opacity.value,
      shadowColor: borderWidth.value > 0 ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: borderWidth.value > 0 ? 0.3 : 0,
      shadowRadius: 8,
      elevation: borderWidth.value > 0 ? 8 : 0,
    };
  });

  const dropZoneStyle = useAnimatedStyle(() => {
    if (isDragOver && (!hourlyMeals[hourData.hour] || hourlyMeals[hourData.hour].length === 0)) {
      return {
        opacity: withSpring(1),
        transform: [{ scale: withSpring(1) }],
      };
    }
    return {
      opacity: withSpring(0),
      transform: [{ scale: withSpring(0.8) }],
    };
  });

  return (
    <Reanimated.View
      className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm relative"
      style={animatedStyle}
    >
      {/* Drop Zone Indicator */}
      {isDragOver && (
        <Reanimated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 8,
              backgroundColor: isDark ? `${Colors.primary}20` : `${Colors.primary}15`,
              alignItems: 'center',
              justifyContent: 'center',
            },
            dropZoneStyle,
          ]}
          pointerEvents="none"
        >
          <View className="flex-row items-center">
            <Icon
              name={Icons.ADD_CIRCLE_OUTLINE}
              size={IconSizes.LG}
              color={isDark ? DarkColors.primary : Colors.primary}
              accessibilityLabel="Drop zone"
            />
            <Text
              className="ml-2 font-semibold"
              style={{ color: isDark ? DarkColors.primary : Colors.primary }}
            >
              Drop here
            </Text>
          </View>
        </Reanimated.View>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-16" style={{ flexShrink: 0 }}>
            <Text
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {hourData.displayTime}
            </Text>
          </View>

          <View className="flex-1 ml-3">
            {hourlyMeals[hourData.hour] && hourlyMeals[hourData.hour].length > 0 ? (
              <Text className="text-sm text-gray-600 dark:text-gray-100">
                {hourlyMeals[hourData.hour].length} meal{hourlyMeals[hourData.hour].length > 1 ? 's' : ''} planned
              </Text>
            ) : (
              <Text className="text-sm text-gray-400 dark:text-gray-200">No meals planned</Text>
            )}
          </View>
        </View>

        <HapticTouchableOpacity
          onPress={() => onAddMeal(hourData.hour)}
          className="p-2 ml-2"
        >
          <Icon name={Icons.ADD_CIRCLE_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Add meal to this hour" />
        </HapticTouchableOpacity>
      </View>
    </Reanimated.View>
  );
};

export default AnimatedHourHeader;
