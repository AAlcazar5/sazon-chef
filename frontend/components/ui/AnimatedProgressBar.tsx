import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  borderRadius?: number;
  duration?: number;
  /** Use spring physics instead of timing animation */
  useSpring?: boolean;
  style?: any;
}

export default function AnimatedProgressBar({
  progress,
  height = 8,
  backgroundColor = '#E5E7EB',
  progressColor = '#3B82F6',
  borderRadius = 999,
  duration = 800,
  useSpring: springMode = false,
  style,
}: AnimatedProgressBarProps) {
  const progressValue = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, progress));
    if (springMode) {
      progressValue.value = withSpring(clamped, {
        damping: 15,
        stiffness: 80,
      });
    } else {
      progressValue.value = withTiming(clamped, { duration });
    }
  }, [progress, duration, springMode]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%` as any,
  }));

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor, borderRadius },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.progress,
          { height, backgroundColor: progressColor, borderRadius },
          progressStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
