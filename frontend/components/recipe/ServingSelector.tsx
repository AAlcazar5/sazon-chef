// frontend/components/recipe/ServingSelector.tsx
// 10K: Unified serving selector — single source of truth for portion size.
// Stepper (−/+) with 0.5 increments + tappable tick track + "Hit My Macros" pill.

import React from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

const TICK_VALUES = [1, 2, 3, 4, 5, 6, 7, 8];
const STEP = 0.5;
const MIN = 0.5;

interface ServingSelectorProps {
  servings: number;
  baseServings: number;
  onServingsChange: (servings: number) => void;
  onHitMyMacrosPress: () => void;
  isDark: boolean;
}

export default function ServingSelector({
  servings,
  baseServings,
  onServingsChange,
  onHitMyMacrosPress,
  isDark,
}: ServingSelectorProps) {
  const isWhole = servings === Math.floor(servings);
  const displayValue = isWhole ? String(servings) : servings.toFixed(1);

  const handleDecrease = () => {
    const next = Math.round((servings - STEP) * 10) / 10;
    if (next >= MIN) onServingsChange(next);
  };

  const handleIncrease = () => {
    const next = Math.round((servings + STEP) * 10) / 10;
    onServingsChange(next);
  };

  const isTickActive = (tick: number) => Math.abs(servings - tick) < 0.01;

  // Determine which tick is closest (for the visual indicator position)
  const closestTick = TICK_VALUES.reduce((prev, curr) =>
    Math.abs(curr - servings) < Math.abs(prev - servings) ? curr : prev
  );

  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const stepperBg = isDark ? PastelDark.peach : Pastel.peach;
  const stepperAccent = isDark ? '#FFB74D' : '#EA580C';
  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6';

  return (
    <View>
      {/* ── Stepper: [ − ]  4  servings  [ + ] ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
      }}>
        <HapticTouchableOpacity
          onPress={handleDecrease}
          hapticStyle="light"
          pressedScale={0.9}
          accessibilityLabel="Decrease servings"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: stepperBg,
            opacity: servings <= MIN ? 0.4 : 1,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '700', color: stepperAccent, lineHeight: 24 }}>−</Text>
        </HapticTouchableOpacity>

        <View style={{ alignItems: 'center', marginHorizontal: 20, minWidth: 80 }}>
          <Text style={{
            fontSize: 28,
            fontWeight: '800',
            color: textPrimary,
            lineHeight: 34,
          }}
          accessibilityLabel={`${displayValue} servings`}
          >
            {displayValue}
          </Text>
          <Text style={{
            fontSize: 13,
            fontWeight: '600',
            color: textSecondary,
            marginTop: -2,
          }}>
            {servings === 1 ? 'serving' : 'servings'}
          </Text>
        </View>

        <HapticTouchableOpacity
          onPress={handleIncrease}
          hapticStyle="light"
          pressedScale={0.9}
          accessibilityLabel="Increase servings"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: stepperBg,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '700', color: stepperAccent, lineHeight: 24 }}>+</Text>
        </HapticTouchableOpacity>
      </View>

      {/* ── Tick track: tappable whole-number marks ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: trackBg,
        borderRadius: 100,
        paddingHorizontal: 4,
        paddingVertical: 4,
        marginBottom: 10,
      }}>
        {TICK_VALUES.map((tick) => {
          const active = isTickActive(tick);
          const isOriginal = Math.abs(tick - baseServings) < 0.01;
          return (
            <HapticTouchableOpacity
              key={tick}
              onPress={() => onServingsChange(tick)}
              hapticStyle="light"
              pressedScale={0.9}
              accessibilityLabel={`Set to ${tick} serving${tick !== 1 ? 's' : ''}${active ? ' (active)' : ''}`}
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 6,
                borderRadius: 100,
                backgroundColor: active
                  ? (isDark ? Accent.peach : '#F97316')
                  : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: active ? '800' : '600',
                color: active
                  ? '#FFFFFF'
                  : isOriginal
                    ? stepperAccent
                    : textSecondary,
              }}>
                {tick}
              </Text>
            </HapticTouchableOpacity>
          );
        })}
      </View>

      {/* ── Hit My Macros pill ── */}
      <HapticTouchableOpacity
        onPress={onHitMyMacrosPress}
        hapticStyle="light"
        pressedScale={0.95}
        accessibilityLabel="Hit my macros scaler"
        style={{
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 100,
          backgroundColor: isDark ? PastelDark.sage : Pastel.sage,
        }}
      >
        <Text style={{ fontSize: 13, marginRight: 5 }}>🎯</Text>
        <Text style={{
          fontSize: 13,
          fontWeight: '700',
          color: isDark ? Accent.sage : '#2E7D32',
        }}>
          Hit My Macros
        </Text>
      </HapticTouchableOpacity>
    </View>
  );
}
