import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface EditorialMealPlanIntroProps {
  weekStart: Date;
  selectedDate: Date;
  /** Optional subtitle override; defaults to a generic copy line. */
  subtitle?: string;
}

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

function isoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

export function EditorialMealPlanIntro({
  weekStart,
  selectedDate,
  subtitle = 'Four meals a day, balanced around your macro budget. Swap or auto-plan at any time.',
}: EditorialMealPlanIntroProps) {
  const month = MONTHS[weekStart.getMonth()];
  const week = isoWeekNumber(selectedDate);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>
        {month} · WEEK {week}
      </Text>
      <Text style={styles.title}>
        This <Text style={styles.titleAccent}>week</Text>
        <Text style={styles.orangePeriod}>.</Text>
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const TITLE_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 18,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.02,
    letterSpacing: -1.8,
    color: '#111827',
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.8,
    color: '#111827',
  },
  orangePeriod: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    color: '#fa7e12',
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginTop: 12,
  },
});
