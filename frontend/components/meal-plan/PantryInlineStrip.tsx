// frontend/components/meal-plan/PantryInlineStrip.tsx
// ROADMAP 4.0 Tier A2-c — Pantry inline strip on Meal Plan / Week tab.
// ROADMAP 4.0 Tier J12 — Pantry-care framing: when soonestExpiringName is
// passed AND there is at least one expiring item, the strip swaps to a
// care-toned invitation ("Your cilantro wants to be in something tonight.")
// with a one-tap CTA to find a recipe that uses it.
//
// Collapsed glanceable summary of pantry state. Tap → opens PantrySheet
// (the curatorial view). Hidden when pantry is empty.

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface PantryInlineStripProps {
  /** Total pantry item count. 0 hides the strip. */
  itemCount: number;
  /** Items expiring within the next 7 days. */
  expiringSoonCount: number;
  /** Name of the soonest-expiring item — when provided AND expiring count > 0,
   *  the strip swaps to J12 care-mode invitation copy. */
  soonestExpiringName?: string;
  /** Tap handler — typically opens PantrySheet. */
  onPress: () => void;
  /** Tap handler for the care-mode "show me a recipe" CTA — receives the
   *  expiring ingredient name so caller can filter Today by it. */
  onUseExpiring?: (ingredientName: string) => void;
}

export default function PantryInlineStrip({
  itemCount,
  expiringSoonCount,
  soonestExpiringName,
  onPress,
  onUseExpiring,
}: PantryInlineStripProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (itemCount <= 0) {
    return null;
  }

  const careModeName = (soonestExpiringName ?? '').trim();
  const inCareMode = careModeName.length > 0 && expiringSoonCount > 0;

  if (inCareMode) {
    const careCopy = `Your ${careModeName} wants to be in something tonight.`;
    return (
      <HapticTouchableOpacity
        testID="pantry-inline-strip"
        onPress={onPress}
        accessibilityLabel={careCopy}
        accessibilityRole="button"
        pressedScale={0.99}
        style={[
          styles.strip,
          { backgroundColor: isDark ? PastelDark.sage : Pastel.sage },
        ]}
      >
        <Ionicons
          name="leaf-outline"
          size={16}
          color={Accent.sage}
          style={styles.icon}
        />
        <Text
          style={[styles.label, { color: Accent.sage, flexShrink: 1 }]}
          numberOfLines={2}
        >
          {careCopy}
        </Text>
        <View style={styles.spacer} />
        <HapticTouchableOpacity
          testID="pantry-care-cta"
          onPress={() => onUseExpiring?.(careModeName)}
          accessibilityRole="button"
          accessibilityLabel={`Show me a recipe with ${careModeName}`}
          pressedScale={0.96}
          hapticStyle="light"
          style={styles.cta}
        >
          <Text style={styles.ctaLabel}>Use it</Text>
        </HapticTouchableOpacity>
      </HapticTouchableOpacity>
    );
  }

  const itemNoun = itemCount === 1 ? 'ingredient' : 'ingredients';
  const expiringSuffix =
    expiringSoonCount > 0 ? ` · ${expiringSoonCount} expiring` : '';
  const label = `Pantry · ${itemCount} ${itemNoun}${expiringSuffix}`;
  const a11yLabel =
    expiringSoonCount > 0
      ? `Pantry — ${itemCount} ingredients, ${expiringSoonCount} expiring soon. Tap to open pantry.`
      : `Pantry — ${itemCount} ingredients. Tap to open pantry.`;

  return (
    <HapticTouchableOpacity
      testID="pantry-inline-strip"
      onPress={onPress}
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      pressedScale={0.99}
      style={[
        styles.strip,
        { backgroundColor: isDark ? PastelDark.golden : Pastel.golden },
      ]}
    >
      <Ionicons
        name="cube-outline"
        size={16}
        color={Accent.golden}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: Accent.golden }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.spacer} />
      <Ionicons name="chevron-forward" size={16} color={Accent.golden} />
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  spacer: {
    flex: 1,
    minWidth: 8,
  },
  cta: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  ctaLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 12,
    color: '#0F1F0F',
    letterSpacing: 0.3,
  },
});
