// frontend/app/onboarding.tsx
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  BackHandler,
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
import { userApi } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedSazon from '../components/mascot/AnimatedSazon';
import LogoMascot from '../components/mascot/LogoMascot';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import SuccessModal from '../components/ui/SuccessModal';
import { Colors, DarkColors } from '../constants/Colors';
import { HapticPatterns } from '../constants/Haptics';
import { useColorScheme } from 'nativewind';

// ── 3-screen onboarding flow ──
// Step 0: Welcome (name + Sazon mascot)
// Step 1: Dietary Restrictions (top 5 + "More" disclosure)
// Step 2: Goal (3 simple tiles)

const TOTAL_STEPS = 3;

const DIETARY_RESTRICTIONS = [
  { name: 'Vegetarian', icon: '🥕', description: 'No meat or fish' },
  { name: 'Vegan', icon: '🌱', description: 'No animal products' },
  { name: 'Gluten-Free', icon: '🌾', description: 'No wheat, barley, rye' },
  { name: 'Dairy-Free', icon: '🥛', description: 'No milk products' },
  { name: 'Nut-Free', icon: '🥜', description: 'No tree nuts or peanuts' },
  { name: 'Kosher', icon: '✡️', description: 'Jewish dietary laws' },
  { name: 'Halal', icon: '☪️', description: 'Islamic dietary laws' },
  { name: 'Pescatarian', icon: '🐟', description: 'No meat, but fish allowed' },
  { name: 'Keto', icon: '🥑', description: 'Low carb, high fat' },
  { name: 'Paleo', icon: '🦴', description: 'Whole foods, no processed' },
];

// Top 5 shown by default; rest behind "More" disclosure
const TOP_DIETARY_RESTRICTIONS = DIETARY_RESTRICTIONS.slice(0, 5);

