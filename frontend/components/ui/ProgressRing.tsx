// frontend/components/ui/ProgressRing.tsx
// Enhanced circular progress indicator with gradient stroke support and center content.
// Inspired by Apple Fitness rings. Used for calorie goals, shopping progress, Sazon Score.

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { DarkColors } from '../../constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** Progress value 0–1 */
  progress: number;
  /** Ring diameter */
  size: number;
  /** Stroke width (default 8) */
  strokeWidth?: number;
  /** Solid color OR gradient array (e.g., ['#FFB74D', '#FB923C']) */
  color: string | string[];
  /** Track background color */
  bgColor?: string;
  /** Center content (icon, number, mascot) */
  children?: React.ReactNode;
  /** Animation duration in ms (default 800) */
  duration?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

export default function ProgressRing({
  progress,
  size,
  strokeWidth = 8,
  color,
  bgColor,
  children,
  duration = 800,
  style,
  testID,
}: ProgressRingProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const reduceMotion = useReducedMotion();

  const trackColor = bgColor ?? (isDark ? '#2C2C2E' : '#E5E7EB');
  const isGradient = Array.isArray(color);
  const solidColor = isGradient ? undefined : color;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // Clamp progress to reasonable range (allow >100% for overflow visual)
  const clampedProgress = Math.max(0, Math.min(progress, 1.5));

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      animatedProgress.value = clampedProgress;
    } else {
      animatedProgress.value = withTiming(clampedProgress, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [clampedProgress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const gradientId = `ring-gradient-${size}`;

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      testID={testID}
      accessibilityLabel={`Progress: ${Math.round(progress * 100)}%`}
    >
      <Svg width={size} height={size}>
        {isGradient && (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              {(color as string[]).map((c, i) => (
                <Stop
                  key={i}
                  offset={`${(i / ((color as string[]).length - 1)) * 100}%`}
                  stopColor={c}
                />
              ))}
            </LinearGradient>
          </Defs>
        )}

        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={isGradient ? `url(#${gradientId})` : solidColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center content */}
      {children && (
        <View style={[styles.center, { width: size, height: size }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
