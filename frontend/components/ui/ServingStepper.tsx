import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EditorialFontFamily } from '../../constants/Typography';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface ServingStepperProps {
  servings: number;
  onChangeServings: (value: number) => void;
}

export function ServingStepper({ servings, onChangeServings }: ServingStepperProps) {
  const handleMinus = () => {
    if (servings <= 1) return;
    triggerHaptic(ImpactStyle.LIGHT);
    onChangeServings(servings - 1);
  };

  const handlePlus = () => {
    triggerHaptic(ImpactStyle.LIGHT);
    onChangeServings(servings + 1);
  };

  return (
    <View style={styles.container}>
      <Pressable
        testID="stepper-minus"
        onPress={handleMinus}
        style={[styles.button, servings <= 1 && styles.buttonDisabled]}
        accessibilityLabel="Decrease servings"
        accessibilityRole="button"
      >
        <Ionicons name="remove" size={18} color={servings <= 1 ? '#D1D5DB' : '#111827'} />
      </Pressable>

      <View style={styles.countContainer}>
        <Text style={styles.count}>{servings}</Text>
        <Text style={styles.label}>{servings === 1 ? 'serving' : 'servings'}</Text>
      </View>

      <Pressable
        testID="stepper-plus"
        onPress={handlePlus}
        style={styles.button}
        accessibilityLabel="Increase servings"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color="#111827" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0EAE2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F0EB',
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
    color: '#fa7e12',
  },
  label: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
});
