// frontend/components/ui/FrostedCard.tsx
// Glassmorphic frosted-glass card for premium visual depth
// iOS: BlurView + semi-transparent bg. Android: semi-transparent fallback.

import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';

interface FrostedCardProps {
  children: React.ReactNode;
  /** Blur intensity (iOS only, default 20) */
  intensity?: number;
  /** Border radius (default 20 — card radius) */
  borderRadius?: number;
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

export default function FrostedCard({
  children,
  intensity = 20,
  borderRadius = BorderRadius.card,
  style,
  testID,
}: FrostedCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const cardStyles: ViewStyle = {
    borderRadius,
    overflow: 'hidden',
    ...(Shadows.MD as ViewStyle),
  };

  if (Platform.OS === 'android') {
    // Android fallback — semi-transparent bg without blur
    return (
      <View
        style={[
          cardStyles,
          {
            backgroundColor: isDark
              ? 'rgba(28, 28, 30, 0.85)'
              : 'rgba(255, 255, 255, 0.85)',
          },
          style,
        ]}
        testID={testID}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[cardStyles, style]} testID={testID}>
      <BlurView
        intensity={intensity}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      {/* Semi-transparent color overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(28, 28, 30, 0.7)'
              : 'rgba(255, 255, 255, 0.7)',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: isDark
              ? 'rgba(255, 255, 255, 0.08)'
              : 'rgba(0, 0, 0, 0.04)',
            borderRadius,
          },
        ]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}
