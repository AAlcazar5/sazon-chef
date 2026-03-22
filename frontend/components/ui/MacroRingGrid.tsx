// frontend/components/ui/MacroRingGrid.tsx
// Compact macro display with mini animated rings in a 2x2 grid
// Replaces plain text macro pills with visual ring indicators

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
}

interface MacroRingGridProps {
  /** Macro values */
  macros: MacroData;
  /** Daily targets for computing progress (optional — if omitted, rings show at 100%) */
  targets?: MacroData;
  /** Ring size */
  ringSize?: number;
  /** Test ID */
  testID?: string;
}

const MACRO_CONFIG = {
  calories: { label: 'Cal', unit: '', colorKey: 'calories' as const },
  protein: { label: 'Protein', unit: 'g', colorKey: 'protein' as const },
  carbs: { label: 'Carbs', unit: 'g', colorKey: 'carbs' as const },
  fat: { label: 'Fat', unit: 'g', colorKey: 'fat' as const },
} as const;

export default function MacroRingGrid({
  macros,
  targets,
  ringSize = 56,
  testID,
}: MacroRingGridProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const macroColors = isDark ? DarkColors.macros : Colors.macros;

  const entries = (['calories', 'protein', 'carbs', 'fat'] as const).map((key) => {
    const config = MACRO_CONFIG[key];
    const value = macros[key];
    const target = targets?.[key];
    const progress = target ? Math.min((value / target) * 100, 100) : 100;

    return { key, config, value, progress };
  });

  return (
    <View style={styles.grid} testID={testID}>
      {entries.map(({ key, config, value, progress }) => (
        <View key={key} style={styles.cell}>
          <AnimatedRing
            progress={progress}
            size={ringSize}
            strokeWidth={4}
            color={macroColors[config.colorKey]}
            label={`${value}`}
            labelSize={14}
            labelColor={macroColors[config.colorKey]}
          />
          <Text
            style={[
              styles.macroLabel,
              { color: isDark ? DarkColors.text.secondary : Colors.text.secondary },
            ]}
          >
            {config.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
