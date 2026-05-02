// frontend/components/build-a-plate/NutrientBadge.tsx
// Group 10X Phase 9 — Sage badge ("⚡ +8g fiber") on components that fill the user's top nutrient gap.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pastel } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import type { TrackedNutrient } from '../../lib/api';

interface NutrientBadgeProps {
  topGap: TrackedNutrient | null;
  amountForGap: number;
  testID?: string;
}

interface NutrientLabelConfig {
  unit: 'g' | 'mg' | 'IU';
  label: string;
}

const NUTRIENT_LABELS: Record<TrackedNutrient, NutrientLabelConfig> = {
  fiberG:      { unit: 'g',  label: 'fiber' },
  omega3G:     { unit: 'g',  label: 'omega-3' },
  vitaminDIu:  { unit: 'IU', label: 'vit D' },
  ironMg:      { unit: 'mg', label: 'iron' },
  magnesiumMg: { unit: 'mg', label: 'magnesium' },
};

export default function NutrientBadge({ topGap, amountForGap, testID }: NutrientBadgeProps) {
  if (!topGap || amountForGap <= 0) return null;

  const config = NUTRIENT_LABELS[topGap];
  const text = `⚡ +${Math.round(amountForGap)}${config.unit} ${config.label}`;

  return (
    <View style={styles.badge} testID={testID} accessibilityLabel={text.replace('⚡ ', '')}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Pastel.sage,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: '#2E5931',
  },
});
