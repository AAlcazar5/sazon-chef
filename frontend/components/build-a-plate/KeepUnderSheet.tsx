// frontend/components/build-a-plate/KeepUnderSheet.tsx
// "Tune the plate" — min/max bounds picker. Each row has:
//   • enable switch
//   • mode toggle (≤ max  /  ≥ min)
//   • numeric value
// Defaults:
//   • calories → 650, max mode (user override of the 1/3-daily rule)
//   • carbs / fat → 1/3 daily, max mode
//   • protein / fiber → 1/3 daily, min mode (typical "at least" use)
//
// On Apply, fires `onApply(bounds)` with each enabled row turned into either
// `{ min: value }` or `{ max: value }` depending on its mode.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Switch, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../ui/BottomSheet';
import BrandButton from '../ui/BrandButton';
import { Pastel, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import type { MacroBounds, MacroKey } from '../../lib/api';

type BoundMode = 'max' | 'min';

interface RowConfig {
  key: MacroKey;
  label: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultMode: BoundMode;
}

const ROWS: RowConfig[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', icon: 'flame-outline',     defaultMode: 'max' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    icon: 'barbell-outline',   defaultMode: 'min' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    icon: 'leaf-outline',      defaultMode: 'max' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    icon: 'water-outline',     defaultMode: 'max' },
  { key: 'fiber',    label: 'Fiber',    unit: 'g',    icon: 'nutrition-outline', defaultMode: 'min' },
];

// Calorie default is fixed regardless of the user's daily macro target — this
// is a per-meal ceiling that maps to the persona's "real food, lighter" intent.
const CALORIES_DEFAULT_VALUE = 650;

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
  onApply: (bounds: MacroBounds) => void;
  /** Daily macro goals — divided by `mealFraction` to seed per-meal defaults.
   *  Calories are NOT seeded from this — they always default to 650. */
  dailyDefaults?: DailyMacroDefaults | null;
  /** Fraction of daily goal to seed (default 1/3 for ~one meal). */
  mealFraction?: number;
}

interface RowState {
  enabled: boolean;
  mode: BoundMode;
  value: string;
}

const computeDefault = (daily: number | undefined, fraction: number): string => {
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

  const initialRows = useMemo<Record<MacroKey, RowState>>(
    () => ({
      calories: { enabled: false, mode: 'max', value: String(CALORIES_DEFAULT_VALUE) },
      protein:  { enabled: false, mode: 'min', value: computeDefault(dailyDefaults?.protein, mealFraction) },
      carbs:    { enabled: false, mode: 'max', value: computeDefault(dailyDefaults?.carbs,   mealFraction) },
      fat:      { enabled: false, mode: 'max', value: computeDefault(dailyDefaults?.fat,     mealFraction) },
      fiber:    { enabled: false, mode: 'min', value: computeDefault(dailyDefaults?.fiber,   mealFraction) },
    }),
    [dailyDefaults, mealFraction],
  );

  const [rows, setRows] = useState(initialRows);

  useEffect(() => {
    if (visible) setRows(initialRows);
  }, [visible, initialRows]);

  const setRow = useCallback((key: MacroKey, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const enabledCount = useMemo(
    () => (Object.values(rows) as RowState[]).filter((r) => r.enabled && Number(r.value) > 0).length,
    [rows],
  );

  const handleApply = useCallback(() => {
    const bounds: MacroBounds = {};
    (Object.keys(rows) as MacroKey[]).forEach((k) => {
      const row = rows[k];
      const n = Number(row.value);
      if (row.enabled && Number.isFinite(n) && n > 0) {
        bounds[k] = row.mode === 'max' ? { max: n } : { min: n };
      }
    });
    if (Object.keys(bounds).length === 0) return;
    onApply(bounds);
  }, [rows, onApply]);

  const accent = Accent.sky;
  const inkPrimary = isDark ? '#F5F0EB' : '#1F2937';
  const inkSecondary = isDark ? '#A8B2BD' : '#5A4534';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : Pastel.sky;
  const modeChipActiveBg = accent;
  const modeChipInactiveBg = isDark ? 'rgba(255,255,255,0.06)' : Pastel.sky;
  const modeChipActiveFg = '#FFFFFF';
  const modeChipInactiveFg = isDark ? '#A8CCEB' : '#1F4F7A';

  return (
    <BottomSheet visible={visible} onClose={onClose} snapPoints={['68%']}>
      <View style={styles.container} testID="keep-under-sheet">
        <Text style={[styles.eyebrow, { color: accent }]}>SET YOUR BOUNDS</Text>
        <Text style={[styles.title, { color: inkPrimary }]}>Tune this plate</Text>
        <Text style={[styles.subtitle, { color: inkSecondary }]}>
          Pin any macro — pick a max ceiling or an "at least" floor.
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
                  <View style={styles.modeToggle} testID={`keep-under-mode-${key}`}>
                    <Pressable
                      onPress={() => setRow(key, { mode: 'max' })}
                      disabled={!row.enabled}
                      accessibilityLabel={`${label} max mode`}
                      accessibilityState={{ selected: row.mode === 'max' }}
                      testID={`keep-under-mode-max-${key}`}
                      style={[
                        styles.modeChip,
                        {
                          backgroundColor: row.mode === 'max' ? modeChipActiveBg : modeChipInactiveBg,
                          opacity: row.enabled ? 1 : 0.5,
                        },
                      ]}
                    >
                      <Text style={[styles.modeChipText, { color: row.mode === 'max' ? modeChipActiveFg : modeChipInactiveFg }]}>≤</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setRow(key, { mode: 'min' })}
                      disabled={!row.enabled}
                      accessibilityLabel={`${label} min mode`}
                      accessibilityState={{ selected: row.mode === 'min' }}
                      testID={`keep-under-mode-min-${key}`}
                      style={[
                        styles.modeChip,
                        {
                          backgroundColor: row.mode === 'min' ? modeChipActiveBg : modeChipInactiveBg,
                          opacity: row.enabled ? 1 : 0.5,
                        },
                      ]}
                    >
                      <Text style={[styles.modeChipText, { color: row.mode === 'min' ? modeChipActiveFg : modeChipInactiveFg }]}>≥</Text>
                    </Pressable>
                  </View>

                  <TextInput
                    value={row.value}
                    onChangeText={(t) => setRow(key, { value: t.replace(/[^\d.]/g, '') })}
                    placeholder="—"
                    placeholderTextColor={inkSecondary}
                    keyboardType="decimal-pad"
                    editable={row.enabled}
                    accessibilityLabel={`${label} ${row.mode === 'max' ? 'max' : 'min'} value in ${unit}`}
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
                    accessibilityLabel={`Enable ${label} bound`}
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
    gap: 6,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 2,
  },
  modeChip: {
    width: 22,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  input: {
    width: 56,
    paddingHorizontal: 8,
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
    width: 28,
  },
  actions: {
    marginTop: 4,
  },
});
