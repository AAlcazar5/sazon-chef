// frontend/components/recipe/CookingStepsTimeline.tsx
// Vertical timeline for recipe instructions — numbered circles connected by dotted lines.
// Active/completed/upcoming states for cooking mode integration.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue, withSequence } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../../constants/Colors';

interface CookingStepsTimelineProps {
  /** Array of step text strings */
  steps: string[];
  /** Index of the currently active step (cooking mode), -1 or undefined = display mode */
  activeStep?: number;
  /** Set of completed step indices */
  completedSteps?: Set<number>;
  /** Test ID */
  testID?: string;
}

function StepCircle({ index, state }: { index: number; state: 'completed' | 'active' | 'upcoming' }) {
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (state === 'active') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = 1;
    }
  }, [state, pulseScale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const bg = state === 'completed' ? '#22C55E' : state === 'active' ? Colors.primary : 'transparent';
  const borderColor = state === 'upcoming' ? '#9CA3AF' : bg;

  return (
    <Animated.View
      style={[
        styles.circle,
        { backgroundColor: bg, borderColor },
        animStyle,
      ]}
    >
      {state === 'completed' ? (
        <Text style={styles.checkmark}>✓</Text>
      ) : (
        <Text style={[styles.stepNumber, state === 'upcoming' && { color: '#9CA3AF' }]}>
          {index + 1}
        </Text>
      )}
    </Animated.View>
  );
}

export default function CookingStepsTimeline({
  steps,
  activeStep = -1,
  completedSteps = new Set(),
  testID,
}: CookingStepsTimelineProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const lineColor = isDark ? 'rgba(255,255,255,0.2)' : Colors.border?.light ?? '#E5E7EB';

  const getStepState = (index: number): 'completed' | 'active' | 'upcoming' => {
    if (completedSteps.has(index)) return 'completed';
    if (index === activeStep) return 'active';
    return 'upcoming';
  };

  return (
    <View testID={testID} style={styles.container}>
      {steps.map((step, index) => {
        const state = getStepState(index);
        const isLast = index === steps.length - 1;

        return (
          <View key={index} style={styles.row}>
            {/* Timeline column: circle + dotted line */}
            <View style={styles.timelineCol}>
              <StepCircle index={index} state={state} />
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    {
                      borderLeftColor: lineColor,
                      borderLeftWidth: 2,
                      borderStyle: 'dashed',
                    },
                  ]}
                />
              )}
            </View>

            {/* Step text */}
            <View style={styles.textCol}>
              <Text
                style={[
                  styles.stepText,
                  {
                    color: state === 'completed'
                      ? (isDark ? '#6B7280' : '#9CA3AF')
                      : (isDark ? DarkColors.text.primary : Colors.text.primary),
                    textDecorationLine: state === 'completed' ? 'line-through' : 'none',
                  },
                ]}
              >
                {typeof step === 'string' ? step : (step as any)?.text ?? String(step)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineCol: {
    width: 32,
    alignItems: 'center',
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    minHeight: 20,
    marginVertical: 4,
  },
  textCol: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
