// frontend/components/recipe/LeftoverBridgeCard.tsx
// ROADMAP 4.0 RD4.2 — "Your X wants to be in something tonight."
//
// Sage-pastel WidgetCard nudge. Lifestyle voice — never expiry-shame.
// Surfaces only when the user has a leftover expiring within 3 days AND
// at least one bridge recipe exists; hides silently otherwise. Consumes
// the first row only (most-urgent leftover) so the surface stays compact.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';

export interface LeftoverBridgeCardProps {
  /** When false, the card never fetches and never renders. Useful for
   *  cold-start gating. */
  enabled?: boolean;
}

interface BridgeRow {
  leftoverIngredient: string;
  expiringIn: number;
  recipes: Array<{
    id: string;
    title: string;
    cuisine: string | null;
    cookTime: number | null;
    imageUrl: string | null;
  }>;
}

export default function LeftoverBridgeCard({ enabled = true }: LeftoverBridgeCardProps) {
  const [row, setRow] = useState<BridgeRow | null>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? PastelDark.sage : Pastel.sage;
  const accent = Accent.sage;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  useEffect(() => {
    if (!enabled) {
      setRow(null);
      return;
    }
    let cancelled = false;
    recipeApi
      .getLeftoverBridge(3)
      .then((res) => {
        if (cancelled) return;
        const payload = (res?.data ?? res) as { rows?: BridgeRow[] };
        const first = payload?.rows?.[0];
        setRow(first && first.recipes.length > 0 ? first : null);
      })
      .catch(() => {
        if (!cancelled) setRow(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!row) return null;

  // Lifestyle voice — invitation, never expiry-shame.
  const headline = `Your ${row.leftoverIngredient} wants to be in something tonight.`;

  return (
    <View testID="leftover-bridge-card" style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.headline, { color: text }]}>{headline}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {row.recipes.slice(0, 3).map((r) => (
          <HapticTouchableOpacity
            key={r.id}
            testID={`leftover-bridge-pill-${r.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${r.title} — uses ${row.leftoverIngredient}`}
            onPress={() => {
              router.push(
                `/recipe/${encodeURIComponent(r.id)}?referrer=detail-bridge` as never,
              );
            }}
            style={[styles.pill, { borderColor: accent }]}
          >
            <Text style={[styles.pillTitle, { color: text }]} numberOfLines={1}>
              {r.title}
            </Text>
            <Text style={[styles.pillSub, { color: subtle }]} numberOfLines={1}>
              {r.cuisine ?? 'Recipe'}
              {r.cookTime ? ` · ${r.cookTime} min` : ''}
            </Text>
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
    minWidth: 140,
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
