// frontend/components/cooking/CookingStepRow.tsx
// ROADMAP 4.0 Tier J10 — Cooking-step sage flash.
//
// Tappable step row that produces a designed peak moment when checked off:
// sage-green flash (200ms), checkmark spring-bounce, haptic medium. Only fires
// on the OFF→ON transition; tapping a completed row again does not re-trigger.
// Inspired by REDESIGN_PHILOSOPHY.md:549 — the cooking equivalent of a Duolingo
// lesson rhythm.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const SAGE = '#A6CFA1';
const SAGE_DARK = '#557D52';
const FLASH_MS = 200;

interface CookingStepRowProps {
  stepNumber: number;
  text: string;
  completed?: boolean;
  onToggle: () => void;
}

export default function CookingStepRow({
  stepNumber,
  text,
  completed = false,
  onToggle,
}: CookingStepRowProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const wasCompleted = useRef(completed);
  const flashProgress = useSharedValue(0);
  const checkScale = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    if (completed && !wasCompleted.current) {
      // OFF → ON transition: peak moment
      Promise.resolve(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)).catch(() => undefined);
      flashProgress.value = withSequence(
        withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: FLASH_MS - 80, easing: Easing.out(Easing.quad) }),
      );
      checkScale.value = withSpring(1, { damping: 10, stiffness: 220 });
    } else if (!completed && wasCompleted.current) {
      // ON → OFF: silent un-check
      checkScale.value = withTiming(0, { duration: 120 });
    }
    wasCompleted.current = completed;
  }, [completed, flashProgress, checkScale]);

  const animatedRowStyle = useAnimatedStyle(() => {
    const baseColor = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
    const flashColor = isDark ? SAGE_DARK : SAGE;
    return {
      backgroundColor: interpolateColor(
        flashProgress.value,
        [0, 1],
        [baseColor, flashColor],
      ),
    };
  });

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const text1 = isDark ? DarkColors.text.primary : Colors.text.primary;
  const text2 = isDark ? DarkColors.text.tertiary : Colors.text.tertiary;
  const numberBg = completed
    ? isDark
      ? SAGE_DARK
      : SAGE
    : isDark
      ? '#374151'
      : '#E5E7EB';

  return (
    <TouchableOpacity
      testID={`cooking-step-row-${stepNumber}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={`Step ${stepNumber}: ${text}`}
      onPress={onToggle}
      activeOpacity={0.85}
      style={styles.touchRoot}
    >
      <Animated.View style={[styles.row, animatedRowStyle]}>
        <View style={[styles.numberCircle, { backgroundColor: numberBg }]}>
          {completed && (
            <Animated.View style={[styles.checkOverlay, animatedCheckStyle]}>
              <Ionicons
                name="checkmark"
                size={16}
                color="#FFFFFF"
                testID={`cooking-step-row-${stepNumber}-check`}
              />
            </Animated.View>
          )}
          {!completed && (
            <Text style={styles.number}>{stepNumber}</Text>
          )}
        </View>
        <Text
          style={[
            styles.text,
            { color: completed ? text2 : text1 },
            completed && styles.textCompleted,
          ]}
        >
          {text}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchRoot: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 12,
  },
  numberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  textCompleted: {
    textDecorationLine: 'line-through',
  },
});
