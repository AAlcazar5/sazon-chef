// frontend/components/today/QuickActionRow.tsx
// ROADMAP 4.0 Tier A1-d — Today quick-action chip row.
//
// 4 chips for the most-used Today actions: Voice / Snap / Build-a-plate / Find-me-a-meal.
// MRU-sorted (most-recently-used floats left). Persists order to AsyncStorage.

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

const STORAGE_KEY = 'today.quick-actions.mru';

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

  const [order, setOrder] = useState<ActionId[]>(ACTIONS.map((a) => a.id));

  // Hydrate MRU order from storage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return;
        const valid = parsed.filter((id): id is ActionId =>
          ACTIONS.some((a) => a.id === id)
        );
        // Append any missing ids in default order so a partial list still renders all chips.
        const missing = ACTIONS.map((a) => a.id).filter((id) => !valid.includes(id));
        setOrder([...valid, ...missing]);
      } catch {
        // ignore — fall through to default order
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setOrder((prev) => {
        const next = [id, ...prev.filter((x) => x !== id)];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
          // ignore — best-effort persistence
        });
        return next;
      });
    },
    [handlerFor]
  );

  const sortedActions: ActionDef[] = order
    .map((id) => ACTIONS.find((a) => a.id === id))
    .filter((a): a is ActionDef => Boolean(a));

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
