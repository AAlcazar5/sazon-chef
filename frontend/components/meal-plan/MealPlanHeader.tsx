import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import FrostedHeader from '../ui/FrostedHeader';
import { Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface MealPlanHeaderProps {
  dateRange: string;
  isSelectedDateToday: boolean;
  isDark: boolean;
  onJumpToToday: () => void;
}

export default function MealPlanHeader({
  dateRange,
  isSelectedDateToday,
  isDark,
  onJumpToToday,
}: MealPlanHeaderProps) {
  return (
    <FrostedHeader paddingBottom={16} withTopInset>
      <View style={styles.headerRow}>
        {/* Editorial title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            Meal <Text style={styles.titleAccent}>Plan</Text>
          </Text>
          <Text style={styles.dateRange}>{dateRange}</Text>
        </View>

        {/* Jump to today */}
        {!isSelectedDateToday && (
          <HapticTouchableOpacity
            onPress={onJumpToToday}
            style={[
              styles.todayButton,
              { backgroundColor: isDark ? `${Colors.primary}33` : Colors.primaryLight },
            ]}
            accessibilityLabel="Jump to today"
            accessibilityRole="button"
          >
            <Text style={[styles.todayLabel, { color: isDark ? DarkColors.primary : Colors.primary }]}>
              Today
            </Text>
          </HapticTouchableOpacity>
        )}
      </View>
    </FrostedHeader>
  );
}

const TITLE_SIZE = 48;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.04,
    letterSpacing: -1.6,
    color: '#111827',
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.6,
    color: '#111827',
  },
  orangePeriod: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    color: '#fa7e12',
  },
  dateRange: {
    ...EditorialTypography.eyebrow,
    color: '#9CA3AF',
    marginTop: 4,
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
});
