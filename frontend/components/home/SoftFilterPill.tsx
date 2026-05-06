// frontend/components/home/SoftFilterPill.tsx
// ROADMAP 4.0 FX3.1 — "Showing closest matches" pill above the recipe grid.
//
// Renders only when `softFilterMode === true` (backend fell back to the
// unfiltered top-K because the post-filter set was sparse). Tapping the pill
// invokes `onPress`, which the home screen wires to scroll up to the
// FilterRow so the user can adjust filters.

import React from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';

export interface SoftFilterPillProps {
  /** Backend-supplied flag. Pill renders only when true. */
  softFilterMode: boolean;
  /** Optional: filter category names that narrowed the result set. */
  narrowedBy?: string[];
  /** Tap target — usually a scroll-to-FilterRow handler. */
  onPress: () => void;
}

export default function SoftFilterPill({
  softFilterMode,
  narrowedBy = [],
  onPress,
}: SoftFilterPillProps) {
  if (!softFilterMode) return null;

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const bg = isDark ? PastelDark.peach : Pastel.peach;
  const accent = Accent.peach;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  // Lifestyle voice; no "your filters are too restrictive" verdict tone.
  const headline = "Showing closest matches";
  const sub =
    narrowedBy.length > 0
      ? `Your ${narrowedBy.join(' + ')} filters narrowed results — tap to adjust`
      : 'Your filters narrowed results — tap to adjust';

  return (
    <HapticTouchableOpacity
      testID="soft-filter-pill"
      accessibilityRole="button"
      accessibilityLabel={`${headline}. ${sub}`}
      onPress={onPress}
      style={{
        backgroundColor: bg,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: accent,
          marginRight: 10,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: text, fontWeight: '600', fontSize: 13 }}>{headline}</Text>
        <Text style={{ color: text, opacity: 0.7, fontSize: 12, marginTop: 2 }}>{sub}</Text>
      </View>
    </HapticTouchableOpacity>
  );
}
