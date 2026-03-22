// frontend/components/ui/AnimatedRing.tsx
// Animated progress ring/arc using SVG + Reanimated
// Use for meal plan progress, profile completion, macro displays

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../../constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedRingProps {
  /** Progress value 0-100 */
  progress: number;
  /** Ring size (diameter) */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Progress color */
  color?: string;
  /** Background track color */
  trackColor?: string;
  /** Center label (e.g., "75%") */
  label?: string;
  /** Label font size */
  labelSize?: number;
  /** Label color */
  labelColor?: string;
  /** Secondary label below main (e.g., "Complete") */
  sublabel?: string;
  /** Test ID */
  testID?: string;
}

export default function AnimatedRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color,
  trackColor,
  label,
  labelSize = 18,
  labelColor,
  sublabel,
  testID,
}: AnimatedRingProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const progressColor = color ?? (isDark ? DarkColors.primary : Colors.primary);
  const bgTrackColor = trackColor ?? (isDark ? '#2C2C2E' : '#E5E7EB');
  const textColor = labelColor ?? (isDark ? DarkColors.text.primary : Colors.text.primary);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(Math.max(0, Math.min(100, progress)), {
      damping: 15,
      stiffness: 80,
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value / 100);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.container} testID={testID} accessibilityLabel={`Progress: ${Math.round(progress)}%`}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgTrackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      {/* Center labels */}
      {(label || sublabel) && (
        <View style={[styles.labelContainer, { width: size, height: size }]}>
          {label && (
            <Text
              style={[styles.label, { fontSize: labelSize, color: textColor }]}
              accessibilityLabel={label}
            >
              {label}
            </Text>
          )}
          {sublabel && (
            <Text
              style={[styles.sublabel, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}
            >
              {sublabel}
            </Text>
          )}
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
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
  },
  sublabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
});
