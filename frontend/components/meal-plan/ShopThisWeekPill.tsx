// frontend/components/meal-plan/ShopThisWeekPill.tsx
// ROADMAP 4.0 Tier A2-b — header-right pill on Meal Plan / Week tab.
//
// Renders only when ≥1 unscheduled meal needs ingredients beyond pantry.
// Tap → opens the existing in-store shopping flow.

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface ShopThisWeekPillProps {
  /** Number of ingredients on this week's plan that aren't in the pantry. 0 hides the pill. */
  missingCount: number;
  /** Tap handler — typically routes to in-store shopping mode. */
  onPress: () => void;
}

export default function ShopThisWeekPill({ missingCount, onPress }: ShopThisWeekPillProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (missingCount <= 0) {
    return null;
  }

  const displayCount = missingCount > 99 ? '99+' : String(missingCount);
  const noun = missingCount === 1 ? 'item' : 'items';
  const label = `Shop · ${displayCount} ${noun}`;
  const a11yLabel = `Shop this week — ${displayCount} ${noun} missing from pantry`;

  return (
    <HapticTouchableOpacity
      testID="shop-this-week-pill"
      onPress={onPress}
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      pressedScale={0.97}
      style={[
        styles.pill,
        { backgroundColor: isDark ? PastelDark.sage : Pastel.sage },
      ]}
    >
      <Ionicons
        name="cart-outline"
        size={14}
        color={Accent.sage}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: Accent.sage }]} numberOfLines={1}>
        {label}
      </Text>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    gap: 6,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
