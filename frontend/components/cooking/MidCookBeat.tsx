// P2 retention — mid-cook delight beat.
//
// Renders a small floating Sazon "looking good in there" beat at a random
// mid-recipe moment. One per cook. Pure joy-bar peak — costs nothing,
// doubles the peak-moment count per cooking session.
//
// Visual: pastel pill anchored top-center, fades in via spring, holds for
// ~2 seconds, fades out. Light haptic only — never interrupts cooking.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

const BEAT_LINES: readonly string[] = [
  'Looking good in there.',
  'Smells incredible.',
  'You\'re plating soon.',
  "Sazon's watching — proudly.",
  'Halfway home.',
  "That's a chef move.",
];

export function pickBeatLine(seed: number = Date.now()): string {
  const i = Math.abs(Math.floor(seed)) % BEAT_LINES.length;
  return BEAT_LINES[i];
}

interface MidCookBeatProps {
  visible: boolean;
  /** Override the random line — useful for tests. */
  line?: string;
}

export default function MidCookBeat({
  visible,
  line,
}: MidCookBeatProps): React.ReactElement | null {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-8)).current;
  const lineRef = useRef<string>(line ?? pickBeatLine());

  useEffect(() => {
    if (!visible) return;
    if (!line) lineRef.current = pickBeatLine();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translate, {
        toValue: 0,
        damping: 14,
        stiffness: 220,
        mass: 0.6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, line, opacity, translate]);

  useEffect(() => {
    if (visible) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 280,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible && (opacity as unknown as { _value?: number })._value === 0) return null;

  const bg = isDark ? PastelDark.peach : Pastel.peach;
  const accent = Accent.peach;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  return (
    <Animated.View
      testID="mid-cook-beat"
      accessibilityRole="alert"
      accessibilityLabel={lineRef.current}
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY: translate }],
        },
      ]}
    >
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Ionicons name="happy-outline" size={14} color={accent} />
        <Text style={[styles.label, { color: text }]}>{lineRef.current}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
