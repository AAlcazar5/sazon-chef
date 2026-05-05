// frontend/components/meal-plan/PantryInlineStrip.tsx
// ROADMAP 4.0 Tier A2-c — Pantry inline strip on Meal Plan / Week tab.
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
  /** Tap handler — typically opens PantrySheet. */
  onPress: () => void;
}

export default function PantryInlineStrip({
  itemCount,
  expiringSoonCount,
  onPress,
}: PantryInlineStripProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (itemCount <= 0) {
    return null;
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
  },
});
