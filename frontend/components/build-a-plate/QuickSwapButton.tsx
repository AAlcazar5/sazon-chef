// frontend/components/build-a-plate/QuickSwapButton.tsx
// Group 10X — compact one-tap swap to the top alternative; sits on the right
// edge of the slot card. Replaces the 3-chip SwapStrip pattern.

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import type { MealComponent } from '../../lib/api';

interface QuickSwapButtonProps {
  topAlternative: MealComponent | null;
  onSwap: (componentId: string) => void;
  testID?: string;
}

export default function QuickSwapButton({
  topAlternative,
  onSwap,
  testID,
}: QuickSwapButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (!topAlternative) return;
    scale.value = withSpring(0.92, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
    onSwap(topAlternative.id);
  }, [topAlternative, onSwap, scale]);

  if (!topAlternative) return null;

  // Saturated dark sage gives WCAG-AA contrast against every pastel slot
  // tint (sage / golden / lavender / peach). Circular footprint avoids
  // overlapping the slot card's macro chips on the right side.
  const bg = isDark ? '#1F4022' : '#2E5931';

  return (
    <Animated.View style={animatedStyle}>
      <HapticTouchableOpacity
        onPress={handlePress}
        hapticStyle="light"
        pressedScale={0.92}
        style={[styles.button, { backgroundColor: bg }, Shadows.MD as any]}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`Swap to ${topAlternative.name}`}
      >
        <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
