// frontend/components/meal-plan/MealPlanEmptyState.tsx
// First-time empty state with Sazon mascot and "Plan My Week" CTA

import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { AnimatedSazon } from '../mascot';
import GoalModeSelector, { GoalMode } from './GoalModeSelector';
import { Colors, DarkColors } from '../../constants/Colors';

interface MealPlanEmptyStateProps {
  isDark: boolean;
  generatingPlan: boolean;
  defaultMode?: GoalMode;
  onPlanMyWeek: (mode: GoalMode) => void;
}

export default function MealPlanEmptyState({
  isDark,
  generatingPlan,
  defaultMode = 'maintain',
  onPlanMyWeek,
}: MealPlanEmptyStateProps) {
  const [selectedMode, setSelectedMode] = useState<GoalMode>(defaultMode);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <AnimatedSazon
        expression={generatingPlan ? 'thinking' : 'excited'}
        size="medium"
      />

      <Text
        className="text-2xl font-bold text-center mt-6"
        style={{ color: isDark ? '#F9FAFB' : '#111827' }}
      >
        {generatingPlan ? 'Planning your week...' : 'Let me plan your week'}
      </Text>

      <Text
        className="text-base text-center mt-2 mb-8"
        style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
      >
        {generatingPlan
          ? 'Sazon is picking recipes just for you'
          : 'Pick your goal and I\'ll handle the rest. Takes about 10 seconds.'}
      </Text>

      {!generatingPlan && (
        <>
          <View className="w-full mb-8">
            <Text
              className="text-sm font-medium mb-3"
              style={{ color: isDark ? '#D1D5DB' : '#374151' }}
            >
              What's your goal?
            </Text>
            <GoalModeSelector
              selectedMode={selectedMode}
              onSelect={setSelectedMode}
              isDark={isDark}
            />
          </View>

          <HapticTouchableOpacity
            onPress={() => onPlanMyWeek(selectedMode)}
            className="w-full rounded-2xl py-4 items-center"
            style={{
              backgroundColor: isDark ? DarkColors.primary : Colors.primary,
            }}
          >
            <Text className="text-white text-lg font-bold">
              Plan My Week
            </Text>
          </HapticTouchableOpacity>
        </>
      )}

      {generatingPlan && (
        <ActivityIndicator
          size="large"
          color={isDark ? DarkColors.primary : Colors.primary}
          style={{ marginTop: 16 }}
        />
      )}
    </View>
  );
}
