// frontend/components/build-a-plate/KeepUnderButton.tsx
// "Keep under" pill — upper-bound caps on macros. Sibling of MacroFitButton.
//
// State pattern matches MacroFitButton: idle / loading / fit (caps respected) /
// impossible (closest combo returned but at least one cap exceeded). Tap opens
// the KeepUnderSheet where the user picks which macros to cap and the values.

import React, { useCallback, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { useTheme } from '../../contexts/ThemeContext';

export type KeepUnderState = 'idle' | 'loading' | 'fit' | 'impossible';

interface KeepUnderButtonProps {
  state: KeepUnderState;
  onPress: () => void;
  testID?: string;
}

interface VisualConfig {
  bg: string;
  fg: string;
  fgDark: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  a11y: string;
}

const STATE_VISUALS: Record<KeepUnderState, VisualConfig> = {
  idle: {
    bg: Pastel.sky,
    fg: '#1F4F7A',
    fgDark: '#A8CCEB',
    icon: 'options-outline',
    label: 'Tune the plate…',
    a11y: 'Tune the plate — pin a min or max for any macro and let Sazon balance the plate within those bounds',
  },
  loading: {
    bg: Pastel.sky,
    fg: '#1F4F7A',
    fgDark: '#A8CCEB',
    icon: 'options-outline',
    label: 'Tuning…',
    a11y: 'Computing within-bounds fit',
  },
  fit: {
    bg: Pastel.sage,
    fg: '#2E5931',
    fgDark: '#A8DDA9',
    icon: 'checkmark-circle',
    label: 'Within bounds',
    a11y: 'Plate stays within every bound you set',
  },
  impossible: {
    bg: Pastel.peach,
    fg: '#8a4a00',
    fgDark: '#FFD4A6',
    icon: 'alert-circle',
    label: 'Cannot meet bounds',
    a11y: 'Cannot stay within all bounds — Sazon returned the closest plate',
  },
};

export default function KeepUnderButton({ state, onPress, testID }: KeepUnderButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const visuals = STATE_VISUALS[state];
  const fg = isDark ? visuals.fgDark : visuals.fg;
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (state === 'fit' || state === 'impossible') {
      scale.value = withSpring(1.06, { damping: 10, stiffness: 220 }, () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      });
    }
  }, [state, scale]);

  useEffect(() => {
    if (state === 'loading') {
      pulse.value = withRepeat(withTiming(0.4, { duration: 700 }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [state, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const iconAnimatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

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
        <Animated.View
          style={state === 'loading' ? iconAnimatedStyle : undefined}
          testID={state === 'loading' && testID ? `${testID}-loading` : undefined}
        >
          <Ionicons name={visuals.icon} size={16} color={fg} />
        </Animated.View>
        <Text style={[styles.label, { color: fg }]} numberOfLines={1}>{visuals.label}</Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    minWidth: 0,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    flexShrink: 1,
  },
});
