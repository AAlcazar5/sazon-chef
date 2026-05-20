// frontend/components/cooking/RecipeAlternatesPeek.tsx
//
// Founder ask 2026-05-20 (round 10): the recipe card occupies 2/3 of
// the viewport; this component fills the remaining 1/3 with a peek of
// the OTHER ranker picks (recipePool alternates). The peek serves two
// purposes:
//   1. Tells the user the screen is scrollable (visible content
//      extends below the main card).
//   2. Surfaces the N=1 ranker's runner-ups — the user can see what
//      else we'd suggest, then tap to swap (existing "Show me another"
//      chip cycles through the same pool).
//
// Read-only by design: tapping an alternate triggers the same
// swapToNextAlternate flow until that recipe becomes primary.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Brand, PastelTokens, Type, Radius, Elevation } from '../../constants/tokens';
import type { RecipeCardPayload } from '../../lib/coach/findOrGenerateRecipe';

interface Props {
  alternates: RecipeCardPayload[];
  /** Tap an alternate → fire this so the parent can cycle/swap. */
  onPickAlternate: (index: number) => void;
}

export default function RecipeAlternatesPeek({ alternates, onPickAlternate }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (alternates.length === 0) return null;

  const accent = isDark ? Brand.dark.base : Brand.light.base;
  const surface = isDark ? PastelTokens.dark.sage : PastelTokens.light.sage;
  const eyebrowColor = accent;
  const textColor = isDark ? '#F9FAFB' : '#1F2937';
  const subColor = isDark ? '#D1D5DB' : '#6B7280';

  return (
    <View
      style={[styles.card, { backgroundColor: surface }, Elevation.sm]}
      accessibilityLabel="Other recipe ideas — swipe up for more"
    >
      <Text style={[styles.eyebrow, { color: eyebrowColor }]}>OTHER IDEAS</Text>
      {alternates.slice(0, 3).map((alt, i) => (
        <HapticTouchableOpacity
          key={`${alt.title}-${i}`}
          onPress={() => onPickAlternate(i)}
          accessibilityRole="button"
          accessibilityLabel={`Show ${alt.title}`}
          pressedScale={0.97}
          style={styles.row}
        >
          {alt.imageUrls?.[0] ? (
            <Image
              source={{ uri: alt.imageUrls[0] }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]} />
          )}
          <View style={styles.body}>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {alt.title}
            </Text>
            {alt.cuisine ? (
              <Text style={[styles.sub, { color: subColor }]} numberOfLines={1}>
                {alt.cuisine}
              </Text>
            ) : null}
          </View>
        </HapticTouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: Radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  eyebrow: { ...Type.eyebrow, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.card,
  },
  thumbFallback: { backgroundColor: 'rgba(0,0,0,0.08)' },
  body: { flex: 1, gap: 2 },
  title: { ...Type.label },
  sub: { ...Type.caption },
});
