// frontend/components/kitchen/KitchenModeBar.tsx
// ROADMAP 4.0 Tier A3-a — Kitchen tab top-of-screen 5-pill nav.
//
// Per `plans/ia-spec.md` Tab 3, Kitchen has 5 view modes: Saved · Collections ·
// Discover · Journey · Stories. Liked / Disliked still exist in the deeper
// CollectionPicker for legacy access but are not part of the new top bar.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export type KitchenMode = 'saved' | 'collections' | 'discover' | 'journey' | 'stories';

interface KitchenModeDef {
  id: KitchenMode;
  label: string;
}

export const KITCHEN_MODES: readonly KitchenModeDef[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'collections', label: 'Collections' },
  { id: 'discover', label: 'Discover' },
  { id: 'journey', label: 'Journey' },
  { id: 'stories', label: 'Stories' },
] as const;

interface KitchenModeBarProps {
  activeMode: KitchenMode;
  onChange: (mode: KitchenMode) => void;
}

export default function KitchenModeBar({ activeMode, onChange }: KitchenModeBarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const inactiveBg = isDark ? PastelDark.lavender : Pastel.lavender;
  const activeBg = Accent.lavender;
  const inactiveText = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const activeText = '#FFFFFF';
  // Solid bg so content scrolling underneath doesn't bleed through.
  const barBg = isDark ? '#1A1410' : '#FAF7F4';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      // flexGrow:0 prevents the ScrollView from claiming extra vertical space
      // — without it, the bar leaves a tall gap above the FilterRow.
      style={[styles.scroll, { backgroundColor: barBg }]}
      testID="kitchen-mode-bar"
    >
      {KITCHEN_MODES.map((mode) => {
        const isActive = mode.id === activeMode;
        return (
          <HapticTouchableOpacity
            key={mode.id}
            accessibilityLabel={`${mode.label} view mode`}
            accessibilityRole="button"
            testID={`kitchen-mode-${mode.id}${isActive ? '-active' : ''}`}
            onPress={() => {
              if (!isActive) onChange(mode.id);
            }}
            style={[
              styles.pill,
              { backgroundColor: isActive ? activeBg : inactiveBg },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? activeText : inactiveText },
              ]}
            >
              {mode.label}
            </Text>
          </HapticTouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  pill: {
    // alignSelf prevents Android from stretching pills to fill the cross-axis
    // before content lays out (was: pills appeared full-width on initial mount).
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 100,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
