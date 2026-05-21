// frontend/app/cook-step.tsx
//
// Tier Y-Live-2 — kitchen-mode step player. Minimal full-screen player
// that matches Claude's Cooking Mode reference: small recipe thumb +
// title in the header, X close top-right, one big step at a time, prev
// /next + "Step X of N" footer (rendered inside CookStepCard, W-B2).
//
// Why a new route instead of refactoring app/cooking.tsx: that screen
// is 1253 LOC and carries many features (cultural primer, taste survey,
// mid-cook beat, …); ripping it apart is high-risk. The launch modal
// (Y-Live-1) navigates here; the old /cooking route stays for paths
// like build-a-plate / tonight that depend on its richer surface.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { recipeApi } from '../lib/api/recipe';
import { getAdhocRecipe } from '../lib/coach/adhocRecipeStash';
import LoadingState from '../components/ui/LoadingState';
import SazonFAB from '../components/sazon/SazonFAB';
import { GenericLoadingStates } from '../constants/LoadingStates';
import CookStepCard from '../components/cooking/CookStepCard';
import StepWithTimers from '../components/cooking/StepWithTimers';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import { useTheme } from '../contexts/ThemeContext';
import { Radius, Type } from '../constants/tokens';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useVoicePlayback } from '../hooks/useVoicePlayback';
import { handleVoiceCookCommand } from '../lib/coach/handleVoiceCookCommand';

interface PlayerRecipe {
  title: string;
  imageUrl?: string;
  steps: string[];
}

function mapResponse(res: unknown): PlayerRecipe | null {
  // apiClient.get returns AxiosResponse; recipe payload lives in .data.
  const r = (res as { data?: Record<string, unknown> } | null)?.data;
  if (!r || typeof r.title !== 'string') return null;
  const stepsRaw = (r.instructions ?? []) as Array<unknown>;
  const steps: string[] = stepsRaw
    .map((s) => {
      if (typeof s === 'string') return s;
      if (
        s &&
        typeof s === 'object' &&
        'text' in s &&
        typeof (s as { text: unknown }).text === 'string'
      ) {
        return (s as { text: string }).text;
      }
      return null;
    })
    .filter((x): x is string => x !== null);
  return {
    title: r.title,
    imageUrl: typeof r.imageUrl === 'string' ? r.imageUrl : undefined,
    steps,
  };
}

