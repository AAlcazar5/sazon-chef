// frontend/components/legal/HealthDisclaimer.tsx
// ROADMAP 4.0 E7 — contextual health disclaimer.
//
// Surfaces inline (not blocking) on three first-touch events:
//   - first AI-generated recipe view
//   - first macro-goal change
//   - first weight target set
//
// Each event uses its own AsyncStorage key so the user sees the disclaimer
// once per context, not once globally. Lifestyle voice — explicitly NOT a
// medical-app verdict, just a "we're not your doctor" line per persona.md.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export type HealthDisclaimerKey = 'ai_recipe_first_view' | 'macro_goal_first_change' | 'weight_target_first_set';

const STORAGE_PREFIX = '@sazon/health_disclaimer/';

const COPY: Record<HealthDisclaimerKey, { title: string; body: string }> = {
  ai_recipe_first_view: {
    title: 'A note about AI recipes',
    body: 'Sazon helps you cook — it isn\'t medical advice. If you have allergies or a condition, double-check ingredients with your provider.',
  },
  macro_goal_first_change: {
    title: 'About macro goals',
    body: 'These are starting points for cooking, not a prescription. Talk to a registered dietitian for nutrition planning tied to your health.',
  },
  weight_target_first_set: {
    title: 'About weight targets',
    body: 'Sazon doesn\'t diagnose or treat. If weight is medically important for you, partner with your doctor — we\'ll keep cooking great food alongside you.',
  },
};

export async function shouldShowHealthDisclaimer(key: HealthDisclaimerKey): Promise<boolean> {
  const seen = await AsyncStorage.getItem(STORAGE_PREFIX + key);
  return seen !== '1';
}

export async function markHealthDisclaimerSeen(key: HealthDisclaimerKey): Promise<void> {
  await AsyncStorage.setItem(STORAGE_PREFIX + key, '1');
}

export async function __resetHealthDisclaimerForTest(key: HealthDisclaimerKey): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_PREFIX + key);
}

interface HealthDisclaimerProps {
  eventKey: HealthDisclaimerKey;
  /** Called after the user dismisses (so the host can hide its container). */
  onDismiss?: () => void;
  /** Inject for tests. */
  storage?: Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
}

/**
 * Self-gating inline banner — renders only the first time `eventKey` is hit.
 * Subsequent renders are no-ops.
 */
export default function HealthDisclaimer({ eventKey, onDismiss, storage }: HealthDisclaimerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [visible, setVisible] = useState<boolean>(false);
  const [resolved, setResolved] = useState<boolean>(false);
  const store = storage ?? AsyncStorage;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await store.getItem(STORAGE_PREFIX + eventKey);
      if (cancelled) return;
      setVisible(seen !== '1');
      setResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventKey, store]);

  if (!resolved || !visible) return null;

  const copy = COPY[eventKey];

  return (
    <View
      testID={`health-disclaimer-${eventKey}`}
      accessibilityRole="alert"
      style={[
        styles.banner,
        { backgroundColor: isDark ? PastelDark.golden : Pastel.golden },
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: isDark ? DarkColors.text.primary : Colors.text.primary },
          ]}
        >
          {copy.title}
        </Text>
        <Text
          style={[
            styles.body,
            { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
          ]}
        >
          {copy.body}
        </Text>
      </View>
      <HapticTouchableOpacity
        testID={`health-disclaimer-${eventKey}-ack`}
        onPress={async () => {
          await store.setItem(STORAGE_PREFIX + eventKey, '1');
          setVisible(false);
          onDismiss?.();
        }}
        accessibilityLabel="Got it"
        accessibilityRole="button"
        style={[
          styles.ack,
          { backgroundColor: isDark ? Accent.golden : '#FFFFFF' },
        ]}
      >
        <Text
          style={[
            styles.ackLabel,
            { color: isDark ? DarkColors.text.primary : Accent.golden },
          ]}
        >
          Got it
        </Text>
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 13,
    marginBottom: 4,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  ack: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
  },
  ackLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
  },
});
