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
import { Pastel, Accent } from '../../constants/Colors';
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
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<MacroEstimateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset when re-opened so a fresh slot/name doesn't leak the previous estimate.
  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setPortionInput('100');
      setResult(null);
      setErrorMsg(null);
      setEstimating(false);
    }
  }, [visible, initialName]);

  const portionGrams = Number.parseFloat(portionInput);
  const portionValid = Number.isFinite(portionGrams) && portionGrams > 0 && portionGrams <= 5000;
  const nameValid = name.trim().length > 0;
  const canEstimate = portionValid && nameValid && slot != null && !estimating;

  const handleEstimate = useCallback(async () => {
    if (!slot || !canEstimate) return;
    setEstimating(true);
    setErrorMsg(null);
    try {
      const res = await mealComponentApi.estimateMacros({
        name: name.trim(),
        portionGrams,
        slot,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Estimation failed';
      setErrorMsg(msg);
    } finally {
      setEstimating(false);
    }
  }, [slot, name, portionGrams, canEstimate]);

  const handleAdd = useCallback(() => {
    if (!slot || !result) return;
    const component: MealComponent = {
      id: `custom-${Date.now()}`,
      slot,
      name: name.trim(),
      defaultPortionGrams: portionGrams,
      caloriesPerPortion: result.caloriesPerPortion,
      proteinG: result.proteinG,
      carbsG: result.carbsG,
      fatG: result.fatG,
      fiberG: result.fiberG,
      cuisineTags: [],
      dietaryTags: [],
      cookMethodHint: 'raw',
      pantryIngredientNames: [],
      pantryCoveragePercent: 0,
    };
    onAdd(component);
  }, [slot, name, portionGrams, result, onAdd]);

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

        <Text style={[styles.label, { color: bodyColor, marginTop: 16 }]}>Portion (grams)</Text>
        <TextInput
          value={portionInput}
          onChangeText={setPortionInput}
          placeholder="100"
          placeholderTextColor={bodyColor}
          keyboardType="number-pad"
          style={[
            styles.input,
            { color: titleColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' },
          ]}
          testID={`${testID}-portion-input`}
          accessibilityLabel="Portion in grams"
        />

        <HapticTouchableOpacity
          onPress={handleEstimate}
          hapticStyle="medium"
          pressedScale={0.97}
          disabled={!canEstimate}
          style={[
            styles.estimateBtn,
            { backgroundColor: canEstimate ? Accent.coral : (isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB') },
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

            <View style={styles.macroRow}>
              <Macro label="kcal" value={result.caloriesPerPortion} unit="" />
              <Macro label="Protein" value={result.proteinG} unit="g" />
              <Macro label="Carbs" value={result.carbsG} unit="g" />
              <Macro label="Fat" value={result.fatG} unit="g" />
              <Macro label="Fiber" value={result.fiberG} unit="g" />
            </View>

            <HapticTouchableOpacity
              onPress={handleAdd}
              hapticStyle="medium"
              pressedScale={0.97}
              style={[styles.addBtn, { backgroundColor: Accent.coral }, Shadows.SM as any]}
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
  sourceBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginBottom: 12 },
  sourceBadgeText: { fontSize: 12, fontWeight: '700' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  macroCell: { alignItems: 'center' },
  macroValue: { fontSize: 16, fontWeight: '700', color: '#1F1F1F' },
  macroLabel: { fontSize: 11, color: '#5C5C5C', marginTop: 2 },
  addBtn: { borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
  addBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
