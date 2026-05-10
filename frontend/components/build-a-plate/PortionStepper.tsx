// frontend/components/build-a-plate/PortionStepper.tsx
// Group 10X Phase 5 — Portion multiplier stepper (×0.5 / ×1 / ×1.5 / ×2) per component.

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { useTheme } from '../../contexts/ThemeContext';

const STEPS: number[] = [0.5, 1, 1.5, 2];

const labelFor = (n: number): string => {
  if (n === 0.5) return '×0.5';
  if (n === 1) return '×1';
  if (n === 1.5) return '×1.5';
  if (n === 2) return '×2';
  return `×${n}`;
};

interface PortionStepperProps {
  value: number;
  onChange: (value: number) => void;
  testID?: string;
}

export default function PortionStepper({ value, onChange, testID }: PortionStepperProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handlePress = useCallback(
    (n: number) => {
      if (n === value) return; // no-op
      onChange(n);
    },
    [value, onChange],
  );

  return (
    <View style={styles.row} testID={testID} accessibilityLabel="Portion multiplier">
      {STEPS.map((n) => {
        const active = n === value;
        return (
          <HapticTouchableOpacity
            key={n}
            onPress={() => handlePress(n)}
            hapticStyle="light"
            pressedScale={0.97}
            style={[
              styles.chip,
              {
                backgroundColor: active
                  ? Accent.sage
                  : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : Pastel.sage,
              },
            ]}
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Portion ${labelFor(n)}${active ? ', selected' : ''}`}
            testID={testID ? `${testID}-chip-${n}` : undefined}
          >
            <Text
              style={[
                styles.label,
                { color: active ? '#FFFFFF' : isDark ? '#A8DDA9' : '#2E5931' },
              ]}
            >
              {labelFor(n)}
            </Text>
          </HapticTouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
});
