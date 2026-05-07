// frontend/components/recipe/DiscoveryInsightLine.tsx
// ROADMAP 4.0 RD6.2 — italic one-line discovery insight.
//
// "First time you'd cook with sumac." / "High in iron compared to your
// usual Italian." / "First Persian dish in three weeks." Single line,
// italic, sub-text color, between title and macros. Hides on null.

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';

export interface DiscoveryInsight {
  line: string;
  rule?: string;
}

export interface DiscoveryInsightLineProps {
  insight?: DiscoveryInsight | null;
}

export default function DiscoveryInsightLine({ insight }: DiscoveryInsightLineProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  if (!insight || !insight.line) return null;
  const color = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  return (
    <Text
      testID="discovery-insight-line"
      numberOfLines={1}
      style={[styles.line, { color }]}
    >
      {insight.line}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    fontFamily: EditorialFontFamily.body.regular,
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
});
