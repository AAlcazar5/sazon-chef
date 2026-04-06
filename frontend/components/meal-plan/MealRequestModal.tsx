// frontend/components/meal-plan/MealRequestModal.tsx
// "Find Me a Meal" constraint builder — bottom sheet modal (10C)
// Step 1: count, Step 2: presets, Step 3: macro sliders, Step 4: meal type + cuisine

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Modal, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import MacroSlider from '../ui/MacroSlider';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { useTheme } from '../../contexts/ThemeContext';
import { mealPlanApi } from '../../lib/api';
import MealRequestResults from './MealRequestResults';

const HISTORY_KEY = 'meal_request_history';
const MAX_HISTORY = 5;

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'any';

interface MacroPreset {
  label: string;
  caloriesMin?: number;
  caloriesMax?: number;
  proteinMin?: number;
  fatMax?: number;
  carbsMin?: number;
  carbsMax?: number;
  fiberMin?: number;
}

const PRESETS: MacroPreset[] = [
  { label: 'High Protein', proteinMin: 35 },
  { label: 'Low Cal', caloriesMax: 400 },
  { label: 'Low Fat', fatMax: 10 },
  { label: 'Balanced', caloriesMin: 400, caloriesMax: 600, proteinMin: 25, fatMax: 25 },
  { label: 'Post-Workout', caloriesMin: 300, caloriesMax: 500, proteinMin: 35, carbsMin: 40, fatMax: 15 },
  { label: 'Light Snack', caloriesMax: 250, proteinMin: 10 },
];

const COUNTS = [1, 3, 5];
const MEAL_TYPES = ['any', 'breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

interface FindRecipesParams {
  count: number;
  calories?: { min?: number; max?: number };
  protein?: { min?: number };
  fat?: { max?: number };
  carbs?: { min?: number; max?: number };
  fiber?: { min?: number };
  mealType?: string;
  maxCookTime?: number;
  difficulty?: string;
  cuisines?: string[];
}

interface MealRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onMealSelected: (recipe: any) => void;
  targetDate: string;
  targetMealType?: MealType;
  remainingCalories?: number;
  remainingProtein?: number;
}

function PillButton({
  label,
  selected,
  onPress,
  isDark,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <HapticTouchableOpacity
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        backgroundColor: selected
          ? Colors.accent.primary
          : isDark ? '#2C2C2E' : '#F3F4F6',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#FFFFFF' : isDark ? '#E5E7EB' : '#374151' }}>
        {label}
      </Text>
    </HapticTouchableOpacity>
  );
}

function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  return (
    <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#F9FAFB' : '#111827', marginBottom: 12 }}>
      {title}
    </Text>
  );
}

