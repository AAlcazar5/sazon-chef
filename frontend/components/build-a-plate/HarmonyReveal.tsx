// frontend/components/build-a-plate/HarmonyReveal.tsx
// ROADMAP 4.0 Tier J3 — Build-a-Plate harmony reveal.
//
// Subtle peak moment that earns its appearance: only fires when the plate is
// (a) fully composed, (b) macro-fitting, (c) diverse across cuisines/textures
// /colors. A complete-but-mediocre plate gets nothing. The line is Sazon's
// quiet acknowledgement: "That's a beautiful plate." A "Save this combo" chip
// captures the affective signal so future ranking can lean on it.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

const MIN_MACRO_FIT = 0.85;
const MIN_DIVERSITY = 3;

export interface HarmonySignal {
  slotsFilled: number;
  totalSlots: number;
  /** 0–1 score from the macro-fit pipeline. */
  macroFit: number;
  /** Distinct cuisine names across the plate (case-insensitive dedupe by caller). */
  cuisines: string[];
  /** Distinct texture descriptors. */
  textures: string[];
  /** Distinct color descriptors. */
  colors: string[];
}

interface HarmonyRevealProps {
  signal: HarmonySignal;
  onSaveCombo: () => void;
}

const distinct = (arr: string[]): number =>
  new Set(arr.map((s) => s.trim().toLowerCase()).filter(Boolean)).size;

const meetsHarmonyBar = (signal: HarmonySignal): boolean => {
  if (signal.totalSlots <= 0) return false;
  if (signal.slotsFilled < signal.totalSlots) return false;
  if (signal.macroFit < MIN_MACRO_FIT) return false;
  const maxAxis = Math.max(
    distinct(signal.cuisines),
    distinct(signal.textures),
    distinct(signal.colors),
  );
  return maxAxis >= MIN_DIVERSITY;
};

export default function HarmonyReveal({ signal, onSaveCombo }: HarmonyRevealProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!meetsHarmonyBar(signal)) return null;

  const bg = isDark ? PastelDark.lavender : Pastel.lavender;
  const accent = Accent.lavender;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subText = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const headline = "That's a beautiful plate.";

  return (
    <View
      testID="harmony-reveal"
      accessibilityRole="summary"
      accessibilityLabel={`${headline} Save the combo to come back to it.`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <View style={styles.row}>
        <Ionicons name="sparkles" size={16} color={accent} />
        <Text style={[styles.eyebrow, { color: accent }]}>HARMONY</Text>
      </View>
      <Text style={[styles.title, { color: text }]} numberOfLines={2}>
        {headline}
      </Text>
      <Text style={[styles.body, { color: subText }]} numberOfLines={2}>
        Cuisines, textures, and colors all in balance.
      </Text>
      <HapticTouchableOpacity
        testID="harmony-save-chip"
        onPress={onSaveCombo}
        accessibilityRole="button"
        accessibilityLabel="Save this combo"
        pressedScale={0.97}
        hapticStyle="light"
        style={[styles.chip, { backgroundColor: 'rgba(255,255,255,0.55)' }]}
      >
        <Ionicons name="bookmark-outline" size={13} color="#3B2D67" />
        <Text style={styles.chipLabel}>Save this combo</Text>
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  body: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  chipLabel: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 12,
    color: '#3B2D67',
    letterSpacing: 0.3,
  },
});
