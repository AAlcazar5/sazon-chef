// frontend/components/meal-plan/MealRationaleRibbon.tsx
// ROADMAP 4.0 WK8.1 — Per-meal "Why this meal" ribbon.
//
// Tiny italic line under the meal-card title. Tap expands a longer
// rationale block (caller-supplied; falls back to the short rationale
// when no expanded form is provided).
//
// Lifestyle voice — no banned vocabulary. Backend builder
// (mealRationaleBuilder) is the source of truth for the rationale string.

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';
import { Spacing } from '../../constants/Spacing';
import { useTheme } from '../../contexts/ThemeContext';

interface MealRationaleRibbonProps {
  /** One-line rationale from the backend builder (≤ 90 chars). */
  rationale: string;
  /** Optional longer-form rationale shown when the user taps to expand. */
  expanded?: string;
}

function MealRationaleRibbon({ rationale, expanded }: MealRationaleRibbonProps) {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  if (!rationale) return null;

  const textColor = isDark ? Colors.text.tertiary : Colors.text.secondary;
  const expandedColor = isDark ? Colors.text.inverse : Colors.text.primary;

  return (
    <View>
      <HapticTouchableOpacity
        testID="meal-rationale-ribbon"
        accessibilityRole="button"
        accessibilityLabel={`Why this meal: ${rationale}`}
        onPress={() => setIsOpen((v) => !v)}
        style={styles.container}
      >
        <Text
          numberOfLines={1}
          style={[styles.line, { color: textColor }]}
        >
          {rationale}
        </Text>
      </HapticTouchableOpacity>
      {isOpen ? (
        <View testID="meal-rationale-expanded" style={styles.expanded}>
          <Text style={[styles.expandedText, { color: expandedColor }]}>
            {expanded ?? rationale}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default MealRationaleRibbon;

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
  },
  line: {
    fontSize: FontSize.xs,
    fontStyle: 'italic',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  expanded: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  expandedText: {
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 20,
  },
});
