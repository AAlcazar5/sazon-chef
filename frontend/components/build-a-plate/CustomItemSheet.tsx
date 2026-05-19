// Build-a-Plate Phase 10 — CustomItemSheet.
// Replaces the previous "Use 'X' tonight" zero-macro CTA. Asks for portion +
// runs USDA → LLM estimation via POST /api/macros/estimate, then hands a
// macro-populated synthetic MealComponent back to the composer.
//
// See plans/product.md#build-a-plate Phase 10 spec.

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
import LoadingState from '../ui/LoadingState';
import { Pastel, Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import {
  mealComponentApi,
  type MealComponent,
  type MealComponentSlot,
  type MacroEstimateResult,
  type MacroEstimateSource,
} from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

interface CustomItemSheetProps {
  visible: boolean;
  slot: MealComponentSlot | null;
  initialName: string;
  onAdd: (component: MealComponent) => void;
  onClose: () => void;
  testID?: string;
}

const SOURCE_BADGES: Record<MacroEstimateSource, { label: string; bg: string; fg: string }> = {
  usda: { label: 'USDA', bg: '#D7F0DC', fg: '#1E6F36' },
  ai: { label: 'Estimated by Sazon', bg: Pastel.lavender, fg: '#5A2E73' },
  fallback: { label: "Couldn't estimate — adjust later", bg: Pastel.peach, fg: '#7A3B12' },
};

// Unit presets → grams. Lookup is approximate by design — the user can
// override grams directly by switching to 'g' if a preset is wrong.
export type PortionUnit = 'g' | 'oz' | 'medium' | 'cup' | 'tbsp';
export const UNIT_TO_GRAMS: Record<PortionUnit, number> = {
  g: 1,
  oz: 28.35,
  medium: 150, // typical per-piece serving (chicken thigh, banana, avocado, etc.)
  cup: 240,
  tbsp: 15,
};
const UNIT_OPTIONS: { value: PortionUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'oz', label: 'oz' },
  { value: 'medium', label: '1 medium' },
  { value: 'cup', label: '1 cup' },
  { value: 'tbsp', label: '1 tbsp' },
];

type MacroField = 'caloriesPerPortion' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG';
const MACRO_FIELDS: { key: MacroField; label: string; unit: string }[] = [
  { key: 'caloriesPerPortion', label: 'kcal', unit: '' },
  { key: 'proteinG', label: 'Protein', unit: 'g' },
  { key: 'carbsG', label: 'Carbs', unit: 'g' },
  { key: 'fatG', label: 'Fat', unit: 'g' },
  { key: 'fiberG', label: 'Fiber', unit: 'g' },
];

