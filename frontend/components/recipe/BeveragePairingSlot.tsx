// frontend/components/recipe/BeveragePairingSlot.tsx
// ROADMAP 4.0 Tier J17.3 — Beverage pairing slot.
//
// First-class "with…" surface on the recipe-detail screen. The slot just
// IS the beverage — never framed against soda or as a substitute. Voice:
// persona-grade discovery.
//
// Renders a row of pill chips (Fraunces text) — one per pairing. Tap fires
// haptic + selection callback. Renders nothing for an empty pairings array.

import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface BeveragePairingSlotProps {
  /** Cuisine slug — used for the slot eyebrow only. */
  cuisine: string;
  /** Curated pairings (2–3). Empty array hides the slot. */
  pairings: readonly string[];
  /** Tap handler — fired with the selected pairing string. */
  onSelect: (pairing: string) => void;
}

export default function BeveragePairingSlot({
  cuisine,
  pairings,
  onSelect,
}: BeveragePairingSlotProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!pairings || pairings.length === 0) return null;

  return (
    <View testID="beverage-pairing-slot" style={styles.wrap}>
      <Text
        style={[
          styles.eyebrow,
          { color: isDark ? Accent.sky : Accent.sky },
        ]}
      >
        WITH…
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityLabel={`Beverage pairings for ${cuisine}`}
      >
        {pairings.map((pairing) => (
          <HapticTouchableOpacity
            key={pairing}
            testID={`beverage-pairing-${pairing}`}
            onPress={() => onSelect(pairing)}
            accessibilityLabel={pairing}
            accessibilityRole="button"
            pressedScale={0.97}
            hapticStyle="light"
            style={[
              styles.chip,
              { backgroundColor: isDark ? PastelDark.sky : Pastel.sky },
            ]}
          >
            <Text style={[styles.chipText, { color: Accent.sky }]}>
              {pairing}
            </Text>
          </HapticTouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    paddingLeft: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
  },
  chipText: {
    fontFamily: EditorialFontFamily.display.medium,
    fontSize: 14,
  },
});
