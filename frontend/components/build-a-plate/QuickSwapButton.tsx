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

  const bg = isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF';
  const fg = isDark ? '#F9FAFB' : '#1F2937';
  const subFg = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <Animated.View style={animatedStyle}>
      <HapticTouchableOpacity
        onPress={handlePress}
        hapticStyle="light"
        pressedScale={0.96}
        style={[styles.button, { backgroundColor: bg }, Shadows.SM as any]}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`Swap to ${topAlternative.name}`}
      >
        <Ionicons name="swap-horizontal" size={14} color={fg} />
        <View style={styles.textBlock}>
          <Text style={[styles.eyebrow, { color: subFg }]}>SWAP</Text>
          <Text style={[styles.name, { color: fg }]} numberOfLines={1}>
            {topAlternative.name}
          </Text>
        </View>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    maxWidth: 130,
  },
  textBlock: {
    flexShrink: 1,
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 8,
    letterSpacing: 1,
  },
  name: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
});
