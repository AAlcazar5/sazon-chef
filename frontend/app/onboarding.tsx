// frontend/app/onboarding.tsx
// Editorial 3-step onboarding — pastel hero circle, italic-accent title, dark CTA pill
// Step 0: Welcome (peach)  Step 1: Diet (sage)  Step 2: Goal (lavender)
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  BackHandler,
  StyleSheet,
  TextInput,
} from 'react-native';
import AnimatedActivityIndicator from '../components/ui/AnimatedActivityIndicator';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { userApi } from '../lib/api';
import { track } from '../lib/analytics';
import BrandButton from '../components/ui/BrandButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoMascot from '../components/mascot/LogoMascot';
import Sazon, { type SazonVariant, type SazonMotion, type SazonFx } from '../components/mascot/Sazon';
import SuccessModal from '../components/ui/SuccessModal';
import {
  Colors,
  DarkColors,
  EditorialColors,
  HeroPlatesDark,
} from '../constants/Colors';
import { EditorialFontFamily } from '../constants/Typography';
import { HapticPatterns } from '../constants/Haptics';
import { useColorScheme } from 'nativewind';

// ─── Step configuration ─────────────────────────────────────────────────
// ROADMAP 4.0 A5 — onboarding rewrite. Steps 0–1 (welcome + diet) and the
// final build-first-plate kept; goal-phase step replaced with a lifestyle
// multi-select (A5-a) and 6 new optional questions inserted between (A5-b–g).
// Every question is skippable (A5-h) — the engine degrades gracefully.
const TOTAL_STEPS = 10;

type StepTheme = {
  // Background gradient (top → bottom)
  gradient: readonly [string, string, string];
  gradientDark: readonly [string, string, string];
  // Pastel circle bg + soft ring around it (light)
  circleBg: string;
  circleRing: string;
  // Dark mode: jewel-tone hero plate gradient (terracotta / forest / plum)
  // Source: COLORS.md → HeroPlatesDark
  circleGradientDark: readonly [string, string];
};

const PEACH_THEME: StepTheme = {
  gradient: ['#FFE3CC', '#FFF3E0', '#FFFFFF'],
  gradientDark: ['#1A1410', '#1A1410', '#1A1410'],
  circleBg: '#FFD9B8',
  circleRing: '#FFEAD6',
  circleGradientDark: HeroPlatesDark.orange.bg,
};
const SAGE_THEME: StepTheme = {
  gradient: ['#C8E6C9', '#E8F5E9', '#FFFFFF'],
  gradientDark: ['#1A1410', '#1A1410', '#1A1410'],
  circleBg: '#B7DFB9',
  circleRing: '#D8EDD9',
  circleGradientDark: HeroPlatesDark.green.bg,
};
const LAVENDER_THEME: StepTheme = {
  gradient: ['#E1BEE7', '#F3E5F5', '#FFFFFF'],
  gradientDark: ['#1A1410', '#1A1410', '#1A1410'],
  circleBg: '#D9B6E1',
  circleRing: '#EAD7EE',
  circleGradientDark: HeroPlatesDark.lavender.bg,
};
const GOLDEN_THEME: StepTheme = {
  gradient: ['#FFE08A', '#FFF8E1', '#FFFFFF'],
  gradientDark: ['#1A1410', '#1A1410', '#1A1410'],
  circleBg: '#FFD86B',
  circleRing: '#FFEFC1',
  circleGradientDark: HeroPlatesDark.orange.bg,
};
const SKY_THEME: StepTheme = {
  gradient: ['#90CAF9', '#E3F2FD', '#FFFFFF'],
  gradientDark: ['#0F1A24', '#0F1A24', '#0F1A24'],
  circleBg: '#A8D5FA',
  circleRing: '#D7EAFB',
  circleGradientDark: HeroPlatesDark.lavender.bg,
};
const BLUSH_THEME: StepTheme = {
  gradient: ['#F8BBD0', '#FCE4EC', '#FFFFFF'],
  gradientDark: ['#231016', '#231016', '#231016'],
  circleBg: '#F4A4BC',
  circleRing: '#FBD8E4',
  circleGradientDark: HeroPlatesDark.orange.bg,
};