export default function CustomItemSheet({
  visible,
  slot,
  initialName,
  onAdd,
  onClose,
  testID = 'custom-item-sheet',
}: CustomItemSheetProps) {
  const { isDark } = useTheme();
  const [name, setName] = useState(initialName);
  const [portionInput, setPortionInput] = useState('100');
  const [unit, setUnit] = useState<PortionUnit>('g');
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<MacroEstimateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingMacros, setEditingMacros] = useState(false);
  const [macroOverrides, setMacroOverrides] = useState<Record<MacroField, string>>({
    caloriesPerPortion: '',
    proteinG: '',
    carbsG: '',
    fatG: '',
    fiberG: '',
  });

  // Reset when re-opened so a fresh slot/name doesn't leak the previous estimate.
  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setPortionInput('100');
      setUnit('g');
      setResult(null);
      setErrorMsg(null);
      setEstimating(false);
      setEditingMacros(false);
      setMacroOverrides({
        caloriesPerPortion: '',
        proteinG: '',
        carbsG: '',
        fatG: '',
        fiberG: '',
      });
    }
  }, [visible, initialName]);

  // For presets ('medium'/'cup'/'tbsp'), portionInput is a count (1, 2, …);
  // for 'g'/'oz', it's the unit count and grams = count × unit-to-grams.
  const portionCount = Number.parseFloat(portionInput);
  const portionGrams = Number.isFinite(portionCount) ? portionCount * UNIT_TO_GRAMS[unit] : NaN;
  const portionValid = Number.isFinite(portionGrams) && portionGrams > 0 && portionGrams <= 5000;
  const nameValid = name.trim().length > 0;
  const canEstimate = portionValid && nameValid && slot != null && !estimating;

  const handleEstimate = useCallback(async () => {
    if (!slot || !canEstimate) return;
    setEstimating(true);
    setErrorMsg(null);
    setEditingMacros(false);
    try {
      const res = await mealComponentApi.estimateMacros({
        name: name.trim(),
        portionGrams,
        slot,
      });
      setResult(res.data);
      // Seed the override inputs so toggling edit doesn't wipe the estimate.
      setMacroOverrides({
        caloriesPerPortion: String(Math.round(res.data.caloriesPerPortion)),
        proteinG: String(Math.round(res.data.proteinG)),
        carbsG: String(Math.round(res.data.carbsG)),
        fatG: String(Math.round(res.data.fatG)),
        fiberG: String(Math.round(res.data.fiberG)),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Estimation failed';
      setErrorMsg(msg);
    } finally {
      setEstimating(false);
    }
  }, [slot, name, portionGrams, canEstimate]);

  // Manual edits win. When the user has touched any macro field via the
  // edit toggle, prefer the override; otherwise pass the estimate through.
  const macroFor = useCallback(
    (key: MacroField): number => {
      if (!result) return 0;
      const override = macroOverrides[key];
      const parsed = Number.parseFloat(override);
      if (editingMacros && Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
      return result[key];
    },
    [result, macroOverrides, editingMacros],
  );

  const handleAdd = useCallback(() => {
    if (!slot || !result) return;
    const component: MealComponent = {
      id: `custom-${Date.now()}`,
      slot,
      name: name.trim(),
      defaultPortionGrams: portionGrams,
      caloriesPerPortion: macroFor('caloriesPerPortion'),
      proteinG: macroFor('proteinG'),
      carbsG: macroFor('carbsG'),
      fatG: macroFor('fatG'),
      fiberG: macroFor('fiberG'),
      cuisineTags: [],
      dietaryTags: [],
      cookMethodHint: 'raw',
      pantryIngredientNames: [],
      pantryCoveragePercent: 0,
    };
    onAdd(component);
  }, [slot, name, portionGrams, result, macroFor, onAdd]);

  const titleColor = isDark ? '#FAF7F4' : '#1F1F1F';
  const bodyColor = isDark ? 'rgba(255,255,255,0.65)' : '#5C5C5C';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Estimate macros" snapPoints={['60%']} scrollable>
      <View style={styles.container} testID={testID}>
        <Text style={[styles.label, { color: bodyColor }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="What are you adding?"
          placeholderTextColor={bodyColor}
          style={[
            styles.input,
            { color: titleColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' },
          ]}
          testID={`${testID}-name-input`}
          accessibilityLabel="Custom item name"
          autoCorrect={false}
        />

        <Text style={[styles.label, { color: bodyColor, marginTop: 16 }]}>
          {unit === 'g' || unit === 'oz' ? `Portion (${unit})` : 'Quantity'}
        </Text>
        <TextInput
          value={portionInput}
          onChangeText={setPortionInput}
          placeholder={unit === 'g' ? '100' : '1'}
          placeholderTextColor={bodyColor}
          keyboardType="number-pad"
          style={[
            styles.input,
            { color: titleColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' },
          ]}
          testID={`${testID}-portion-input`}
          accessibilityLabel={unit === 'g' || unit === 'oz' ? `Portion in ${unit}` : `Number of ${unit} servings`}
        />

        <View style={styles.unitRow} testID={`${testID}-unit-row`}>
          {UNIT_OPTIONS.map((opt) => {
            const active = unit === opt.value;
            return (
              <HapticTouchableOpacity
                key={opt.value}
                onPress={() => {
                  setUnit(opt.value);
                  // Switching from a count-based preset back to grams keeps the
                  // grams value; switching INTO a preset resets count to 1.
                  if (opt.value !== 'g' && opt.value !== 'oz') {
                    setPortionInput('1');
                  } else if (opt.value === 'g') {
                    setPortionInput('100');
                  } else {
                    setPortionInput('3');
                  }
                }}
                style={[
                  styles.unitChip,
                  {
                    backgroundColor: active
                      ? (isDark ? DarkColors.primary : Colors.primary)
                      : isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                  },
                ]}
                testID={`${testID}-unit-${opt.value}`}
                accessibilityRole="button"
                accessibilityLabel={`Switch portion unit to ${opt.label}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.unitChipLabel, { color: active ? '#fff' : bodyColor }]}>
                  {opt.label}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>

        {(unit !== 'g' && unit !== 'oz' && Number.isFinite(portionGrams)) && (
          <Text style={[styles.unitHint, { color: bodyColor }]} testID={`${testID}-unit-hint`}>
            ≈ {Math.round(portionGrams)}g per request
          </Text>
        )}

        <HapticTouchableOpacity
          onPress={handleEstimate}
          hapticStyle="medium"
          pressedScale={0.97}
          disabled={!canEstimate}
          style={[
            styles.estimateBtn,
            { backgroundColor: canEstimate ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB') },
            Shadows.SM as any,
          ]}
          testID={`${testID}-estimate-btn`}
          accessibilityLabel="Estimate macros"
          accessibilityRole="button"
        >
          <Text style={[styles.estimateBtnLabel, { color: canEstimate ? '#fff' : bodyColor }]}>
            {estimating ? 'Estimating…' : 'Estimate'}
          </Text>
        </HapticTouchableOpacity>

        {estimating && (
          <View style={styles.loadingWrap} testID={`${testID}-loading`}>
            <LoadingState expression="thinking" message="Sazon's checking the numbers…" />
          </View>
        )}

        {errorMsg && (
          <Text style={[styles.error, { color: '#B91C1C' }]} testID={`${testID}-error`}>
            {errorMsg}
          </Text>
        )}

        {result && !estimating && (
          <View style={styles.previewCard} testID={`${testID}-preview`}>
            <View style={styles.previewHeader}>
              <View
                style={[
                  styles.sourceBadge,
                  { backgroundColor: SOURCE_BADGES[result.source].bg },
                ]}
                testID={`${testID}-source-${result.source}`}
              >
                <Text style={[styles.sourceBadgeText, { color: SOURCE_BADGES[result.source].fg }]}>
                  {SOURCE_BADGES[result.source].label}
                </Text>
              </View>
              <HapticTouchableOpacity
                onPress={() => setEditingMacros((v) => !v)}
                style={styles.adjustToggle}
                testID={`${testID}-edit-toggle`}
                accessibilityRole="button"
                accessibilityLabel={editingMacros ? 'Use estimated macros' : 'Adjust macros manually'}
                accessibilityState={{ selected: editingMacros }}
              >
                <Text style={[styles.adjustToggleLabel, { color: (isDark ? DarkColors.primary : Colors.primary) }]}>
                  {editingMacros ? 'Use estimate' : 'Adjust'}
                </Text>
              </HapticTouchableOpacity>
            </View>

            {!editingMacros ? (
              <View style={styles.macroRow}>
                {MACRO_FIELDS.map((f) => (
                  <Macro key={f.key} label={f.label} value={macroFor(f.key)} unit={f.unit} />
                ))}
              </View>
            ) : (
              <View style={styles.macroEditGrid} testID={`${testID}-edit-grid`}>
                {MACRO_FIELDS.map((f) => (
                  <View key={f.key} style={styles.macroEditCell}>
                    <Text style={[styles.macroEditLabel, { color: bodyColor }]}>
                      {f.label}{f.unit ? ` (${f.unit})` : ''}
                    </Text>
                    <TextInput
                      value={macroOverrides[f.key]}
                      onChangeText={(v) =>
                        setMacroOverrides((prev) => ({ ...prev, [f.key]: v }))
                      }
                      keyboardType="number-pad"
                      style={[
                        styles.macroEditInput,
                        { color: titleColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' },
                      ]}
                      testID={`${testID}-edit-${f.key}`}
                      accessibilityLabel={`Manual ${f.label} value`}
                    />
                  </View>
                ))}
              </View>
            )}

            <HapticTouchableOpacity
              onPress={handleAdd}
              hapticStyle="medium"
              pressedScale={0.97}
              style={[styles.addBtn, { backgroundColor: (isDark ? DarkColors.primary : Colors.primary) }, Shadows.SM as any]}
              testID={`${testID}-add-btn`}
              accessibilityLabel="Add to plate"
              accessibilityRole="button"
            >
              <Text style={styles.addBtnLabel}>Add to plate</Text>
            </HapticTouchableOpacity>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <View style={styles.macroCell}>
      <Text style={styles.macroValue}>
        {Math.round(value)}
        {unit}
      </Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    borderRadius: BorderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  estimateBtn: {
    marginTop: 20,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
  },
  estimateBtnLabel: { fontSize: 16, fontWeight: '700' },
  loadingWrap: { marginTop: 16, alignItems: 'center' },
  error: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  previewCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FAF7F4',
    borderRadius: BorderRadius.card,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sourceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  sourceBadgeText: { fontSize: 12, fontWeight: '700' },
  adjustToggle: { paddingHorizontal: 8, paddingVertical: 4 },
  adjustToggleLabel: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  macroCell: { alignItems: 'center' },
  macroValue: { fontSize: 16, fontWeight: '700', color: '#1F1F1F' },
  macroLabel: { fontSize: 11, color: '#5C5C5C', marginTop: 2 },
  macroEditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  macroEditCell: { width: '48%', marginBottom: 10 },
  macroEditLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  macroEditInput: {
    borderRadius: BorderRadius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  addBtn: { borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
  addBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  unitChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  unitHint: {
    marginTop: 6,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
