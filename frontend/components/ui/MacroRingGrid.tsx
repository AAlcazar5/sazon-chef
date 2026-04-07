// frontend/components/ui/MacroRingGrid.tsx
// Macro display with animated rings.
// Layout: calories as a large top ring, then protein/carbs/fat/fiber in a 2×2 grid.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import AnimatedRing from './AnimatedRing';
import { Colors, DarkColors } from '../../constants/Colors';

interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

interface MacroRingGridProps {
  /** Macro values */
  macros: MacroData;
  /** Daily targets for computing progress (optional — if omitted, rings show at 100%) */
  targets?: MacroData;
  /** Ring size for the 2×2 grid cells (default 64) */
  ringSize?: number;
  /** Test ID */
  testID?: string;
}

const MACRO_CONFIG = {
  calories: { label: 'Calories', unit: '', colorKey: 'calories' as const },
  protein:  { label: 'Protein',  unit: 'g', colorKey: 'protein'  as const },
  carbs:    { label: 'Carbs',    unit: 'g', colorKey: 'carbs'    as const },
  fat:      { label: 'Fat',      unit: 'g', colorKey: 'fat'      as const },
  fiber:    { label: 'Fiber',    unit: 'g', colorKey: 'fiber'    as const },
} as const;

export default function MacroRingGrid({
  macros,
  targets,
  ringSize = 64,
  testID,
}: MacroRingGridProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const macroColors = isDark ? DarkColors.macros : Colors.macros;

  function entry(key: keyof typeof MACRO_CONFIG) {
    const config = MACRO_CONFIG[key];
    const value = macros[key as keyof MacroData] ?? 0;
    const target = targets?.[key as keyof MacroData];
    const progress = target ? Math.min((value / target) * 100, 100) : 100;
    return { key, config, value, progress };
  }

  const calEntry = entry('calories');
  const gridEntries = (['protein', 'carbs', 'fat', 'fiber'] as const).map(entry);

  const calRingSize = ringSize * 1.6; // ~90px at default
  const hasTargets = targets !== undefined;

  return (
    <View testID={testID}>
      {/* Calories — top, centred, larger ring */}
      <View style={styles.caloriesRow}>
        <View style={styles.caloriesCell}>
          <AnimatedRing
            progress={calEntry.progress}
            size={calRingSize}
            strokeWidth={5}
            color={macroColors[calEntry.config.colorKey]}
            label={`${calEntry.value}`}
            sublabel={hasTargets ? `/ ${targets!.calories}` : undefined}
            labelSize={16}
            labelColor={macroColors[calEntry.config.colorKey]}
          />
          <Text style={[styles.macroLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
            {calEntry.config.label}
          </Text>
        </View>
      </View>

      {/* Protein / Carbs / Fat / Fiber — 2×2 grid */}
      <View style={styles.grid}>
        {gridEntries.map(({ key, config, value, progress }) => {
          const targetVal = targets?.[key as keyof typeof targets];
          const sublabel = hasTargets && targetVal ? `/ ${targetVal}g` : undefined;
          return (
            <View key={key} style={styles.cell}>
              <AnimatedRing
                progress={progress}
                size={ringSize}
                strokeWidth={4}
                color={macroColors[config.colorKey]}
                label={`${value}g`}
                sublabel={sublabel}
                labelSize={12}
                labelColor={macroColors[config.colorKey]}
              />
              <Text style={[styles.macroLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                {config.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caloriesRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesCell: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});
