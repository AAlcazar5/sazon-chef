// frontend/components/today/ActivationCard.tsx
// ROADMAP 4.0 N12 — Activation cliff card.
//
// Day-3 (0 cooks): editorial trio of 30-min starter recipes tuned to the
// onboarding cuisines, designed to drive a first cook.
// Day-7 (still 0 cooks): softer "no rush" surface — never punitive.
//
// Hides immediately on first cook (server returns surface: null).
// Wrapped in <CapabilityReveal> so the day-3 surface fires the N6 reveal
// animation on first appearance.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import CapabilityReveal from '../ui/CapabilityReveal';
import { registerCapability } from '../../services/capabilityRegistry';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { todayApi, type ActivationSurface } from '../../lib/api';

// ROADMAP 4.0 N6.2 — register at module load. High priority since first-cook
// activation is launch-critical.
registerCapability({
  featureKey: 'activation-day-3',
  priority: 95,
  copyShort: 'Ready when you are',
  copyLong:
    'Sazon picked three 30-minute starters from cuisines you mentioned in setup.',
});

export interface ActivationCardProps {
  /** When false, never fetches and never renders. */
  enabled?: boolean;
}

export default function ActivationCard({ enabled = true }: ActivationCardProps) {
  const [surface, setSurface] = useState<ActivationSurface | null>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (!enabled) {
      setSurface(null);
      return;
    }
    let cancelled = false;
    todayApi
      .activation()
      .then((res) => {
        if (cancelled) return;
        const payload = (res?.data ?? res) as {
          surface: ActivationSurface | null;
        };
        setSurface(payload?.surface ?? null);
      })
      .catch(() => {
        if (!cancelled) setSurface(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!surface) return null;

  // Different pastels per phase: golden for the "ready to cook" energy of
  // day-3, lavender for the gentler day-7 surface.
  const isDay3 = surface.phase === 'day-3';
  const bg = isDark
    ? isDay3 ? PastelDark.golden : PastelDark.lavender
    : isDay3 ? Pastel.golden : Pastel.lavender;
  const accent = isDay3 ? Accent.golden : Accent.lavender;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const featureKey = isDay3 ? 'activation-day-3' : 'activation-day-7';

  const handleRecipeTap = (recipeId: string) => {
    router.push(
      `/recipe/${encodeURIComponent(recipeId)}?referrer=activation` as never,
    );
  };

  const card = (
    <View
      testID={`activation-card-${surface.phase}`}
      accessibilityRole="summary"
      accessibilityLabel={`${surface.headline} ${surface.body}`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <Text style={[styles.eyebrow, { color: accent }]}>
        {isDay3 ? 'FIRST COOK' : 'WHENEVER YOU\'RE READY'}
      </Text>
      <Text style={[styles.headline, { color: text }]}>{surface.headline}</Text>
      <Text style={[styles.body, { color: subtle }]}>{surface.body}</Text>
      {surface.recipes.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {surface.recipes.map((r) => (
            <HapticTouchableOpacity
              key={r.id}
              testID={`activation-recipe-${r.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Cook ${r.title}`}
              onPress={() => handleRecipeTap(r.id)}
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
      ) : null}
    </View>
  );

  // Only the day-3 surface fires the reveal. Day-7 is a quieter moment —
  // a sparkle there would feel like the app is celebrating the user's
  // inactivity, which would feel terrible.
  return isDay3 ? (
    <CapabilityReveal featureKey={featureKey}>{card}</CapabilityReveal>
  ) : (
    card
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
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
