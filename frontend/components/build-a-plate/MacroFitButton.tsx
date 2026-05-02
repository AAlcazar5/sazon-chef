// frontend/components/build-a-plate/MacroFitButton.tsx
// Group 10X Phase 5 — "Fit my macros" pill: green when fit, amber when impossible.

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { useTheme } from '../../contexts/ThemeContext';

export type MacroFitState = 'idle' | 'loading' | 'fit' | 'impossible';

interface MacroFitButtonProps {
  state: MacroFitState;
  onPress: () => void;
  testID?: string;
}

interface VisualConfig {
  bg: string;
  fg: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  a11y: string;
}

const STATE_VISUALS: Record<MacroFitState, VisualConfig> = {
  idle: {
    bg: Pastel.lavender,
    fg: '#6a2677',
    icon: 'sparkles-outline',
    label: 'Fit my macros',
    a11y: 'Fit my macros — auto-balance the plate to your daily macro target',
  },
  loading: {
    bg: Pastel.lavender,
    fg: '#6a2677',
    icon: 'sparkles-outline',
    label: 'Fitting…',
    a11y: 'Computing macro fit',
  },
  fit: {
    bg: Pastel.sage,
    fg: '#2E5931',
    icon: 'checkmark-circle',
    label: 'Macros fit',
    a11y: 'Macros fit — your plate is within ten percent of your daily target',
  },
  impossible: {
    bg: Pastel.peach,
    fg: '#8a4a00',
    icon: 'alert-circle',
    label: 'Cannot fit today',
    a11y: "Cannot fit my macros — Sazon couldn't land within your remaining target",
  },
};

export default function MacroFitButton({ state, onPress, testID }: MacroFitButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const visuals = STATE_VISUALS[state];
  const scale = useSharedValue(1);

  // Spring pulse when state transitions to fit / impossible
  useEffect(() => {
    if (state === 'fit' || state === 'impossible') {
      scale.value = withSpring(1.06, { damping: 10, stiffness: 220 }, () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      });
    }
  }, [state, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    if (state === 'loading') return;
    onPress();
  }, [state, onPress]);

  return (
    <Animated.View style={animatedStyle}>
      <HapticTouchableOpacity
        onPress={handlePress}
        hapticStyle={state === 'fit' ? 'medium' : 'light'}
        pressedScale={0.97}
        style={[
          styles.pill,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : visuals.bg },
          Shadows.SM as any,
        ]}
        testID={testID}
        accessibilityLabel={visuals.a11y}
      >
        {state === 'loading' ? (
          <ActivityIndicator
            size="small"
            color={visuals.fg}
            testID={testID ? `${testID}-loading` : undefined}
          />
        ) : (
          <Ionicons name={visuals.icon} size={16} color={visuals.fg} />
        )}
        <Text style={[styles.label, { color: visuals.fg }]} numberOfLines={1}>{visuals.label}</Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
  },
});
