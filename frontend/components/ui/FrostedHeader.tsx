// Frosted glass header wrapper using expo-blur
// Wraps any header content in a BlurView with Sazon-branded translucent surface.
// Usage: replace the outer <View className="bg-white ...border-b..."> with <FrostedHeader>

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

interface FrostedHeaderProps {
  children: React.ReactNode;
  /** Extra padding at the bottom of the header (default 12) */
  paddingBottom?: number;
  /** If true, adds safe-area top inset automatically */
  withTopInset?: boolean;
}

export default function FrostedHeader({
  children,
  paddingBottom = 12,
  withTopInset = true,
}: FrostedHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const topPad = withTopInset ? insets.top : 0;

  if (Platform.OS === 'android') {
    // BlurView on Android requires additional setup; use a semi-transparent fallback
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: topPad,
            paddingBottom,
            backgroundColor: isDark
              ? 'rgba(15, 15, 15, 0.95)'
              : 'rgba(250, 247, 244, 0.95)',
          },
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={isDark ? 60 : 80}
      tint={isDark ? 'dark' : 'light'}
      style={[
        styles.container,
        {
          paddingTop: topPad,
          paddingBottom,
        },
      ]}
    >
      {/* Tint overlay to add brand warmth */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(17, 24, 39, 0.45)'
              : 'rgba(255, 255, 255, 0.55)',
          },
        ]}
        pointerEvents="none"
      />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    zIndex: 10,
  },
});
