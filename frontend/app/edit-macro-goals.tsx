import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useMemo } from 'react';
import { userApi } from '../lib/api';
import type { MacroCalculations } from '../types';
import * as Haptics from 'expo-haptics';
import { Colors, DarkColors } from '../constants/Colors';
import { useColorScheme } from 'nativewind';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_GAP = 10;
const TILE_H_PAD = 32; // 16 left + 16 right
const TILE_WIDTH = (SCREEN_WIDTH - TILE_H_PAD - TILE_GAP) / 2;

interface EatingGoal {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Cal multiplier applied to TDEE */
  calMult: number;
  /** Caloric ratios (must sum to ~1 when converted via cal/g) */
  ratios: { protein: number; carbs: number; fat: number };
  accentColor: string;
  accentBg: string;
  darkAccent: string;
}

const EATING_GOALS: EatingGoal[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    description: 'Steady energy & sustainable habits',
    calMult: 1.0,
    ratios: { protein: 0.30, carbs: 0.40, fat: 0.30 },
    accentColor: '#3B82F6',
    accentBg: '#EFF6FF',
    darkAccent: '#60A5FA',
  },
  {
    id: 'high_protein',
    label: 'High Protein',
    emoji: '💪',
    description: 'Muscle building & recovery',
    calMult: 1.0,
    ratios: { protein: 0.40, carbs: 0.35, fat: 0.25 },
    accentColor: '#DC2626',
    accentBg: '#FEF2F2',
    darkAccent: '#F87171',
  },
  {
    id: 'low_carb',
    label: 'Low Carb',
    emoji: '🥑',
    description: 'Fat adaptation & mental clarity',
    calMult: 1.0,
    ratios: { protein: 0.35, carbs: 0.15, fat: 0.50 },
    accentColor: '#16A34A',
    accentBg: '#F0FDF4',
    darkAccent: '#4ADE80',
  },
  {
    id: 'cut',
    label: 'Cut',
    emoji: '🔥',
    description: 'Lose fat while preserving muscle',
    calMult: 0.82,
    ratios: { protein: 0.40, carbs: 0.35, fat: 0.25 },
    accentColor: '#EA580C',
    accentBg: '#FFF7ED',
    darkAccent: '#FB923C',
  },
  {
    id: 'bulk',
    label: 'Bulk',
    emoji: '📈',
    description: 'Maximize muscle & strength gains',
    calMult: 1.15,
    ratios: { protein: 0.28, carbs: 0.45, fat: 0.27 },
    accentColor: '#7C3AED',
    accentBg: '#F5F3FF',
    darkAccent: '#A78BFA',
  },
];

/** Convert goal ratios + base TDEE into gram targets */
function computeMacros(goal: EatingGoal, tdee: number) {
  const cal = Math.round(tdee * goal.calMult);
  const protein = Math.round((cal * goal.ratios.protein) / 4);
  const carbs = Math.round((cal * goal.ratios.carbs) / 4);
  const fat = Math.round((cal * goal.ratios.fat) / 9);
  return { calories: cal, protein, carbs, fat };
}

