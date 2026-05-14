import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';

interface DayInfo {
  dayAbbrev: string;
  dateNumber: number;
  dateKey: string;
}

interface WeekStripProps {
  days: DayInfo[];
  activeKey: string;
  onDayPress: (key: string) => void;
}

export function WeekStrip({ days, activeKey, onDayPress }: WeekStripProps) {
  return (
    <View style={styles.container} testID="week-strip">
      {days.map((day) => {
        const isActive = day.dateKey === activeKey;
        return (
          <Pressable
            key={day.dateKey}
            testID={`day-${day.dateKey}`}
            onPress={() => onDayPress(day.dateKey)}
            style={styles.dayCol}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.dayAbbrev, isActive && styles.dayAbbrevActive]}>
              {day.dayAbbrev}
            </Text>
            <View style={[styles.dateCircle, isActive && styles.dateCircleActive]}>
              <Text style={[styles.dateNumber, isActive && styles.dateNumberActive]}>
                {day.dateNumber}
              </Text>
            </View>
            {isActive && <View style={styles.orangeDot} testID="active-dot" />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayAbbrev: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 11,
    color: '#6B6B6B',
    textTransform: 'uppercase',
  },
  dayAbbrevActive: {
    color: '#111827',
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCircleActive: {
    backgroundColor: '#111827',
  },
  dateNumber: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 14,
    color: '#6B6B6B',
  },
  dateNumberActive: {
    color: '#FFFFFF',
  },
  orangeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fa7e12',
    marginTop: 2,
  },
});
