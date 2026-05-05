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

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
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
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
