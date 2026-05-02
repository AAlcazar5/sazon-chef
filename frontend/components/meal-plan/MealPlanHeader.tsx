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
        {/* Editorial title — date range sits inline to the right of "Plan" */}
        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, { color: isDark ? DarkColors.text.primary : '#111827' }]}
            accessibilityRole="header"
          >
            Meal{' '}
            <Text style={[styles.titleAccent, { color: isDark ? DarkColors.text.primary : '#111827' }]}>
              Plan
            </Text>
          </Text>
          <Text
            style={[styles.dateRange, { color: isDark ? DarkColors.text.tertiary : '#9CA3AF' }]}
            numberOfLines={1}
          >
            {dateRange}
          </Text>
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

const TITLE_SIZE = 40;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.04,
    letterSpacing: -1.4,
    flexShrink: 0,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.4,
  },
  dateRange: {
    ...EditorialTypography.eyebrow,
    marginLeft: 12,
    flexShrink: 1,
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
