// frontend/components/home/KitchenIQPromoCard.tsx
// Group 10S Surface 4 — Kitchen IQ promo card on home feed.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import useKitchenIQProgress from '../../hooks/useKitchenIQProgress';
import { KITCHEN_IQ_CARDS, type KitchenIQCard } from '../../lib/kitchenIQ/cards';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, PastelDark, EditorialColors } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Duration } from '../../constants/Animations';

const STORAGE_KEY = 'kitchen_iq_unlocked_at_v1';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

interface KitchenIQPromoCardProps {
  testID?: string;
}

type TimestampMap = Record<string, number>;

async function readTimestamps(): Promise<TimestampMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: TimestampMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === 'number') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function writeTimestamps(map: TimestampMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // non-fatal
  }
}

function findCard(id: string): KitchenIQCard | undefined {
  return KITCHEN_IQ_CARDS.find((c) => c.id === id);
}

export default function KitchenIQPromoCard({ testID }: KitchenIQPromoCardProps) {
  const { isDark } = useTheme();
  const { newUnlocks, acknowledgeNewUnlock, loading } = useKitchenIQProgress();

  const [timestamps, setTimestamps] = useState<TimestampMap | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    if (newUnlocks.length === 0) {
      setTimestamps(null);
      return;
    }
    void (async () => {
      const existing = await readTimestamps();
      const now = Date.now();
      const next: TimestampMap = { ...existing };
      let changed = false;
      for (const id of newUnlocks) {
        if (typeof next[id] !== 'number') {
          next[id] = now;
          changed = true;
        }
      }
      if (changed) {
        await writeTimestamps(next);
      }
      if (!cancelled) setTimestamps(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [newUnlocks]);

  const promoCardId = useMemo(() => {
    if (!timestamps || newUnlocks.length === 0) return null;
    const now = Date.now();
    for (let i = newUnlocks.length - 1; i >= 0; i -= 1) {
      const id = newUnlocks[i];
      if (dismissedIds.has(id)) continue;
      const ts = timestamps[id];
      if (typeof ts === 'number' && now - ts <= FORTY_EIGHT_HOURS_MS) {
        return id;
      }
    }
    return null;
  }, [timestamps, newUnlocks, dismissedIds]);

  const card = useMemo(() => (promoCardId ? findCard(promoCardId) : undefined), [promoCardId]);

  const handleOpen = useCallback(() => {
    if (!card) return;
    const id = card.id;
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    void acknowledgeNewUnlock(id);
    router.push(`/kitchen-iq?card=${id}` as any);
  }, [card, acknowledgeNewUnlock]);

  const handleDismiss = useCallback(() => {
    if (!card) return;
    const id = card.id;
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    void acknowledgeNewUnlock(id);
  }, [card, acknowledgeNewUnlock]);

  if (loading || !card) return null;

  const bg = isDark ? PastelDark.peach : Pastel.peach;
  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#D1D5DB' : '#4B5563';
  const eyebrowColor = isDark ? '#FFB74D' : EditorialColors.pastelTitle.peach;

  return (
    <Animated.View
      entering={FadeIn.duration(Duration.medium)}
      style={[styles.card, { backgroundColor: bg }]}
      testID={testID}
      accessibilityLabel={`New in Kitchen IQ: ${card.title}`}
    >
      <HapticTouchableOpacity
        onPress={handleOpen}
        accessibilityLabel={`Open ${card.title}`}
        testID={testID ? `${testID}-body` : 'kiq-promo-body'}
        style={styles.body}
      >
        <Text style={[EditorialTypography.eyebrow, { color: eyebrowColor }]}>
          New in Kitchen IQ
        </Text>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
          {card.title}
        </Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
          {card.subtitle}
        </Text>
      </HapticTouchableOpacity>

      <View style={styles.right}>
        <Text style={styles.emoji}>{card.heroEmoji}</Text>
      </View>

      <HapticTouchableOpacity
        onPress={handleDismiss}
        accessibilityLabel="Dismiss Kitchen IQ promo"
        testID={testID ? `${testID}-dismiss` : 'kiq-promo-dismiss'}
        hapticStyle="light"
        style={styles.dismiss}
      >
        <Text style={[styles.dismissIcon, { color: subtitleColor }]}>×</Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...cardShadow,
  },
  body: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 19,
    letterSpacing: -0.4,
    lineHeight: 23,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  right: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  dismissIcon: {
    fontSize: 22,
    lineHeight: 22,
    fontFamily: EditorialFontFamily.body.regular,
  },
});
