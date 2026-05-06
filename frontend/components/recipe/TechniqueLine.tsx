// frontend/components/recipe/TechniqueLine.tsx
// ROADMAP 4.0 Tier J18.1 — Technique line.
//
// Italic subtitle rendered NEXT TO the recipe title (or directly under it),
// describing the lightening technique without a moralized framing. Voice:
// "oven-finished — same melt, less oil." Banned: any "healthy alternative,"
// "guilt-free," "skinny," "macro-friendly," "instead of," "low-fat," "diet."
//
// Pure presentation — the caller passes a string. Hides on null/empty.

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorialFontFamily } from '../../constants/Typography';

interface TechniqueLineProps {
  text: string | null;
}

export default function TechniqueLine({ text }: TechniqueLineProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!text) return null;

  return (
    <Text
      testID="technique-line"
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[
        styles.line,
        { color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(17,24,39,0.55)' },
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    fontFamily: EditorialFontFamily.displayItalic.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
});