// ROADMAP 4.0 A5 — distinct theme per onboarding step. With 10 steps and 6
// pastels, each step gets its own color and adjacent steps never share.
const STEP_THEMES: readonly StepTheme[] = [
  PEACH_THEME,    // 0 Welcome
  SAGE_THEME,     // 1 Diet
  LAVENDER_THEME, // 2 Lifestyle (A5-a)
  BLUSH_THEME,    // 3 Favorite meal (A5-b)
  SKY_THEME,      // 4 Cuisine clusters (A5-c)
  GOLDEN_THEME,   // 5 Nutrition density (A5-d)
  SAGE_THEME,     // 6 Pantry top-5 (A5-e)
  LAVENDER_THEME, // 7 Equipment (A5-f)
  PEACH_THEME,    // 8 Cook for whom (A5-g)
  BLUSH_THEME,    // 9 Build first plate
];

const DIETARY_OPTIONS = [
  { id: 'vegetarian', name: 'Vegetarian' },
  { id: 'vegan', name: 'Vegan' },
  { id: 'gluten-free', name: 'Gluten-free' },
  { id: 'dairy-free', name: 'Dairy-free' },
  { id: 'nut-free', name: 'Nut-free' },
  { id: 'keto', name: 'Keto' },
];

// ROADMAP 4.0 A5-a — affective lifestyle multi-select replaces cut/bulk/maintain.
const LIFESTYLE_OPTIONS = [
  { id: 'try_new_cuisines', label: 'Try new cuisines' },
  { id: 'eat_seasonally', label: 'Eat seasonally' },
  { id: 'avoid_processed', label: 'Avoid processed food' },
  { id: 'balance_health_pleasure', label: 'Balance health & pleasure' },
  { id: 'specific_health_goals', label: 'Specific health goals' },
];

// ROADMAP 4.0 A5-c — cuisine cluster picker, multi-select.
const CUISINE_CLUSTERS = [
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'latin_american', label: 'Latin American' },
  { id: 'asian', label: 'Asian' },
  { id: 'african', label: 'African' },
  { id: 'middle_eastern', label: 'Middle Eastern' },
  { id: 'european', label: 'European' },
  { id: 'caribbean', label: 'Caribbean' },
  { id: 'south_asian', label: 'South Asian' },
];

// ROADMAP 4.0 A5-d — nutrition density single-select.
const NUTRITION_DENSITY_OPTIONS = [
  { id: 'minimal', label: 'Just food' },
  { id: 'macros', label: 'Macros' },
  { id: 'macros_micros', label: 'Macros & micros' },
  { id: 'power_user', label: 'Power user' },
];

// ROADMAP 4.0 A5-f — equipment chips, multi-select.
const EQUIPMENT_OPTIONS = [
  { id: 'ninja_creami', label: 'Ninja Creami' },
  { id: 'air_fryer', label: 'Air fryer' },
  { id: 'instant_pot', label: 'Instant Pot' },
  { id: 'sous_vide', label: 'Sous vide' },
  { id: 'dutch_oven', label: 'Dutch oven' },
  { id: 'cast_iron', label: 'Cast iron' },
  { id: 'grill', label: 'Grill' },
  { id: 'smoker', label: 'Smoker' },
];

// ROADMAP 4.0 A5-g — cook-for single-select.
const COOK_FOR_OPTIONS = [
  { id: 'self', label: 'Just me' },
  { id: 'partner', label: 'Partner' },
  { id: 'family', label: 'Family' },
];

interface OnboardingData {
  dietaryRestrictions: string[];
  // ROADMAP 4.0 A5 — new fields below
  lifestyle: string[];
  firstFavoriteMealText: string;
  cuisineClusters: string[];
  nutritionUIDensity: string;
  pantryTopFive: string[];
  kitchenEquipment: string[];
  cookFor: string;
}

