// frontend/components/build-a-plate/VariantChips.tsx
// Group 10X Phase 6 — Variant chips ("Roasted • Steamed • Raw • Pickled") with a soft Sazon hint banner.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';
import { useTheme } from '../../contexts/ThemeContext';

const LOW_COMPAT_THRESHOLD = 0.6;
const HINT_DISMISS_MS = 3000;

export interface ComponentVariant {
  id: string;
  variantKey: string;
  label: string;
  compatibilityScore: number;
  hint?: string;
  caloriesDeltaPerPortion?: number;
  cookTimeMinutes?: number;
}

interface VariantChipsProps {
  variants: ComponentVariant[];
  onSelect: (variant: ComponentVariant) => void;
  testID?: string;
}

export default function VariantChips({ variants, onSelect, testID }: VariantChipsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const sorted = useMemo(
    () => [...variants].sort((a, b) => b.compatibilityScore - a.compatibilityScore),
    [variants],
  );
  const highest = sorted[0];

  const [activeKey, setActiveKey] = useState<string | undefined>(highest?.variantKey);
  const [hint, setHint] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset selection when variants list changes
  useEffect(() => {
    setActiveKey(highest?.variantKey);
  }, [highest?.variantKey]);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const handleSelect = useCallback(
    (variant: ComponentVariant) => {
      setActiveKey(variant.variantKey);
      onSelect(variant);
      if (variant.compatibilityScore < LOW_COMPAT_THRESHOLD && variant.hint) {
        setHint(variant.hint);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => setHint(null), HINT_DISMISS_MS);
      } else {
        setHint(null);
      }
    },
    [onSelect],
  );

  if (sorted.length === 0) return null;

  return (
    <View testID={testID} accessibilityLabel="Cook method variants">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {sorted.map((variant) => {
          const active = variant.variantKey === activeKey;
          return (
            <HapticTouchableOpacity
              key={variant.variantKey}
              onPress={() => handleSelect(variant)}
              hapticStyle="light"
              pressedScale={0.97}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? Accent.sage
                    : isDark
                    ? 'rgba(255,255,255,0.08)'
                    : Pastel.sage,
                },
              ]}
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${variant.label}${active ? ', selected' : ''}, compatibility ${Math.round(variant.compatibilityScore * 100)}%`}
              testID={`variant-chip-${variant.variantKey}`}
            >
              <Text style={[styles.label, { color: active ? '#FFFFFF' : '#2E5931' }]}>
                {variant.label}
              </Text>
            </HapticTouchableOpacity>
          );
        })}
      </ScrollView>
      {hint && (
        <View style={styles.hint} testID={testID ? `${testID}-hint` : undefined}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 4,
    gap: 6,
    paddingVertical: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
  },
  hint: {
    backgroundColor: Pastel.peach,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  hintText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: '#8a4a00',
  },
});
