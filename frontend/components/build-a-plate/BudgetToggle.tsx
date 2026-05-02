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
      <Ionicons name="cash-outline" size={14} color={active ? '#2C1810' : '#8a6200'} />
      <Text style={[styles.label, { color: active ? '#2C1810' : '#8a6200' }]}>
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
  if (totalCost <= 0) return null;
  const formatted = `$${totalCost.toFixed(2)}`;
  return (
    <View
      style={styles.costPill}
      testID={testID}
      accessibilityLabel={`Plate cost ${formatted}`}
    >
      <Text style={styles.costText}>{formatted}</Text>
    </View>
  );
}

export default BudgetToggle;

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  costPill: {
    backgroundColor: Pastel.golden,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  costText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: '#8a6200',
  },
});