export default function CookStepScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { recipeId, adhocId } = useLocalSearchParams<{
    recipeId?: string;
    adhocId?: string;
  }>();

  const [recipe, setRecipe] = useState<PlayerRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [complete, setComplete] = useState(false);

  // Founder bug 2026-05-20 round 16: hooks were called AFTER early
  // returns below, violating React's rules-of-hooks. The hook count
  // changed between the loading render and the loaded render, which
  // surfaced as the "Can't perform a React state update on a
  // component that hasn't mounted yet" error chain via ErrorBoundary
  // → SplashScreen → errorLogger. ALL hooks must be at the top — the
  // voice hooks are unconditional now; refs carry the latest recipe
  // state into the (stable) onIntent callback.
  const { speak } = useVoicePlayback();
  const stateRef = useRef<{
    recipe: PlayerRecipe | null;
    currentStep: number;
  }>({ recipe: null, currentStep: 0 });
  stateRef.current = { recipe, currentStep };
  const voice = useVoiceInput({
    continuous: false,
    onIntent: (parsed) => {
      const { recipe: r, currentStep: cs } = stateRef.current;
      if (!r) return;
      const stepText = r.steps[cs] ?? '';
      const total = r.steps.length;
      handleVoiceCookCommand(parsed.rawText, {
        onNext: () => {
          if (cs >= total - 1) setComplete(true);
          else setCurrentStep((c) => c + 1);
        },
        onPrev: cs > 0 ? () => setCurrentStep((c) => c - 1) : undefined,
        speak,
        currentStepText: stepText,
      });
    },
  });

  useEffect(() => {
    // Ad-hoc path (AI-gen recipes): the launch modal stashed the full
    // payload before navigating. No network call needed.
    if (adhocId) {
      const stashed = getAdhocRecipe(adhocId);
      // Founder bug 2026-05-20 round 18: surface diagnostic when the
      // stash is missing OR the recipe arrived without steps — the
      // user reported "only header shows" which happens when steps[]
      // is empty (CookStepCard renders STEP 1 with nothing in it).
      if (!stashed) {
        // eslint-disable-next-line no-console
        console.warn(`[cook-step] adhocId=${adhocId} not found in stash`);
        setError("Couldn't load the recipe — try again.");
        return;
      }
      if (!stashed.steps || stashed.steps.length === 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[cook-step] adhocId=${adhocId} loaded but steps[] is empty`,
          { title: stashed.title, hasSteps: !!stashed.steps },
        );
        setError(
          'This recipe came back without step-by-step instructions — try generating it again.',
        );
        return;
      }
      setRecipe({
        title: stashed.title,
        imageUrl: stashed.imageUrls?.[0],
        steps: stashed.steps,
      });
      return;
    }
    if (!recipeId) return;
    let cancelled = false;
    recipeApi
      .getRecipe(recipeId)
      .then((res) => {
        if (cancelled) return;
        const mapped = mapResponse(res);
        if (!mapped) {
          // eslint-disable-next-line no-console
          console.warn(`[cook-step] recipeId=${recipeId} mapResponse returned null`);
          setError("Couldn't load the recipe — try again.");
          return;
        }
        if (mapped.steps.length === 0) {
          // eslint-disable-next-line no-console
          console.warn(`[cook-step] recipeId=${recipeId} backend returned no steps`);
          setError(
            'This recipe has no step-by-step instructions yet — try a different one.',
          );
          return;
        }
        setRecipe(mapped);
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn(`[cook-step] recipeId=${recipeId} fetch threw`, err);
        setError("Couldn't load the recipe — try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId, adhocId]);

  const onClose = () => router.back();

  if (!recipeId && !adhocId) {
    return (
      <View style={[styles.screen, isDark ? styles.bgDark : styles.bgLight]}>
        <Text style={[styles.fallbackText, isDark && styles.textDark]}>
          No recipe selected.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, isDark ? styles.bgDark : styles.bgLight]}>
        <View style={styles.header}>
          <HapticTouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            pressedScale={0.97}
            style={styles.closeBtn}
          >
            <Ionicons
              name="close"
              size={26}
              color={isDark ? '#FFFFFF' : '#111827'}
            />
          </HapticTouchableOpacity>
        </View>
        <Text style={[styles.fallbackText, isDark && styles.textDark]}>
          {error}
        </Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.screen, isDark ? styles.bgDark : styles.bgLight]}>
        <LoadingState config={GenericLoadingStates.pullingUpRecipe} fullScreen />
      </View>
    );
  }

  const totalSteps = recipe.steps.length;
  const stepText = recipe.steps[currentStep] ?? '';

  const onNext = () => {
    if (currentStep >= totalSteps - 1) {
      setComplete(true);
    } else {
      setCurrentStep((c) => c + 1);
    }
  };
  const onPrev = currentStep > 0 ? () => setCurrentStep((c) => c - 1) : undefined;

  const onVoicePress = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      void voice.startListening();
    }
  };

  return (
    <View style={[styles.screen, isDark ? styles.bgDark : styles.bgLight]}>
      <View style={styles.header}>
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            style={styles.thumb}
            cachePolicy="memory-disk"
          />
        ) : null}
        <Text
          style={[styles.title, isDark && styles.textDark]}
          numberOfLines={1}
        >
          {recipe.title}
        </Text>
        {/* Y-Visible-2 (founder 2026-05-21): mid-cook Sazon presence.
            Tap → opens Sazon for general chat. Long-press → seeds with
            the current step text so the user can ask "what does
            'fold gently' actually mean?" without losing context. */}
        <SazonFAB
          accessibilityLabel="Talk to Sazon about this step"
          getContextSeed={() =>
            stepText
              ? `I'm on this step: "${stepText}". `
              : null
          }
        />
        <HapticTouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          pressedScale={0.97}
          style={styles.closeBtn}
        >
          <Ionicons
            name="close"
            size={26}
            color={isDark ? '#FFFFFF' : '#111827'}
          />
        </HapticTouchableOpacity>
      </View>
      <View style={styles.cardWrap}>
        <CookStepCard
          stepNumber={currentStep + 1}
          totalSteps={totalSteps}
          text={stepText}
          recipeTitle={recipe.title}
          complete={complete}
          isListening={voice.isListening}
          onVoicePress={onVoicePress}
          onNext={onNext}
          onPrev={onPrev}
          // Y-Live-3 — durations in step prose become tappable inline
          // timer chips; temps/sizes stay plain by construction.
          renderStep={(t) => <StepWithTimers text={t} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Founder bug 2026-05-20 round 20: `flex: 1` alone was collapsing
  // the screen to its content height (only the header showed; the
  // coach behind was visible through the gap below). The Stack
  // screen container apparently isn't propagating definite bounds
  // to its children here. Explicit window-height + width forces the
  // screen to own the full viewport regardless of parent sizing.
  screen: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  bgLight: { backgroundColor: '#FFFFFF' },
  bgDark: { backgroundColor: '#1A1A1A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  thumb: { width: 32, height: 32, borderRadius: Radius.card },
  title: { ...Type.label, flex: 1, color: '#111827' },
  textDark: { color: '#F9FAFB' },
  closeBtn: { padding: 6 },
  cardWrap: { flex: 1, justifyContent: 'center' },
  fallbackText: {
    ...Type.body,
    color: '#111827',
    textAlign: 'center',
    marginTop: 80,
  },
});
