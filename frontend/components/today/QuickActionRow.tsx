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
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { useQuickActionRanking } from '../../hooks/useQuickActionRanking';
import { logHomeSurfaceEvent } from '../../lib/homeSurfaceEvents';

type ActionId = 'voice' | 'snap' | 'build-a-plate' | 'find-me-a-meal';

interface ActionDef {
  id: ActionId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  a11y: string;
  tint: keyof typeof Pastel;
  accent: keyof typeof Accent;
}

const ACTIONS: ActionDef[] = [
  { id: 'voice', label: 'Voice', icon: 'mic-outline', a11y: 'Voice composer', tint: 'sage', accent: 'sage' },
  { id: 'snap', label: 'Snap', icon: 'camera-outline', a11y: 'Snap to log a meal', tint: 'peach', accent: 'peach' },
  { id: 'build-a-plate', label: 'Build a plate', icon: 'restaurant-outline', a11y: 'Build a plate', tint: 'lavender', accent: 'lavender' },
  { id: 'find-me-a-meal', label: 'Find me a meal', icon: 'sparkles-outline', a11y: 'Find me a meal', tint: 'sky', accent: 'sky' },
];

interface QuickActionRowProps {
  onVoice: () => void;
  onSnap: () => void;
  onBuildAPlate: () => void;
  onFindMeAMeal: () => void;
}

export default function QuickActionRow({
  onVoice,
  onSnap,
  onBuildAPlate,
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
        case 'voice':
          return onVoice;
        case 'snap':
          return onSnap;
        case 'build-a-plate':
          return onBuildAPlate;
        case 'find-me-a-meal':
          return onFindMeAMeal;
      }
    },
    [onVoice, onSnap, onBuildAPlate, onFindMeAMeal]
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
              backgroundColor: isDark ? PastelDark[action.tint] : Pastel[action.tint],
            },
          ]}
        >
          <Ionicons name={action.icon} size={16} color={Accent[action.accent]} />
          <Text style={[styles.label, { color: Accent[action.accent] }]} numberOfLines={1}>
            {action.label}
          </Text>
        </HapticTouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
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
