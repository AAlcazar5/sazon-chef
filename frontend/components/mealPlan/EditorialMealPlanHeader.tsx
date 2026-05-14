import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface EditorialMealPlanHeaderProps {
  month: string;
  weekNumber: number;
}

export function EditorialMealPlanHeader({ month, weekNumber }: EditorialMealPlanHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>
        {month.toUpperCase()} · WEEK {weekNumber}
      </Text>
      <Text style={styles.title}>
        This{' '}
        <Text style={styles.titleAccent}>week</Text>
      </Text>
      <Text style={styles.subtitle}>
        Four meals a day, balanced around your macro budget. Swap or auto-plan at any time.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 20,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#6B6B6B',
    marginBottom: 8,
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: '#111827',
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: '#111827',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 6,
    maxWidth: 320,
  },
});
