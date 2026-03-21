// frontend/components/meal-plan/MealPlanEmptyState.tsx
// First-time empty state with Sazon mascot and "Plan My Week" CTA
// Redesigned: staggered entrance animations, gradient CTA, spring press

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';
import LoadingState from '../ui/LoadingState';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { AnimatedLottieMascot } from '../mascot';
import GoalModeSelector, { GoalMode } from './GoalModeSelector';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

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

  // Staggered entrance animations
  const mascotOpacity = useSharedValue(0);
  const mascotScale = useSharedValue(0.8);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const goalOpacity = useSharedValue(0);
  const goalTranslateY = useSharedValue(20);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslateY = useSharedValue(20);
  const ctaScale = useSharedValue(1);

  useEffect(() => {
    mascotOpacity.value = withDelay(0, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    mascotScale.value = withDelay(0, withSpring(1, { damping: 8, stiffness: 200 }));
    titleOpacity.value = withDelay(150, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
    titleTranslateY.value = withDelay(150, withSpring(0, { damping: 14, stiffness: 200 }));
    subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
    subtitleTranslateY.value = withDelay(300, withSpring(0, { damping: 14, stiffness: 200 }));
    goalOpacity.value = withDelay(450, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
    goalTranslateY.value = withDelay(450, withSpring(0, { damping: 14, stiffness: 200 }));
    ctaOpacity.value = withDelay(600, withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) }));
    ctaTranslateY.value = withDelay(600, withSpring(0, { damping: 14, stiffness: 200 }));
  }, []);

  const mascotAnimStyle = useAnimatedStyle(() => ({
    opacity: mascotOpacity.value,
    transform: [{ scale: mascotScale.value }],
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const goalAnimStyle = useAnimatedStyle(() => ({
    opacity: goalOpacity.value,
    transform: [{ translateY: goalTranslateY.value }],
  }));

  const ctaAnimStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }, { scale: ctaScale.value }],
  }));

  const handleCtaPressIn = useCallback(() => {
    ctaScale.value = withSpring(0.95, { damping: 10, stiffness: 400 });
  }, []);

  const handleCtaPressOut = useCallback(() => {
    ctaScale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }, []);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Animated.View style={mascotAnimStyle}>
        <AnimatedLottieMascot
          expression={generatingPlan ? 'thinking' : 'excited'}
          size="medium"
        />
      </Animated.View>

      <Animated.View style={titleAnimStyle}>
        <Text
          className="text-2xl font-black text-center mt-6"
          style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
        >
          {generatingPlan ? 'Planning your week...' : 'Let me plan your week'}
        </Text>
      </Animated.View>

      <Animated.View style={subtitleAnimStyle}>
        <Text
          className="text-base text-center mt-2 mb-8"
          style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
        >
          {generatingPlan
            ? 'Sazon is picking recipes just for you'
            : 'Pick your goal and I\'ll handle the rest. Takes about 10 seconds.'}
        </Text>
      </Animated.View>

      {!generatingPlan && (
        <>
          <Animated.View style={[goalAnimStyle, { width: '100%', marginBottom: 32 }]}>
            <Text
              className="text-sm font-semibold mb-3"
              style={{ color: isDark ? '#D1D5DB' : '#374151' }}
            >
              What's your goal?
            </Text>
            <GoalModeSelector
              selectedMode={selectedMode}
              onSelect={setSelectedMode}
              isDark={isDark}
            />
          </Animated.View>

          <Animated.View style={[ctaAnimStyle, { width: '100%' }]}>
            <HapticTouchableOpacity
              onPress={() => onPlanMyWeek(selectedMode)}
              onPressIn={handleCtaPressIn}
              onPressOut={handleCtaPressOut}
              style={{ borderRadius: 100, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={['#fa7e12', '#d67a0c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[{
                  paddingVertical: 18,
                  alignItems: 'center',
                  borderRadius: 100,
                }, Shadows.LG]}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                  Plan My Week
                </Text>
              </LinearGradient>
            </HapticTouchableOpacity>
          </Animated.View>
        </>
      )}

      {generatingPlan && (
        <View style={{ marginTop: 16 }}>
          <LoadingState message="Creating your meal plan..." expression="focused" size="small" />
        </View>
      )}
    </View>
  );
}
