// frontend/components/cooking/CookRecapLine.tsx
// ROADMAP 4.0 Tier J16 — Auto-generated cook recap line.
//
// Pure presentation: render the upstream insight string when present, render
// nothing when null/empty. One line max, italic, sub-text color. Sits above
// the cook-complete celebration (J14) and the share card (J15) — see
// `app/cooking.tsx` for the integration point.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

interface CookRecapLineProps {
  /** Insight string from `cookRecapInsightService` — null/empty hides the line. */
  insight: string | null;
}

export default function CookRecapLine({ insight }: CookRecapLineProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!insight) return null;

  const sub = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  return (
    <View
      testID="cook-recap-line"
      accessibilityRole="text"
      accessibilityLabel={insight}
      style={styles.container}
    >
      <Text
        testID="cook-recap-line-text"
        accessibilityLabel={insight}
        numberOfLines={1}
        style={[styles.text, { color: sub }]}
      >
        {insight}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  text: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.1,
  },
});
