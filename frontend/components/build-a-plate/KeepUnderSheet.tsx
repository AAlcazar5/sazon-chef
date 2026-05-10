// frontend/components/build-a-plate/KeepUnderSheet.tsx
// "Keep under" cap picker — 5 toggleable rows (calories, protein, carbs, fat,
// fiber). Each row has an enable switch + a numeric value. Defaults pulled
// from the user's daily macro goals divided by 3 (one meal vs daily).
//
// On Apply, fires the `onApply(caps)` callback with only the enabled fields.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../ui/BottomSheet';
import BrandButton from '../ui/BrandButton';
import { Pastel, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import type { KeepUnderCaps } from '../../lib/api';

interface RowConfig {
  key: keyof KeepUnderCaps;
  label: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ROWS: RowConfig[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: 'flame-outline' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    icon: 'barbell-outline' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    icon: 'leaf-outline' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    icon: 'water-outline' },
  { key: 'fiber',    label: 'Fiber',    unit: 'g',    icon: 'nutrition-outline' },
];

export interface DailyMacroDefaults {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

interface KeepUnderSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (caps: KeepUnderCaps) => void;
  /** Daily macro goals — divided by `mealFraction` to seed per-meal defaults. */
  dailyDefaults?: DailyMacroDefaults | null;
  /** Fraction of daily goal to seed (default 1/3 for ~one meal). */
  mealFraction?: number;
}

type RowState = { enabled: boolean; value: string };

const computeDefault = (
  daily: number | undefined,
  fraction: number,
): string => {
  if (typeof daily !== 'number' || daily <= 0) return '';
  return Math.round(daily * fraction).toString();
};

export default function KeepUnderSheet({
  visible,
  onClose,
  onApply,
  dailyDefaults,
  mealFraction = 1 / 3,
}: KeepUnderSheetProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const initialRows = useMemo<Record<keyof KeepUnderCaps, RowState>>(
    () => ({
      calories: { enabled: false, value: computeDefault(dailyDefaults?.calories, mealFraction) },
      protein:  { enabled: false, value: computeDefault(dailyDefaults?.protein,  mealFraction) },
      carbs:    { enabled: false, value: computeDefault(dailyDefaults?.carbs,    mealFraction) },
      fat:      { enabled: false, value: computeDefault(dailyDefaults?.fat,      mealFraction) },
      fiber:    { enabled: false, value: computeDefault(dailyDefaults?.fiber,    mealFraction) },
    }),
    [dailyDefaults, mealFraction],
  );

  const [rows, setRows] = useState(initialRows);

  // Reset to defaults whenever the sheet opens — prevents stale values from
  // a previous session when the user reopens after dismissing.
  useEffect(() => {
    if (visible) setRows(initialRows);
  }, [visible, initialRows]);

  const setRow = useCallback((key: keyof KeepUnderCaps, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const enabledCount = useMemo(
    () => (Object.values(rows) as RowState[]).filter((r) => r.enabled && Number(r.value) > 0).length,
    [rows],
  );

  const handleApply = useCallback(() => {
    const caps: KeepUnderCaps = {};
    (Object.keys(rows) as (keyof KeepUnderCaps)[]).forEach((k) => {
      const row = rows[k];
      const n = Number(row.value);
      if (row.enabled && Number.isFinite(n) && n > 0) {
        caps[k] = n;
      }
    });
    if (Object.keys(caps).length === 0) return;
    onApply(caps);
  }, [rows, onApply]);

  const accent = Accent.sky;
  const inkPrimary = isDark ? '#F5F0EB' : '#1F2937';
  const inkSecondary = isDark ? '#A8B2BD' : '#5A4534';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : Pastel.sky;

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={['62%']}>
      <View style={styles.container} testID="keep-under-sheet">
        <Text style={[styles.eyebrow, { color: accent }]}>SET YOUR CEILINGS</Text>
        <Text style={[styles.title, { color: inkPrimary }]}>Keep this plate under…</Text>
        <Text style={[styles.subtitle, { color: inkSecondary }]}>
          Pick any combination — Sazon will balance the rest within them.
        </Text>

        <View style={styles.rows}>
          {ROWS.map(({ key, label, unit, icon }) => {
            const row = rows[key];
            return (
              <View
                key={key}
                style={[styles.row, Shadows.SM as any, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}
                testID={`keep-under-row-${key}`}
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBubble, { backgroundColor: row.enabled ? accent : (isDark ? 'rgba(255,255,255,0.06)' : Pastel.sky) }]}>
                    <Ionicons name={icon} size={16} color={row.enabled ? '#FFFFFF' : (isDark ? '#A8CCEB' : '#1F4F7A')} />
                  </View>
                  <Text style={[styles.rowLabel, { color: inkPrimary }]}>{label}</Text>
                </View>

                <View style={styles.rowRight}>
                  <TextInput
                    value={row.value}
                    onChangeText={(t) => setRow(key, { value: t.replace(/[^\d.]/g, '') })}
                    placeholder="—"
                    placeholderTextColor={inkSecondary}
                    keyboardType="decimal-pad"
                    editable={row.enabled}
                    accessibilityLabel={`${label} cap value in ${unit}`}
                    testID={`keep-under-input-${key}`}
                    style={[
                      styles.input,
                      {
                        color: row.enabled ? inkPrimary : inkSecondary,
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        opacity: row.enabled ? 1 : 0.6,
                      },
                    ]}
                  />
                  <Text style={[styles.unit, { color: inkSecondary }]}>{unit}</Text>
                  <Switch
                    value={row.enabled}
                    onValueChange={(enabled) => setRow(key, { enabled })}
                    accessibilityLabel={`Enable ${label} cap`}
                    testID={`keep-under-switch-${key}`}
                    trackColor={{ false: '#D1D5DB', true: accent }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.actions}>
          <BrandButton
            label="Apply"
            onPress={handleApply}
            disabled={enabledCount === 0}
            variant="sky"
            testID="keep-under-apply"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  rows: {
    gap: 10,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    textAlign: 'right',
  },
  unit: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    width: 30,
  },
  actions: {
    marginTop: 4,
  },
});
