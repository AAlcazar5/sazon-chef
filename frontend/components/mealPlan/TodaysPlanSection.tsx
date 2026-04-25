import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface TodaysPlanSectionProps {
  onAutoplan: () => void;
  children: React.ReactNode;
}

export function TodaysPlanSection({ onAutoplan, children }: TodaysPlanSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          Today's{' '}
          <Text style={styles.sectionAccent}>plan</Text>
        </Text>
        <Pressable onPress={onAutoplan} testID="auto-plan-button" accessibilityRole="link">
          <Text style={styles.autoPlanLink}>AUTO-PLAN</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    ...EditorialTypography.sectionTitle,
    color: '#111827',
  },
  sectionAccent: {
    ...EditorialTypography.sectionAccent,
    color: '#111827',
  },
  autoPlanLink: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#fa7e12',
    textTransform: 'uppercase',
  },
});