export default function EditMacroGoalsScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPhysicalProfile, setHasPhysicalProfile] = useState(false);

  // Base calorie reference — TDEE if available, else 2000
  const [baseTdee, setBaseTdee] = useState(2000);
  const [selectedGoal, setSelectedGoal] = useState<string>('balanced');
  const [showCustomize, setShowCustomize] = useState(false);

  // Raw custom inputs
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Animated bar values (0–100, representing % of caloric total)
  const proteinAnim = useRef(new Animated.Value(30)).current;
  const carbsAnim = useRef(new Animated.Value(40)).current;
  const fatAnim = useRef(new Animated.Value(30)).current;

  // Customize section collapse
  const customizeAnim = useRef(new Animated.Value(0)).current;
  const customizeHeight = customizeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 340] });

  // ── Derived macros from selected goal ──────────────────────────────────
  const derivedMacros = useMemo(() => {
    const goal = EATING_GOALS.find(g => g.id === selectedGoal) ?? EATING_GOALS[0];
    return computeMacros(goal, baseTdee);
  }, [selectedGoal, baseTdee]);

  // ── Active macros: either derived or custom ────────────────────────────
  const activeMacros = useMemo(() => {
    if (!showCustomize) return derivedMacros;
    return {
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
    };
  }, [showCustomize, derivedMacros, calories, protein, carbs, fat]);

  // ── Populate custom inputs when customize opens ────────────────────────
  useEffect(() => {
    if (showCustomize) {
      setCalories(derivedMacros.calories.toString());
      setProtein(derivedMacros.protein.toString());
      setCarbs(derivedMacros.carbs.toString());
      setFat(derivedMacros.fat.toString());
    }
    Animated.spring(customizeAnim, {
      toValue: showCustomize ? 1 : 0,
      friction: 7,
      tension: 100,
      useNativeDriver: false,
    }).start();
  }, [showCustomize]);

  // ── Animate macro bar when activeMacros change ─────────────────────────
  useEffect(() => {
    const { protein: p, carbs: c, fat: f } = activeMacros;
    const pCal = p * 4;
    const cCal = c * 4;
    const fCal = f * 9;
    const total = pCal + cCal + fCal || 1;
    Animated.parallel([
      Animated.spring(proteinAnim, { toValue: (pCal / total) * 100, friction: 8, tension: 100, useNativeDriver: false }),
      Animated.spring(carbsAnim, { toValue: (cCal / total) * 100, friction: 8, tension: 100, useNativeDriver: false }),
      Animated.spring(fatAnim, { toValue: (fCal / total) * 100, friction: 8, tension: 100, useNativeDriver: false }),
    ]).start();
  }, [activeMacros]);

  // ── Load existing goals + TDEE on mount ───────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [goalsRes] = await Promise.all([userApi.getMacroGoals()]);
      const goals = goalsRes.data;
      // Pre-fill custom inputs with saved values
      setCalories(goals.calories.toString());
      setProtein(goals.protein.toString());
      setCarbs(goals.carbs.toString());
      setFat(goals.fat.toString());

      // Fetch TDEE if physical profile exists
      try {
        const calcRes = await userApi.getCalculatedMacros();
        setBaseTdee(calcRes.data.tdee);
        setHasPhysicalProfile(true);
      } catch {
        setHasPhysicalProfile(false);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to load macro goals');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    const m = showCustomize ? activeMacros : derivedMacros;

    if (showCustomize) {
      if (!calories || !protein || !carbs || !fat) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Validation Error', 'Please fill in all fields');
        return;
      }
      if (m.calories < 500 || m.calories > 10000) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Validation Error', 'Calories must be between 500 and 10,000');
        return;
      }
    }

    try {
      setSaving(true);
      await userApi.updateMacroGoals({
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to update macro goals');
    } finally {
      setSaving(false);
    }
  };

  // ── Colours ────────────────────────────────────────────────────────────
  const bg = isDark ? DarkColors.background : Colors.surface;
  const cardBg = isDark ? DarkColors.card : '#FFFFFF';
  const border = 'transparent';
  const label = isDark ? DarkColors.text.primary : Colors.text.primary;
  const sub = isDark ? '#9CA3AF' : '#6B7280';
  const inputBg = isDark ? '#374151' : '#F3F4F6';
  const primaryColor = isDark ? DarkColors.primary : Colors.primary;

  if (loadingData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="fitness-outline" size={56} color={sub} />
          <Text style={{ color: sub, marginTop: 12, fontSize: 15 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeGoalData = EATING_GOALS.find(g => g.id === selectedGoal) ?? EATING_GOALS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
      <KeyboardAvoidingContainer>
        {/* Header */}
        <View style={{ backgroundColor: cardBg, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <HapticTouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={label} />
          </HapticTouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: label }}>Macro Goals</Text>
          <HapticTouchableOpacity onPress={handleSave} disabled={saving} style={{ padding: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: saving ? sub : primaryColor }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </HapticTouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section heading */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: sub, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>
            How do you want to eat?
          </Text>

          {/* Physical profile nudge */}
          {!hasPhysicalProfile && (
            <HapticTouchableOpacity
              onPress={() => { router.back(); setTimeout(() => router.push('/edit-physical-profile'), 100); }}
              style={{ backgroundColor: isDark ? 'rgba(250,204,21,0.1)' : '#FEFCE8', borderWidth: 1, borderColor: isDark ? '#854D0E' : '#FDE047', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
            >
              <Ionicons name="information-circle-outline" size={18} color={isDark ? '#FDE047' : '#A16207'} style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 13, color: isDark ? '#FDE047' : '#78350F', lineHeight: 18 }}>
                Add your physical profile to get calorie targets tailored to your body. Tap here →
              </Text>
            </HapticTouchableOpacity>
          )}

          {/* Goal picker tiles */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP, marginBottom: 20 }}>
            {EATING_GOALS.map((goal, index) => {
              const isSelected = selectedGoal === goal.id;
              const accent = isDark ? goal.darkAccent : goal.accentColor;
              const tileBg = isSelected
                ? (isDark ? `${goal.accentColor}25` : goal.accentBg)
                : cardBg;
              const tileBorder = isSelected ? accent : border;

              return (
                <HapticTouchableOpacity
                  key={goal.id}
                  onPress={() => {
                    setSelectedGoal(goal.id);
                    setShowCustomize(false);
                  }}
                  style={{
                    width: index === 4 ? '100%' : TILE_WIDTH,
                    backgroundColor: tileBg,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: tileBorder,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <View style={{ flexDirection: index === 4 ? 'row' : 'column', alignItems: index === 4 ? 'center' : 'flex-start' }}>
                    <Text style={{ fontSize: index === 4 ? 22 : 26, marginBottom: index === 4 ? 0 : 6, marginRight: index === 4 ? 10 : 0 }}>{goal.emoji}</Text>
                    <View style={{ flex: index === 4 ? 1 : 0 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? accent : label }}>{goal.label}</Text>
                      <Text style={{ fontSize: 12, color: sub, marginTop: 2, lineHeight: 16 }} numberOfLines={2}>{goal.description}</Text>
                    </View>
                    {isSelected && (
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', marginTop: index === 4 ? 0 : 8, marginLeft: index === 4 ? 8 : 0 }}>
                        <Ionicons name="checkmark" size={12} color="white" />
                      </View>
                    )}
                  </View>
                </HapticTouchableOpacity>
              );
            })}
          </View>

          {/* Animated macro bar preview */}
          <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 14, padding: 16, marginBottom: 14 }}>
            {/* Numbers */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: label }}>{activeMacros.calories}</Text>
                <Text style={{ fontSize: 11, color: sub, marginTop: 1 }}>calories</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#3B82F6' }}>{activeMacros.protein}g</Text>
                <Text style={{ fontSize: 11, color: sub, marginTop: 1 }}>protein</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#F97316' }}>{activeMacros.carbs}g</Text>
                <Text style={{ fontSize: 11, color: sub, marginTop: 1 }}>carbs</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#EAB308' }}>{activeMacros.fat}g</Text>
                <Text style={{ fontSize: 11, color: sub, marginTop: 1 }}>fat</Text>
              </View>
            </View>

            {/* Segmented bar */}
            <View style={{ height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', backgroundColor: isDark ? '#374151' : '#F3F4F6' }}>
              <Animated.View style={{ width: proteinAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: '#3B82F6' }} />
              <Animated.View style={{ width: carbsAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: '#F97316' }} />
              <Animated.View style={{ width: fatAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), backgroundColor: '#EAB308' }} />
            </View>

            {/* Legend */}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8, justifyContent: 'center' }}>
              {[['#3B82F6', 'Protein'], ['#F97316', 'Carbs'], ['#EAB308', 'Fat']].map(([color, name]) => (
                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                  <Text style={{ fontSize: 11, color: sub }}>{name}</Text>
                </View>
              ))}
            </View>

            {/* TDEE context */}
            {hasPhysicalProfile && !showCustomize && (
              <Text style={{ fontSize: 11, color: sub, marginTop: 10, textAlign: 'center' }}>
                Based on your TDEE of {baseTdee} cal/day
                {activeGoalData.calMult !== 1.0 ? ` · ${activeGoalData.calMult > 1 ? '+' : ''}${Math.round((activeGoalData.calMult - 1) * 100)}% adjustment` : ''}
              </Text>
            )}
          </View>

          {/* Customize toggle */}
          <HapticTouchableOpacity
            onPress={() => setShowCustomize(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginBottom: 4 }}
          >
            <Ionicons name={showCustomize ? 'chevron-up' : 'settings-outline'} size={16} color={sub} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 13, color: sub, fontWeight: '500' }}>
              {showCustomize ? 'Hide custom values' : 'Customize'}
            </Text>
          </HapticTouchableOpacity>

          {/* Custom inputs — always in tree, collapsed via maxHeight */}
          <Animated.View style={{ maxHeight: customizeHeight, overflow: 'hidden' }}>
            <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 14, padding: 16 }}>
              <Text style={{ fontSize: 12, color: sub, marginBottom: 14, lineHeight: 18 }}>
                Fine-tune your exact targets. Changes here override the goal selection above.
              </Text>

              {([
                { label: 'Daily Calories', value: calories, onChange: setCalories, placeholder: '2000', hint: '500 – 10,000 cal' },
                { label: 'Protein (g)', value: protein, onChange: setProtein, placeholder: '150', hint: '~0.8–1.2g per lb body weight' },
                { label: 'Carbs (g)', value: carbs, onChange: setCarbs, placeholder: '200', hint: 'Adjust based on activity level' },
                { label: 'Fat (g)', value: fat, onChange: setFat, placeholder: '65', hint: 'Essential for hormone production' },
              ] as const).map(({ label: fieldLabel, value, onChange, placeholder, hint }) => (
                <View key={fieldLabel} style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: label, marginBottom: 6 }}>{fieldLabel}</Text>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    keyboardType="numeric"
                    style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: border, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: label }}
                    placeholderTextColor={sub}
                  />
                  <Text style={{ fontSize: 11, color: sub, marginTop: 4 }}>{hint}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}
