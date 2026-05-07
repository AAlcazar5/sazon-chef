// frontend/components/meal-plan/PeerCookSuggestion.tsx
// ROADMAP 4.0 WK11.1 — Peer-cook slot suggestion chip.
//
// Renders ONLY on empty Week slots when ≥ 1 friend's recent cook matches
// the slot's macro/dietary constraints. Tap → fires onAdd(recipeId).
// Friend identity respects F1 settings: when `friendOptedInToShare ===
// false`, we render an anonymized chip ("a friend made this Tuesday")
// instead of the friend's name.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';

export interface PeerCookSuggestionData {
  recipeId: string;
  recipeName: string;
  friendName: string;
  /** ISO weekday "Monday" / "Tuesday" / ... — caller normalizes. */
  cookedOn: string;
  /** When false, anonymize the chip (privacy opt-out). */
  friendOptedInToShare: boolean;
}

interface PeerCookSuggestionProps {
  /** When omitted, the chip does not render. */
  suggestion?: PeerCookSuggestionData;
  /** When false, the chip does not render (caller signals "slot is full"). */
  slotIsEmpty?: boolean;
  onAdd?: (recipeId: string) => void;
}

function PeerCookSuggestion({
  suggestion,
  slotIsEmpty = true,
  onAdd,
}: PeerCookSuggestionProps) {
  const { isDark } = useTheme();

  if (!suggestion) return null;
  if (!slotIsEmpty) return null;

  const tint = isDark ? PastelDark.lavender : Pastel.lavender;
  const accent = Accent.lavender;
  const textColor = isDark ? Colors.text.inverse : Colors.text.primary;
  const subTextColor = isDark ? Colors.text.tertiary : Colors.text.secondary;

  const speaker = suggestion.friendOptedInToShare
    ? suggestion.friendName
    : 'A friend';
  const headlineCopy = `${speaker} made this ${suggestion.cookedOn} — want to try it?`;

  return (
    <View
      testID="peer-cook-suggestion"
      style={[styles.container, { backgroundColor: tint }, Shadows.SM]}
    >
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <Text style={[styles.recipe, { color: textColor }]} numberOfLines={1}>
          {suggestion.recipeName}
        </Text>
        <Text style={[styles.copy, { color: subTextColor }]} numberOfLines={2}>
          {headlineCopy}
        </Text>
      </View>
      <HapticTouchableOpacity
        testID="peer-cook-add"
        accessibilityRole="button"
        accessibilityLabel={`Add ${suggestion.recipeName} to this slot`}
        onPress={() => onAdd?.(suggestion.recipeId)}
        style={[styles.cta, { backgroundColor: accent }]}
      >
        <Text style={styles.ctaText}>Add</Text>
      </HapticTouchableOpacity>
    </View>
  );
}

export default PeerCookSuggestion;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.card,
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    flex: 1,
  },
  recipe: {
    fontSize: FontSize.md,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  copy: {
    fontSize: FontSize.xs,
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  cta: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 100,
  },
  ctaText: {
    color: Colors.text.inverse,
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
