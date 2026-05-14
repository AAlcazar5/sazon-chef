// frontend/app/cooking.tsx
// Hands-free full-screen cooking mode — step-by-step with timers and ingredient checklist

import {
  View,
  Text,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
  Share,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import BrandButton from '../components/ui/BrandButton';
import { Brand } from '../constants/tokens';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import Icon from '../components/ui/Icon';
import { Icons, IconSizes } from '../constants/Icons';
import { recipeApi, culturalPrimerApi, firstCookStatsApi, discoveryMilestonesApi, cookCompleteSignalsApi, type CulturalPrimerPayload, type FirstCookStatsPayload, type CookCompleteSignalsPayload } from '../lib/api';
import CulturalPrimerModal from '../components/recipe/CulturalPrimerModal';
import FirstCuisineStamp from '../components/celebrations/FirstCuisineStamp';
import DiscoveryMilestoneInline from '../components/celebrations/DiscoveryMilestoneInline';
import PostCookRating from '../components/cooking/PostCookRating';
import DailyCheckIn from '../components/today/DailyCheckIn';
import { useDailyCheckInGate } from '../hooks/useDailyCheckInGate';
import CookCompleteCelebration from '../components/cooking/CookCompleteCelebration';
import CookRecapLine from '../components/cooking/CookRecapLine';
import MidCookBeat from '../components/cooking/MidCookBeat';
import DailyPlateShareCard from '../components/celebrations/DailyPlateShareCard';
import { deriveTopMinerals, deriveIngredientCount } from '../utils/cookCompleteDerivations';
import { matchAppliancesMilestoneFromList } from '../utils/discoveryMilestoneKeys';
import { extractTimers } from '../utils/timerExtraction';
import CookingModeTimers, { CookingTimer } from '../components/recipe/CookingModeTimers';
import IngredientChecklist from '../components/recipe/IngredientChecklist';
import AnimatedLottieMascot from '../components/mascot/AnimatedLottieMascot';
import { CoffeeBanner, shouldShowCoffeeBanner, recordCoffeeBannerShown } from '../components/premium/CoffeeBanner';
import { CelebrationOverlay } from '../components/celebrations';
import ShareCardCapture from '../components/celebrations/ShareCardCapture';
import { LinearGradient } from 'expo-linear-gradient';
import { HapticChoreography } from '../utils/hapticChoreography';
import { mealPlanApi } from '../lib/api';
import TasteSurveySheet from '../components/recipe/TasteSurveySheet';
import ConsumeIngredientsSheet from '../components/cooking/ConsumeIngredientsSheet';
import LeftoverIdeasSheet from '../components/cooking/LeftoverIdeasSheet';
import TechniqueTip from '../components/cooking/TechniqueTip';
import FoodIntelCookingTip from '../components/cooking/FoodIntelCookingTip';
import { detectTechniques } from '../lib/cookingTechniques';
import { useVoicePlayback, } from '../hooks/useVoicePlayback';

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
  imageUrl?: string;
  cookTime?: number;
  calories?: number;
  protein?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  /** JSON-stringified array of equipment names (e.g. ["Ninja Creami","oven"]). */
  equipmentNeeded?: string;
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
  const { id, mealId: mealIdParam } = useLocalSearchParams<{ id: string; mealId?: string }>();

  const [recipe, setRecipe] = useState<CookingRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // P2 retention — mid-cook delight beat (1 random surprise per cook).
  const [midCookBeatVisible, setMidCookBeatVisible] = useState(false);
  const midCookBeatFiredRef = useRef(false);
  const midCookBeatStepRef = useRef<number | null>(null);
  // 10I: techniques the user has already opened this session → don't re-prompt
  const [seenTechniques, setSeenTechniques] = useState<Set<string>>(new Set());
  const [showIngredients, setShowIngredients] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [servings, setServings] = useState(1);
  const [done, setDone] = useState(false);
  // ROADMAP 4.0 Tier C7 — daily check-in gate (once per local day, surfaced
  // here on the cook-complete screen rather than the Kitchen tab).
  const dailyCheckInGate = useDailyCheckInGate();
  const [stepCheckVisible, setStepCheckVisible] = useState(false);

  // Timer state
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const [showCoffeeBanner, setShowCoffeeBanner] = useState(false);

  // Taste survey state
  const [resolvedMealId, setResolvedMealId] = useState<string | null>(mealIdParam || null);
  const [showTasteSurvey, setShowTasteSurvey] = useState(false);
  const [showConsumeSheet, setShowConsumeSheet] = useState(false);
  const [showLeftoverSheet, setShowLeftoverSheet] = useState(false);
  // ROADMAP 4.0 C10 — first-cook cultural primer modal
  const [culturalPrimer, setCulturalPrimer] = useState<CulturalPrimerPayload['primer']>(null);
  const [firstCookStats, setFirstCookStats] = useState<FirstCookStatsPayload | null>(null);
  // ROADMAP 4.0 J5 — discovery milestone celebration (single-fire)
  const [discoveryMilestone, setDiscoveryMilestone] = useState<string | null>(null);
  // ROADMAP 4.0 J14 + J16 — cook-complete signals (intensity tier + recap insight)
  const [cookCompleteSignals, setCookCompleteSignals] = useState<CookCompleteSignalsPayload | null>(null);

  // Voice mode state
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const voice = useVoicePlayback();

  // Track elapsed cooking time
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [nextMealName, setNextMealName] = useState<string | null>(null);

  // Quick note state
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Share card
  const shareCardRef = useRef<ViewShot>(null);
  const [userPhotoUri, setUserPhotoUri] = useState<string | null>(null);

  // Hide tab bar while cooking for full immersion
  const navigation = useNavigation();
  useEffect(() => {
    const parent = navigation.getParent?.();
    parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
    return () => {
      parent?.setOptions?.({ tabBarStyle: undefined });
    };
  }, [navigation]);

  // Step scale animation for spring entrance
  const stepScale = useSharedValue(1);

  // Slide animation for step transitions (-1 = off-screen left, 1 = right)
  const slideAnim = useSharedValue(0);
  const stepRef = useRef(0);

  const stepCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(slideAnim.value, [-1, 0, 1], [-40, 0, 40], Extrapolation.CLAMP) },
      { scale: stepScale.value },
    ],
    opacity: interpolate(slideAnim.value, [-1, -0.5, 0, 0.5, 1], [0, 0.5, 1, 0.5, 0], Extrapolation.CLAMP),
  }));

  const bumpStep = useCallback((delta: number) => {
    setCurrentStep((s) => s + delta);
  }, []);

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
        setRecipe({ id: data.id, title: data.title, servings: data.servings || 4, ingredients, instructions, imageUrl: data.imageUrl, cookTime: data.cookTime, calories: data.calories, protein: data.protein, cuisine: data.cuisine, equipmentNeeded: data.equipmentNeeded });
        setServings(data.servings || 4);
        setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Couldn\'t load this recipe');
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

  // Voice mode: speak the current step when it changes
  useEffect(() => {
    if (!voiceMode || !recipe) return;
    const step = recipe.instructions[currentStep];
    const text = typeof step === 'string' ? step : step?.text;
    if (!text) return;
    voice.speak(`Step ${currentStep + 1}. ${text}`);
  }, [voiceMode, currentStep, recipe]);

  // Sync rate changes to playback
  useEffect(() => {
    voice.setRate(voiceRate);
  }, [voiceRate]);

  // Stop when voice mode is turned off
  useEffect(() => {
    if (!voiceMode) voice.stop();
  }, [voiceMode]);

  // P2 retention — pick a random mid-recipe step to fire the delight beat at.
  // Runs once per cook when the recipe loads.
  useEffect(() => {
    if (!recipe) return;
    const total = recipe.instructions.length;
    if (total < 3) return; // tiny recipes don't need mid-beats
    if (midCookBeatStepRef.current !== null) return;
    const minStep = 1;
    const maxStep = Math.max(minStep + 1, total - 2);
    midCookBeatStepRef.current =
      minStep + Math.floor(Math.random() * (maxStep - minStep + 1));
  }, [recipe]);

  // Fire the beat the first time currentStep crosses the trigger.
  useEffect(() => {
    if (midCookBeatFiredRef.current) return;
    if (midCookBeatStepRef.current === null) return;
    if (currentStep < midCookBeatStepRef.current) return;
    midCookBeatFiredRef.current = true;
    setMidCookBeatVisible(true);
    const hideTimer = setTimeout(() => setMidCookBeatVisible(false), 2400);
    return () => clearTimeout(hideTimer);
  }, [currentStep]);

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
  // Cross-fade: slide current content out, swap step at the midpoint, slide
  // new content in from the opposite side. State change driven from JS
  // (setTimeout) so the swap doesn't depend on the worklet completion
  // callback firing under test runners.
  const transitionStep = useCallback((direction: 1 | -1) => {
    slideAnim.value = withTiming(-direction, { duration: 120 });
    stepScale.value = withSequence(
      withTiming(0.95, { duration: 120 }),
      withSpring(1, { damping: 12, stiffness: 100 }),
    );
    setTimeout(() => {
      bumpStep(direction);
      slideAnim.value = direction;
      slideAnim.value = withSpring(0, { damping: 14, stiffness: 200 });
    }, 120);
  }, [bumpStep, slideAnim, stepScale]);

  function goNext() {
    if (!recipe) return;
    if (currentStep < recipe.instructions.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStepCheckVisible(true);
      setTimeout(() => setStepCheckVisible(false), 400);
      transitionStep(1);
    } else {
      handleDone();
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      transitionStep(-1);
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
    setElapsedSeconds(Math.round((Date.now() - startTimeRef.current) / 1000));
    setDone(true);
    HapticChoreography.cookingComplete();

    // Record cooking (non-blocking)
    recipeApi.recordCook(recipe.id).catch(() => {});

    // ROADMAP 4.0 J5 — first-appliance milestone (single-fire per appliance)
    if (recipe.equipmentNeeded) {
      try {
        const list = JSON.parse(recipe.equipmentNeeded);
        const applianceList: string[] = Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
        const milestoneKey = matchAppliancesMilestoneFromList(applianceList);
        if (milestoneKey) {
          discoveryMilestonesApi
            .mark(milestoneKey)
            .then((res) => {
              const payload = (res?.data ?? res) as { newlyAchieved?: boolean } | undefined;
              if (payload?.newlyAchieved) {
                setDiscoveryMilestone(milestoneKey);
              }
            })
            .catch(() => undefined);
        }
      } catch {
        // best-effort — never block cook completion on milestone parse error
      }
    }

    // Prompt user to mark ingredients as consumed from pantry (opt-in, non-silent)
    setShowConsumeSheet(true);

    // 10H: offer leftover-transformer recipes (silent if none found)
    setShowLeftoverSheet(true);

    // Fetch next meal from today's plan + resolve mealId for taste survey (non-blocking)
    mealPlanApi.getWeeklyPlan().then((res: any) => {
      const days = res?.data?.days || res?.data?.data?.days || [];
      if (Array.isArray(days)) {
        const today = new Date().toISOString().split('T')[0];
        const todayPlan = days.find((d: any) => d.date === today);
        const meals = todayPlan?.meals || [];
        const next = meals.find((m: any) => !m.completed && m.recipe?.title !== recipe.title);
        if (next?.recipe?.title) setNextMealName(next.recipe.title);

        // Resolve mealId for taste survey if not passed as param
        if (!resolvedMealId) {
          const matchingMeal = meals.find((m: any) => m.recipeId === recipe.id || m.recipe?.id === recipe.id);
          if (matchingMeal?.id) setResolvedMealId(matchingMeal.id);
        }
      }
    }).catch(() => {});

    // Conditionally show coffee banner (7-day cooldown, free users only)
    shouldShowCoffeeBanner().then((show) => {
      if (show) {
        setShowCoffeeBanner(true);
        recordCoffeeBannerShown();
      }
    }).catch(() => {});

    // ROADMAP 4.0 C10 — first-cook cultural primer (silent if not first cook
    // OR cuisine has no primer in the library)
    if (recipe.cuisine) {
      culturalPrimerApi
        .check(recipe.cuisine)
        .then((res) => {
          const payload = res.data as CulturalPrimerPayload | undefined;
          if (payload?.shouldShow && payload.primer) {
            setCulturalPrimer(payload.primer);
          }
        })
        .catch(() => {});

      // ROADMAP 4.0 J2 — first-cook-of-cuisine passport stamp inside the celebration overlay
      firstCookStatsApi
        .get(recipe.cuisine)
        .then((res) => {
          const payload = (res.data ?? res) as FirstCookStatsPayload | undefined;
          if (payload?.isFirstCook) {
            setFirstCookStats(payload);
          }
        })
        .catch(() => {});

      // ROADMAP 4.0 J14 + J16 — cook-complete signals (intensity tier + recap insight)
      cookCompleteSignalsApi
        .get({ cuisine: recipe.cuisine, recipeId: recipe.id })
        .then((res) => {
          const payload = (res.data ?? res) as CookCompleteSignalsPayload | undefined;
          if (payload) setCookCompleteSignals(payload);
        })
        .catch(() => {});
    }
  }

  // --- Quick Note Save ---
  const handleSaveNote = useCallback(async () => {
    if (!recipe || !noteText.trim()) return;
    const timestamp = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const entry = `[${timestamp}] ${noteText.trim()}`;

    try {
      // Fetch existing notes so we append
      const res = await recipeApi.getSavedMeta(recipe.id);
      const existing = res.data?.notes || '';
      const updated = existing ? `${existing}\n${entry}` : entry;
      await recipeApi.updateSavedMeta(recipe.id, { notes: updated });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Best-effort — don't block cooking
    }
    setNoteText('');
    setShowNoteInput(false);
  }, [recipe, noteText]);

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
        <AnimatedLottieMascot expression="thinking" size="medium" />
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
        <BrandButton
          label="Go Back"
          onPress={() => router.back()}
          variant="brand"
        />
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
    const elapsedMin = Math.floor(elapsedSeconds / 60);
    const elapsedSec = elapsedSeconds % 60;
    const timeLabel = elapsedMin > 0
      ? `${elapsedMin}m ${elapsedSec}s`
      : `${elapsedSeconds}s`;

    const difficultyLabel = recipe.difficulty
      ? recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)
      : 'Medium';
    const cookingStats = [
      { value: timeLabel, label: 'Cook Time', color: '#1D4ED8', bgColor: '#E3F2FD' },
      { value: `${totalSteps}/${totalSteps}`, label: 'Steps', color: '#15803D', bgColor: '#E8F5E9' },
      { value: `${recipe.calories}`, label: 'Calories', color: '#9A3412', bgColor: '#FFF3E0' },
      { value: difficultyLabel, label: 'Difficulty', color: '#6D28D9', bgColor: '#F3E5F5' },
    ];

    const nextMealCTA = nextMealName
      ? { label: `Next: ${nextMealName}`, onPress: () => router.replace('/(tabs)/meal-plan' as any) }
      : undefined;

    return (
      <View className="flex-1 bg-gray-950">
        <CelebrationOverlay
          visible={true}
          title="You nailed it!"
          subtitle={`${recipe.title} is ready to serve. Enjoy!`}
          expression="chef-kiss"
          stats={cookingStats}
          primaryCTA={nextMealCTA || {
            label: 'Back to Recipe',
            onPress: () => router.back(),
          }}
          secondaryCTA={nextMealCTA ? {
            label: 'Back to Recipe',
            onPress: () => router.back(),
          } : undefined}
        >
          {/* ROADMAP 4.0 J16 — auto-generated cook recap line (above all celebrations).
              Pulled from cookCompleteSignals; renders nothing when null. */}
          <CookRecapLine insight={cookCompleteSignals?.recapInsight ?? null} />

          {/* ROADMAP 4.0 J14 — variable-reward cook-complete intensity tier.
              Defaults to 'quiet' until signals load to keep the celebration
              calm rather than blanking out. */}
          <CookCompleteCelebration
            tier={cookCompleteSignals?.intensity ?? 'quiet'}
            recipeTitle={recipe.title}
            onSharePress={async () => {
              try {
                if (shareCardRef.current?.capture) {
                  const uri = await shareCardRef.current.capture();
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                      mimeType: 'image/png',
                      dialogTitle: 'Send today\'s plate to a friend',
                    });
                    return;
                  }
                }
                await Share.share({
                  message: `🌶️ Just cooked ${recipe.title} with Sazon Chef!\n\n⏱️ Cook Time: ${recipe.cookTime} min\n🔥 ${recipe.calories} cal | 🥩 ${recipe.protein}g protein`,
                });
              } catch {}
            }}
          />

          {/* ROADMAP 4.0 J2 — first-cook-of-cuisine passport stamp */}
          {firstCookStats && recipe.cuisine && (
            <FirstCuisineStamp
              isFirstCook={firstCookStats.isFirstCook}
              cuisine={recipe.cuisine}
              cuisinesCookedCount={firstCookStats.cuisinesCookedCount}
              totalCuisinesAvailable={firstCookStats.totalCuisinesAvailable}
              onPress={() => router.push('/(tabs)/cookbook?view=journey' as any)}
            />
          )}

          {/* ROADMAP 4.0 J5 — single-fire discovery milestone (photo / appliance) */}
          <DiscoveryMilestoneInline milestoneKey={discoveryMilestone} />

          {/* ROADMAP 4.0 Tier C7 — Daily check-in. Anchored to the post-cook
              moment (was on the Kitchen tab where the prompt felt random).
              The gate hook persists today's-shown date so it doesn't repeat
              on subsequent cooks the same day. */}
          {dailyCheckInGate.shouldShow === true && (
            <DailyCheckIn
              visible={true}
              onClose={() => { void dailyCheckInGate.dismiss(); }}
            />
          )}

          {/* ROADMAP 4.0 J9 — post-cook 5-star bloom; submits taste feedback if mealId resolved */}
          <PostCookRating
            onSubmit={({ stars }) => {
              if (resolvedMealId) {
                mealPlanApi
                  .submitTasteFeedback(resolvedMealId, { tasteRating: stars, flavorTags: [] })
                  .catch(() => undefined);
              }
            }}
          />

          {/* Photo + Share row */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 12 }}>
            {/* Add a photo of your dish */}
            <HapticTouchableOpacity
              onPress={async () => {
                try {
                  const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setUserPhotoUri(result.assets[0].uri);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    // ROADMAP 4.0 J5 — first-photo discovery milestone
                    discoveryMilestonesApi
                      .mark('first-photo')
                      .then((res) => {
                        const payload = (res?.data ?? res) as { newlyAchieved?: boolean } | undefined;
                        if (payload?.newlyAchieved) {
                          setDiscoveryMilestone('first-photo');
                        }
                      })
                      .catch(() => undefined);
                  }
                } catch {
                  // Camera permission denied or unavailable — skip silently
                }
              }}
              hapticStyle="light"
              accessibilityRole="button"
              accessibilityLabel={userPhotoUri ? 'Retake photo of dish' : 'Add a photo of your dish'}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, marginRight: 6 }}>📸</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                {userPhotoUri ? 'Retake' : 'Add Photo'}
              </Text>
            </HapticTouchableOpacity>

            {/* Share My Creation — branded card */}
            <HapticTouchableOpacity
              onPress={async () => {
                try {
                  if (shareCardRef.current?.capture) {
                    const uri = await shareCardRef.current.capture();
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your creation' });
                    } else {
                      // Fallback to text share
                      await Share.share({
                        message: `🌶️ Just cooked ${recipe.title} with Sazon Chef!\n\n⏱️ Cook Time: ${recipe.cookTime} min\n🔥 ${recipe.calories} cal | 🥩 ${recipe.protein}g protein\n\n🌶️ Discover amazing recipes with Sazon Chef!`,
                      });
                    }
                  } else {
                    await Share.share({
                      message: `🌶️ Just cooked ${recipe.title} with Sazon Chef!\n\n⏱️ Cook Time: ${recipe.cookTime} min\n🔥 ${recipe.calories} cal | 🥩 ${recipe.protein}g protein\n\n🌶️ Discover amazing recipes with Sazon Chef!`,
                    });
                  }
                } catch {}
              }}
              hapticStyle="light"
              accessibilityRole="button"
              accessibilityLabel="Share your creation"
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, marginRight: 6 }}>📤</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>Share</Text>
            </HapticTouchableOpacity>
          </View>

          {/* ROADMAP 4.0 J15 — share-able discovery rings card. Anonymous-by-default
              (no first-name passed) for v1; identity toggle on the card flips state
              locally. v1 sources from the current recipe — full "today's plate"
              aggregation lands when the daily-plate roll-up endpoint exists. */}
          <DailyPlateShareCard
            ingredientCount={deriveIngredientCount(recipe)}
            topMinerals={deriveTopMinerals(recipe)}
            dishNames={[recipe.title]}
          />

          {/* Off-screen share card for capture */}
          <ShareCardCapture
            ref={shareCardRef}
            title={recipe.title}
            imageUrl={recipe.imageUrl}
            cookTime={recipe.cookTime}
            calories={recipe.calories}
            protein={recipe.protein}
            userPhotoUri={userPhotoUri ?? undefined}
          />
        </CelebrationOverlay>

        {/* Rate this meal — shows after celebration */}
        {resolvedMealId && !showTasteSurvey && (
          <View style={{ position: 'absolute', bottom: 100, alignSelf: 'center' }}>
            <HapticTouchableOpacity
              onPress={() => setShowTasteSurvey(true)}
              hapticStyle="light"
              accessibilityLabel="How was it?"
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, marginRight: 6 }}>💬</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>How was it?</Text>
            </HapticTouchableOpacity>
          </View>
        )}

        <TasteSurveySheet
          visible={showTasteSurvey}
          mealId={resolvedMealId}
          isDark={true}
          onClose={() => setShowTasteSurvey(false)}
        />

        <ConsumeIngredientsSheet
          visible={showConsumeSheet}
          ingredients={recipe.ingredients.map((ing) => ing.text)}
          onClose={() => setShowConsumeSheet(false)}
        />

        <LeftoverIdeasSheet
          visible={showLeftoverSheet}
          ingredients={recipe.ingredients.map((ing) => ing.text)}
          excludeRecipeId={recipe.id}
          excludeCuisine={recipe.cuisine}
          onClose={() => setShowLeftoverSheet(false)}
          onSelectRecipe={(recipeId) => {
            // ROADMAP 4.0 J5 — first-leftover discovery milestone
            discoveryMilestonesApi
              .mark('first-leftover')
              .then((res) => {
                const payload = (res?.data ?? res) as { newlyAchieved?: boolean } | undefined;
                if (payload?.newlyAchieved) {
                  setDiscoveryMilestone('first-leftover');
                }
              })
              .catch(() => undefined);
            router.push(`/recipe/${recipeId}` as any);
          }}
        />

        <CoffeeBanner
          visible={showCoffeeBanner}
          onDismiss={() => setShowCoffeeBanner(false)}
        />

        {/* ROADMAP 4.0 C10 — first-cook cultural primer */}
        <CulturalPrimerModal
          visible={culturalPrimer !== null}
          primer={culturalPrimer}
          onDismiss={() => setCulturalPrimer(null)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Subtle dark gradient to reduce eye strain during cooking */}
      <LinearGradient
        colors={['#0A0A0F', '#111118', '#0D0D14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>

        {/* P2 retention — mid-cook delight beat (1 random surprise per cook). */}
        <MidCookBeat visible={midCookBeatVisible} />

        {/* Progress bar */}
        <View className="h-1 bg-gray-800 mx-4 mt-1 rounded-full overflow-hidden">
          <Animated.View
            className="h-full bg-orange-500 rounded-full"
            style={{ width: `${stepProgress * 100}%` }}
          />
        </View>

        {/* Top bar */}
        <View className="flex-row items-center px-4 pt-3 pb-2">
          <HapticTouchableOpacity
            onPress={() => router.back()}
            hapticStyle="light"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="p-1 mr-3"
          >
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
              style={stepCardAnimatedStyle}
            >
              {/* Step completion checkmark flash */}
              {stepCheckVisible && (
                <View style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  alignItems: 'center', justifyContent: 'center', zIndex: 10,
                }}>
                  <View style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: 'rgba(34,197,94,0.2)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
                  </View>
                </View>
              )}

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

                {/* 10I: Technique tips — collapsible "What's this?" for new techniques */}
                {currentInstruction?.text &&
                  detectTechniques(currentInstruction.text, seenTechniques).map((technique) => (
                    <TechniqueTip
                      key={technique.id}
                      testID={`technique-tip-${technique.id}`}
                      term={technique.term}
                      explanation={technique.explanation}
                      onOpen={() =>
                        setSeenTechniques((prev) => {
                          const next = new Set(prev);
                          next.add(technique.id);
                          return next;
                        })
                      }
                    />
                  ))}

                {/* 10R Surface 2: Step-adjacent Food Intel tip (max 1 per session) */}
                {currentInstruction?.text && (
                  <FoodIntelCookingTip
                    testID="food-intel-cooking-tip"
                    stepText={currentInstruction.text}
                    stepIndex={currentStep}
                    sessionId={`${recipe.id}::${startTimeRef.current}`}
                  />
                )}

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
                          accessibilityRole="button"
                          accessibilityLabel={isActive ? `${label} timer running` : `Start ${label} timer for ${minutes} minutes`}
                          accessibilityState={{ disabled: isActive }}
                          className="flex-row items-center px-3 py-2 rounded-full border"
                          style={{
                            borderColor: isActive ? '#4B5563' : Brand.light.base,
                            backgroundColor: isActive ? '#1F2937' : 'rgba(249,115,22,0.15)',
                            opacity: isActive ? 0.5 : 1,
                          }}
                        >
                          <Ionicons
                            name={isActive ? 'timer' : 'timer-outline'}
                            size={14}
                            color={isActive ? '#6B7280' : Brand.light.base}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: isActive ? '#6B7280' : Brand.light.base }}
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
          {/* Quick Note Input Overlay */}
          {showNoteInput && (
            <View className="rounded-xl border border-amber-500/30 p-3 mb-2" style={{ backgroundColor: 'rgba(251,191,36,0.08)' }}>
              <TextInput
                placeholder="Jot down a quick note…"
                placeholderTextColor="#9CA3AF"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                maxLength={200}
                autoFocus
                className="text-sm text-white mb-2"
                style={{ minHeight: 40, maxHeight: 80 }}
              />
              <View className="flex-row justify-end gap-3">
                <HapticTouchableOpacity
                  onPress={() => { setShowNoteInput(false); setNoteText(''); }}
                  hapticStyle="light"
                  accessibilityLabel="Cancel note"
                >
                  <Text className="text-gray-400 text-sm font-medium">Cancel</Text>
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={handleSaveNote}
                  hapticStyle="medium"
                  accessibilityLabel="Save note"
                  disabled={!noteText.trim()}
                  style={{ opacity: noteText.trim() ? 1 : 0.4 }}
                >
                  <Text className="text-amber-400 text-sm font-semibold">Save</Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          )}

          {/* Add Note + Ingredients row */}
          <View className="flex-row gap-2">
            <HapticTouchableOpacity
              onPress={() => setShowNoteInput((s) => !s)}
              hapticStyle="light"
              accessibilityLabel="Add note"
              className="flex-row items-center justify-center py-2.5 px-3 rounded-xl "
            >
              <Ionicons name="document-text-outline" size={16} color="#FBBF24" />
              <Text className="text-amber-400 font-semibold text-xs ml-1.5">Note</Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              onPress={() => {
                setVoiceMode((v) => !v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              hapticStyle="light"
              accessibilityLabel={voiceMode ? 'Turn off voice mode' : 'Turn on voice mode — reads steps aloud'}
              accessibilityState={{ selected: voiceMode }}
              className="flex-row items-center justify-center py-2.5 px-3 rounded-xl border"
              style={{
                borderColor: voiceMode ? '#2563EB' : '#374151',
                backgroundColor: voiceMode ? 'rgba(37,99,235,0.12)' : 'transparent',
              }}
            >
              <Ionicons
                name={voiceMode ? 'volume-high' : 'volume-medium-outline'}
                size={16}
                color={voiceMode ? '#2563EB' : '#9CA3AF'}
              />
              <Text
                className="font-semibold text-xs ml-1.5"
                style={{ color: voiceMode ? '#2563EB' : '#9CA3AF' }}
              >
                {voiceMode ? 'Voice On' : 'Voice'}
              </Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              onPress={() => {
                setShowIngredients((v) => !v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              hapticStyle="light"
              accessibilityRole="button"
              accessibilityLabel={showIngredients ? 'Back to cooking steps' : `Show ingredients — ${ingredientStrings.length} total`}
              accessibilityState={{ expanded: showIngredients }}
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl "
            >
              <Ionicons
                name={showIngredients ? 'list' : 'list-outline'}
                size={18}
                color={showIngredients ? Brand.light.base : '#9CA3AF'}
                style={{ marginRight: 8 }}
              />
              <Text
                className="font-semibold text-sm"
                style={{ color: showIngredients ? Brand.light.base : '#9CA3AF' }}
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
          </View>

          {/* Voice playback controls + speed — only visible when voice mode is on */}
          {voiceMode && (
            <View style={{ paddingHorizontal: 4 }}>
              {/* Prev Step / Rewind 5s / Pause-Play */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <HapticTouchableOpacity
                  onPress={goPrev}
                  hapticStyle="light"
                  disabled={currentStep === 0}
                  accessibilityLabel="Previous step"
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(37,99,235,0.12)',
                    opacity: currentStep === 0 ? 0.3 : 1,
                  }}
                >
                  <Ionicons name="play-skip-back" size={18} color="#2563EB" />
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  onPress={() => voice.seekBack(5)}
                  hapticStyle="light"
                  disabled={voice.engine === 'system'}
                  accessibilityLabel="Rewind 5 seconds"
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(37,99,235,0.12)',
                    opacity: voice.engine === 'system' ? 0.3 : 1,
                  }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="play-back" size={16} color="#2563EB" />
                    <Text style={{ color: '#2563EB', fontSize: 8, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: -1 }}>5s</Text>
                  </View>
                </HapticTouchableOpacity>

                {voice.isLoading ? (
                  <View
                    style={{
                      width: 52, height: 52, borderRadius: 26,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: 'rgba(37,99,235,0.25)',
                    }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={22} color="#2563EB" />
                  </View>
                ) : (
                  <HapticTouchableOpacity
                    onPress={voice.isPaused ? voice.resume : voice.pause}
                    hapticStyle="medium"
                    accessibilityLabel={voice.isPaused ? 'Resume voice' : 'Pause voice'}
                    style={{
                      width: 52, height: 52, borderRadius: 26,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: '#2563EB',
                    }}
                  >
                    <Ionicons name={voice.isPaused ? 'play' : 'pause'} size={22} color="#fff" />
                  </HapticTouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: '#2563EB', fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1 }}>
                  Speed
                </Text>
                <Text style={{ color: '#2563EB', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' }}>
                  {voiceRate <= 0.6 ? 'Slow' : voiceRate >= 1.3 ? 'Fast' : 'Normal'}
                  {' '}({voiceRate.toFixed(1)}×)
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#6B7280', fontSize: 11 }}>🐢</Text>
                <View style={{ flex: 1, height: 28, justifyContent: 'center' }}>
                  <View
                    style={{ height: 4, backgroundColor: '#374151', borderRadius: 2 }}
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={(e) => {
                      const x = e.nativeEvent.locationX;
                      const width = e.nativeEvent.target;
                      // handled by touch move
                    }}
                    onLayout={(e) => {
                      // width available for gesture math
                    }}
                  />
                  {/* Use simple TouchableOpacity segments for speed presets */}
                  <View style={{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', top: -10 }}>
                    {[0.5, 0.75, 1.0, 1.5, 2.0].map((rate) => (
                      <HapticTouchableOpacity
                        key={rate}
                        onPress={() => setVoiceRate(rate)}
                        hapticStyle="light"
                        accessibilityLabel={`Set speed to ${rate}x`}
                        style={{
                          width: 28, height: 28, borderRadius: 14,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: Math.abs(voiceRate - rate) < 0.05
                            ? '#2563EB'
                            : 'rgba(37,99,235,0.15)',
                        }}
                      >
                        <Text style={{
                          fontSize: 9, fontFamily: 'PlusJakartaSans_700Bold',
                          color: Math.abs(voiceRate - rate) < 0.05 ? '#fff' : '#2563EB',
                        }}>
                          {rate}×
                        </Text>
                      </HapticTouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={{ color: '#6B7280', fontSize: 11 }}>🐇</Text>
              </View>
            </View>
          )}

          {/* Prev / Next */}
          {!showIngredients && (
            <View className="flex-row gap-3">
              <HapticTouchableOpacity
                onPress={goPrev}
                hapticStyle="light"
                disabled={currentStep === 0}
                accessibilityRole="button"
                accessibilityLabel="Previous step"
                accessibilityState={{ disabled: currentStep === 0 }}
                className="flex-1 flex-row items-center justify-center py-3.5 rounded-xl "
                style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
              >
                <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
                <Text className="text-gray-400 font-semibold ml-1">Prev</Text>
              </HapticTouchableOpacity>

              <View style={{ flex: 2 }}>
                <BrandButton
                  label={isLastStep ? "I'm Done!" : "Next"}
                  onPress={goNext}
                  variant={isLastStep ? 'sage' : 'brand'}
                  icon={isLastStep ? 'checkmark-circle' : 'chevron-forward'}
                />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
