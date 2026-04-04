// frontend/app/onboarding.tsx
// 9N: 3-screen onboarding with pastel gradient backgrounds, mascot per step,
// spring transitions, and hero typography.
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  BackHandler,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import { MotiView } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedLottieMascot from '../components/mascot/AnimatedLottieMascot';
import LogoMascot from '../components/mascot/LogoMascot';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import SuccessModal from '../components/ui/SuccessModal';
import ScreenGradient from '../components/ui/ScreenGradient';
import { Colors, DarkColors, Pastel, PastelDark } from '../constants/Colors';
import { FontSize, FontWeight } from '../constants/Typography';
import { Shadows } from '../constants/Shadows';
import { HapticPatterns } from '../constants/Haptics';
import { onboarding1, onboarding2, onboarding3 } from '../constants/Gradients';
import { useColorScheme } from 'nativewind';
import type { LogoMascotExpression } from '../components/mascot/LogoMascot';

// ── 3-screen onboarding flow ──
// Step 0: Welcome (peach gradient + excited mascot)
// Step 1: Dietary Restrictions (sage gradient + thinking mascot)
// Step 2: Goal (lavender gradient + chef-kiss mascot)

const TOTAL_STEPS = 3;

const STEP_GRADIENTS: readonly (readonly [string, string])[] = [
  onboarding1, // peach → cream
  onboarding2, // sage → cream
  onboarding3, // lavender → cream
];

const STEP_DARK_GRADIENTS: readonly (readonly [string, string])[] = [
  ['rgba(255,183,77,0.08)', '#0D0D0D'],
  ['rgba(129,199,132,0.08)', '#0D0D0D'],
  ['rgba(206,147,216,0.08)', '#0D0D0D'],
];

const STEP_MASCOTS: readonly LogoMascotExpression[] = [
  'excited',    // Welcome
  'thinking',   // Dietary restrictions
  'chef-kiss',  // Goal
];

const DIETARY_RESTRICTIONS = [
  { name: 'Vegetarian', icon: '🥕', description: 'No meat or fish', tint: Pastel.sage, tintDark: PastelDark.sage },
  { name: 'Vegan', icon: '🌱', description: 'No animal products', tint: Pastel.sage, tintDark: PastelDark.sage },
  { name: 'Gluten-Free', icon: '🌾', description: 'No wheat, barley, rye', tint: Pastel.golden, tintDark: PastelDark.golden },
  { name: 'Dairy-Free', icon: '🥛', description: 'No milk products', tint: Pastel.sky, tintDark: PastelDark.sky },
  { name: 'Nut-Free', icon: '🥜', description: 'No tree nuts or peanuts', tint: Pastel.red, tintDark: PastelDark.red },
  { name: 'Kosher', icon: '✡️', description: 'Jewish dietary laws', tint: Pastel.lavender, tintDark: PastelDark.lavender },
  { name: 'Halal', icon: '☪️', description: 'Islamic dietary laws', tint: Pastel.peach, tintDark: PastelDark.peach },
  { name: 'Pescatarian', icon: '🐟', description: 'No meat, but fish allowed', tint: Pastel.sky, tintDark: PastelDark.sky },
  { name: 'Keto', icon: '🥑', description: 'Low carb, high fat', tint: Pastel.sage, tintDark: PastelDark.sage },
  { name: 'Paleo', icon: '🦴', description: 'Whole foods, no processed', tint: Pastel.peach, tintDark: PastelDark.peach },
];

const TOP_DIETARY_RESTRICTIONS = DIETARY_RESTRICTIONS.slice(0, 5);

