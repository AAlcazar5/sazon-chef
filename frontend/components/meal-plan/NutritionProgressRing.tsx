// frontend/components/meal-plan/NutritionProgressRing.tsx
// Circular progress ring for a single nutrition goal (calories, protein, carbs, fat)

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { Colors, DarkColors } from '../../constants/Colors';

interface NutritionProgressRingProps {
  /** Current progress 0–100 (clamped internally) */
  progress: number;
  /** Goal label shown below the ring */
  label: string;
  /** Diameter of the ring in pixels */
  size?: number;
  /** Ring fill colour */
  color?: string;
  /** Background track colour */
  trackColor?: string;
  /** Dark mode flag */
  isDark?: boolean;
}

/**
 * A simple circular progress ring using concentric Views.
 * `progress` is clamped to [0, 100] so callers never need to guard it.
 */
export default function NutritionProgressRing({
  progress,
  label,
  size = 80,
  color = '#FA7E12',
  trackColor,
  isDark = false,
}: NutritionProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const ringWidth = Math.round(size * 0.1);
  const resolvedTrack = trackColor ?? (isDark ? '#374151' : '#E5E7EB');

  // Animate fill opacity from 0 → target on mount
  const fillOpacity = useSharedValue(0);
  const scaleVal = useSharedValue(0.85);

  useEffect(() => {
    const targetOpacity = clamped > 0 ? clamped / 100 + 0.15 : 0;
    fillOpacity.value = withDelay(200, withTiming(targetOpacity, { duration: 600, easing: Easing.out(Easing.cubic) }));
    scaleVal.value = withDelay(100, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
  }, [clamped]);

  const fillAnimStyle = useAnimatedStyle(() => ({
    opacity: fillOpacity.value,
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        testID="nutrition-progress-ring"
        style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, ringAnimStyle]}
      >
        {/* Background track */}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: resolvedTrack,
          }}
        />
        {/* Filled arc — simplified as a full ring at reduced opacity for 0 progress */}
        <Animated.View
          testID="progress-fill"
          style={[{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: ringWidth,
            borderColor: color,
          }, fillAnimStyle]}
        />
        {/* Centre percentage */}
        <Text
          testID="progress-percent"
          style={{
            fontSize: Math.round(size * 0.2),
            fontWeight: '700',
            color: isDark ? DarkColors.text.primary : Colors.text.primary,
          }}
        >
          {`${Math.round(clamped)}%`}
        </Text>
      </Animated.View>

      {/* Goal label */}
      <Text
        testID="progress-label"
        style={{
          marginTop: 4,
          fontSize: Math.round(size * 0.14),
          color: isDark ? '#9CA3AF' : '#6B7280',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
