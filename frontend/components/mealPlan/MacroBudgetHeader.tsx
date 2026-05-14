import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface MacroBudgetHeaderProps {
  dayName: string;
  onTrackPercent: number;
}

export function MacroBudgetHeader({ dayName, onTrackPercent }: MacroBudgetHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>
        {dayName.toUpperCase()} · MACRO BUDGET
      </Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{onTrackPercent}% on track</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#6B6B6B',
  },
  badge: {
    backgroundColor: 'rgba(250,126,18,0.12)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 11,
    color: '#fa7e12',
  },
});
