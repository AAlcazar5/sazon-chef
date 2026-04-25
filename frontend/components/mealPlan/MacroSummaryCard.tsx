import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { CalorieRing } from '../ui/CalorieRing';
import { MacroBar } from '../ui/MacroBar';
import { EditorialShadows } from '../../constants/Shadows';
import { Pastel } from '../../constants/Colors';

interface MacroData {
  value: number;
  goal: number;
}

interface MacroSummaryCardProps {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fat: MacroData;
  fiber: MacroData;
}

const MACRO_COLORS = {
  protein: Pastel.sage,
  carbs: '#FFB74D',
  fat: Pastel.lavender,
  fiber: '#81C784',
};

export function MacroSummaryCard({ calories, protein, carbs, fat, fiber }: MacroSummaryCardProps) {
  const shadowStyle = Platform.select({
    ios: EditorialShadows.cardRaised.ios,
    android: EditorialShadows.cardRaised.android,
    default: {},
  });

  return (
    <View testID="macro-summary-card" style={[styles.container, shadowStyle]}>
      <View style={styles.ringSection}>
        <CalorieRing
          testID="calorie-ring"
          consumed={calories.value}
          goal={calories.goal}
          size={120}
        />
      </View>
      <View style={styles.barsSection}>
        <MacroBar testID="macro-protein" label="Protein" value={protein.value} goal={protein.goal} color={MACRO_COLORS.protein} />
        <MacroBar testID="macro-carbs" label="Carbs" value={carbs.value} goal={carbs.goal} color={MACRO_COLORS.carbs} />
        <MacroBar testID="macro-fat" label="Fat" value={fat.value} goal={fat.goal} color={MACRO_COLORS.fat} />
        <MacroBar testID="macro-fiber" label="Fiber" value={fiber.value} goal={fiber.goal} color={MACRO_COLORS.fiber} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  ringSection: {
    alignItems: 'center',
  },
  barsSection: {
    flex: 1,
  },
});
