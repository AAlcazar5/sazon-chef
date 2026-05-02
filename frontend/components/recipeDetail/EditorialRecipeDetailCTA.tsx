import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StickyBottomBar } from '../ui/StickyBottomBar';
import { BlackPillCTA } from '../ui/BlackPillCTA';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface EditorialRecipeDetailCTAProps {
  onStartCooking: () => void;
  onAddToMealPlan: () => void;
}

export function EditorialRecipeDetailCTA({ onStartCooking, onAddToMealPlan }: EditorialRecipeDetailCTAProps) {
  return (
    <StickyBottomBar testID="recipe-cta-bar">
      <Pressable
        testID="meal-plan-button"
        onPress={() => {
          triggerHaptic('impact', ImpactStyle.light);
          onAddToMealPlan();
        }}
        style={styles.calendarButton}
        accessibilityLabel="Add to meal plan"
        accessibilityRole="button"
      >
        <Ionicons name="calendar-outline" size={22} color="#111827" />
      </Pressable>
      <BlackPillCTA
        testID="start-cooking-cta"
        label="Start cooking"
        icon="play"
        onPress={onStartCooking}
        style={styles.cta}
      />
    </StickyBottomBar>
  );
}

const styles = StyleSheet.create({
  calendarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cta: {
    flex: 1,
  },
});