const GOAL_CARDS = [
  { value: 'maintain', label: 'Eat Healthy', icon: '⚖️', description: 'Balanced meals that fuel your day', tint: Pastel.sage, tintDark: PastelDark.sage },
  { value: 'lose_weight', label: 'Save Time', icon: '⏱️', description: 'Quick, nutritious meals in 30 min or less', tint: Pastel.sky, tintDark: PastelDark.sky },
  { value: 'gain_muscle', label: 'Explore Cuisines', icon: '🌍', description: 'Discover flavors from around the world', tint: Pastel.peach, tintDark: PastelDark.peach },
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
  const [showMoreDietary, setShowMoreDietary] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    dietaryRestrictions: [],
    fitnessGoal: '',
  });

  // Android hardware back button -> go to previous step (not previous screen)
  useEffect(() => {
    const onHardwareBack = () => {
      if (currentStep <= 0) return false;
      prevStep();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [currentStep]);

  // iOS swipe-back gesture -> go to previous step (not previous screen)
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (currentStep <= 0) return;
      e.preventDefault();
      prevStep();
    });
    return unsubscribe;
  }, [navigation, currentStep]);

  const toggleDietaryRestriction = (name: string) => {
    setData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(name)
        ? prev.dietaryRestrictions.filter(v => v !== name)
        : [...prev.dietaryRestrictions, name],
    }));
  };

  // ── Screen transition: spring scale 0.95→1.0 + opacity ──
  const slideScale = useSharedValue(1);
  const slideOpacity = useSharedValue(1);
  const [visibleStep, setVisibleStep] = useState(currentStep);

  const animateToStep = (nextStepIndex: number) => {
    // Exit: scale down + fade out
    slideScale.value = withTiming(0.95, { duration: 120 });
    slideOpacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(setVisibleStep)(nextStepIndex);
      // Enter: spring scale up + fade in
      slideScale.value = 0.95;
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

  const saveOnboarding = async () => {
    try {
      setSaving(true);

      const prefsPayload: Record<string, any> = {
        dietaryRestrictions: data.dietaryRestrictions,
        cookTimePreference: 30,
        spiceLevel: 'medium',
      };
      if (data.fitnessGoal) {
        prefsPayload.fitnessGoal = data.fitnessGoal;
      }

      await userApi.updatePreferences(prefsPayload);

      if (data.fitnessGoal) {
        await AsyncStorage.setItem('onboarding_goal', data.fitnessGoal);
      }

      await AsyncStorage.setItem('onboarding_complete', 'true');

      HapticPatterns.success();
      setShowSuccessModal(true);
    } catch (error) {
      HapticPatterns.error();
      Alert.alert('Oops!', "Couldn't save your preferences — give it another shot?");
    } finally {
      setSaving(false);
    }
  };

  const skipOnboarding = async () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can always set up your preferences later from the Profile screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            try {
              await AsyncStorage.setItem('onboarding_complete', 'true');
              router.replace('/(tabs)');
            } catch {
              router.replace('/(tabs)');
            }
          }
        },
      ]
    );
  };

  // ── Render step dispatcher ──
  const renderStep = () => {
    switch (visibleStep) {
      case 0: return renderWelcome();
      case 1: return renderDietary();
      case 2: return renderGoal();
      default: return null;
    }
  };

  // ════════════════════════════════════════
  // Screen 1: Welcome — peach gradient
  // ════════════════════════════════════════
  const renderWelcome = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 16, stiffness: 200 }}
      >
        <View style={styles.mascotContainer}>
          <LogoMascot expression="excited" size="large" />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 24 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 100 }}
      >
        <Text
          style={[
            styles.heroTitle,
            { color: isDark ? DarkColors.text.primary : Colors.text.primary },
          ]}
          accessibilityRole="header"
        >
          What's your name?
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 150 }}
      >
        <Text style={[styles.subtitle, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
          Let's personalize your experience in just a few quick steps
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 200 }}
      >
        <View style={[
          styles.previewCard,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
            ...(Shadows.MD as any),
          },
        ]}>
          <View style={styles.previewRow}>
            <View style={[styles.previewIconBg, { backgroundColor: isDark ? PastelDark.sage : Pastel.sage }]}>
              <Text style={styles.previewEmoji}>🥗</Text>
            </View>
            <View style={styles.previewText}>
              <Text style={[styles.previewTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
                Set Your Restrictions
              </Text>
              <Text style={[styles.previewDesc, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                Tell us about dietary needs
              </Text>
            </View>
          </View>

          <View style={styles.previewRow}>
            <View style={[styles.previewIconBg, { backgroundColor: isDark ? PastelDark.peach : Pastel.peach }]}>
              <Text style={styles.previewEmoji}>🎯</Text>
            </View>
            <View style={styles.previewText}>
              <Text style={[styles.previewTitle, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
                Pick Your Goal
              </Text>
              <Text style={[styles.previewDesc, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                What are you cooking for?
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 300 }}
      >
        <Text style={[styles.hint, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>
          Takes less than a minute. You can skip and set this up later.
        </Text>
      </MotiView>
    </ScrollView>
  );

  // ════════════════════════════════════════
  // Screen 2: Dietary Restrictions — sage gradient
  // ════════════════════════════════════════
  const renderDietary = () => {
    const restrictionsToShow = showMoreDietary ? DIETARY_RESTRICTIONS : TOP_DIETARY_RESTRICTIONS;

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 16, stiffness: 200 }}
        >
          <View style={styles.mascotContainer}>
            <AnimatedLottieMascot expression="thinking" size="small" />
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 50 }}
        >
          <Text
            style={[
              styles.stepTitle,
              { color: isDark ? DarkColors.text.primary : Colors.text.primary },
            ]}
            accessibilityRole="header"
          >
            Anything you can't eat?
          </Text>
          <Text style={[styles.stepSubtitle, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
            Optional — skip if none apply
          </Text>
        </MotiView>

        {restrictionsToShow.map((restriction, index) => {
          const isSelected = data.dietaryRestrictions.includes(restriction.name);
          return (
            <MotiView
              key={restriction.name}
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 100 + index * 50 }}
            >
              <HapticTouchableOpacity
                onPress={() => toggleDietaryRestriction(restriction.name)}
                style={[
                  styles.chipCard,
                  {
                    backgroundColor: isSelected
                      ? (isDark ? restriction.tintDark : restriction.tint)
                      : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'),
                    ...(Shadows.SM as any),
                  },
                ]}
                activeOpacity={0.7}
                accessibilityLabel={`${restriction.name}: ${restriction.description}`}
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={styles.chipEmoji}>{restriction.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.chipName,
                    { color: isDark ? DarkColors.text.primary : Colors.text.primary },
                  ]}>
                    {restriction.name}
                  </Text>
                  <Text style={[styles.chipDesc, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                    {restriction.description}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: Colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="white" />
                  </View>
                )}
              </HapticTouchableOpacity>
            </MotiView>
          );
        })}

        {!showMoreDietary && (
          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 350 }}
          >
            <HapticTouchableOpacity
              onPress={() => setShowMoreDietary(true)}
              style={[
                styles.moreButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)' },
              ]}
              activeOpacity={0.7}
              accessibilityLabel="Show more dietary options"
            >
              <Ionicons name="chevron-down" size={18} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} />
              <Text style={[styles.moreLabel, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                More options
              </Text>
            </HapticTouchableOpacity>
          </MotiView>
        )}
      </ScrollView>
    );
  };

  // ════════════════════════════════════════
  // Screen 3: Goal — lavender gradient
  // ════════════════════════════════════════
  const renderGoal = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 16, stiffness: 200 }}
      >
        <View style={styles.mascotContainer}>
          <AnimatedLottieMascot expression="chef-kiss" size="small" />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 50 }}
      >
        <Text
          style={[
            styles.stepTitle,
            { color: isDark ? DarkColors.text.primary : Colors.text.primary },
          ]}
          accessibilityRole="header"
        >
          What's your goal?
        </Text>
        <Text style={[styles.stepSubtitle, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
          We'll tailor recipes to match
        </Text>
      </MotiView>

      {GOAL_CARDS.map((goal, index) => {
        const isSelected = data.fitnessGoal === goal.value;
        return (
          <MotiView
            key={goal.value}
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200, delay: 100 + index * 60 }}
          >
            <HapticTouchableOpacity
              onPress={() => setData({ ...data, fitnessGoal: goal.value })}
              style={[
                styles.goalCard,
                {
                  backgroundColor: isSelected
                    ? (isDark ? goal.tintDark : goal.tint)
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)'),
                  ...(Shadows.MD as any),
                },
              ]}
              activeOpacity={0.7}
              accessibilityLabel={`${goal.label}: ${goal.description}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={styles.goalEmoji}>{goal.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.goalLabel,
                  { color: isDark ? DarkColors.text.primary : Colors.text.primary },
                ]}>
                  {goal.label}
                </Text>
                <Text style={[styles.goalDesc, { color: isDark ? DarkColors.text.secondary : Colors.text.secondary }]}>
                  {goal.description}
                </Text>
              </View>
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color="white" />
                </View>
              )}
            </HapticTouchableOpacity>
          </MotiView>
        );
      })}

      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 400, delay: 280 }}
      >
        <Text style={[styles.hint, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>
          You can refine this and add more details from your Profile anytime
        </Text>
      </MotiView>
    </ScrollView>
  );

  // ── Gradient for current step ──
  const currentGradient = isDark
    ? STEP_DARK_GRADIENTS[currentStep]
    : STEP_GRADIENTS[currentStep];

  return (
    <ScreenGradient gradient={currentGradient}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={[
            styles.header,
            {
              backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
            },
          ]}>
            <View style={styles.headerRow}>
              {currentStep > 0 ? (
                <HapticTouchableOpacity
                  onPress={prevStep}
                  style={{ padding: 4 }}
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="arrow-back" size={24} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} />
                </HapticTouchableOpacity>
              ) : (
                <View style={{ width: 32 }} />
              )}

              <AnimatedLottieMascot
                expression={STEP_MASCOTS[currentStep]}
                size="tiny"
              />

              <HapticTouchableOpacity
                onPress={skipOnboarding}
                style={{ padding: 4 }}
                accessibilityLabel="Skip onboarding"
              >
                <Text style={[styles.skipLabel, { color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }]}>
                  Skip
                </Text>
              </HapticTouchableOpacity>
            </View>

            {/* Orange active dot progress indicator */}
            <View style={styles.dotsRow}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <MotiView
                  key={i}
                  animate={{
                    width: i === currentStep ? 20 : 6,
                    opacity: i === currentStep ? 1 : i < currentStep ? 0.6 : 0.25,
                  }}
                  transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i <= currentStep
                        ? '#FF8B41' // orange active
                        : (isDark ? '#4B5563' : '#D1D5DB'),
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Content — spring scale transition */}
          <Animated.View style={[{ flex: 1 }, slideStyle]}>
            {renderStep()}
          </Animated.View>

          {/* Bottom Bar */}
          <View style={[
            styles.bottomBar,
            {
              backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)',
            },
          ]}>
            <GradientButton
              label={saving ? 'Setting Up...' : currentStep === TOTAL_STEPS - 1 ? 'Finish' : 'Continue'}
              onPress={nextStep}
              disabled={saving}
              loading={saving}
              colors={GradientPresets.brand}
              icon={currentStep === TOTAL_STEPS - 1 ? 'checkmark-circle-outline' : 'arrow-forward'}
            />
          </View>
        </View>

        {/* Success Modal */}
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
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: FontSize.hero,
    fontWeight: FontWeight.extrabold,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.lg,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  stepSubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: 20,
  },
  hint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  // Preview card (welcome screen)
  previewCard: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  previewEmoji: {
    fontSize: 24,
  },
  previewText: {
    flex: 1,
  },
  previewTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  previewDesc: {
    fontSize: FontSize.sm,
  },
  // Dietary chips
  chipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  chipEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  chipName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  chipDesc: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  moreLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    marginLeft: 8,
  },
  // Goal cards
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
  },
  goalEmoji: {
    fontSize: 36,
    marginRight: 16,
  },
  goalLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  goalDesc: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skipLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  // Bottom bar
  bottomBar: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
});
