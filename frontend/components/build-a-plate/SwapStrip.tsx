// frontend/components/build-a-plate/SwapStrip.tsx
// Group 10X Phase 2 — horizontal strip of swap alternatives below a selected slot.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import type { MealComponent } from '../../lib/api';

const MAX_CHIPS = 3;

interface SwapStripProps {
  alternatives: MealComponent[];
  current: MealComponent;
  onSwap: (componentId: string) => void;
  testID?: string;
}

interface MacroDeltaTooltipProps {
  from: MealComponent;
  to: MealComponent;
  testID?: string;
}

function MacroDeltaTooltip({ from, to, testID }: MacroDeltaTooltipProps) {
  const calDelta = Math.round(to.caloriesPerPortion - from.caloriesPerPortion);
  const proteinDelta = Math.round(to.proteinG - from.proteinG);

  const calStr = calDelta >= 0 ? `+${calDelta} cal` : `${calDelta} cal`;
  const proteinStr = proteinDelta >= 0 ? `+${proteinDelta}g protein` : `–${Math.abs(proteinDelta)}g protein`;

  return (
    <View style={styles.tooltip} testID={testID} accessibilityLabel={`${to.name}: ${calStr}, ${proteinStr}`}>
      <Text style={styles.tooltipName}>{from.name} → {to.name}</Text>
      <Text style={styles.tooltipDelta}>{calStr}, {proteinStr}</Text>
    </View>
  );
}

interface SwapChipProps {
  component: MealComponent;
  current: MealComponent;
  onSwap: (id: string) => void;
  testID?: string;
}

function SwapChip({ component, current, onSwap, testID }: SwapChipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const scale = useSharedValue(1);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(async () => {
    scale.value = withSpring(0.92, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSwap(component.id);
  }, [component.id, onSwap, scale]);

  const handleLongPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTooltip(true);
    dismissTimer.current = setTimeout(() => setShowTooltip(false), 3000);
  }, []);

  const handleTooltipDismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setShowTooltip(false);
  }, []);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  return (
    <View style={styles.chipWrapper}>
      {showTooltip && (
        <HapticTouchableOpacity
          onPress={handleTooltipDismiss}
          hapticStyle="light"
          style={styles.tooltipWrapper}
          accessibilityLabel="Dismiss macro delta"
        >
          <MacroDeltaTooltip from={current} to={component} testID="macro-delta-tooltip" />
        </HapticTouchableOpacity>
      )}
      <Animated.View style={animatedStyle}>
        <HapticTouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          hapticStyle="light"
          pressedScale={1}
          style={styles.chip}
          testID={testID}
          accessibilityLabel={`Swap to ${component.name}, ${component.pantryCoveragePercent}% pantry coverage`}
        >
          <View style={[styles.chipCircle, { backgroundColor: Pastel.sage }]}>
            <Text style={styles.chipEmoji}>🔄</Text>
          </View>
          <Text style={styles.chipName} numberOfLines={1}>{component.name}</Text>
        </HapticTouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function SwapStrip({ alternatives, current, onSwap, testID }: SwapStripProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const sorted = [...alternatives]
    .sort((a, b) => b.pantryCoveragePercent - a.pantryCoveragePercent)
    .slice(0, MAX_CHIPS);

  if (sorted.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      testID={testID}
      accessibilityLabel="Swap alternatives"
    >
      {sorted.map((alt) => (
        <SwapChip
          key={alt.id}
          component={alt}
          current={current}
          onSwap={onSwap}
          testID={`swap-chip-${alt.id}`}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 8,
    gap: 10,
  },
  chipWrapper: {
    alignItems: 'center',
    position: 'relative',
  },
  chip: {
    alignItems: 'center',
    width: 56,
  },
  chipCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.SM as any),
  },
  chipEmoji: {
    fontSize: 20,
  },
  chipName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 56,
  },
  tooltipWrapper: {
    position: 'absolute',
    bottom: '100%',
    zIndex: 100,
    marginBottom: 4,
  },
  tooltip: {
    backgroundColor: '#1F2937',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 160,
    alignItems: 'center',
    ...(Shadows.MD as any),
  },
  tooltipName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  tooltipDelta: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: '#D1D5DB',
  },
});