const SIMPLE_GOALS = [
  { value: 'maintain', label: 'Balanced', icon: '⚖️', description: 'Eat well and stay healthy' },
  { value: 'gain_muscle', label: 'High Protein', icon: '💪', description: 'Build muscle and recover' },
  { value: 'lose_weight', label: 'Lose Weight', icon: '📉', description: 'Eat lighter, feel great' },
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
      if (currentStep <= 0) return false; // Let OS pop the screen
      prevStep();
      return true; // Consumed -- don't pop the screen
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [currentStep]);

  // iOS swipe-back gesture -> go to previous step (not previous screen)
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (currentStep <= 0) return; // First step -- allow the screen to be popped
      e.preventDefault(); // Cancel the navigation event
      prevStep();          // Move one step back within the flow instead
    });
    return unsubscribe;
  }, [navigation, currentStep]);

  // Mascot expression per step: excited (welcome) -> thinking (dietary) -> chef-kiss (goal)
  const getMascotExpression = (): 'excited' | 'thinking' | 'chef-kiss' => {
    switch (currentStep) {
      case 0: return 'excited';
      case 1: return 'thinking';
      case 2: return 'chef-kiss';
      default: return 'excited';
    }
  };

  const toggleDietaryRestriction = (name: string) => {
    setData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(name)
        ? prev.dietaryRestrictions.filter(v => v !== name)
        : [...prev.dietaryRestrictions, name],
    }));
  };

  // ── Screen transition animation ──
  const slideX = useSharedValue(0);
  const [visibleStep, setVisibleStep] = useState(currentStep);

  const animateToStep = (nextStepIndex: number) => {
    const direction = nextStepIndex > currentStep ? 1 : -1;
    slideX.value = withTiming(direction * -40, { duration: 120 }, () => {
      runOnJS(setVisibleStep)(nextStepIndex);
      slideX.value = direction * 40;
      slideX.value = withSpring(0, { damping: 18, stiffness: 280 });
    });
  };

  const slideStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 100 }),
    transform: [{ translateX: slideX.value }],
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

      // Only update physical profile if a fitness goal was selected
      if (data.fitnessGoal) {
        await userApi.updatePhysicalProfile({
          fitnessGoal: data.fitnessGoal,
        } as any);
      }

      // Mark onboarding as complete
      await AsyncStorage.setItem('onboarding_complete', 'true');

      HapticPatterns.success();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      HapticPatterns.error();
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
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
            } catch (error) {
              console.error('Error skipping onboarding:', error);
              router.replace('/(tabs)');
            }
          }
        },
      ]
    );
  };

  // ── Render step dispatcher ──
  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderWelcome();
      case 1: return renderDietary();
      case 2: return renderGoal();
      default: return null;
    }
  };

  // ════════════════════════════════════════
  // Screen 1: Welcome
  // ════════════════════════════════════════

  const renderWelcome = () => (
    <ScrollView className="flex-1 px-6 py-8" keyboardShouldPersistTaps="handled">
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 0 }}
      >
        <View className="items-center mb-8">
          <LogoMascot
            expression="excited"
            size="large"
            style={{ marginBottom: 16 }}
          />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 50 }}
      >
        <Text className="text-3xl font-bold text-center mb-3" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          Welcome to Sazon Chef!
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 100 }}
      >
        <Text className="text-lg text-center mb-8" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
          Let's personalize your experience in just a few quick steps
        </Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 150 }}
      >
        <View className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}>
          <View className="flex-row items-center mb-4">
            <View className="rounded-full p-3 mr-4" style={{ backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight }}>
              <Text className="text-2xl">🥗</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold mb-1" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                Set Your Restrictions
              </Text>
              <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                Tell us about dietary needs
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="rounded-full p-3 mr-4" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
              <Text className="text-2xl">🎯</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold mb-1" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                Pick Your Goal
              </Text>
              <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                What are you cooking for?
              </Text>
            </View>
          </View>
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 200 }}
      >
        <Text className="text-sm text-center px-4 mt-6" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
          Takes less than a minute. You can skip and set this up later.
        </Text>
      </MotiView>
    </ScrollView>
  );

  // ════════════════════════════════════════
  // Screen 2: Dietary Restrictions
  // ════════════════════════════════════════

  const renderDietary = () => {
    const restrictionsToShow = showMoreDietary ? DIETARY_RESTRICTIONS : TOP_DIETARY_RESTRICTIONS;

    return (
      <ScrollView className="flex-1 px-6 py-6" keyboardShouldPersistTaps="handled">
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 0 }}
        >
          <View className="items-center mb-4">
            <AnimatedSazon expression="thinking" size="small" />
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 50 }}
        >
          <Text className="text-2xl font-bold mb-2 text-center" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
            Anything you can't eat?
          </Text>
          <Text className="text-base mb-6 text-center" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
            Optional - Skip if none apply
          </Text>
        </MotiView>

        {restrictionsToShow.map((restriction, index) => {
          const isSelected = data.dietaryRestrictions.includes(restriction.name);
          return (
            <MotiView
              key={restriction.name}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 400, delay: 100 + index * 50 }}
            >
              <HapticTouchableOpacity
                onPress={() => toggleDietaryRestriction(restriction.name)}
                className="mb-3 p-4 rounded-xl border-2 flex-row items-center"
                style={{
                  borderColor: isSelected
                    ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                    : (isDark ? DarkColors.border.light : Colors.border.light),
                  backgroundColor: isSelected
                    ? (isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight)
                    : (isDark ? '#1F2937' : '#FFFFFF'),
                }}
                activeOpacity={0.7}
              >
                <Text className="text-3xl mr-3">{restriction.icon}</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold" style={{
                    color: isSelected
                      ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                      : (isDark ? DarkColors.text.primary : Colors.text.primary)
                  }}>
                    {restriction.name}
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                    {restriction.description}
                  </Text>
                </View>
                {isSelected && (
                  <View className="rounded-full p-1" style={{ backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen }}>
                    <Ionicons name="checkmark" size={16} color="white" />
                  </View>
                )}
              </HapticTouchableOpacity>
            </MotiView>
          );
        })}

        {!showMoreDietary && (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 350 }}
          >
            <HapticTouchableOpacity
              onPress={() => setShowMoreDietary(true)}
              className="mb-3 p-4 rounded-xl flex-row items-center justify-center"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-down" size={18} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} />
              <Text className="text-base font-medium ml-2" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                More options
              </Text>
            </HapticTouchableOpacity>
          </MotiView>
        )}
      </ScrollView>
    );
  };

  // ════════════════════════════════════════
  // Screen 3: Goal
  // ════════════════════════════════════════

  const renderGoal = () => (
    <ScrollView className="flex-1 px-6 py-6" keyboardShouldPersistTaps="handled">
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 0 }}
      >
        <View className="items-center mb-4">
          <AnimatedSazon expression="chef-kiss" size="small" />
        </View>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 50 }}
      >
        <Text className="text-2xl font-bold mb-2 text-center" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
          What's your goal?
        </Text>
        <Text className="text-base mb-8 text-center" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
          We'll tailor recipes to match
        </Text>
      </MotiView>

      {SIMPLE_GOALS.map((goal, index) => {
        const isSelected = data.fitnessGoal === goal.value;
        const goalColor = goal.value === 'lose_weight' ? '#DC2626'
          : goal.value === 'maintain' ? '#10B981'
          : '#8B5CF6';

        return (
          <MotiView
            key={goal.value}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 100 + index * 50 }}
          >
            <HapticTouchableOpacity
              onPress={() => setData({ ...data, fitnessGoal: goal.value })}
              className="mb-4 p-5 rounded-2xl border-2 flex-row items-center"
              style={{
                borderColor: isSelected ? goalColor : (isDark ? DarkColors.border.light : Colors.border.light),
                backgroundColor: isSelected
                  ? (isDark ? `${goalColor}22` : `${goalColor}11`)
                  : (isDark ? '#1F2937' : '#FFFFFF'),
              }}
              activeOpacity={0.7}
            >
              <Text className="text-4xl mr-4">{goal.icon}</Text>
              <View className="flex-1">
                <Text className="text-lg font-bold mb-1" style={{
                  color: isSelected ? goalColor : (isDark ? DarkColors.text.primary : Colors.text.primary),
                }}>
                  {goal.label}
                </Text>
                <Text className="text-sm" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                  {goal.description}
                </Text>
              </View>
              {isSelected && (
                <View className="rounded-full p-1" style={{ backgroundColor: goalColor }}>
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              )}
            </HapticTouchableOpacity>
          </MotiView>
        );
      })}

      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 250 }}
      >
        <Text className="text-sm text-center px-4 mt-2" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>
          You can refine this and add more details from your Profile anytime
        </Text>
      </MotiView>
    </ScrollView>
  );

  // ── Main render ──

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-4 pb-3 border-b" style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderBottomColor: isDark ? DarkColors.border.light : Colors.border.light,
        }}>
          <View className="flex-row items-center justify-between mb-4">
            {currentStep > 0 ? (
              <HapticTouchableOpacity onPress={prevStep} style={{ padding: 4 }}>
                <Ionicons name="arrow-back" size={24} color={isDark ? DarkColors.text.secondary : Colors.text.secondary} />
              </HapticTouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}

            {/* Animated mascot reacting per step */}
            <AnimatedSazon
              expression={getMascotExpression()}
              size="tiny"
            />

            <HapticTouchableOpacity onPress={skipOnboarding} style={{ padding: 4 }}>
              <Text className="text-base font-medium" style={{ color: isDark ? DarkColors.text.tertiary : Colors.text.tertiary }}>Skip</Text>
            </HapticTouchableOpacity>
          </View>

          {/* Spring progress dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <MotiView
                key={i}
                animate={{
                  width: i === currentStep ? 20 : 6,
                  opacity: i === currentStep ? 1 : i < currentStep ? 0.6 : 0.25,
                }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i <= currentStep
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? '#4B5563' : '#D1D5DB'),
                }}
              />
            ))}
          </View>
        </View>

        {/* Content -- slides between steps */}
        <Animated.View style={[{ flex: 1 }, slideStyle]}>
          {renderStep()}
        </Animated.View>

        {/* Bottom Bar */}
        <View className="px-6 py-4 border-t" style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderTopColor: isDark ? DarkColors.border.light : Colors.border.light,
        }}>
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
  );
}
