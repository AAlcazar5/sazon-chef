import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

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
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const previousProgress = useRef(progress);

  useEffect(() => {
    // Animate from previous progress to new progress
    Animated.timing(animatedWidth, {
      toValue: Math.max(0, Math.min(100, progress)), // Clamp between 0-100
      duration,
      useNativeDriver: false, // width animation requires layout
    }).start();

    previousProgress.current = progress;
  }, [progress, duration, animatedWidth]);

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.progress,
          {
            height,
            backgroundColor: progressColor,
            borderRadius,
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
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

