// frontend/components/build-a-plate/RainbowHint.tsx
// Group 10X Phase 9 — "Eat the rainbow" hint shown above Vegetable picker when user lacks greens.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';

export const RAINBOW_HINT_KEY = 'rainbow_hint_dismissed';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface RainbowConditions {
  greenVegCount: number;
  totalPlates: number;
}

export const shouldShowRainbowHint = ({ greenVegCount, totalPlates }: RainbowConditions): boolean =>
  greenVegCount === 0 && totalPlates >= 4;

interface RainbowHintProps {
  greenVegCount: number;
  totalPlates: number;
  copy?: string;
  testID?: string;
}

const DEFAULT_COPY =
  "You haven't had greens this week — spinach + broccoli are in your pantry";

export default function RainbowHint({
  greenVegCount,
  totalPlates,
  copy = DEFAULT_COPY,
  testID,
}: RainbowHintProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate dismissal state from AsyncStorage
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const raw = await AsyncStorage.getItem(RAINBOW_HINT_KEY);
        if (!raw) {
          if (!cancelled) setHydrated(true);
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed?.expiresAt && parsed.expiresAt > Date.now()) {
          if (!cancelled) {
            setDismissed(true);
            setHydrated(true);
          }
        } else {
          if (!cancelled) setHydrated(true);
        }
      } catch {
        if (!cancelled) setHydrated(true);
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    try {
      await AsyncStorage.setItem(
        RAINBOW_HINT_KEY,
        JSON.stringify({ expiresAt: Date.now() + SEVEN_DAYS_MS }),
      );
    } catch {
      // Non-blocking — banner is dismissed locally either way.
    }
  }, []);

  if (!shouldShowRainbowHint({ greenVegCount, totalPlates })) return null;
  if (!hydrated || dismissed) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(129,199,132,0.12)' : Pastel.sage },
        Shadows.SM as any,
      ]}
      testID={testID}
      accessibilityLabel={copy}
    >
      <Text style={[styles.body, { color: isDark ? '#A6E0A8' : '#2E5931' }]}>{copy}</Text>
      <HapticTouchableOpacity
        onPress={handleDismiss}
        hapticStyle="light"
        pressedScale={0.9}
        style={styles.dismiss}
        accessibilityLabel="Dismiss greens hint"
        testID={testID ? `${testID}-dismiss` : undefined}
      >
        <Ionicons name="close" size={16} color={isDark ? '#A6E0A8' : '#2E5931'} />
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.card,
  },
  body: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
