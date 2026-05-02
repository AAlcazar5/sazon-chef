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
  ActivityIndicator,
} from 'react-native';
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
const TOTAL_STEPS = 3;

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

const STEP_THEMES: readonly StepTheme[] = [
  // 0: Welcome — peach (light) / terracotta (dark)
  {
    gradient: ['#FFE3CC', '#FFF3E0', '#FFFFFF'],
    gradientDark: ['#1A1410', '#1A1410', '#1A1410'],
    circleBg: '#FFD9B8',
    circleRing: '#FFEAD6',
    circleGradientDark: HeroPlatesDark.orange.bg,
  },
  // 1: Diet — sage (light) / forest (dark)
  {
    gradient: ['#C8E6C9', '#E8F5E9', '#FFFFFF'],
    gradientDark: ['#1A1410', '#1A1410', '#1A1410'],
    circleBg: '#B7DFB9',
    circleRing: '#D8EDD9',
    circleGradientDark: HeroPlatesDark.green.bg,
  },
  // 2: Goal — lavender (light) / plum (dark)
  {
    gradient: ['#E1BEE7', '#F3E5F5', '#FFFFFF'],
    gradientDark: ['#1A1410', '#1A1410', '#1A1410'],
    circleBg: '#D9B6E1',
    circleRing: '#EAD7EE',
    circleGradientDark: HeroPlatesDark.lavender.bg,
  },
];

const DIETARY_OPTIONS = [
  { id: 'vegetarian', name: 'Vegetarian' },
  { id: 'vegan', name: 'Vegan' },
  { id: 'gluten-free', name: 'Gluten-free' },
  { id: 'dairy-free', name: 'Dairy-free' },
  { id: 'nut-free', name: 'Nut-free' },
  { id: 'keto', name: 'Keto' },
];

const GOAL_OPTIONS = [
  { id: 'lose_weight', label: 'Lose weight' },
  { id: 'maintain', label: 'Maintain' },
  { id: 'gain_muscle', label: 'Build muscle' },
  { id: 'just_eat_better', label: 'Just eat better' },
];

interface OnboardingData {
  dietaryRestrictions: string[];
  fitnessGoal: string;
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
    fitnessGoal: '',
  });

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

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      const next = currentStep + 1;
      animateToStep(next);
      setCurrentStep(next);
    } else {
      saveOnboarding();
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

  const saveOnboarding = async () => {
    try {
      setSaving(true);
      const prefsPayload: Record<string, any> = {
        dietaryRestrictions: data.dietaryRestrictions,
        cookTimePreference: 30,
        spiceLevel: 'medium',
      };
      if (data.fitnessGoal) prefsPayload.fitnessGoal = data.fitnessGoal;

      await userApi.updatePreferences(prefsPayload);
      if (data.fitnessGoal) await AsyncStorage.setItem('onboarding_goal', data.fitnessGoal);
      await AsyncStorage.setItem('onboarding_complete', 'true');

      HapticPatterns.success();
      setShowSuccessModal(true);
    } catch {
      HapticPatterns.error();
      Alert.alert('Oops!', "Couldn't save your preferences — give it another shot?");
    } finally {
      setSaving(false);
    }
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
            eyebrow="Step 1 of 3"
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
      case 2:
        return (
          <EditorialStep
            stepIndex={2}
            theme={STEP_THEMES[2]}
            isDark={isDark}
            eyebrow="Step 2 of 3"
            mascotExpression="chef-kiss"
            titleLead="What's your "
            titleAccent="goal"
            terminator="?"
            subtitle="We'll tune portions and macro targets to match."
          >
            <OptionGrid
              columns={2}
              isDark={isDark}
              options={GOAL_OPTIONS.map(o => ({
                id: o.id,
                label: o.label,
                selected: data.fitnessGoal === o.id,
              }))}
              onSelect={(id) => setData(prev => ({ ...prev, fitnessGoal: id }))}
            />
          </EditorialStep>
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

        {/* Dark editorial CTA pill */}
        <View style={styles.ctaWrap}>
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
              <ActivityIndicator size="small" color={isDark ? DarkColors.text.inverse : '#FFFFFF'} />
            ) : (
              <Text style={[styles.ctaLabel, { color: isDark ? DarkColors.text.inverse : '#FFFFFF' }]}>
                {ctaLabel}
              </Text>
            )}
          </HapticTouchableOpacity>
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
  { variant: 'orange', motion: 'bounce', fx: ['sparkles'] },
  { variant: 'red', motion: 'wobble', fx: ['question'] },
  { variant: 'orange', motion: 'celebrate', fx: ['hearts'] },
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
});