export default function OnboardingScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation();

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    dietaryRestrictions: [],
    lifestyle: [],
    firstFavoriteMealText: '',
    cuisineClusters: [],
    nutritionUIDensity: '',
    pantryTopFive: [],
    kitchenEquipment: [],
    cookFor: '',
  });
  const [pantryInput, setPantryInput] = useState('');

  // Hardware/gesture back → previous step instead of leaving the flow
  useEffect(() => {
    const onHardwareBack = () => {
      if (currentStep <= 0) return false;
      prevStep();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [currentStep]);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (currentStep <= 0) return;
      e.preventDefault();
      prevStep();
    });
    return unsubscribe;
  }, [navigation, currentStep]);

  // ─── Step transition (spring scale + fade) ─────────────────────────────
  const slideScale = useSharedValue(1);
  const slideOpacity = useSharedValue(1);
  const [visibleStep, setVisibleStep] = useState(currentStep);

  const animateToStep = (nextIdx: number) => {
    slideScale.value = withTiming(0.96, { duration: 120 });
    slideOpacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(setVisibleStep)(nextIdx);
      slideScale.value = 0.96;
      slideOpacity.value = 0;
      slideScale.value = withSpring(1, { damping: 18, stiffness: 280 });
      slideOpacity.value = withTiming(1, { duration: 200 });
    });
  };

  const slideStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [{ scale: slideScale.value }],
  }));

  // ROADMAP 4.0 A5 — last question step is index 8 (cook-for); step 9 is build-first-plate.
  // Persist after the last question, then animate into the build-first-plate hand-off.
  const LAST_QUESTION_STEP = TOTAL_STEPS - 2;

  const nextStep = async () => {
    if (currentStep === LAST_QUESTION_STEP) {
      const ok = await persistPreferences();
      if (!ok) return;
      animateToStep(currentStep + 1);
      setCurrentStep(currentStep + 1);
      return;
    }
    if (currentStep < TOTAL_STEPS - 1) {
      const next = currentStep + 1;
      animateToStep(next);
      setCurrentStep(next);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      animateToStep(prev);
      setCurrentStep(prev);
    }
  };

  const toggleDietary = (id: string) => {
    setData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(id)
        ? prev.dietaryRestrictions.filter(v => v !== id)
        : [...prev.dietaryRestrictions, id],
    }));
  };

  const persistPreferences = async (): Promise<boolean> => {
    try {
      setSaving(true);
      const prefsPayload: Record<string, any> = {
        dietaryRestrictions: data.dietaryRestrictions,
        cookTimePreference: 30,
        spiceLevel: 'medium',
      };
      // ROADMAP 4.0 A5 — persist all the new optional onboarding fields.
      if (data.lifestyle.length > 0) prefsPayload.lifestyle = data.lifestyle;
      if (data.firstFavoriteMealText.trim().length > 0) {
        prefsPayload.firstFavoriteMealText = data.firstFavoriteMealText.trim();
      }
      if (data.cuisineClusters.length > 0) prefsPayload.likedCuisineClusters = data.cuisineClusters;
      if (data.nutritionUIDensity) prefsPayload.nutritionUIDensity = data.nutritionUIDensity;
      if (data.pantryTopFive.length > 0) prefsPayload.pantryTopFive = data.pantryTopFive;
      if (data.kitchenEquipment.length > 0) prefsPayload.kitchenEquipment = data.kitchenEquipment;
      if (data.cookFor) prefsPayload.cookFor = data.cookFor;

      await userApi.updatePreferences(prefsPayload);
      await AsyncStorage.setItem('onboarding_complete', 'true');
      HapticPatterns.success();
      return true;
    } catch {
      HapticPatterns.error();
      Alert.alert('Oops!', "Couldn't save your preferences — give it another shot?");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleMulti = (field: 'lifestyle' | 'cuisineClusters' | 'kitchenEquipment') => (id: string) => {
    setData(prev => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter(v => v !== id)
        : [...prev[field], id],
    }));
  };

  const addPantryChip = () => {
    const trimmed = pantryInput.trim();
    if (!trimmed || data.pantryTopFive.length >= 5) return;
    if (data.pantryTopFive.includes(trimmed)) {
      setPantryInput('');
      return;
    }
    setData(prev => ({ ...prev, pantryTopFive: [...prev.pantryTopFive, trimmed] }));
    setPantryInput('');
  };

  const removePantryChip = (item: string) => {
    setData(prev => ({ ...prev, pantryTopFive: prev.pantryTopFive.filter(v => v !== item) }));
  };

  const handleBuildFirstPlate = () => {
    // P0 retention — route through the 3-recipe quick-start seed first
    // so the recommender has recipe-level signal before /(tabs) opens.
    // build-a-plate is still reachable from the Today tab.
    router.replace('/quick-start' as any);
  };

  const handleSkipFirstPlate = () => {
    track('skipped_first_plate');
    router.replace('/(tabs)');
  };

  const skipOnboarding = () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can always set up your preferences later from the Profile screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            try { await AsyncStorage.setItem('onboarding_complete', 'true'); } catch {}
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  // ─── CTA label per step ─────────────────────────────────────────────────
  const ctaLabel = useMemo(() => {
    if (saving) return 'Setting up...';
    if (currentStep === 0) return 'Get started';
    if (currentStep === TOTAL_STEPS - 1) return 'Finish setup';
    return 'Continue';
  }, [currentStep, saving]);

  const theme = STEP_THEMES[currentStep];
  const gradient = isDark ? theme.gradientDark : theme.gradient;

  // ─── Render ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (visibleStep) {
      case 0:
        return (
          <EditorialStep
            stepIndex={0}
            theme={STEP_THEMES[0]}
            isDark={isDark}
            eyebrow="Welcome"
            mascotExpression="excited"
            titleLead="Let's find "
            titleAccent="recipes"
            titleTail=" you'll love"
            terminator="."
            subtitle="Sazon tailors every recipe to your macros, your pantry, and how much time you have tonight."
          />
        );
      case 1:
        return (
          <EditorialStep
            stepIndex={1}
            theme={STEP_THEMES[1]}
            isDark={isDark}
            eyebrow={`Step 1 of ${TOTAL_STEPS - 1}`}
            mascotExpression="thinking"
            titleLead="Any foods "
            titleAccent="to avoid"
            terminator="?"
            subtitle="Pick anything you skip. You can change these anytime in your profile."
          >
            <OptionGrid
              columns={3}
              isDark={isDark}
              options={DIETARY_OPTIONS.map(o => ({
                id: o.id,
                label: o.name,
                selected: data.dietaryRestrictions.includes(o.id),
              }))}
              onSelect={toggleDietary}
            />
          </EditorialStep>
        );
      // ROADMAP 4.0 A5-a — affective lifestyle multi-select replaces goal step.
      case 2:
        return (
          <EditorialStep
            stepIndex={2}
            theme={STEP_THEMES[2]}
            isDark={isDark}
            eyebrow={`Step 2 of ${TOTAL_STEPS - 1}`}
            mascotExpression="chef-kiss"
            titleLead="How would you describe how you "
            titleAccent="want to eat"
            terminator="?"
            subtitle="Pick all that fit. We'll tune everything to match."
          >
            <OptionGrid
              columns={2}
              isDark={isDark}
              options={LIFESTYLE_OPTIONS.map(o => ({
                id: o.id,
                label: o.label,
                selected: data.lifestyle.includes(o.id),
              }))}
              onSelect={toggleMulti('lifestyle')}
            />
          </EditorialStep>
        );
      // ROADMAP 4.0 A5-b — free-text favorite meal.
      case 3:
        return (
          <EditorialStep
            stepIndex={3}
            theme={STEP_THEMES[3]}
            isDark={isDark}
            eyebrow={`Step 3 of ${TOTAL_STEPS - 1}`}
            mascotExpression="thinking"
            titleLead="Tell me about a meal you "
            titleAccent="love"
            terminator="."
            subtitle="One sentence is plenty. Anything you can describe, Sazon can learn from."
          >
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <TextInput
                value={data.firstFavoriteMealText}
                onChangeText={(t: string) => setData(prev => ({ ...prev, firstFavoriteMealText: t }))}
                placeholder="My grandmother's chicken with saffron rice…"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                multiline
                numberOfLines={3}
                accessibilityLabel="Favorite meal description"
                style={{
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  minHeight: 90,
                  fontSize: 15,
                  fontFamily: 'PlusJakartaSans_400Regular',
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  color: isDark ? DarkColors.text.primary : Colors.text.primary,
                  textAlignVertical: 'top',
                }}
              />
            </View>
          </EditorialStep>
        );
      // ROADMAP 4.0 A5-c — cuisine cluster picker, multi-select.
      case 4:
        return (
          <EditorialStep
            stepIndex={4}
            theme={STEP_THEMES[4]}
            isDark={isDark}
            eyebrow={`Step 4 of ${TOTAL_STEPS - 1}`}
            mascotExpression="excited"
            titleLead="Where in the world do you want to "
            titleAccent="eat from"
            terminator="?"
            subtitle="Pick the regions you want more of. We'll start there."
          >
            <OptionGrid
              columns={2}
              isDark={isDark}
              options={CUISINE_CLUSTERS.map(o => ({
                id: o.id,
                label: o.label,
                selected: data.cuisineClusters.includes(o.id),
              }))}
              onSelect={toggleMulti('cuisineClusters')}
            />
          </EditorialStep>
        );
      // ROADMAP 4.0 A5-d — nutrition density single-select.
      case 5:
        return (
          <EditorialStep
            stepIndex={5}
            theme={STEP_THEMES[5]}
            isDark={isDark}
            eyebrow={`Step 5 of ${TOTAL_STEPS - 1}`}
            mascotExpression="thinking"
            titleLead="How interested are you in "
            titleAccent="nutrition data"
            terminator="?"
            subtitle="We'll match the density of nutrition info to how you like to read it."
          >
            <OptionGrid
              columns={2}
              isDark={isDark}
              options={NUTRITION_DENSITY_OPTIONS.map(o => ({
                id: o.id,
                label: o.label,
                selected: data.nutritionUIDensity === o.id,
              }))}
              onSelect={(id) => setData(prev => ({ ...prev, nutritionUIDensity: id }))}
            />
          </EditorialStep>
        );
      // ROADMAP 4.0 A5-e — pantry top-5, free-form chips.
      case 6:
        return (
          <EditorialStep
            stepIndex={6}
            theme={STEP_THEMES[6]}
            isDark={isDark}
            eyebrow={`Step 6 of ${TOTAL_STEPS - 1}`}
            mascotExpression="thinking"
            titleLead="What's always in your "
            titleAccent="pantry"
            terminator="?"
            subtitle="Top 5 ingredients you keep on hand. Type one and tap Add."
          >
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={pantryInput}
                  onChangeText={setPantryInput}
                  placeholder="Olive oil"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  onSubmitEditing={addPantryChip}
                  accessibilityLabel="Pantry item input"
                  style={{
                    flex: 1,
                    borderRadius: 100,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    fontSize: 15,
                    fontFamily: 'PlusJakartaSans_400Regular',
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    color: isDark ? DarkColors.text.primary : Colors.text.primary,
                  }}
                />
                <HapticTouchableOpacity
                  onPress={addPantryChip}
                  accessibilityLabel="Add pantry item"
                  accessibilityRole="button"
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 100,
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 }}>
                    Add
                  </Text>
                </HapticTouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {data.pantryTopFive.map(item => (
                  <HapticTouchableOpacity
                    key={item}
                    onPress={() => removePantryChip(item)}
                    accessibilityLabel={`Remove ${item}`}
                    accessibilityRole="button"
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 12, paddingVertical: 6, gap: 6,
                      borderRadius: 100,
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                    }}
                  >
                    <Text style={{ color: isDark ? '#D1D5DB' : '#374151', fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>
                      {item}
                    </Text>
                    <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 14 }}>×</Text>
                  </HapticTouchableOpacity>
                ))}
              </View>
            </View>
          </EditorialStep>
        );
      // ROADMAP 4.0 A5-f — equipment multi-select.
      case 7:
        return (
          <EditorialStep
            stepIndex={7}
            theme={STEP_THEMES[7]}
            isDark={isDark}
            eyebrow={`Step 7 of ${TOTAL_STEPS - 1}`}
            mascotExpression="excited"
            titleLead="What "
            titleAccent="equipment"
            titleTail=" do you have"
            terminator="?"
            subtitle="Helps us suggest recipes that actually fit your kitchen."
          >
            <OptionGrid
              columns={2}
              isDark={isDark}
              options={EQUIPMENT_OPTIONS.map(o => ({
                id: o.id,
                label: o.label,
                selected: data.kitchenEquipment.includes(o.id),
              }))}
              onSelect={toggleMulti('kitchenEquipment')}
            />
          </EditorialStep>
        );
      // ROADMAP 4.0 A5-g — cook-for single-select.
      case 8:
        return (
          <EditorialStep
            stepIndex={8}
            theme={STEP_THEMES[8]}
            isDark={isDark}
            eyebrow={`Step 8 of ${TOTAL_STEPS - 1}`}
            mascotExpression="chef-kiss"
            titleLead="Who do you "
            titleAccent="cook for"
            terminator="?"
            subtitle="We'll set portions and pantry defaults to match."
          >
            <OptionGrid
              columns={3}
              isDark={isDark}
              options={COOK_FOR_OPTIONS.map(o => ({
                id: o.id,
                label: o.label,
                selected: data.cookFor === o.id,
              }))}
              onSelect={(id) => setData(prev => ({ ...prev, cookFor: id }))}
            />
          </EditorialStep>
        );
      // ROADMAP 4.0 A5 — final step: seed the recommender with 3 picks.
      case 9:
        return (
          <EditorialStep
            stepIndex={9}
            theme={STEP_THEMES[9]}
            isDark={isDark}
            eyebrow="One more thing"
            mascotExpression="excited"
            titleLead="Pick a few you'd "
            titleAccent="cook tonight"
            terminator="."
            subtitle="Sazon learns from every tap. Pick up to three — your kitchen starts where you start."
          />
        );
      default:
        return null;
    }
  };

  const accentColor = isDark ? DarkColors.primary : Colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? DarkColors.background : '#FFFFFF' }}>
      <LinearGradient
        colors={gradient as unknown as [string, string, string]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Top chrome: dots (left) + skip (right) */}
        <View style={styles.topChrome}>
          <View style={styles.dotsRow} accessibilityRole="progressbar" accessibilityLabel={`Step ${currentStep + 1} of ${TOTAL_STEPS}`}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <MotiView
                key={i}
                animate={{
                  width: i === currentStep ? 22 : 6,
                  opacity: i === currentStep ? 1 : 0.4,
                }}
                transition={{ type: 'spring', damping: 16, stiffness: 280 }}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === currentStep ? accentColor : (isDark ? DarkColors.surfaceTint : '#E5DFD7'),
                  },
                ]}
                testID={`onboarding-dot-${i}`}
              />
            ))}
          </View>

          <HapticTouchableOpacity
            onPress={skipOnboarding}
            style={styles.skipBtn}
            accessibilityLabel="Skip onboarding"
            accessibilityRole="button"
          >
            <Text style={[styles.skipText, { color: isDark ? DarkColors.text.tertiary : '#6B7280' }]}>
              Skip
            </Text>
          </HapticTouchableOpacity>
        </View>

        {/* Step content */}
        <Animated.View style={[{ flex: 1 }, slideStyle]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>
        </Animated.View>

        {/* Dark editorial CTA pill + ghost back on steps 1-2 */}
        <View style={styles.ctaWrap}>
          {currentStep === TOTAL_STEPS - 1 ? (
            <>
              <BrandButton
                label="Show me a few to pick"
                variant="sage"
                icon="restaurant-outline"
                onPress={handleBuildFirstPlate}
                testID="onboarding-build-plate-cta"
                accessibilityLabel="Pick a few recipes to start"
              />
              <HapticTouchableOpacity
                onPress={handleSkipFirstPlate}
                accessibilityLabel="Skip for now"
                accessibilityRole="button"
                testID="onboarding-skip-plate"
                style={styles.ghostBack}
              >
                <Text style={[styles.ghostBackLabel, { color: isDark ? DarkColors.text.tertiary : '#6B7280' }]}>
                  Skip for now
                </Text>
              </HapticTouchableOpacity>
            </>
          ) : (
            <HapticTouchableOpacity
              onPress={nextStep}
              disabled={saving}
              accessibilityLabel={ctaLabel}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              testID="onboarding-cta"
              style={[
                styles.ctaPill,
                {
                  backgroundColor: isDark ? DarkColors.primary : EditorialColors.blackCTA,
                  opacity: saving ? 0.7 : 1,
                  ...(isDark
                    ? {
                        shadowColor: DarkColors.primary,
                        shadowOpacity: 0.35,
                        shadowRadius: 24,
                        shadowOffset: { width: 0, height: 10 },
                        elevation: 8,
                      }
                    : null),
                },
              ]}
            >
              {saving ? (
                <AnimatedActivityIndicator size="small" color={isDark ? DarkColors.text.inverse : '#FFFFFF'} />
              ) : (
                <Text style={[styles.ctaLabel, { color: isDark ? DarkColors.text.inverse : '#FFFFFF' }]}>
                  {ctaLabel}
                </Text>
              )}
            </HapticTouchableOpacity>
          )}

          {currentStep > 0 && currentStep !== TOTAL_STEPS - 1 && (
            <HapticTouchableOpacity
              onPress={prevStep}
              disabled={saving}
              accessibilityLabel="Back"
              accessibilityRole="button"
              testID="onboarding-back"
              style={styles.ghostBack}
            >
              <Text style={[styles.ghostBackLabel, { color: isDark ? DarkColors.text.tertiary : '#6B7280' }]}>
                Back
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <SuccessModal
        visible={showSuccessModal}
        title="Welcome to Sazon Chef!"
        message="Your preferences have been saved. We'll use this information to give you personalized recipe recommendations."
        expression="excited"
        actionLabel="Get Started"
        onAction={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)');
        }}
        onDismiss={() => {
          setShowSuccessModal(false);
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}

// ─── EditorialStep — shared frame: circle hero + title + subtitle + children ──

interface EditorialStepProps {
  stepIndex: number;
  theme: StepTheme;
  isDark: boolean;
  eyebrow: string;
  mascotExpression: 'excited' | 'thinking' | 'chef-kiss';
  titleLead: string;
  titleAccent: string;
  titleTail?: string;
  terminator: string; // "." or "?"
  subtitle: string;
  children?: React.ReactNode;
}

// Sazon mascot config per onboarding step — keyed by stepIndex
// 0: Welcome → orange, bouncy + sparkles
// 1: Diet → green, curious wobble + question marks
// 2: Goal → purple, celebrating with hearts
const STEP_SAZON: readonly { variant: SazonVariant; motion: SazonMotion; fx: SazonFx[] }[] = [
  { variant: 'orange', motion: 'bounce', fx: ['sparkles'] },         // 0 Welcome
  { variant: 'red', motion: 'wobble', fx: ['question'] },            // 1 Diet
  { variant: 'orange', motion: 'celebrate', fx: ['hearts'] },        // 2 Lifestyle (A5-a)
  { variant: 'red', motion: 'wobble', fx: ['question'] },            // 3 Favorite meal (A5-b)
  { variant: 'orange', motion: 'bounce', fx: ['sparkles'] },         // 4 Cuisine clusters (A5-c)
  { variant: 'red', motion: 'wobble', fx: ['question'] },            // 5 Nutrition density (A5-d)
  { variant: 'orange', motion: 'bounce', fx: ['sparkles'] },         // 6 Pantry top-5 (A5-e)
  { variant: 'orange', motion: 'celebrate', fx: ['hearts'] },        // 7 Equipment (A5-f)
  { variant: 'red', motion: 'wobble', fx: ['question'] },            // 8 Cook for (A5-g)
  { variant: 'orange', motion: 'bounce', fx: ['sparkles'] },         // 9 Build first plate
];

function EditorialStep({
  stepIndex,
  theme,
  isDark,
  eyebrow,
  mascotExpression,
  titleLead,
  titleAccent,
  titleTail,
  terminator,
  subtitle,
  children,
}: EditorialStepProps) {
  const titleColor = isDark ? DarkColors.text.primary : '#1A1A1A';
  const subtitleColor = isDark ? DarkColors.text.secondary : '#6B7280';
  const eyebrowColor = isDark ? DarkColors.text.tertiary : '#A8A29A';

  return (
    <View
      style={styles.stepFrame}
      testID={`onboarding-step-${stepIndex}`}
    >
      {/* Eyebrow */}
      <MotiView
        from={{ opacity: 0, translateY: 6 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 320 }}
      >
        <Text style={[styles.eyebrow, { color: eyebrowColor }]} accessibilityLabel={eyebrow}>
          {eyebrow.toUpperCase()}
        </Text>
      </MotiView>

      {/* Pastel hero circle (light) / Jewel gradient plate (dark) */}
      <MotiView
        from={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200 }}
      >
        <View style={styles.circleOuter}>
          <View
            style={[
              styles.circleRing,
              { backgroundColor: isDark ? 'transparent' : theme.circleRing },
            ]}
          >
            {isDark ? (
              <LinearGradient
                colors={theme.circleGradientDark as unknown as [string, string]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[
                  styles.circleInner,
                  styles.circleInnerDarkShadow,
                ]}
              >
                <Sazon
                  variant={STEP_SAZON[stepIndex].variant}
                  motion={STEP_SAZON[stepIndex].motion}
                  fx={STEP_SAZON[stepIndex].fx}
                  size={140}
                />
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.circleInner,
                  { backgroundColor: theme.circleBg },
                ]}
              >
                <Sazon
                  variant={STEP_SAZON[stepIndex].variant}
                  motion={STEP_SAZON[stepIndex].motion}
                  fx={STEP_SAZON[stepIndex].fx}
                  size={140}
                />
              </View>
            )}
          </View>
        </View>
      </MotiView>

      {/* Title with italic accent + accent-colored terminator */}
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 220, delay: 80 }}
      >
        <Text
          style={[styles.title, { color: titleColor }]}
          accessibilityRole="header"
          accessibilityLabel={`${titleLead}${titleAccent}${titleTail ?? ''}${terminator}`}
        >
          {titleLead}
          <Text style={[styles.titleAccent, { color: titleColor }]}>
            {titleAccent}
          </Text>
          {titleTail ?? ''}
          {terminator !== '.' && (
            <Text style={[styles.titleTerminator, { color: isDark ? DarkColors.primary : Colors.primary }]}>{terminator}</Text>
          )}
        </Text>
      </MotiView>

      {/* Subtitle */}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 220, delay: 140 }}
      >
        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          {subtitle}
        </Text>
      </MotiView>

      {/* Optional content (option grid) */}
      {children && (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 220, delay: 200 }}
          style={{ width: '100%' }}
        >
          {children}
        </MotiView>
      )}
    </View>
  );
}

