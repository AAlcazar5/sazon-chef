// frontend/components/ui/ScreenGradient.tsx
// Soft gradient screen background wrapper — the single biggest difference
// between "clean" and "premium." Every tab screen uses this instead of flat white.

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

interface ScreenGradientProps {
  children: React.ReactNode;
  /** Gradient variant */
  variant?: 'default' | 'auth' | 'onboarding' | 'paywall';
  /** Additional styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

// Light mode gradients — uniform warm cream backgrounds
// Auth/onboarding use a stronger warm tint that gradually fades into the
// default app gradient, creating smooth visual continuity across screens.
const LIGHT_GRADIENTS = {
  default: {
    colors: ['#FFFBF7', '#FFFFFF'] as const, // subtle warm cream → white
    locations: [0, 1] as const,
  },
  auth: {
    colors: ['rgba(250, 126, 18, 0.10)', 'rgba(250, 126, 18, 0.03)'] as const, // stronger warm tint
    locations: [0, 1] as const,
  },
  onboarding: {
    colors: ['rgba(250, 126, 18, 0.08)', 'rgba(250, 126, 18, 0.02)'] as const, // between auth and default
    locations: [0, 1] as const,
  },
  paywall: {
    colors: ['#1A1A2E', 'rgba(250, 126, 18, 0.08)'] as const,
    locations: [0, 1] as const,
  },
};

// Dark mode gradients — subtle deep tints with warm undertones
const DARK_GRADIENTS = {
  default: {
    colors: ['#141420', '#0F0F0F'] as const,
    locations: [0, 1] as const,
  },
  auth: {
    colors: ['#1A1520', '#0D0D0D'] as const, // warm deep tint matching default family
    locations: [0, 1] as const,
  },
  onboarding: {
    colors: ['rgba(250, 126, 18, 0.05)', '#0D0D0D'] as const,
    locations: [0, 1] as const,
  },
  paywall: {
    colors: ['#0D0D0D', 'rgba(250, 126, 18, 0.06)'] as const,
    locations: [0, 1] as const,
  },
};

export default function ScreenGradient({
  children,
  variant = 'default',
  style,
  testID,
}: ScreenGradientProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const gradients = isDark ? DARK_GRADIENTS : LIGHT_GRADIENTS;
  const { colors, locations } = gradients[variant];

  return (
    <LinearGradient
      colors={colors as unknown as string[]}
      locations={locations as unknown as number[]}
      style={[styles.container, style]}
      testID={testID}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
