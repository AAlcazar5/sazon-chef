// frontend/app/cooking.tsx
// Hands-free full-screen cooking mode — step-by-step with timers and ingredient checklist

import {
  View,
  Text,
  ScrollView,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import Icon from '../components/ui/Icon';
import { Icons, IconSizes } from '../constants/Icons';
import { recipeApi } from '../lib/api';
import { extractTimers } from '../utils/timerExtraction';
import CookingModeTimers, { CookingTimer } from '../components/recipe/CookingModeTimers';
import IngredientChecklist from '../components/recipe/IngredientChecklist';
import AnimatedSazon from '../components/mascot/AnimatedSazon';

// --- Types ---

interface Instruction {
  step: number;
  text: string;
}

interface Ingredient {
  text: string;
  order: number;
}

interface CookingRecipe {
  id: string;
  title: string;
  servings: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
}

// --- Helpers ---

function getTextContent(item: any): string {
  if (typeof item === 'string') return item;
  if (item?.text) return item.text;
  return String(item);
}

function sortedInstructions(instructions: any[]): Instruction[] {
  return [...instructions]
    .sort((a, b) => (a.step || 0) - (b.step || 0))
    .map((inst, index) => ({
      step: inst.step || index + 1,
      text: getTextContent(inst),
    }));
}

function uid(): string {
  return Math.random().toString(36).slice(2);
}

// --- Component ---

export default function CookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [recipe, setRecipe] = useState<CookingRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [servings, setServings] = useState(1);
  const [done, setDone] = useState(false);

  // Timer state
  const [timers, setTimers] = useState<CookingTimer[]>([]);

  // Slide animation for step transitions
  const slideAnim = useRef(new Animated.Value(0)).current;
  const stepRef = useRef(0);

  // --- Fetch Recipe ---
  useEffect(() => {
    if (!id) {
      setError('No recipe ID provided');
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        const response = await recipeApi.getRecipe(id as string);
        if (cancelled) return;
        const data = (response as any).data || response;
        const instructions = sortedInstructions(data.instructions || []);
        const ingredients: Ingredient[] = (data.ingredients || []).map((ing: any, i: number) => ({
          text: getTextContent(ing),
          order: ing.order ?? i + 1,
        }));
        setRecipe({ id: data.id, title: data.title, servings: data.servings || 4, ingredients, instructions });
        setServings(data.servings || 4);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load recipe');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // --- Keep Awake ---
  useEffect(() => {
    activateKeepAwakeAsync();
    return () => { deactivateKeepAwake(); };
  }, []);

  // --- Timer suggestions: derived from current step text, no state side-effects ---
  // Computed per-render so there's no useEffect that can run twice (Strict Mode safe).
  const stepTimerSuggestions = (() => {
    if (!recipe) return [];
    const step = recipe.instructions[currentStep];
    if (!step) return [];
    return extractTimers(step.text);
  })();

  function addTimerFromSuggestion(label: string, minutes: number) {
    // Don't add a duplicate of an identical running/paused timer
    const alreadyActive = timers.some(
      (t) => t.label === label && t.totalSeconds === minutes * 60 && !t.completed
    );
    if (alreadyActive) return;
    setTimers((prev) => [
      ...prev,
      {
        id: uid(),
        label,
        totalSeconds: minutes * 60,
        remainingSeconds: minutes * 60,
        running: true, // Auto-start when user explicitly taps
        completed: false,
      },
    ]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  // --- Step Navigation ---
  function animateStep(direction: 'next' | 'prev') {
    const toValue = direction === 'next' ? -1 : 1;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function goNext() {
    if (!recipe) return;
    if (currentStep < recipe.instructions.length - 1) {
      animateStep('next');
      setCurrentStep((s) => s + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      handleDone();
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      animateStep('prev');
      setCurrentStep((s) => s - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  // --- Swipe Gesture ---
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onEnd((event) => {
      if (event.translationX < -50) {
        goNext();
      } else if (event.translationX > 50) {
        goPrev();
      }
    })
    .runOnJS(true);

  // --- Done! ---
  async function handleDone() {
    if (!recipe || done) return;
    setDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Record cooking (non-blocking)
    recipeApi.recordCook(recipe.id).catch(() => {});
  }

  // --- Timer handlers ---
  const handleTimerTick = useCallback((timerId: string) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id !== timerId || !t.running || t.completed) return t;
        const remaining = t.remainingSeconds - 1;
        return { ...t, remainingSeconds: remaining, completed: remaining <= 0, running: remaining > 0 };
      })
    );
  }, []);

  const handleTimerToggle = useCallback((timerId: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === timerId && !t.completed ? { ...t, running: !t.running } : t))
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleTimerDismiss = useCallback((timerId: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== timerId));
  }, []);

  // --- Ingredient toggle ---
  function toggleIngredient(index: number) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  // --- Render states ---

  if (loading) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center">
        <AnimatedSazon expression="thinking" size="medium" />
        <Text className="text-gray-300 mt-4 text-base">Getting recipe ready...</Text>
      </View>
    );
  }

  if (error || !recipe) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center px-8">
        <Text className="text-6xl mb-4">😕</Text>
        <Text className="text-white text-xl font-bold mb-2">Recipe not found</Text>
        <Text className="text-gray-400 text-center mb-6">{error || 'Could not load recipe'}</Text>
        <HapticTouchableOpacity
          onPress={() => router.back()}
          className="bg-orange-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </HapticTouchableOpacity>
      </View>
    );
  }

  const instructions = recipe.instructions;
  const totalSteps = instructions.length;
  const stepProgress = totalSteps > 0 ? (currentStep + 1) / totalSteps : 0;
  const currentInstruction = instructions[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const ingredientStrings = recipe.ingredients
    .sort((a, b) => a.order - b.order)
    .map((i) => i.text);

  // --- Done screen ---
  if (done) {
    return (
      <View className="flex-1 bg-gray-950 items-center justify-center px-8">
        <AnimatedSazon expression="chef-kiss" size="large" />
        <Text className="text-white text-3xl font-bold mt-6 text-center">
          Recipe Complete!
        </Text>
        <Text className="text-gray-400 text-center mt-2 text-base">
          {recipe.title} is ready to serve. Enjoy!
        </Text>
        <HapticTouchableOpacity
          onPress={() => router.back()}
          hapticStyle="medium"
          className="mt-8 bg-orange-500 px-8 py-4 rounded-2xl"
        >
          <Text className="text-white font-bold text-lg">Back to Recipe</Text>
        </HapticTouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-950">
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

        {/* Progress bar */}
        <View className="h-1 bg-gray-800 mx-4 mt-1 rounded-full overflow-hidden">
          <Animated.View
            className="h-full bg-orange-500 rounded-full"
            style={{ width: `${stepProgress * 100}%` }}
          />
        </View>

        {/* Top bar */}
        <View className="flex-row items-center px-4 pt-3 pb-2">
          <HapticTouchableOpacity onPress={() => router.back()} hapticStyle="light" className="p-1 mr-3">
            <Icon name={Icons.ARROW_BACK} size={IconSizes.MD} color="#9CA3AF" />
          </HapticTouchableOpacity>
          <Text className="flex-1 text-gray-100 font-semibold text-base" numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text className="text-gray-400 text-sm">
            {currentStep + 1} / {totalSteps}
          </Text>
        </View>

        {/* Active timers bar */}
        {timers.length > 0 && (
          <CookingModeTimers
            timers={timers}
            onTick={handleTimerTick}
            onToggle={handleTimerToggle}
            onDismiss={handleTimerDismiss}
          />
        )}

        {/* Main content — step OR ingredients */}
        {showIngredients ? (
          <View className="flex-1">
            <IngredientChecklist
              ingredients={ingredientStrings}
              checkedIndices={checkedIngredients}
              onToggle={toggleIngredient}
              servings={servings}
              originalServings={recipe.servings}
              onServingsChange={setServings}
            />
          </View>
        ) : (
          <GestureDetector gesture={swipeGesture}>
            <Animated.View
              className="flex-1 px-6 justify-center"
              style={{
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: [-40, 0, 40],
                    }),
                  },
                ],
                opacity: slideAnim.interpolate({
                  inputRange: [-1, -0.5, 0, 0.5, 1],
                  outputRange: [0, 0.5, 1, 0.5, 0],
                }),
              }}
            >
              {/* Step label */}
              <Text className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-4">
                Step {currentStep + 1}
              </Text>

              {/* Step text — scrollable if long */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                <Text className="text-white text-2xl leading-10 font-medium">
                  {currentInstruction?.text || ''}
                </Text>

                {/* Timer suggestion buttons — tap to start */}
                {stepTimerSuggestions.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mt-4">
                    {stepTimerSuggestions.map(({ label, minutes }) => {
                      const isActive = timers.some(
                        (t) => t.label === label && t.totalSeconds === minutes * 60 && !t.completed
                      );
                      return (
                        <HapticTouchableOpacity
                          key={`${label}-${minutes}`}
                          onPress={() => addTimerFromSuggestion(label, minutes)}
                          hapticStyle="medium"
                          disabled={isActive}
                          className="flex-row items-center px-3 py-2 rounded-full border"
                          style={{
                            borderColor: isActive ? '#4B5563' : '#F97316',
                            backgroundColor: isActive ? '#1F2937' : 'rgba(249,115,22,0.15)',
                            opacity: isActive ? 0.5 : 1,
                          }}
                        >
                          <Ionicons
                            name={isActive ? 'timer' : 'timer-outline'}
                            size={14}
                            color={isActive ? '#6B7280' : '#F97316'}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: isActive ? '#6B7280' : '#F97316' }}
                          >
                            {isActive ? `${label} running` : `${label} · ${minutes} min`}
                          </Text>
                        </HapticTouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              {/* Swipe hint */}
              <Text className="text-gray-600 text-xs text-center mt-3">
                Swipe to navigate steps
              </Text>
            </Animated.View>
          </GestureDetector>
        )}

        {/* Bottom bar */}
        <View className="px-4 pb-2 gap-3">
          {/* Ingredients toggle */}
          <HapticTouchableOpacity
            onPress={() => {
              setShowIngredients((s) => !s);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            hapticStyle="light"
            className="flex-row items-center justify-center py-2.5 rounded-xl border border-gray-700"
          >
            <Ionicons
              name={showIngredients ? 'list' : 'list-outline'}
              size={18}
              color={showIngredients ? '#F97316' : '#9CA3AF'}
              style={{ marginRight: 8 }}
            />
            <Text
              className="font-semibold text-sm"
              style={{ color: showIngredients ? '#F97316' : '#9CA3AF' }}
            >
              {showIngredients ? 'Back to Steps' : `Ingredients (${ingredientStrings.length})`}
            </Text>
            {checkedIngredients.size > 0 && !showIngredients && (
              <View className="ml-2 bg-green-500 rounded-full px-1.5 py-0.5">
                <Text className="text-white text-xs font-bold">
                  {checkedIngredients.size}
                </Text>
              </View>
            )}
          </HapticTouchableOpacity>

          {/* Prev / Next */}
          {!showIngredients && (
            <View className="flex-row gap-3">
              <HapticTouchableOpacity
                onPress={goPrev}
                hapticStyle="light"
                disabled={currentStep === 0}
                className="flex-1 flex-row items-center justify-center py-3.5 rounded-xl border border-gray-700"
                style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
              >
                <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
                <Text className="text-gray-400 font-semibold ml-1">Prev</Text>
              </HapticTouchableOpacity>

              <HapticTouchableOpacity
                onPress={goNext}
                hapticStyle="medium"
                className="flex-2 flex-row items-center justify-center py-3.5 px-8 rounded-xl"
                style={{ backgroundColor: isLastStep ? '#22C55E' : '#F97316', flex: 2 }}
              >
                {isLastStep ? (
                  <>
                    <Text className="text-white font-bold text-base mr-1">I'm Done!</Text>
                    <Text className="text-xl">🎉</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-white font-bold text-base mr-1">Next</Text>
                    <Ionicons name="chevron-forward" size={20} color="white" />
                  </>
                )}
              </HapticTouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
