// frontend/components/ui/MacroSlider.tsx
// Reanimated + GestureDetector single-thumb slider for macro constraints

import React, { useCallback } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors } from '../../constants/Colors';

interface MacroSliderProps {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** When true, shows "Any" when value is undefined/min */
  anyWhenMin?: boolean;
  isDark: boolean;
}

const THUMB_SIZE = 26;
const TRACK_HEIGHT = 6;

export default function MacroSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 5,
  unit = 'g',
  anyWhenMin = false,
  isDark,
}: MacroSliderProps) {
  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const startX = useSharedValue(0);

  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const trackBg = isDark ? '#3A3A3C' : '#E5E7EB';

  // Convert value → position (0..trackWidth - THUMB_SIZE)
  const valueToX = useCallback(
    (v: number, tw: number) => {
      const ratio = (v - min) / (max - min);
      return ratio * Math.max(tw - THUMB_SIZE, 1);
    },
    [min, max]
  );

  // Convert position → snapped value
  const xToValue = useCallback(
    (x: number, tw: number): number => {
      const ratio = x / Math.max(tw - THUMB_SIZE, 1);
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      return Math.min(max, Math.max(min, snapped));
    },
    [min, max, step]
  );

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const tw = e.nativeEvent.layout.width;
      trackWidth.value = tw;
      thumbX.value = valueToX(value ?? min, tw);
    },
    [value, min, valueToX, trackWidth, thumbX]
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = thumbX.value;
    })
    .onUpdate((e) => {
      const tw = trackWidth.value;
      const newX = clamp(startX.value + e.translationX, 0, Math.max(tw - THUMB_SIZE, 0));
      thumbX.value = newX;
      const v = xToValue(newX, tw);
      runOnJS(onChange)(anyWhenMin && v === min ? undefined : v);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value + THUMB_SIZE / 2,
  }));

  const displayValue = value === undefined ? 'Any' : `${value}${unit}`;

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>{label}</Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: value === undefined ? textSecondary : Colors.accent.primary,
          }}
        >
          {displayValue}
        </Text>
      </View>

      <View style={{ paddingHorizontal: THUMB_SIZE / 2 }}>
        <View
          onLayout={handleLayout}
          style={{
            height: THUMB_SIZE,
            justifyContent: 'center',
          }}
        >
          {/* Track background */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: TRACK_HEIGHT,
              backgroundColor: trackBg,
              borderRadius: TRACK_HEIGHT / 2,
            }}
          />
          {/* Filled portion */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 0,
                height: TRACK_HEIGHT,
                backgroundColor: Colors.accent.primary,
                borderRadius: TRACK_HEIGHT / 2,
              },
              fillStyle,
            ]}
          />
          {/* Thumb */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: THUMB_SIZE / 2,
                  backgroundColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 4,
                  borderWidth: 2,
                  borderColor: Colors.accent.primary,
                  top: 0,
                  left: -THUMB_SIZE / 2,
                },
                thumbStyle,
              ]}
            />
          </GestureDetector>
        </View>
      </View>

      {/* Min/Max labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ fontSize: 10, color: textSecondary }}>{anyWhenMin ? 'Any' : `${min}${unit}`}</Text>
        <Text style={{ fontSize: 10, color: textSecondary }}>{`${max}${unit}`}</Text>
      </View>
    </View>
  );
}
