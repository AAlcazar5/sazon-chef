// frontend/components/recipe/MacroPillsRow.tsx
// Pastel-tinted macro pills row for recipe detail (9M).
// Order matches the rest of the app: calories, protein, carbs, fat, fiber.
// Auto-scrolling marquee so every pill rotates into view without manual scrolling.

import React, { useEffect, useState } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';

interface MacroPillsRowProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  isDark: boolean;
}

type PillKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';

// Darker text colors for light mode — pastel accents lack contrast on pastel bg.
const TextLight: Record<PillKey, string> = {
  calories: '#C2410C',
  protein:  '#2E7D32',
  carbs:    '#B45309',
  fat:      '#6A1B9A',
  fiber:    '#0369A1',
};

const PILLS: Array<{
  key: PillKey;
  label: string;
  unit: string;
  bg: string;
  bgDark: string;
  accentDark: string;
}> = [
  { key: 'calories', label: 'kcal',    unit: '',  bg: Pastel.peach,    bgDark: PastelDark.peach,    accentDark: Accent.peach },
  { key: 'protein',  label: 'protein', unit: 'g', bg: Pastel.sage,     bgDark: PastelDark.sage,     accentDark: Accent.sage },
  { key: 'carbs',    label: 'carbs',   unit: 'g', bg: Pastel.golden,   bgDark: PastelDark.golden,   accentDark: Accent.golden },
  { key: 'fat',      label: 'fat',     unit: 'g', bg: Pastel.lavender, bgDark: PastelDark.lavender, accentDark: Accent.lavender },
  { key: 'fiber',    label: 'fiber',   unit: 'g', bg: Pastel.sky,      bgDark: PastelDark.sky,      accentDark: Accent.sky },
];

const GAP = 6;

export default function MacroPillsRow({
  calories = 0,
  protein = 0,
  carbs = 0,
  fat = 0,
  fiber,
  isDark,
}: MacroPillsRowProps) {
  const values: Record<PillKey, number | undefined> = {
    calories,
    protein,
    carbs,
    fat,
    fiber,
  };

  const visiblePills = PILLS.filter((pill) => {
    const v = values[pill.key];
    return v != null && v !== 0;
  });

  const [setWidth, setSetWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (setWidth <= 0) return;
    // 25 pixels per second — calm, readable marquee speed.
    const duration = (setWidth / 25) * 1000;
    translateX.value = 0;
    translateX.value = withRepeat(
      withTiming(-setWidth, { duration, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(translateX);
  }, [setWidth, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.abs(w - setWidth) > 1) setSetWidth(w);
  };

  const renderPill = (pill: (typeof PILLS)[number], suffix: string) => {
    const value = values[pill.key];
    const textColor = isDark ? pill.accentDark : TextLight[pill.key];
    return (
      <View
        key={`${pill.key}-${suffix}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? pill.bgDark : pill.bg,
          borderRadius: 100,
          paddingHorizontal: 10,
          paddingVertical: 5,
          marginRight: GAP,
        }}
        accessibilityLabel={`${value}${pill.unit} ${pill.label}`}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: textColor }}>
          {value}
          {pill.unit}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: textColor, marginLeft: 3, opacity: 0.85 }}>
          {pill.label}
        </Text>
      </View>
    );
  };

  if (visiblePills.length === 0) return null;

  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View style={[{ flexDirection: 'row' }, animStyle]}>
        {/* First set — measured for the loop distance */}
        <View style={{ flexDirection: 'row' }} onLayout={handleLayout}>
          {visiblePills.map((p) => renderPill(p, 'a'))}
        </View>
        {/* Duplicate set — creates seamless wrap-around */}
        <View style={{ flexDirection: 'row' }}>
          {visiblePills.map((p) => renderPill(p, 'b'))}
        </View>
      </Animated.View>
    </View>
  );
}
