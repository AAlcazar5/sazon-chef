// frontend/components/today/UseItUpStrip.tsx
// ROADMAP 4.0 IG4.3 — "Tonight: use up your cilantro" Today surface.
//
// Sage-pastel WidgetCard nudge. Lifestyle voice — invitation, never
// expiry-shame. Surfaces only when the user has ≥1 pantry item expiring
// within 3 days; hides silently otherwise. Reads from `expiringInventoryService`
// via the `/api/pantry/expiring` endpoint (N2.3 + IG4.1 source).
//
// Cross-tier dovetail (N3.2): each row's headline is server-formatted via
// `sazonVoiceService.expiringPrompt` and rendered verbatim — no inline
// prose templates here.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { pantryApi } from '../../lib/api';

export interface UseItUpStripProps {
  /** When false, the strip never fetches and never renders. Cold-start gating. */
  enabled?: boolean;
  /** Optional override of the days-ahead window. Default 3. */
  withinDays?: number;
  /** Caller-supplied tap handler — receives the ordered expiring names.
   *  Default behavior: route to a craving-search filtered by expiring names. */
  onPress?: (expiringNames: string[]) => void;
}

interface ExpiringItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  daysUntilExpiry: number;
  expiresAt: string;
  expirySource: 'column' | 'fallback';
  prompt: string;
}

const MAX_PILLS = 3;

export default function UseItUpStrip({
  enabled = true,
  withinDays = 3,
  onPress,
}: UseItUpStripProps) {
  const [items, setItems] = useState<ExpiringItem[]>([]);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const accent = Accent.sage;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }
    let cancelled = false;
    pantryApi
      .getExpiring(withinDays)
      .then((res) => {
        if (cancelled) return;
        const payload = (res?.data ?? res) as { items?: ExpiringItem[] };
        setItems(payload?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, withinDays]);

  if (items.length === 0) return null;

  // Most-urgent first (server already orders by daysUntilExpiry ASC).
  const visible = items.slice(0, MAX_PILLS);
  // Headline uses the most-urgent item's server-formatted prompt.
  const headline = visible[0].prompt;
  const expiringNames = visible.map((i) => i.name);

  const handlePress = () => {
    if (onPress) {
      onPress(expiringNames);
      return;
    }
    // Default: route to Today's craving filter with the most-urgent name.
    router.push(
      `/(tabs)?craving=${encodeURIComponent(expiringNames[0])}` as never,
    );
  };

  return (
    <View
      testID="use-it-up-strip"
      accessibilityRole="summary"
      accessibilityLabel={`Items to use tonight: ${expiringNames.join(', ')}`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <Text style={[styles.headline, { color: text }]} numberOfLines={2}>
        {headline}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {visible.map((it) => (
          <HapticTouchableOpacity
            key={it.id}
            testID={`use-it-up-pill-${it.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Cook with ${it.name}`}
            onPress={handlePress}
            style={[styles.pill, { borderColor: accent }]}
          >
            <Text style={[styles.pillTitle, { color: text }]} numberOfLines={1}>
              {it.name}
            </Text>
            {it.category ? (
              <Text style={[styles.pillSub, { color: subtle }]} numberOfLines={1}>
                {it.category}
              </Text>
            ) : null}
          </HapticTouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 20,
  },
  headline: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    minWidth: 110,
  },
  pillTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
