import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';

interface OnboardingStepProps {
  stepIndex: number;
  totalSteps: number;
  title: string;
  description: string;
}

export function OnboardingStep({ stepIndex, totalSteps, title, description }: OnboardingStepProps) {
  const eyebrow = stepIndex === 0 ? 'Welcome' : `Step ${stepIndex} of ${totalSteps}`;
  const titleSize = stepIndex === 0 ? 34 : 30;

  return (
    <View style={styles.container} testID={`onboarding-step-${stepIndex}`}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#fa7e12',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    letterSpacing: -0.5,
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#9CA3AF',
  },
});
