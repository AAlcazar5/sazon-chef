// frontend/components/build-a-plate/PantryOnlyToggle.tsx
// Group 10X — "Cook with what I have" pantry-only filter.
//
// On-state affordance is layered on purpose: filled-icon swap + checkmark
// badge + scale spring on activation + saturated bg. Off-state is a neutral
// pastel so the green is reserved as the "on" signal, not just a hue shift.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { PastelDark } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';

interface PantryOnlyToggleProps {
  active: boolean;
  onToggle: () => void;
  testID?: string;
}

export default function PantryOnlyToggle({ active, onToggle, testID }: PantryOnlyToggleProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const scale = useSharedValue(1);
  useEffect(() => {
    if (active) {
      scale.value = withSpring(1.06, { damping: 10, stiffness: 220 }, () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      });
    }
  }, [active, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Active uses deep sage (#2E5931) for WCAG-AA contrast against white text;
  // Accent.sage (#81C784) was ~2.6:1, below the readable threshold.
  const bg = active
    ? '#2E5931'
    : isDark
    ? 'rgba(255,255,255,0.08)'
    : PastelDark.sage;

  const fg = active
    ? '#FFFFFF'
    : isDark
    ? '#A8DDA9'
    : '#2E5931';

  return (
    <Animated.View style={[animatedStyle, { alignSelf: 'flex-start' }]}>
      <HapticTouchableOpacity
        onPress={onToggle}
        hapticStyle={active ? 'medium' : 'light'}
        pressedScale={0.97}
        style={[
          styles.chip,
          { backgroundColor: bg },
          active ? (Shadows.SM as any) : null,
        ]}
        testID={testID}
        accessibilityRole="switch"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`Cook with what I have, ${active ? 'on' : 'off'}`}
      >
        <View testID={testID ? `${testID}-icon-${active ? 'on' : 'off'}` : undefined}>
          <Ionicons
            name={active ? 'basket' : 'basket-outline'}
            size={16}
            color={fg}
          />
        </View>
        <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
          Cook with what I have
        </Text>
        {active && (
          <View
            style={styles.checkBadge}
            testID={testID ? `${testID}-check` : undefined}
          >
            <Ionicons name="checkmark" size={12} color="#2E5931" />
          </View>
        )}
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 100,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
