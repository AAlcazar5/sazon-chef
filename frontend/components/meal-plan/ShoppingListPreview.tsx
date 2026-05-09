// frontend/components/meal-plan/ShoppingListPreview.tsx
// ROADMAP 4.0 Tier SH — inline shopping-list preview on the Week tab.
//
// The "lobby" surface for the shopping flow. Glanceable summary anchored
// directly under the WeeklyCalendar; tap routes to the focused full-screen
// shopping mode at `/shopping-list`. Renders nothing when there's no
// active list with items — never an empty placeholder.
//
// Phase 2 (Tier SH SH2.x) will add Sazon helper interventions (budget
// swaps, leftover bridges, seasonal opportunities) inline above the count
// row. The visual scaffold below leaves room for that block.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { PastelTokens, AccentTokens, Ink } from '../../constants/tokens';
import { EditorialFontFamily } from '../../constants/Typography';

export interface ShoppingListPreviewProps {
  /** Total items on the active list (purchased + unpurchased). Hides when 0. */
  totalCount: number;
  /** Items the user hasn't checked off yet. */
  unpurchasedCount: number;
  /** Tap → /shopping-list (focused in-store mode). */
  onPress: () => void;
}

export default function ShoppingListPreview({
  totalCount,
  unpurchasedCount,
  onPress,
}: ShoppingListPreviewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Three states: empty (no list yet), in-progress, all-grabbed.
  // Empty no longer hides — it surfaces a create-your-first-list CTA so
  // the shop slot stays visible at all times on Week.
  const isEmpty = totalCount <= 0;
  const allGrabbed = !isEmpty && unpurchasedCount === 0;
  const purchasedCount = isEmpty ? 0 : totalCount - unpurchasedCount;

  const eyebrow = isEmpty
    ? 'START SHOPPING'
    : allGrabbed
      ? 'SHOP COMPLETE'
      : 'SHOP THIS WEEK';
  const headline = isEmpty
    ? 'No list yet — start one.'
    : allGrabbed
      ? `You've grabbed all ${totalCount}.`
      : `${unpurchasedCount} ${unpurchasedCount === 1 ? 'item' : 'items'} left to grab.`;
  const supporting = isEmpty
    ? 'Tap to create your first shopping list.'
    : allGrabbed
      ? 'Nice work — list archived. Tap to review.'
      : purchasedCount > 0
        ? `${purchasedCount} of ${totalCount} grabbed. Tap to keep going.`
        : `Tap for the focused in-store list.`;
  const headerIcon: keyof typeof Ionicons.glyphMap = isEmpty
    ? 'add-circle-outline'
    : allGrabbed
      ? 'checkmark-circle'
      : 'cart-outline';

  const cardBg = isDark ? PastelTokens.dark.peach : PastelTokens.light.peach;
  const accentColor = AccentTokens.peach;
  const headlineColor = isDark ? Ink.dark.primary : Ink.light.primary;
  const supportingColor = isDark ? Ink.dark.secondary : Ink.light.secondary;

  return (
    <HapticTouchableOpacity
      testID="shopping-list-preview"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow}: ${headline} ${supporting}`}
      pressedScale={0.98}
      style={[styles.card, { backgroundColor: cardBg }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>
        <Ionicons name={headerIcon} size={16} color={accentColor} />
      </View>
      <Text style={[styles.headline, { color: headlineColor }]} numberOfLines={2}>
        {headline}
      </Text>
      <View style={styles.footerRow}>
        <Text style={[styles.supporting, { color: supportingColor }]} numberOfLines={2}>
          {supporting}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={supportingColor} />
      </View>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  headline: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  supporting: {
    flex: 1,
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
