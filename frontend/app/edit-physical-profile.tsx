import { View, Text, TextInput, Alert, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import LoadingState from '../components/ui/LoadingState';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import ScreenGradient from '../components/ui/ScreenGradient';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { userApi } from '../lib/api';
import * as Haptics from 'expo-haptics';
import { Colors, DarkColors, Pastel, PastelDark } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { FontSize, FontWeight } from '../constants/Typography';
import { useColorScheme } from 'nativewind';

const GENDERS = [
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'other', label: 'Other', emoji: '🧑' },
] as const;

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', emoji: '🛋️', tint: Pastel.sky, tintDark: PastelDark.sky },
  { value: 'lightly_active', label: 'Lightly Active', description: '1-3 days/week', emoji: '🚶', tint: Pastel.sage, tintDark: PastelDark.sage },
  { value: 'moderately_active', label: 'Moderately Active', description: '3-5 days/week', emoji: '🏃', tint: Pastel.golden, tintDark: PastelDark.golden },
  { value: 'very_active', label: 'Very Active', description: '6-7 days/week', emoji: '🏋️', tint: Pastel.peach, tintDark: PastelDark.peach },
  { value: 'extra_active', label: 'Extra Active', description: 'Physical job + exercise', emoji: '⚡', tint: Pastel.blush, tintDark: PastelDark.blush },
] as const;

const FITNESS_GOALS = [
  { value: 'lose_weight', label: 'Lose Weight', emoji: '📉', tint: Pastel.blush, tintDark: PastelDark.blush, accent: '#E91E63' },
  { value: 'maintain', label: 'Maintain', emoji: '⚖️', tint: Pastel.sage, tintDark: PastelDark.sage, accent: '#4CAF50' },
  { value: 'gain_muscle', label: 'Gain Muscle', emoji: '💪', tint: Pastel.lavender, tintDark: PastelDark.lavender, accent: '#7C4DFF' },
  { value: 'gain_weight', label: 'Gain Weight', emoji: '📈', tint: Pastel.peach, tintDark: PastelDark.peach, accent: '#FF9800' },
] as const;

