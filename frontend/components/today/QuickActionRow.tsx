// frontend/components/today/QuickActionRow.tsx
// ROADMAP 4.0 Tier A1-d — Today quick-action chip row.
// HX4.1 — chip order now reflects per-user tap frequency (cold-start: default
// order; chips with zero taps in 30 days hidden; visible set ≥ 3).
// HX7.1 — every chip tap is logged via homeSurfaceEvent.

import React, { useCallback } from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { PastelTokens, AccentTokens, Ink } from '../../constants/tokens';
import { EditorialFontFamily } from '../../constants/Typography';
import { useQuickActionRanking } from '../../hooks/useQuickActionRanking';
import { logHomeSurfaceEvent } from '../../lib/homeSurfaceEvents';

type ActionId = 'build-a-plate' | 'meal-prep' | 'log-meal' | 'find-me-a-meal' | 'surprise-me';

type AccentKey = keyof typeof AccentTokens;

interface ActionDef {
  id: ActionId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  a11y: string;
  tint: AccentKey;
  accent: AccentKey;
}

const ACTIONS: ActionDef[] = [
  { id: 'build-a-plate', label: 'Build a Plate', icon: 'restaurant-outline', a11y: 'Build a plate', tint: 'lavender', accent: 'lavender' },
  { id: 'meal-prep', label: 'Meal Prep', icon: 'layers-outline', a11y: 'Meal Prep — cook once, eat all week', tint: 'sage', accent: 'sage' },
  { id: 'log-meal', label: 'Log a Meal', icon: 'nutrition-outline', a11y: 'Log a meal', tint: 'peach', accent: 'peach' },
  { id: 'surprise-me', label: 'Surprise Me', icon: 'shuffle-outline', a11y: 'Surprise me with a recipe', tint: 'blush', accent: 'blush' },
  { id: 'find-me-a-meal', label: 'Find Me a Meal', icon: 'sparkles-outline', a11y: 'Find me a meal', tint: 'sky', accent: 'sky' },
];

interface QuickActionRowProps {
  onBuildAPlate: () => void;
  onMealPrep: () => void;
  onLogMeal: () => void;
  onSurpriseMe: () => void;
  onFindMeAMeal: () => void;
}

export default function QuickActionRow({
  onBuildAPlate,
  onMealPrep,
  onLogMeal,
  onSurpriseMe,
  onFindMeAMeal,
}: QuickActionRowProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // HX4.1 — frequency-ranked chip order (cold-start = default).
  const { rankedActions: sortedActions, recordTap } = useQuickActionRanking<ActionDef>(
    ACTIONS,
    (a) => a.id,
  );

  const handlerFor = useCallback(
    (id: ActionId): (() => void) => {
      switch (id) {
        case 'build-a-plate':
          return onBuildAPlate;
        case 'meal-prep':
          return onMealPrep;
        case 'log-meal':
          return onLogMeal;
        case 'surprise-me':
          return onSurpriseMe;
        case 'find-me-a-meal':
          return onFindMeAMeal;
      }
    },
    [onBuildAPlate, onMealPrep, onLogMeal, onSurpriseMe, onFindMeAMeal]
  );

  const handleChipPress = useCallback(
    (id: ActionId) => {
      handlerFor(id)();
      void recordTap(id);
      // HX7.1 — log to homeSurfaceEvent (chip id rides as metadata).
      logHomeSurfaceEvent({
        surface: 'quick_action_chip',
        eventType: 'tap',
        metadata: { actionId: id },
      });
    },
    [handlerFor, recordTap]
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {sortedActions.map((action) => (
        <HapticTouchableOpacity
          key={action.id}
          testID={`quick-action-${action.id}`}
          onPress={() => handleChipPress(action.id)}
          accessibilityLabel={action.a11y}
          accessibilityRole="button"
          pressedScale={0.96}
          style={[
            styles.chip,
            {
              backgroundColor: isDark
                ? PastelTokens.dark[action.tint]
                : PastelTokens.light[action.tint],
            },
          ]}
        >
          {/* Icon keeps the vivid accent (small enough that the saturation
              reads as decoration). Label uses ink for AA-legible contrast on
              the pastel chip — accent-on-pastel-of-same-hue was unreadable. */}
          <Ionicons name={action.icon} size={16} color={AccentTokens[action.accent]} />
          <Text
            style={[
              styles.label,
              { color: isDark ? Ink.dark.primary : Ink.light.primary },
            ]}
            numberOfLines={1}
          >
            {action.label}
          </Text>
        </HapticTouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ScrollView in a flex column would otherwise stretch to fill the parent
  // — clamp it to its content height so the chip row reads as a compact band.
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
    gap: 6,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
