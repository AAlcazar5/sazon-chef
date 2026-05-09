// frontend/components/budget/BudgetInputRow.tsx
// K15: shared "currency-prefixed numeric input with title + helper text" row.
// edit-budget.tsx had three of these (max recipe cost, max meal cost, daily
// budget) duplicated verbatim; each had identical layout differing only in
// label, helper text, and the field of `BudgetSettings` it bound to.

import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Colors, DarkColors } from '../../constants/Colors';

export interface BudgetInputRowProps {
  title: string;
  description: string;
  /** Currency glyph rendered as a prefix inside the input shell (e.g., "$"). */
  currencySymbol: string;
  /** Current numeric value or undefined when no limit is set. */
  value: number | undefined;
  /** Called with the parsed number, or undefined when the field is cleared / unparseable. */
  onChange: (next: number | undefined) => void;
  isDark: boolean;
}

export default function BudgetInputRow({
  title,
  description,
  currencySymbol,
  value,
  onChange,
  isDark,
}: BudgetInputRowProps) {
  const titleColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const helperColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const inputBg = isDark ? '#1F2937' : '#FFFFFF';
  const placeholderColor = isDark ? DarkColors.text.tertiary : Colors.text.tertiary;

  return (
    <View className="mb-6">
      <Text className="text-lg font-semibold mb-2" style={{ color: titleColor }}>
        {title}
      </Text>
      <Text className="text-sm mb-2" style={{ color: helperColor }}>
        {description}
      </Text>
      <View
        className="flex-row items-center rounded-lg border"
        style={{ backgroundColor: inputBg, borderColor: 'transparent', borderWidth: 0 }}
      >
        <Text className="px-4 font-semibold" style={{ color: helperColor }}>
          {currencySymbol}
        </Text>
        <TextInput
          placeholder="No limit"
          value={value?.toString() ?? ''}
          onChangeText={(text) => {
            if (text === '') {
              onChange(undefined);
              return;
            }
            const parsed = parseFloat(text);
            onChange(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
          }}
          keyboardType="decimal-pad"
          className="flex-1 py-3"
          style={{ color: titleColor }}
          placeholderTextColor={placeholderColor}
          accessibilityLabel={title}
        />
      </View>
    </View>
  );
}
