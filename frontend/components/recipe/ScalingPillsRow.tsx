// frontend/components/recipe/ScalingPillsRow.tsx
// 10K: Quick-tap scaling pills (½×, 1×, 2×, 4×, Custom, Hit My Macros)
// for recipe detail. Tapping instantly updates ingredients + macros.

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';

const PRESETS: Array<{ label: string; factor: number }> = [
  { label: '½×', factor: 0.5 },
  { label: '1×', factor: 1 },
  { label: '2×', factor: 2 },
  { label: '4×', factor: 4 },
];

interface ScalingPillsRowProps {
  activeScale: number;
  onScaleChange: (factor: number) => void;
  onCustomPress: () => void;
  onHitMyMacrosPress: () => void;
  isDark: boolean;
}

export default function ScalingPillsRow({
  activeScale,
  onScaleChange,
  onCustomPress,
  onHitMyMacrosPress,
  isDark,
}: ScalingPillsRowProps) {
  const isPresetActive = (factor: number) =>
    Math.abs(activeScale - factor) < 0.01;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 2, gap: 8 }}
    >
      {PRESETS.map((preset) => {
        const active = isPresetActive(preset.factor);
        return (
          <HapticTouchableOpacity
            key={preset.label}
            onPress={() => onScaleChange(preset.factor)}
            hapticStyle="light"
            pressedScale={0.95}
            accessibilityLabel={`Scale to ${preset.label}${active ? ' (active)' : ''}`}
            accessibilityState={{ selected: active }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 100,
              backgroundColor: active
                ? (isDark ? Accent.peach : '#F97316')
                : (isDark ? PastelDark.peach : Pastel.peach),
            }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '700',
              color: active
                ? '#FFFFFF'
                : (isDark ? Accent.peach : '#C2410C'),
            }}>
              {preset.label}
            </Text>
          </HapticTouchableOpacity>
        );
      })}

      {/* Custom pill */}
      <HapticTouchableOpacity
        onPress={onCustomPress}
        hapticStyle="light"
        pressedScale={0.95}
        accessibilityLabel="Custom serving size"
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 100,
          backgroundColor: isDark ? PastelDark.sky : Pastel.sky,
        }}
      >
        <Text style={{
          fontSize: 14,
          fontWeight: '700',
          color: isDark ? Accent.sky : '#0369A1',
        }}>
          Custom
        </Text>
      </HapticTouchableOpacity>

      {/* Hit My Macros pill */}
      <HapticTouchableOpacity
        onPress={onHitMyMacrosPress}
        hapticStyle="light"
        pressedScale={0.95}
        accessibilityLabel="Hit my macros scaler"
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 100,
          backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
        }}
      >
        <Text style={{
          fontSize: 14,
          fontWeight: '700',
          color: isDark ? Accent.sage : '#2E7D32',
        }}>
          Hit My Macros
        </Text>
      </HapticTouchableOpacity>
    </ScrollView>
  );
}
