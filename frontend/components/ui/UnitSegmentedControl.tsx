import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily } from '../../constants/Typography';
import { DarkColors } from '../../constants/Colors';

type UnitValue = 'Metric' | 'US';

interface UnitSegmentedControlProps {
  value: UnitValue;
  onChange: (value: UnitValue) => void;
}

const OPTIONS: UnitValue[] = ['Metric', 'US'];

export function UnitSegmentedControl({ value, onChange }: UnitSegmentedControlProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  // Spec: dark active = ivory pill with cocoa text (inverse of light's black-pill / white-text)
  const trackBg = isDark ? DarkColors.surfaceTint : '#F5F0EB';
  const activeBg = isDark ? DarkColors.text.primary : '#111827';
  const activeText = isDark ? DarkColors.text.inverse : '#FFFFFF';
  const inactiveText = isDark ? DarkColors.text.tertiary : '#9CA3AF';

  return (
    <View style={[styles.container, { backgroundColor: trackBg }]} accessibilityRole="tablist">
      {OPTIONS.map((option) => {
        const isActive = value === option;
        return (
          <Pressable
            key={option}
            testID={`segment-${option}`}
            onPress={() => onChange(option)}
            style={[
              styles.segment,
              { backgroundColor: isActive ? activeBg : 'transparent' },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, { color: isActive ? activeText : inactiveText }]}>
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
