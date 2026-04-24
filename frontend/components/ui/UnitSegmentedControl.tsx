import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';

type UnitValue = 'Metric' | 'US';

interface UnitSegmentedControlProps {
  value: UnitValue;
  onChange: (value: UnitValue) => void;
}

const OPTIONS: UnitValue[] = ['Metric', 'US'];

export function UnitSegmentedControl({ value, onChange }: UnitSegmentedControlProps) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {OPTIONS.map((option) => {
        const isActive = value === option;
        return (
          <Pressable
            key={option}
            testID={`segment-${option}`}
            onPress={() => onChange(option)}
            style={[
              styles.segment,
              { backgroundColor: isActive ? '#111827' : 'transparent' },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, { color: isActive ? '#FFFFFF' : '#9CA3AF' }]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F5F0EB',
    borderRadius: 9999,
    padding: 3,
    alignSelf: 'flex-start',
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 9999,
  },
  label: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
  },
});
