// frontend/components/home/StretchHomeCard.tsx
// Group 10X Phase 6 — "Stretch last night's plate" editorial home hero card.
// Renders only when ≥2 components from yesterday's plate are still in the
// leftover inventory and the user hasn't dismissed the card today.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import BrandButton from '../ui/BrandButton';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Sazon, { expressionToSazon } from '../mascot/Sazon';
import { useLeftoverInventory } from '../../hooks/useLeftoverInventory';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import type { LeftoverInventoryItem, MealComponentSlot } from '../../lib/api';

const SLOT_EMOJI: Record<MealComponentSlot, string> = {
  protein: '🥩',
  base: '🍚',
  vegetable: '🥬',
  sauce: '🥣',
  garnish: '🌿',
};

function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `stretch-card-dismissed-${y}-${m}-${d}`;
}

function formatLeftoverList(items: LeftoverInventoryItem[]): string {
  return items
    .slice(0, 4)
    .map((it) => `${SLOT_EMOJI[it.slot] ?? ''} ${it.name}`.trim())
    .join(' · ');
}

export default function StretchHomeCard() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { leftovers, isLoading, hasEnoughForStretch } = useLeftoverInventory();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  // Hydrate today's dismissal flag from AsyncStorage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(todayKey());
        if (!cancelled) {
          setDismissed(v === '1');
        }
      } catch {
        if (!cancelled) {
          setDismissed(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCTA = useCallback(() => {
    router.push({
      pathname: '/build-a-plate',
      params: { leftoverMode: 'true' },
    });
  }, [router]);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    await AsyncStorage.setItem(todayKey(), '1').catch(() => undefined);
  }, []);

  if (isLoading || dismissed === null) return null;
  if (dismissed) return null;
  if (!hasEnoughForStretch) return null;

  const gradientColors = isDark
    ? (['rgba(129,199,132,0.14)', '#1C1C1E'] as const)
    : ([Pastel.sage, '#FAF7F4'] as const);

  const eyebrowColor = isDark ? Accent.sage : '#2E5931';
  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const bodyColor = isDark ? '#D1D5DB' : '#374151';
  const accentOrange = '#FB923C';
  const sazonConfig = expressionToSazon('curious');

  return (
    <View
      style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}
      accessibilityLabel={`Stretch last night — ${leftovers.length} leftovers ready to reuse`}
      testID="stretch-home-card"
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Dismiss icon (top right) */}
        <HapticTouchableOpacity
          onPress={handleDismiss}
          accessibilityLabel="Dismiss stretch card"
          testID="stretch-card-dismiss"
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </HapticTouchableOpacity>

        <View style={styles.row}>
          <View style={styles.mascotWrap} testID="sazon-curious">
            <Sazon
              variant={sazonConfig.variant}
              motion={sazonConfig.motion}
              fx={sazonConfig.fx}
              size={48}
            />
          </View>
          <View style={styles.content}>
            <Text style={[EditorialTypography.eyebrow, styles.eyebrow, { color: eyebrowColor }]}>
              STRETCH LAST NIGHT
            </Text>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: titleColor }]}>
                {'Reuse what\'s still '}
              </Text>
              <Text style={[styles.titleItalic, { color: titleColor }]}>good</Text>
              <Text style={[styles.titlePeriod, { color: accentOrange }]}>.</Text>
            </View>
            <Text
              style={[styles.body, { color: bodyColor }]}
              testID="stretch-card-body"
              numberOfLines={2}
            >
              {formatLeftoverList(leftovers)}
            </Text>
          </View>
        </View>

        <BrandButton
          label="Build a plate from leftovers"
          variant="sage"
          onPress={handleCTA}
          accessibilityLabel="Build a plate from your leftovers"
          testID="stretch-card-cta"
          style={styles.cta}
        />
      </LinearGradient>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {},
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 16,
    ...cardShadow,
  },
  cardLight: {
    backgroundColor: Pastel.sage,
  },
  cardDark: {
    backgroundColor: '#1C1C1E',
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  dismissBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  mascotWrap: {
    width: 48,
    height: 48,
  },
  content: {
    flex: 1,
    gap: 6,
    paddingRight: 20,
  },
  eyebrow: {
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  titleItalic: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  titlePeriod: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  body: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    alignSelf: 'flex-start',
  },
});
