// frontend/components/build-a-plate/BudgetToggle.tsx
// Group 10X Phase 9 — "Hit my budget" toggle pill + cost pill on plate totals row.

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import type { MealComponent } from '../../lib/api';

export const sortByCost = (components: MealComponent[]): MealComponent[] =>
  [...components].sort((a, b) => {
    const aCost = a.estimatedCostPerPortion ?? Number.POSITIVE_INFINITY;
    const bCost = b.estimatedCostPerPortion ?? Number.POSITIVE_INFINITY;
    return aCost - bCost;
  });

interface BudgetToggleProps {
  active: boolean;
  onToggle: () => void;
  testID?: string;
}

export function BudgetToggle({ active, onToggle, testID }: BudgetToggleProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handlePress = useCallback(() => onToggle(), [onToggle]);

  const fg = active ? '#2C1810' : isDark ? '#F0D070' : '#8a6200';

  return (
    <HapticTouchableOpacity
      onPress={handlePress}
      hapticStyle="light"
      pressedScale={0.97}
      style={[
        styles.pill,
        {
          backgroundColor: active
            ? Accent.golden
            : isDark
            ? 'rgba(255,255,255,0.08)'
            : Pastel.golden,
        },
        Shadows.SM as any,
      ]}
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Hit my budget, ${active ? 'on' : 'off'}`}
      testID={testID}
    >
      <Ionicons name="cash-outline" size={14} color={fg} />
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        Hit my budget
      </Text>
    </HapticTouchableOpacity>
  );
}

interface CostPillProps {
  totalCost: number;
  testID?: string;
}

export function CostPill({ totalCost, testID }: CostPillProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (totalCost <= 0) return null;
  const formatted = `$${totalCost.toFixed(2)}`;
  return (
    <View
      style={[
        styles.costPill,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : Pastel.golden },
      ]}
      testID={testID}
      accessibilityLabel={`Plate cost ${formatted}`}
    >
      <Text style={[styles.costText, { color: isDark ? '#F0D070' : '#8a6200' }]}>
        {formatted}
      </Text>
    </View>
  );
}

export default BudgetToggle;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    minWidth: 0,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    flexShrink: 1,
  },
  costPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  costText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
  },
});
