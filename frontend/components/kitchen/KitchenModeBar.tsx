// frontend/components/kitchen/KitchenModeBar.tsx
// ROADMAP 4.0 Tier A3-a — Kitchen tab top-of-screen view-mode nav.
//
// Per `plans/ia-spec.md` Tab 3, Kitchen has 5 view modes: Saved · Collections ·
// Discover · Journey · Stories. Underlined text tabs (not pill chips) so the
// nav reads as a hierarchy distinct from the FilterRow chips above it.
//
// Liked / Disliked still exist in the deeper CollectionPicker for legacy
// access but are not part of the new top bar.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Accent, Colors, DarkColors } from '../../constants/Colors';
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
  const inactiveText = isDark ? DarkColors.text.tertiary : Colors.text.tertiary;
  const activeText = isDark ? DarkColors.text.primary : Colors.text.primary;
  const accent = Accent.lavender;
  // Solid bg so content scrolling underneath doesn't bleed through.
  const barBg = isDark ? '#1A1410' : '#FAF7F4';
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      // flexGrow:0 prevents the ScrollView from claiming extra vertical space.
      style={[
        styles.scroll,
        { backgroundColor: barBg, borderBottomColor: dividerColor },
      ]}
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
            // Disable press scale — the bold-weight + underline state change
            // IS the feedback. Scaling the tab on press visibly clipped the
            // underline indicator under the hairline divider below.
            scaleOnPress={false}
            onPress={() => {
              if (!isActive) onChange(mode.id);
            }}
            style={styles.tab}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? activeText : inactiveText,
                  fontFamily: isActive
                    ? EditorialFontFamily.body.bold
                    : EditorialFontFamily.body.semibold,
                },
              ]}
            >
              {mode.label}
            </Text>
            {/* Underline rendered as a sibling view (not a borderBottom) so it
                sits inside the bar's content box, not on the bottom edge where
                the parent's hairline divider can paint over it. */}
            <View
              style={[
                styles.underline,
                { backgroundColor: isActive ? accent : 'transparent' },
              ]}
            />
          </HapticTouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    // Subtle separator under the tabs — common for tabbed-nav patterns.
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 6,
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  underline: {
    alignSelf: 'stretch',
    height: 2,
    borderRadius: 1,
  },
});
