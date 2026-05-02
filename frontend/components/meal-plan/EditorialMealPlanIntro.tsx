import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily } from '../../constants/Typography';
import { DarkColors } from '../../constants/Colors';

interface EditorialMealPlanIntroProps {
  weekStart: Date;
  selectedDate: Date;
  /** Optional subtitle override; defaults to a generic copy line. */
  subtitle?: string;
}

export function EditorialMealPlanIntro({
  subtitle = 'Four meals a day, balanced around your macro budget. Swap or auto-plan at any time.',
}: EditorialMealPlanIntroProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const subtitleColor = isDark ? DarkColors.text.secondary : '#6B7280';

  return (
    <View style={styles.container}>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 18,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    lineHeight: 20,
  },
});
