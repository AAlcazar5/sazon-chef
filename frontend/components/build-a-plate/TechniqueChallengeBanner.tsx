// frontend/components/build-a-plate/TechniqueChallengeBanner.tsx
// Group 10X Phase 9 — Editorial weekly technique challenge banner with per-week dismissal.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';

const KEY_PREFIX = 'technique-banner-dismissed-';

// ISO week string (YYYY-Www) — Monday-based.
export const isoWeekKey = (date: Date): string => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO week starts Monday; getUTCDay() returns 0 for Sunday.
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

export const techniqueDismissalKey = (date: Date): string => `${KEY_PREFIX}${isoWeekKey(date)}`;

interface TechniqueChallengeBannerProps {
  title: string;
  body: string;
  testID?: string;
}

export default function TechniqueChallengeBanner({
  title,
  body,
  testID,
}: TechniqueChallengeBannerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const key = techniqueDismissalKey(new Date());
        const raw = await AsyncStorage.getItem(key);
        if (!cancelled) {
          setDismissed(raw === 'true');
          setHydrated(true);
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
      await AsyncStorage.setItem(techniqueDismissalKey(new Date()), 'true');
    } catch {
      // Non-blocking — banner is dismissed locally either way.
    }
  }, []);

  if (!hydrated || dismissed) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(129,199,132,0.12)' : Pastel.sage },
        Shadows.SM as any,
      ]}
      testID={testID}
      accessibilityLabel={`Technique of the week: ${title}. ${body}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>TRY THIS WEEK</Text>
        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>{title}</Text>
        <Text style={[styles.body, { color: isDark ? '#A6E0A8' : '#2E5931' }]} numberOfLines={2}>
          {body}
        </Text>
      </View>
      <HapticTouchableOpacity
        onPress={handleDismiss}
        hapticStyle="light"
        pressedScale={0.9}
        style={styles.dismiss}
        accessibilityLabel="Dismiss technique of the week"
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
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: BorderRadius.card,
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#2E5931',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
  },
  body: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