export default function MealRequestModal({
  visible,
  onClose,
  onMealSelected,
  targetDate,
  targetMealType,
  remainingCalories,
  remainingProtein,
}: MealRequestModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Step 1: count
  const [count, setCount] = useState(3);

  // Step 2: preset
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Step 3: macro sliders — undefined = "Any"
  const [caloriesMin, setCaloriesMin] = useState<number | undefined>(undefined);
  const [caloriesMax, setCaloriesMax] = useState<number | undefined>(undefined);
  const [proteinMin, setProteinMin] = useState<number | undefined>(undefined);
  const [fatMax, setFatMax] = useState<number | undefined>(undefined);
  const [carbsMin, setCarbsMin] = useState<number | undefined>(undefined);
  const [fiberMin, setFiberMin] = useState<number | undefined>(undefined);

  // Step 4: filters
  const [mealType, setMealType] = useState<string>(targetMealType ?? 'any');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [history, setHistory] = useState<FindRecipesParams[]>([]);

  useEffect(() => {
    if (visible) loadHistory();
  }, [visible]);

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  };

  const saveToHistory = async (params: FindRecipesParams) => {
    try {
      const updated = [params, ...history.filter(h => JSON.stringify(h) !== JSON.stringify(params))].slice(0, MAX_HISTORY);
      setHistory(updated);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch {}
  };

  const applyPreset = useCallback((preset: MacroPreset) => {
    setActivePreset(preset.label);
    setCaloriesMin(preset.caloriesMin);
    setCaloriesMax(preset.caloriesMax);
    setProteinMin(preset.proteinMin);
    setFatMax(preset.fatMax);
    setCarbsMin(preset.carbsMin);
    setFiberMin(preset.fiberMin);
  }, []);

  const clearAll = useCallback(() => {
    setActivePreset(null);
    setCaloriesMin(undefined);
    setCaloriesMax(undefined);
    setProteinMin(undefined);
    setFatMax(undefined);
    setCarbsMin(undefined);
    setFiberMin(undefined);
  }, []);

  const buildParams = useCallback((): FindRecipesParams => {
    const params: FindRecipesParams = { count };
    if (caloriesMin !== undefined || caloriesMax !== undefined) {
      params.calories = { ...(caloriesMin !== undefined ? { min: caloriesMin } : {}), ...(caloriesMax !== undefined ? { max: caloriesMax } : {}) };
    }
    if (proteinMin !== undefined) params.protein = { min: proteinMin };
    if (fatMax !== undefined) params.fat = { max: fatMax };
    if (carbsMin !== undefined) params.carbs = { min: carbsMin };
    if (fiberMin !== undefined) params.fiber = { min: fiberMin };
    if (mealType && mealType !== 'any') params.mealType = mealType;
    return params;
  }, [count, caloriesMin, caloriesMax, proteinMin, fatMax, carbsMin, fiberMin, mealType]);

  const handleFind = useCallback(async (params?: FindRecipesParams) => {
    const searchParams = params ?? buildParams();
    setLoading(true);
    setResults(null);
    try {
      await saveToHistory(searchParams);
      const response = await mealPlanApi.findRecipes(searchParams);
      setResults(response.data);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const handleGenerateMore = useCallback(() => {
    setResults(null);
    handleFind();
  }, [handleFind]);

  const handleClose = useCallback(() => {
    setResults(null);
    clearAll();
    onClose();
  }, [onClose, clearAll]);

  const historyLabel = (h: FindRecipesParams) => [
    h.protein?.min ? `≥${h.protein.min}g protein` : null,
    h.calories?.max ? `≤${h.calories.max} cal` : null,
    h.calories?.min ? `≥${h.calories.min} cal` : null,
    h.fat?.max ? `≤${h.fat.max}g fat` : null,
    h.mealType && h.mealType !== 'any' ? h.mealType : null,
  ].filter(Boolean).join(' · ') || `${h.count} options`;

  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const bgCard = isDark ? '#1C1C1E' : '#FFFFFF';
  const bgSheet = isDark ? '#111111' : '#F9F7F4';

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: bgSheet, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingBottom: 34 }}>

          {/* Handle bar */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? '#3A3A3C' : '#D1D5DB' }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: textPrimary }}>
              {results ? 'Results' : 'Find Me a Meal'}
            </Text>
            <HapticTouchableOpacity onPress={results ? () => setResults(null) : handleClose} accessibilityLabel="Close">
              <Icon
                name={results ? Icons.CHEVRON_BACK : Icons.CLOSE}
                size={IconSizes.MD}
                color={textSecondary}
                accessibilityLabel="Close"
              />
            </HapticTouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            {results ? (
              <MealRequestResults
                options={results.options}
                totalMatches={results.totalMatches}
                generatedCount={results.generatedCount}
                onAddToPlan={(recipe) => { onMealSelected(recipe); handleClose(); }}
                onGenerateMore={handleGenerateMore}
                onClose={handleClose}
                targetDate={targetDate}
                targetMealType={targetMealType ?? 'any'}
                isDark={isDark}
              />
            ) : (
              <>
                {/* Remaining macros context banner */}
                {(remainingCalories !== undefined || remainingProtein !== undefined) && (
                  <View style={{ backgroundColor: isDark ? '#1C2C1C' : '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, color: isDark ? '#86EFAC' : '#16A34A', fontWeight: '500' }}>
                      {remainingCalories !== undefined && remainingProtein !== undefined
                        ? `You have ~${remainingCalories} calories and ${remainingProtein}g protein remaining today`
                        : remainingCalories !== undefined
                          ? `You have ~${remainingCalories} calories remaining today`
                          : `You have ~${remainingProtein}g protein remaining today`}
                    </Text>
                  </View>
                )}

                {/* Recent history */}
                {history.length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <SectionHeader title="Recent Searches" isDark={isDark} />
                    {history.slice(0, 3).map((h, i) => (
                      <HapticTouchableOpacity
                        key={i}
                        onPress={() => handleFind(h)}
                        style={[{ backgroundColor: bgCard, borderRadius: 10, padding: 10, marginBottom: 6 }, Shadows.SM]}
                      >
                        <Text style={{ fontSize: 12, color: textSecondary }}>{historyLabel(h)}</Text>
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Step 1: Count */}
                <View style={{ marginBottom: 20 }}>
                  <SectionHeader title="How many options?" isDark={isDark} />
                  <View style={{ flexDirection: 'row' }}>
                    {COUNTS.map(c => (
                      <PillButton key={c} label={String(c)} selected={count === c} onPress={() => setCount(c)} isDark={isDark} />
                    ))}
                  </View>
                </View>

                {/* Step 2: Quick Presets */}
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <SectionHeader title="Quick Preset" isDark={isDark} />
                    {activePreset && (
                      <HapticTouchableOpacity onPress={clearAll}>
                        <Text style={{ fontSize: 13, color: Colors.accent.primary }}>Clear</Text>
                      </HapticTouchableOpacity>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {PRESETS.map(preset => (
                      <PillButton
                        key={preset.label}
                        label={preset.label}
                        selected={activePreset === preset.label}
                        onPress={() => activePreset === preset.label ? clearAll() : applyPreset(preset)}
                        isDark={isDark}
                      />
                    ))}
                  </View>
                </View>

                {/* Step 3: Macro Sliders */}
                <View style={{ marginBottom: 8 }}>
                  <SectionHeader title="Macro Targets" isDark={isDark} />
                  <MacroSlider
                    label="Calories (max)"
                    value={caloriesMax}
                    onChange={setCaloriesMax}
                    min={100}
                    max={1200}
                    step={50}
                    unit=" cal"
                    anyWhenMin
                    isDark={isDark}
                  />
                  <MacroSlider
                    label="Protein (min)"
                    value={proteinMin}
                    onChange={setProteinMin}
                    min={0}
                    max={80}
                    step={5}
                    unit="g"
                    anyWhenMin
                    isDark={isDark}
                  />
                  <MacroSlider
                    label="Fat (max)"
                    value={fatMax}
                    onChange={setFatMax}
                    min={0}
                    max={60}
                    step={5}
                    unit="g"
                    anyWhenMin
                    isDark={isDark}
                  />
                  <MacroSlider
                    label="Fiber (min)"
                    value={fiberMin}
                    onChange={setFiberMin}
                    min={0}
                    max={25}
                    step={1}
                    unit="g"
                    anyWhenMin
                    isDark={isDark}
                  />
                </View>

                {/* Step 4: Meal Type */}
                <View style={{ marginBottom: 24 }}>
                  <SectionHeader title="Meal Type" isDark={isDark} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {MEAL_TYPES.map(mt => (
                      <PillButton
                        key={mt}
                        label={mt === 'any' ? 'Any' : mt.charAt(0).toUpperCase() + mt.slice(1)}
                        selected={mealType === mt}
                        onPress={() => setMealType(mt)}
                        isDark={isDark}
                      />
                    ))}
                  </View>
                </View>

                {/* Find button */}
                <HapticTouchableOpacity
                  onPress={() => handleFind()}
                  disabled={loading}
                  accessibilityLabel="Find meals"
                  style={{
                    backgroundColor: Colors.accent.primary,
                    borderRadius: 100,
                    paddingVertical: 16,
                    alignItems: 'center',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                      Find {count === 1 ? 'a Meal' : `${count} Meals`}
                    </Text>
                  )}
                </HapticTouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