// ─── OptionGrid — selectable card grid with icon dot + label ────────────

interface OptionGridItem {
  id: string;
  label: string;
  selected: boolean;
}

function OptionGrid({
  options,
  columns,
  isDark,
  onSelect,
}: {
  options: OptionGridItem[];
  columns: 2 | 3;
  isDark: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.gridWrap}>
      {options.map((opt) => (
        <OptionCard
          key={opt.id}
          label={opt.label}
          selected={opt.selected}
          isDark={isDark}
          columns={columns}
          onPress={() => onSelect(opt.id)}
        />
      ))}
    </View>
  );
}

function OptionCard({
  label,
  selected,
  isDark,
  columns,
  onPress,
}: {
  label: string;
  selected: boolean;
  isDark: boolean;
  columns: 2 | 3;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => { scale.value = withSpring(0.96, { damping: 14, stiffness: 320 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 14, stiffness: 320 }); };

  const widthPct = columns === 3 ? '31.5%' : '47.5%';
  // Dark-mode selected: accentSoft tint per COLORS.md (rgba(255,149,89,0.14))
  const bg = selected
    ? (isDark ? 'rgba(255,149,89,0.14)' : 'rgba(250,126,18,0.08)')
    : (isDark ? DarkColors.card : '#FFFFFF');
  const border = selected
    ? (isDark ? DarkColors.primary : Colors.primary)
    : (isDark ? DarkColors.border.light : '#EAE3DA');
  const labelColor = isDark ? DarkColors.text.primary : '#1A1A1A';
  const dotBg = isDark ? DarkColors.surfaceTint : '#E9E4DD';

  return (
    <Animated.View style={[{ width: widthPct as any }, animStyle]}>
      <HapticTouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={label}
        style={[
          styles.optionCard,
          {
            backgroundColor: bg,
            borderColor: border,
            borderWidth: selected ? 1.5 : 1,
          },
        ]}
        testID={`option-${label}`}
      >
        <View style={[styles.optionDot, { backgroundColor: dotBg }]} />
        <Text style={[styles.optionLabel, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const TITLE_SIZE = 38;

const styles = StyleSheet.create({
  topChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  stepFrame: {
    alignItems: 'center',
    paddingTop: 12,
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 14,
  },
  circleOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  circleRing: {
    width: 218,
    height: 218,
    borderRadius: 109,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: 188,
    height: 188,
    borderRadius: 94,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleInnerDarkShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 18 },
    elevation: 16,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * 1.06,
    letterSpacing: -1.2,
    textAlign: 'center',
    marginBottom: 12,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontStyle: 'italic',
    fontSize: TITLE_SIZE,
    letterSpacing: -1.2,
  },
  titleTerminator: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: TITLE_SIZE,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 22,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginTop: 4,
  },
  optionCard: {
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    gap: 10,
  },
  optionDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  optionLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  ctaPill: {
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  ghostBack: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  ghostBackLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
