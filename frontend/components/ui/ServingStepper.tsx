import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorialFontFamily } from '../../constants/Typography';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';
import { Colors, DarkColors } from '../../constants/Colors';

interface ServingStepperProps {
  servings: number;
  onChangeServings: (value: number) => void;
}

export function ServingStepper({ servings, onChangeServings }: ServingStepperProps) {
  const { isDark } = useTheme();
  const containerBg = isDark ? DarkColors.card : '#FFFFFF';
  const containerBorder = isDark ? DarkColors.border.light : '#F0EAE2';
  const buttonBg = isDark ? DarkColors.surfaceTint : '#F5F0EB';
  const iconColor = isDark ? DarkColors.text.primary : '#111827';
  const disabledIconColor = isDark ? DarkColors.text.tertiary : '#D1D5DB';
  const countColor = isDark ? DarkColors.primary : Colors.primary;
  const labelColor = isDark ? DarkColors.text.tertiary : '#9CA3AF';

  const handleMinus = () => {
    if (servings <= 1) return;
    triggerHaptic('impact', ImpactStyle.light);
    onChangeServings(servings - 1);
  };

  const handlePlus = () => {
    triggerHaptic('impact', ImpactStyle.light);
    onChangeServings(servings + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: containerBg, borderColor: containerBorder }]}>
      <Pressable
        testID="stepper-minus"
        onPress={handleMinus}
        style={[styles.button, { backgroundColor: buttonBg }, servings <= 1 && styles.buttonDisabled]}
        accessibilityLabel="Decrease servings"
        accessibilityRole="button"
      >
        <Ionicons name="remove" size={18} color={servings <= 1 ? disabledIconColor : iconColor} />
      </Pressable>

      <View style={styles.countContainer}>
        <Text style={[styles.count, { color: countColor }]}>{servings}</Text>
        <Text style={[styles.label, { color: labelColor }]}>{servings === 1 ? 'serving' : 'servings'}</Text>
      </View>

      <Pressable
        testID="stepper-plus"
        onPress={handlePlus}
        style={[styles.button, { backgroundColor: buttonBg }]}
        accessibilityLabel="Increase servings"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color={iconColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  countContainer: {
    alignItems: 'center',
    marginHorizontal: 16,
    minWidth: 48,
  },
  count: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 13,
  },
  label: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 10,
    marginTop: 1,
  },
});