export default function EditPhysicalProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [activityLevel, setActivityLevel] = useState<string>('moderately_active');
  const [fitnessGoal, setFitnessGoal] = useState<string>('maintain');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [targetWeightLbs, setTargetWeightLbs] = useState('');
  const [useMetric, setUseMetric] = useState(false);
  const [bmr, setBmr] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoadingData(true);
      const response = await userApi.getPhysicalProfile();
      const profile = response.data;
      if (!profile) { setLoadingData(false); return; }

      setGender(profile.gender);
      setAge(profile.age.toString());
      setHeightCm(profile.heightCm.toString());
      const heightFtIn = cmToFeetInches(profile.heightCm);
      setHeightFeet(heightFtIn.feet.toString());
      setHeightInches(heightFtIn.inches.toString());
      setWeightKg(profile.weightKg.toString());
      setWeightLbs(kgToLbs(profile.weightKg).toString());
      setActivityLevel(profile.activityLevel);
      setFitnessGoal(profile.fitnessGoal);
      if (profile.targetWeightKg) {
        setTargetWeightKg(profile.targetWeightKg.toString());
        setTargetWeightLbs(kgToLbs(profile.targetWeightKg).toString());
      }
      setBmr(profile.bmr || null);
      setTdee(profile.tdee || null);
    } catch {
      Alert.alert('Notice', 'Starting with a fresh profile. Fill in your details below.');
    } finally {
      setLoadingData(false);
    }
  };

  const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
  const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10;
  const cmToFeetInches = (cm: number) => {
    const totalInches = cm / 2.54;
    return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
  };
  const feetInchesToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54);

  const handleHeightFeetChange = (value: string) => {
    setHeightFeet(value);
    setHeightCm(feetInchesToCm(parseFloat(value) || 0, parseFloat(heightInches) || 0).toString());
  };
  const handleHeightInchesChange = (value: string) => {
    setHeightInches(value);
    setHeightCm(feetInchesToCm(parseFloat(heightFeet) || 0, parseFloat(value) || 0).toString());
  };
  const handleHeightCmChange = (value: string) => {
    setHeightCm(value);
    const { feet, inches } = cmToFeetInches(parseFloat(value) || 0);
    setHeightFeet(feet.toString());
    setHeightInches(inches.toString());
  };
  const handleWeightLbsChange = (value: string) => {
    setWeightLbs(value);
    setWeightKg(lbsToKg(parseFloat(value) || 0).toString());
  };
  const handleWeightKgChange = (value: string) => {
    setWeightKg(value);
    setWeightLbs(kgToLbs(parseFloat(value) || 0).toString());
  };
  const handleTargetWeightLbsChange = (value: string) => {
    setTargetWeightLbs(value);
    setTargetWeightKg(lbsToKg(parseFloat(value) || 0).toString());
  };
  const handleTargetWeightKgChange = (value: string) => {
    setTargetWeightKg(value);
    setTargetWeightLbs(kgToLbs(parseFloat(value) || 0).toString());
  };

  const handleSave = async () => {
    let finalHeightCm: number;
    let finalWeightKg: number;

    if (useMetric) {
      finalHeightCm = parseFloat(heightCm) || 0;
      finalWeightKg = parseFloat(weightKg) || 0;
    } else {
      finalHeightCm = feetInchesToCm(parseFloat(heightFeet) || 0, parseFloat(heightInches) || 0);
      finalWeightKg = lbsToKg(parseFloat(weightLbs) || 0);
    }

    if (!gender || !age || !activityLevel || !fitnessGoal) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Hold On', 'Please fill in all required fields');
      return;
    }
    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Hold On', 'Age must be between 13 and 120');
      return;
    }
    if (finalHeightCm < 100 || finalHeightCm > 250) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Hold On', 'Height must be between 3\'3" and 8\'2" (100cm - 250cm)');
      return;
    }
    if (finalWeightKg < 30 || finalWeightKg > 300) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Hold On', 'Weight must be between 66 lbs and 661 lbs (30kg - 300kg)');
      return;
    }

    try {
      setLoading(true);
      const profileData: any = {
        gender, age: ageNum, heightCm: finalHeightCm, weightKg: finalWeightKg,
        activityLevel, fitnessGoal,
      };
      if (targetWeightKg) {
        const targetNum = parseFloat(targetWeightKg);
        if (!isNaN(targetNum)) profileData.targetWeightKg = targetNum;
      }
      const response = await userApi.updatePhysicalProfile(profileData);
      if (response.data.profile) {
        setBmr(response.data.profile.bmr);
        setTdee(response.data.profile.tdee);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', 'Your physical profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', error.message || "Couldn't save your profile — give it another shot?");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <LoadingState message="Loading your profile..." expression="happy" />
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)';
  const inputColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const placeholderColor = isDark ? DarkColors.text.tertiary : Colors.text.tertiary;

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingContainer>
          {/* Header */}
          <View style={styles.header}>
            <HapticTouchableOpacity onPress={() => router.back()} style={{ padding: 8 }} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={24} color={isDark ? DarkColors.text.primary : Colors.text.primary} />
            </HapticTouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
              Physical Profile
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <Animated.ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Gender ── */}
            <View style={[styles.section, { backgroundColor: isDark ? PastelDark.lavender : Pastel.lavender }, Shadows.SM as any]}>
              <Text style={[styles.sectionEmoji]}>👤</Text>
              <Text style={[styles.sectionTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDERS.map((g) => {
                  const selected = gender === g.value;
                  return (
                    <HapticTouchableOpacity
                      key={g.value}
                      onPress={() => setGender(g.value)}
                      style={[
                        styles.genderChip,
                        {
                          backgroundColor: selected
                            ? (isDark ? 'rgba(206,147,216,0.3)' : '#CE93D8')
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)'),
                        },
                      ]}
                      accessibilityLabel={g.label}
                      accessibilityState={{ selected }}
                    >
                      <Text style={styles.chipEmoji}>{g.emoji}</Text>
                      <Text style={[
                        styles.chipLabel,
                        { color: selected ? '#FFFFFF' : (isDark ? DarkColors.text.primary : Colors.text.primary) },
                      ]}>
                        {g.label}
                      </Text>
                    </HapticTouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Age ── */}
            <View style={[styles.section, { backgroundColor: isDark ? PastelDark.sky : Pastel.sky }, Shadows.SM as any]}>
              <Text style={styles.sectionEmoji}>🎂</Text>
              <Text style={[styles.sectionTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>Age</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="25"
                keyboardType="numeric"
                style={[styles.textInput, { backgroundColor: inputBg, color: inputColor }]}
                placeholderTextColor={placeholderColor}
              />
            </View>

            {/* ── Height ── */}
            <View style={[styles.section, { backgroundColor: isDark ? PastelDark.sage : Pastel.sage }, Shadows.SM as any]}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionEmoji}>📏</Text>
                  <Text style={[styles.sectionTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>Height</Text>
                </View>
                <HapticTouchableOpacity
                  onPress={() => setUseMetric(!useMetric)}
                  style={[styles.unitToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                >
                  <Text style={[styles.unitToggleText, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                    {useMetric ? 'ft/in' : 'cm'}
                  </Text>
                </HapticTouchableOpacity>
              </View>

              {useMetric ? (
                <TextInput
                  value={heightCm}
                  onChangeText={handleHeightCmChange}
                  placeholder="170 cm"
                  keyboardType="numeric"
                  style={[styles.textInput, { backgroundColor: inputBg, color: inputColor }]}
                  placeholderTextColor={placeholderColor}
                />
              ) : (
                <View style={styles.splitRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>Feet</Text>
                    <TextInput
                      value={heightFeet}
                      onChangeText={handleHeightFeetChange}
                      placeholder="5"
                      keyboardType="numeric"
                      style={[styles.textInput, { backgroundColor: inputBg, color: inputColor }]}
                      placeholderTextColor={placeholderColor}
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>Inches</Text>
                    <TextInput
                      value={heightInches}
                      onChangeText={handleHeightInchesChange}
                      placeholder="10"
                      keyboardType="numeric"
                      style={[styles.textInput, { backgroundColor: inputBg, color: inputColor }]}
                      placeholderTextColor={placeholderColor}
                    />
                  </View>
                </View>
              )}
              {heightCm && parseFloat(heightCm) > 0 && (
                <Text style={[styles.conversionHint, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                  {useMetric
                    ? `≈ ${cmToFeetInches(parseFloat(heightCm)).feet}'${cmToFeetInches(parseFloat(heightCm)).inches}"`
                    : `≈ ${heightCm} cm`}
                </Text>
              )}
            </View>

            {/* ── Weight ── */}
            <View style={[styles.section, { backgroundColor: isDark ? PastelDark.peach : Pastel.peach }, Shadows.SM as any]}>
              <Text style={styles.sectionEmoji}>⚖️</Text>
              <Text style={[styles.sectionTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
                Current Weight
              </Text>
              <TextInput
                value={useMetric ? weightKg : weightLbs}
                onChangeText={useMetric ? handleWeightKgChange : handleWeightLbsChange}
                placeholder={useMetric ? '70 kg' : '154 lbs'}
                keyboardType="numeric"
                style={[styles.textInput, { backgroundColor: inputBg, color: inputColor }]}
                placeholderTextColor={placeholderColor}
              />
              {weightKg && parseFloat(weightKg) > 0 && (
                <Text style={[styles.conversionHint, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                  {useMetric ? `≈ ${kgToLbs(parseFloat(weightKg))} lbs` : `≈ ${weightKg} kg`}
                </Text>
              )}
            </View>

            {/* ── Target Weight ── */}
            <View style={[styles.section, { backgroundColor: isDark ? PastelDark.sage : Pastel.sage }, Shadows.SM as any]}>
              <Text style={styles.sectionEmoji}>🎯</Text>
              <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
                  Target Weight
                </Text>
                <Text style={[styles.optionalBadge, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>
                  Optional
                </Text>
              </View>
              <TextInput
                value={useMetric ? targetWeightKg : targetWeightLbs}
                onChangeText={useMetric ? handleTargetWeightKgChange : handleTargetWeightLbsChange}
                placeholder={useMetric ? '65 kg' : '143 lbs'}
                keyboardType="numeric"
                style={[styles.textInput, { backgroundColor: inputBg, color: inputColor }]}
                placeholderTextColor={placeholderColor}
              />
              {targetWeightKg && parseFloat(targetWeightKg) > 0 && (
                <Text style={[styles.conversionHint, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                  {useMetric ? `≈ ${kgToLbs(parseFloat(targetWeightKg))} lbs` : `≈ ${targetWeightKg} kg`}
                </Text>
              )}
            </View>

            {/* ── Activity Level ── */}
            <View style={[styles.section, { backgroundColor: isDark ? PastelDark.golden : Pastel.golden }, Shadows.SM as any]}>
              <Text style={styles.sectionEmoji}>🏃</Text>
              <Text style={[styles.sectionTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>Activity Level</Text>
              <View style={{ gap: 8, marginTop: 4 }}>
                {ACTIVITY_LEVELS.map((level) => {
                  const selected = activityLevel === level.value;
                  return (
                    <HapticTouchableOpacity
                      key={level.value}
                      onPress={() => setActivityLevel(level.value)}
                      style={[
                        styles.activityOption,
                        {
                          backgroundColor: selected
                            ? (isDark ? level.tintDark : level.tint)
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)'),
                        },
                        selected && (Shadows.SM as any),
                      ]}
                      accessibilityLabel={`${level.label}: ${level.description}`}
                      accessibilityState={{ selected }}
                    >
                      <Text style={styles.activityEmoji}>{level.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.activityLabel, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
                          {level.label}
                        </Text>
                        <Text style={[styles.activityDesc, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                          {level.description}
                        </Text>
                      </View>
                      {selected && (
                        <View style={[styles.checkBadge, { backgroundColor: Colors.primary }]}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </HapticTouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Fitness Goal ── */}
            <View style={[styles.section, { backgroundColor: isDark ? PastelDark.blush : Pastel.blush }, Shadows.SM as any]}>
              <Text style={styles.sectionEmoji}>💪</Text>
              <Text style={[styles.sectionTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>Fitness Goal</Text>
              <View style={styles.goalGrid}>
                {FITNESS_GOALS.map((goal) => {
                  const selected = fitnessGoal === goal.value;
                  return (
                    <HapticTouchableOpacity
                      key={goal.value}
                      onPress={() => setFitnessGoal(goal.value)}
                      style={[
                        styles.goalCard,
                        {
                          backgroundColor: selected
                            ? (isDark ? goal.tintDark : goal.tint)
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)'),
                        },
                        selected && (Shadows.SM as any),
                      ]}
                      accessibilityLabel={goal.label}
                      accessibilityState={{ selected }}
                    >
                      <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                      <Text style={[
                        styles.goalLabel,
                        { color: selected ? goal.accent : (isDark ? DarkColors.text.primary : Colors.text.primary) },
                      ]}>
                        {goal.label}
                      </Text>
                    </HapticTouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── BMR/TDEE Metrics ── */}
            {(bmr || tdee) && (
              <View style={[
                styles.metricsCard,
                { backgroundColor: isDark ? 'rgba(255,139,65,0.10)' : Pastel.orange },
                Shadows.MD as any,
              ]}>
                <Text style={[styles.metricsTitle, { color: isDark ? '#FFB74D' : '#E65100' }]}>
                  Your Numbers
                </Text>
                <View style={styles.metricsRow}>
                  {bmr && (
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>BMR</Text>
                      <Text style={[styles.metricValue, { color: isDark ? '#FFB74D' : '#E65100' }]}>{Math.round(bmr)}</Text>
                      <Text style={[styles.metricUnit, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>cal/day</Text>
                    </View>
                  )}
                  {tdee && (
                    <View style={styles.metricItem}>
                      <Text style={[styles.metricLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>TDEE</Text>
                      <Text style={[styles.metricValue, { color: isDark ? '#FFB74D' : '#E65100' }]}>{Math.round(tdee)}</Text>
                      <Text style={[styles.metricUnit, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>cal/day</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.metricsHint, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>
                  Updates automatically when you save
                </Text>
              </View>
            )}

            {/* ── Info ── */}
            <View style={[styles.infoCard, { backgroundColor: isDark ? PastelDark.sky : Pastel.sky }]}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>💡</Text>
              <Text style={[styles.infoText, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                This helps us calculate your personalized macro goals using scientific formulas (BMR/TDEE).
              </Text>
            </View>

            {/* Save button */}
            <View style={{ marginTop: 8 }}>
              <GradientButton
                label={loading ? 'Saving...' : 'Save Profile'}
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                colors={GradientPresets.brand}
                icon="checkmark-circle-outline"
              />
            </View>
          </Animated.ScrollView>
        </KeyboardAvoidingContainer>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  section: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitToggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unitToggleText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  optionalBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginBottom: 10,
  },
  textInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  splitRow: {
    flexDirection: 'row',
  },
  subLabel: {
    fontSize: FontSize.xs,
    marginBottom: 4,
    fontWeight: FontWeight.medium,
  },
  conversionHint: {
    fontSize: FontSize.xs,
    marginTop: 6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
  },
  activityEmoji: {
    fontSize: 20,
    marginRight: 10,
    width: 28,
    textAlign: 'center',
  },
  activityLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  activityDesc: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  goalCard: {
    width: '47%' as any,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 4,
  },
  goalEmoji: {
    fontSize: 28,
  },
  goalLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  metricsCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  metricsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
  },
  metricUnit: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  metricsHint: {
    fontSize: FontSize.xs,
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
});
