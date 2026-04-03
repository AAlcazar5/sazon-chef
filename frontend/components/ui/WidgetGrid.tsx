// frontend/components/ui/WidgetGrid.tsx
// 2×2 grid layout wrapper for WidgetCard children.

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Gap } from '../../constants/Spacing';

interface WidgetGridProps {
  children: React.ReactNode;
  /** Gap between cards (default 12) */
  gap?: number;
  /** Additional container styles */
  style?: ViewStyle;
  /** Test ID */
  testID?: string;
}

export default function WidgetGrid({
  children,
  gap = Gap.md,
  style,
  testID,
}: WidgetGridProps) {
  return (
    <View style={[styles.grid, { gap }, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
