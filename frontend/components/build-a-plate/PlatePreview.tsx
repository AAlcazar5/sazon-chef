// frontend/components/build-a-plate/PlatePreview.tsx
// Group 10X Phase 1 — sticky bottom preview: concentric rings + macro pills + pantry coverage ring.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import ConcentricRings from '../ui/ConcentricRings';
import ProgressRing from '../ui/ProgressRing';
import { Accent, Pastel } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import type { PlateTotals } from '../../hooks/useBuildAPlate';
import type { MealComponentSlot } from '../../lib/api';

interface PlatePreviewProps {
  totals: PlateTotals;
  slotsFilled: Partial<Record<MealComponentSlot, boolean>>;
  testID?: string;
}

const SLOT_RING_COLORS: Record<MealComponentSlot, string> = {
  protein: Accent.sage,
  base: Accent.golden,
  vegetable: '#66BB6A',
  sauce: Accent.lavender,
  garnish: Accent.peach,
};

interface MacroPillProps {
  label: string;
  value: number;
  unit: string;
  bg: string;
  accent: string;
  testID?: string;
}

function AnimatedMacroPill({ label, value, unit, bg, accent, testID }: MacroPillProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1.06, { damping: 10, stiffness: 220 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
  }, [value]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[styles.pill, { backgroundColor: bg }, style]}
      testID={testID}
      accessibilityLabel={`${label} ${value} ${unit}`}
    >
      <Text style={[styles.pillValue, { color: accent }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}{unit ? ` ${unit}` : ''}</Text>
    </Animated.View>
  );
}

export default function PlatePreview({ totals, slotsFilled, testID }: PlatePreviewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const rings = (['protein', 'base', 'vegetable', 'sauce'] as MealComponentSlot[]).map((slot) => ({
    progress: slotsFilled[slot] ? 1 : 0,
    color: SLOT_RING_COLORS[slot],
  }));

  const coverage = Math.max(0, Math.min(1, totals.pantryCoveragePercent / 100));

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FAF7F4' }, Shadows.MD as any]}
      testID={testID}
      accessibilityLabel="Plate preview"
    >
      <View style={styles.row}>
        <ConcentricRings
          size={108}
          strokeWidth={9}
          ringGap={2}
          rings={rings}
          testID="plate-preview-rings"
        >
          <View style={styles.center} accessibilityElementsHidden>
            <Text style={[styles.centerCal, { color: isDark ? '#FFF' : '#111' }]}>
              {totals.calories}
            </Text>
            <Text style={styles.centerLabel}>cal</Text>
          </View>
        </ConcentricRings>

        <View style={styles.macros} testID="plate-preview-macros">
          <AnimatedMacroPill
            label="P"
            value={totals.protein}
            unit="g"
            bg={Pastel.sage}
            accent="#2E5931"
            testID="macro-pill-protein"
          />
          <AnimatedMacroPill
            label="C"
            value={totals.carbs}
            unit="g"
            bg={Pastel.golden}
            accent="#8a6200"
            testID="macro-pill-carbs"
          />
          <AnimatedMacroPill
            label="F"
            value={totals.fat}
            unit="g"
            bg={Pastel.lavender}
            accent="#6a2677"
            testID="macro-pill-fat"
          />
          <AnimatedMacroPill
            label="Cal"
            value={totals.calories}
            unit=""
            bg={Pastel.peach}
            accent="#8a4a00"
            testID="macro-pill-calories"
          />
        </View>

        <View style={styles.coverage} testID="plate-preview-coverage">
          <ProgressRing
            progress={coverage}
            size={64}
            strokeWidth={8}
            color={Accent.sage}
            testID="pantry-coverage-ring"
          >
            <Text style={[styles.coverageText, { color: isDark ? '#FFF' : '#111' }]}>
              {totals.pantryCoveragePercent}%
            </Text>
          </ProgressRing>
          <Text style={styles.coverageLabel}>Pantry</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  center: {
    alignItems: 'center',
  },
  centerCal: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
  },
  centerLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    color: '#6B7280',
  },
  macros: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 4,
  },
  pillValue: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  pillLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: '#6B7280',
  },
  coverage: {
    alignItems: 'center',
  },
  coverageText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
  },
  coverageLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
});
