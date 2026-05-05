// frontend/components/ui/FilterRow.tsx
// ROADMAP 4.0 — Compact filter row.
//
// Layout: a single row that lives on Today (between macros and Quick Meals)
// and on Kitchen (between Recently Added and Your Recipes). The fixed
// "Filters" button sits on the left (opens the full filter sheet). The right
// side is a horizontally scrollable strip of most-used filter chips that the
// user can toggle without leaving the page.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export interface FilterChipDef {
  id: string;
  label: string;
  emoji?: string;
}

interface FilterRowProps {
  chips: FilterChipDef[];
  activeChipIds: string[];
  onChipToggle: (chipId: string) => void;
  onAdvancedFilterPress: () => void;
  /** Number of advanced (sheet) filters currently active. Renders as a badge. */
  activeAdvancedCount?: number;
}

export default function FilterRow({
  chips,
  activeChipIds,
  onChipToggle,
  onAdvancedFilterPress,
  activeAdvancedCount = 0,
}: FilterRowProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const filterButtonBg = isDark ? PastelDark.lavender : Pastel.lavender;
  const accent = Accent.lavender;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const inactiveChipBg = isDark ? '#374151' : '#F3F4F6';
  const activeChipBg = isDark ? DarkColors.primary : Colors.primary;
  const inactiveChipText = isDark ? '#D1D5DB' : '#374151';

  return (
    <View style={styles.row} testID="filter-row">
      {/* Left: Filters button */}
      <HapticTouchableOpacity
        accessibilityLabel="Open advanced filters"
        accessibilityRole="button"
        onPress={onAdvancedFilterPress}
        style={[styles.filterButton, { backgroundColor: filterButtonBg }]}
        testID="filter-row-advanced-button"
      >
        <Ionicons name="options" size={16} color={accent} />
        <Text style={[styles.filterButtonLabel, { color: textPrimary }]}>Filters</Text>
        {activeAdvancedCount > 0 && (
          <View style={[styles.badge, { backgroundColor: accent }]} testID="filter-row-active-badge">
            <Text style={styles.badgeText}>{activeAdvancedCount}</Text>
          </View>
        )}
      </HapticTouchableOpacity>

      {/* Right: scrollable chip strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        testID="filter-row-chip-scroll"
      >
        {chips.map((chip) => {
          const isActive = activeChipIds.includes(chip.id);
          return (
            <HapticTouchableOpacity
              key={chip.id}
              accessibilityLabel={`${chip.label} filter`}
              accessibilityRole="button"
              onPress={() => onChipToggle(chip.id)}
              style={[
                styles.chip,
                { backgroundColor: isActive ? activeChipBg : inactiveChipBg },
              ]}
              testID={`filter-row-chip-${chip.id}${isActive ? '-active' : ''}`}
            >
              {chip.emoji && (
                <Text style={styles.chipEmoji}>{chip.emoji}</Text>
              )}
              <Text
                style={[
                  styles.chipLabel,
                  { color: isActive ? '#FFFFFF' : inactiveChipText },
                ]}
              >
                {chip.label}
              </Text>
            </HapticTouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Default chip set used by both Today and Kitchen surfaces. Importable so
// callers can extend or swap.
export const DEFAULT_FILTER_CHIPS: FilterChipDef[] = [
  { id: 'quick', label: 'Quick', emoji: '⚡' },
  { id: 'easy', label: 'Easy', emoji: '👍' },
  { id: 'high_protein', label: 'High Protein', emoji: '💪' },
  { id: 'low_carb', label: 'Low Carb', emoji: '🥩' },
  { id: 'low_cal', label: 'Low Cal', emoji: '🥗' },
  { id: 'meal_prep', label: 'Meal Prep', emoji: '🍱' },
  { id: 'budget', label: 'Budget', emoji: '💰' },
  { id: 'one_pot', label: 'One Pot', emoji: '🍲' },
  { id: 'high_fiber', label: 'High Fiber', emoji: '🌾' },
];

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  filterButtonLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: EditorialFontFamily.body.bold,
  },
  chipScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
  },
});
