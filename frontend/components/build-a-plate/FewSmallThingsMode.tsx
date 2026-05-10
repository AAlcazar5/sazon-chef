// frontend/components/build-a-plate/FewSmallThingsMode.tsx
// ROADMAP 4.0 Tier J17.2 — "Small plates" plate-mode toggle.
//
// A pill chip that flips Build-a-Plate from the standard 3-slot composition
// to the 4–6 small-component archetype. Surfaced as a STYLE — izakaya /
// mezze / banchan / antipasti — never a health pitch.
//
// Banned-vocab discipline applies — see the matching test for the full
// banned list.

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface FewSmallThingsModeProps {
  /** Whether the archetype is currently active. */
  active: boolean;
  /** Resolved slot count — 4–6 when active, 3 when inactive. */
  slotCount: number;
  /** Tap handler to toggle the archetype. */
  onToggle: () => void;
}

export default function FewSmallThingsMode({
  active,
  slotCount,
  onToggle,
}: FewSmallThingsModeProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const bg = active
    ? isDark ? PastelDark.peach : Pastel.peach
    : isDark ? PastelDark.lavender : Pastel.lavender;
  const fg = active ? Accent.peach : Accent.lavender;

  return (
    <HapticTouchableOpacity
      testID="few-small-things-mode"
      onPress={onToggle}
      accessibilityLabel={`Small plates — ${slotCount} slots`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityValue={{ now: slotCount }}
      pressedScale={0.97}
      style={[styles.chip, { backgroundColor: bg }]}
    >
      <Ionicons
        name={active ? 'sparkles' : 'sparkles-outline'}
        size={14}
        color={fg}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>Small plates</Text>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
    minWidth: 0,
  },
  icon: {
    marginRight: 5,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 11,
    flexShrink: 1,
  },
});
