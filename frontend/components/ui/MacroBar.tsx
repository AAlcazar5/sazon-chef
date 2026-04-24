import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';

interface MacroBarProps extends ViewProps {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  color: string;
}

export function MacroBar({ label, value, goal, unit = 'g', color, testID, style, ...props }: MacroBarProps) {
  const pct = Math.min(Math.round((value / goal) * 100), 100);

  return (
    <View style={[styles.container, style]} {...props}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.barTrack}>
        <View
          testID={testID ? `${testID}-fill` : 'macro-bar-fill'}
          style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.valueBold}>{value}</Text>
        <Text style={styles.valueGoal}>/{goal}{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#6B7280',
    width: 62,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F5F0EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 60,
  },
  valueBold: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 11,
    color: '#111827',
  },
  valueGoal: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 11,
    color: '#9CA3AF',
  },
});
