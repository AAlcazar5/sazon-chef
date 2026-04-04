// frontend/components/recipe/MacroPillsRow.tsx
// Pastel-tinted macro pills row for recipe detail (9M).
// protein=sage, carbs=golden, fat=lavender, calories=peach.

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Pastel, PastelDark, Accent, MACRO_COLORS } from '../../constants/Colors';

interface MacroPillsRowProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  isDark: boolean;
}

const PILLS: Array<{
  key: 'protein' | 'carbs' | 'fat' | 'calories';
  label: string;
  unit: string;
  bg: string;
  bgDark: string;
  accent: string;
}> = [
  { key: 'protein', label: 'protein', unit: 'g', bg: Pastel.sage, bgDark: PastelDark.sage, accent: Accent.sage },
  { key: 'carbs', label: 'carbs', unit: 'g', bg: Pastel.golden, bgDark: PastelDark.golden, accent: Accent.golden },
  { key: 'fat', label: 'fat', unit: 'g', bg: Pastel.lavender, bgDark: PastelDark.lavender, accent: Accent.lavender },
  { key: 'calories', label: 'kcal', unit: '', bg: Pastel.peach, bgDark: PastelDark.peach, accent: Accent.peach },
];

export default function MacroPillsRow({
  calories = 0,
  protein = 0,
  carbs = 0,
  fat = 0,
  fiber,
  isDark,
}: MacroPillsRowProps) {
  const values: Record<string, number> = { protein, carbs, fat, calories };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {PILLS.map((pill) => {
        const value = values[pill.key];
        if (!value && value !== 0) return null;
        return (
          <View
            key={pill.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDark ? pill.bgDark : pill.bg,
              borderRadius: 100,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
            accessibilityLabel={`${value}${pill.unit} ${pill.label}`}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: pill.accent }}>
              {value}
              {pill.unit}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '500', color: pill.accent, marginLeft: 3, opacity: 0.8 }}>
              {pill.label}
            </Text>
          </View>
        );
      })}

      {/* Optional fiber pill */}
      {fiber != null && fiber > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? PastelDark.sky : Pastel.sky,
            borderRadius: 100,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
          accessibilityLabel={`${fiber}g fiber`}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: Accent.sky }}>
            {fiber}g
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: Accent.sky, marginLeft: 3, opacity: 0.8 }}>
            fiber
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
