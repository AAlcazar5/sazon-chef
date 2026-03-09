import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  borderRadius?: number;
  duration?: number;
  style?: any;
}

export default function AnimatedProgressBar({
  progress,
  height = 8,
  backgroundColor = '#E5E7EB',
  progressColor = '#3B82F6',
  borderRadius = 999,
  duration = 800,
  style,
}: AnimatedProgressBarProps) {
  const progressValue = useSharedValue(0);

  useEffect(() => {
    progressValue.value = withTiming(Math.max(0, Math.min(100, progress)), {
      duration,
    });
  }, [progress, duration]);

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
