// frontend/components/profile/DataStatRow.tsx
// K20: simple label + value row used 5× inside DataPrivacyCard's Data Usage
// breakdown (Saved Recipes, Meal Plans, Shopping Lists, Meal History,
// Collections).

import React from 'react';
import { View, Text } from 'react-native';
import { Colors, DarkColors } from '../../constants/Colors';

export interface DataStatRowProps {
  label: string;
  value: number;
  isDark: boolean;
  /** When true, render with bolder weight + accent value color (used for "Total Items"). */
  emphasized?: boolean;
}

export default function DataStatRow({
  label,
  value,
  isDark,
  emphasized = false,
}: DataStatRowProps) {
  const labelColor = isDark
    ? emphasized
      ? DarkColors.text.primary
      : DarkColors.text.secondary
    : emphasized
      ? Colors.text.primary
      : Colors.text.secondary;
  const valueColor = emphasized
    ? isDark
      ? DarkColors.primary
      : Colors.primary
    : isDark
      ? DarkColors.text.primary
      : Colors.text.primary;
  const labelClass = emphasized ? 'text-xs font-medium' : 'text-xs';
  const valueClass = emphasized ? 'text-xs font-bold' : 'text-xs font-semibold';

  return (
    <View className="flex-row justify-between items-center">
      <Text className={labelClass} style={{ color: labelColor }}>
        {label}
      </Text>
      <Text className={valueClass} style={{ color: valueColor }}>
        {value}
      </Text>
    </View>
  );
}
