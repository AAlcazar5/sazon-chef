// frontend/app/build-a-plate.tsx
// Group 10X Phase 1+2+5+6+8+9 — Build-a-Plate composer (P0 launch blocker).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import BrandButton from '../components/ui/BrandButton';
import ScreenGradient from '../components/ui/ScreenGradient';
import { StickyBottomBar } from '../components/ui/StickyBottomBar';
import {
  SlotRow,
  SlotPicker,
  PlatePreview,
  PermutationCarousel,
  SwapStrip,
  MacroFitButton,
  PortionStepper,
  SubstitutionBanner,
  BudgetToggle,
  CostPill,
  TechniqueChallengeBanner,
  type MacroFitState,
} from '../components/build-a-plate';
import useDailyPlateSeed from '../hooks/useDailyPlateSeed';
import useBuildAPlate, { SLOT_ORDER, REQUIRED_SLOTS } from '../hooks/useBuildAPlate';
import useFavoriteComponents, { invalidateAffinitySlot } from '../hooks/useFavoriteComponents';
import useSkillTier from '../hooks/useSkillTier';
import { useRecent7DayPlates } from '../hooks/useRecent7DayPlates';
import {
  mealComponentApi,
  composedPlateApi,
  shoppingListApi,
  leftoverInventoryApi,
  nutrientGapApi,
  type MealComponent,
  type MealComponentSlot,
  type PermutationCandidate,
  type LeftoverInventoryItem,
  type ComponentVariantResponse,
  type TrackedNutrient,
} from '../lib/api';
import type { ComponentVariant } from '../components/build-a-plate';
import { Pastel, Accent } from '../constants/Colors';
import { useTheme } from '../contexts/ThemeContext';
import { HapticPatterns } from '../constants/Haptics';

const BEGINNER_TUTORIAL_KEY = 'beginner_tutorial_seen';

const SLOT_META: Record<MealComponentSlot, { label: string; emoji: string }> = {
  protein: { label: 'Protein', emoji: '🥩' },
  base: { label: 'Base', emoji: '🍚' },
  vegetable: { label: 'Vegetables', emoji: '🥬' },
  sauce: { label: 'Sauce', emoji: '🥣' },
  garnish: { label: 'Garnish', emoji: '🌿' },
};

export default function BuildAPlateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pantryOnly?: string;
    plateId?: string;
    seed?: string;
    preset?: string;
    subsCount?: string;
  }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const initialPantryOnly = params.pantryOnly === 'true';
  const plateId = typeof params.plateId === 'string' ? params.plateId : undefined;
  const isBeginnerSeed = params.seed === 'beginner';
  const presetId = typeof params.preset === 'string' ? params.preset : undefined;
  // Substitution count is provided by the deep-link route after the backend
  // has adapted the plate to the current user's pantry. The composer doesn't
  // recompute it — it just renders the banner if there's something to show.
  const subsCount = useMemo(() => {
    const raw = typeof params.subsCount === 'string' ? Number(params.subsCount) : 0;
    return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
  }, [params.subsCount]);
  const [subsBannerDismissed, setSubsBannerDismissed] = useState(false);

  const handleSwapAway = useCallback((componentId: string, slot: MealComponentSlot) => {
    mealComponentApi.swapAway(componentId).catch(() => undefined);
    invalidateAffinitySlot(slot);
  }, []);

  const composer = useBuildAPlate({ pantryOnly: initialPantryOnly, onSwapAway: handleSwapAway });
  const [showGarnish, setShowGarnish] = useState<boolean>(false);
  const [pickerSlot, setPickerSlot] = useState<MealComponentSlot | null>(null);
  const [poolBySlot, setPoolBySlot] = useState<Partial<Record<MealComponentSlot, MealComponent[]>>>({});
  const [loadingSlot, setLoadingSlot] = useState<MealComponentSlot | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [showBeginnerTutorial, setShowBeginnerTutorial] = useState<boolean>(false);
  const beginnerInitialized = useRef(false);
  const presetInitialized = useRef(false);

  const skillTier = useSkillTier();
  const weeklyPlates = useRecent7DayPlates();
  const [macroFitState, setMacroFitState] = useState<MacroFitState>('idle');
  const [budgetMode, setBudgetMode] = useState<boolean>(false);
  const [leftoversBySlot, setLeftoversBySlot] = useState<Partial<Record<MealComponentSlot, LeftoverInventoryItem[]>>>({});
  const [variantsByComponent, setVariantsByComponent] = useState<Record<string, ComponentVariant[]>>({});
  // Track which componentIds we've already fetched variants for, without
  // putting `variantsByComponent` in the handleOpenPicker dep array (which
  // would re-create the callback on every variant fetch and re-render every
  // downstream consumer).
  const fetchedVariantIds = useRef<Set<string>>(new Set());
  const [topNutrientGap, setTopNutrientGap] = useState<TrackedNutrient | null>(null);

  const loadSlot = useCallback(async (slot: MealComponentSlot) => {
    if (poolBySlot[slot]) return poolBySlot[slot]!;
    setLoadingSlot(slot);
    try {
      const res = await mealComponentApi.list({ slot });
      const list = (res.data?.components ?? []) as MealComponent[];
      setPoolBySlot((prev) => ({ ...prev, [slot]: list }));
      return list;
    } catch {
      setPoolBySlot((prev) => ({ ...prev, [slot]: [] }));
      return [];
    } finally {
      setLoadingSlot(null);
    }
  }, [poolBySlot]);

  useEffect(() => {
    void loadSlot('protein');
    void loadSlot('base');
    void loadSlot('vegetable');
    void loadSlot('sauce');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 6: leftovers fetched once on mount per slot — only renders when populated.
  useEffect(() => {
    let cancelled = false;
    async function fetchLeftovers() {
      try {
        const slots: MealComponentSlot[] = ['protein', 'base', 'vegetable', 'sauce'];
        const results = await Promise.allSettled(
          slots.map((slot) => leftoverInventoryApi.list({ slot })),
        );
        if (cancelled) return;
        const next: Partial<Record<MealComponentSlot, LeftoverInventoryItem[]>> = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            next[slots[i]] = r.value.data?.leftovers ?? [];
          }
        });
        setLeftoversBySlot(next);
      } catch {
        // Non-blocking — composer works without leftovers.
      }
    }
    void fetchLeftovers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase 9: top nutrient gap fetched once on mount.
  useEffect(() => {
    let cancelled = false;
    async function fetchGap() {
      try {
        const res = await nutrientGapApi.fetchTopGap();
        if (cancelled) return;
        setTopNutrientGap(res.data?.topGap ?? null);
      } catch {
        // Non-blocking — badges just won't render if no gap.
      }
    }
    void fetchGap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isBeginnerSeed || beginnerInitialized.current) return;
    beginnerInitialized.current = true;

    async function seedBeginner() {
      try {
        const res = await mealComponentApi.permutations({
          lockedSlots: [],
          slotsToFill: ['protein', 'base', 'vegetable', 'sauce'],
          maxResults: 1,
          prioritizePantry: true,
        });
        const perm = res.data?.permutations?.[0];
        if (perm) {
          composer.applySeed(perm);
        }
      } catch (err) {
        if (__DEV__) console.warn('[build-a-plate] beginner seed fetch failed:', err);
      }

      const seen = await AsyncStorage.getItem(BEGINNER_TUTORIAL_KEY);
      if (!seen) {
        setShowBeginnerTutorial(true);
      }
    }

    void seedBeginner();
  }, [isBeginnerSeed]);

  useEffect(() => {
    if (!presetId || presetInitialized.current) return;
    presetInitialized.current = true;

    async function applyPreset() {
      try {
        const raw = await AsyncStorage.getItem(`tonights_plate_preset:${presetId}`);
        if (!raw) return;
        const perm: PermutationCandidate = JSON.parse(raw);
        composer.applySeed(perm);
        await AsyncStorage.removeItem(`tonights_plate_preset:${presetId}`).catch(() => undefined);
      } catch {
        // Non-blocking — composer opens normally without a seed
      }
    }

    void applyPreset();
  }, [presetId]);

  const dailyPlateSeed = useDailyPlateSeed();
  const dailySeedInitialized = useRef(false);
  useEffect(() => {
    if (dailySeedInitialized.current) return;
    if (isBeginnerSeed || presetId || plateId) return;
    if (composer.selectedSlotsCount > 0) return;
    if (!dailyPlateSeed.seed) return;
    dailySeedInitialized.current = true;
    composer.applySeed(dailyPlateSeed.seed);
  }, [dailyPlateSeed.seed, isBeginnerSeed, presetId, plateId, composer.selectedSlotsCount, composer]);

  const handleDismissBeginnerTutorial = useCallback(async () => {
    setShowBeginnerTutorial(false);
    await AsyncStorage.setItem(BEGINNER_TUTORIAL_KEY, 'true');
  }, []);

  const handleApplyPermutation = useCallback((permutation: PermutationCandidate) => {
    composer.applyPermutation(permutation);
    HapticPatterns.success();
  }, [composer]);

  const handleOpenPicker = useCallback(async (slot: MealComponentSlot) => {
    await loadSlot(slot);
    setPickerSlot(slot);
    // Phase 6 — fetch variants for the currently-selected component when the
    // picker opens (chef tier renders the chip row).
    const selected = composer.selections[slot];
    if (selected && skillTier.isVariantChipsVisible && !fetchedVariantIds.current.has(selected.id)) {
      fetchedVariantIds.current.add(selected.id);
      try {
        const res = await mealComponentApi.variants(selected.id);
        const list: ComponentVariantResponse[] = res.data?.variants ?? [];
        setVariantsByComponent((prev) => ({ ...prev, [selected.id]: list }));
      } catch {
        // Non-blocking — chips just won't render.
        fetchedVariantIds.current.delete(selected.id);
        if (__DEV__) console.warn('[build-a-plate] variant fetch failed for', selected.id);
      }
    }
  }, [loadSlot, composer.selections, skillTier.isVariantChipsVisible]);

  const handleSelect = useCallback((component: MealComponent) => {
    if (!pickerSlot) return;
    composer.setSlot(pickerSlot, component);
    setPickerSlot(null);
  }, [pickerSlot, composer]);

  const handleLeftoverSelect = useCallback(
    (item: LeftoverInventoryItem) => {
      // Auto-lock the slot when picking a leftover so subsequent rolls don't
      // overwrite it — leftovers are intentional selections.
      const pool = poolBySlot[item.slot] ?? [];
      const match = pool.find((c) => c.id === item.componentId);
      if (match) {
        composer.setSlot(item.slot, match);
        if (!composer.locks[item.slot]) composer.toggleLock(item.slot);
      }
      setPickerSlot(null);
    },
    [poolBySlot, composer],
  );

  const handleVariantSelect = useCallback((_variant: ComponentVariant) => {
    // Variants represent a cook-method swap on the same component; macro
    // recompute is handled by future caloriesDeltaPerPortion wiring (Phase 6
    // backend is the source of truth). For now this keeps the chip
    // controlled and the hint banner functional.
  }, []);

  const handleLongPress = useCallback((slot: MealComponentSlot) => {
    HapticPatterns.longPress();
    composer.toggleLock(slot);
  }, [composer]);

  const handleRoll = useCallback(async () => {
    HapticPatterns.rouletteSpin();
    const slotsToLoad = REQUIRED_SLOTS.filter((s) => !poolBySlot[s]);
    const fetched = await Promise.all(slotsToLoad.map(loadSlot));
    const fresh: Partial<Record<MealComponentSlot, MealComponent[]>> = { ...poolBySlot };
    slotsToLoad.forEach((s, i) => {
      fresh[s] = fetched[i];
    });
    composer.rollUnlocked(fresh);
  }, [poolBySlot, loadSlot, composer]);

  const handleAddGarnish = useCallback(() => {
    setShowGarnish(true);
    void loadSlot('garnish');
  }, [loadSlot]);

  const buildPayload = useCallback(() => ({
    components: SLOT_ORDER
      .filter((slot) => composer.selections[slot])
      .map((slot) => ({
        slot,
        componentId: composer.selections[slot]!.id,
        portionMultiplier: 1,
      })),
  }), [composer.selections]);

  const handleSave = useCallback(async () => {
    if (composer.selectedSlotsCount === 0) return;
    setSaving(true);
    try {
      const payload = { ...buildPayload(), saveAsRecipe: true };
      const res = await composedPlateApi.save(payload);
      HapticPatterns.success();
      const recipeId = res.data?.recipe?.id ?? res.data?.plate?.recipeId;
      if (recipeId) {
        router.replace(`/recipe/${recipeId}` as any);
      } else {
        router.back();
      }
    } catch {
      HapticPatterns.error();
      Alert.alert('Hmm', 'Sazon couldn’t save your plate just yet — try again in a sec.');
    } finally {
      setSaving(false);
    }
  }, [composer.selectedSlotsCount, buildPayload, router]);

  const handleCookNow = useCallback(async () => {
    if (composer.selectedSlotsCount === 0) return;
    setSaving(true);
    try {
      const payload = { ...buildPayload(), saveAsRecipe: true };
      const res = await composedPlateApi.save(payload);
      HapticPatterns.success();
      const savedPlateId = res.data?.plate?.id;
      const recipeId = res.data?.recipe?.id ?? res.data?.plate?.recipeId;
      if (savedPlateId) {
        router.replace({ pathname: '/cook-timeline', params: { plateId: savedPlateId } } as any);
      } else if (recipeId) {
        router.replace({ pathname: '/cooking', params: { id: recipeId } } as any);
      }
    } catch {
      HapticPatterns.error();
      Alert.alert('Hmm', 'Sazon couldn’t fire up cooking mode just yet — try again.');
    } finally {
      setSaving(false);
    }
  }, [composer.selectedSlotsCount, buildPayload, router]);

  const handleAddMissing = useCallback(async () => {
    const missing = Object.values(composer.selections)
      .filter((c): c is MealComponent => Boolean(c))
      .flatMap((c) => c.pantryIngredientNames)
      .filter((name, idx, arr) => arr.indexOf(name) === idx);
    if (missing.length === 0) return;
    try {
      const lists = await shoppingListApi.getShoppingLists();
      const active = (lists.data as Array<{ id: string; isActive?: boolean }> | undefined)?.find(
        (l) => l.isActive,
      );
      const listId = active?.id ?? (await shoppingListApi.createShoppingList({})).data?.id;
      if (!listId) return;
      await Promise.all(missing.map((name) => shoppingListApi.addItem(listId, { name })));
      HapticPatterns.success();
      Alert.alert('Added!', `${missing.length} ingredient${missing.length === 1 ? '' : 's'} on your list.`);
    } catch {
      HapticPatterns.error();
    }
  }, [composer.selections]);

  const slotsFilled = useMemo(() => {
    const map: Partial<Record<MealComponentSlot, boolean>> = {};
    SLOT_ORDER.forEach((s) => { map[s] = Boolean(composer.selections[s]); });
    return map;
  }, [composer.selections]);

  // Skill-tier gating: beginner tier collapses the Sauce slot row entirely.
  const requiredSlotsForTier = useMemo<MealComponentSlot[]>(
    () => (skillTier.isSauceVisible ? REQUIRED_SLOTS : REQUIRED_SLOTS.filter((s) => s !== 'sauce')),
    [skillTier.isSauceVisible],
  );

  const visibleSlots = useMemo(
    () => (showGarnish || composer.selections.garnish ? [...requiredSlotsForTier, 'garnish' as MealComponentSlot] : requiredSlotsForTier),
    [showGarnish, composer.selections.garnish, requiredSlotsForTier],
  );

  const hasMissing = composer.totals.pantryCoveragePercent < 100 && composer.selectedSlotsCount > 0;
  // Budget-mode sort: cheapest-first when toggle is on.
  const pickerComponents = useMemo(() => {
    const base = pickerSlot ? poolBySlot[pickerSlot] ?? [] : [];
    if (!budgetMode || base.length === 0) return base;
    return [...base].sort((a, b) => {
      const aCost = a.estimatedCostPerPortion ?? Number.POSITIVE_INFINITY;
      const bCost = b.estimatedCostPerPortion ?? Number.POSITIVE_INFINITY;
      return aCost - bCost;
    });
  }, [pickerSlot, poolBySlot, budgetMode]);
  const { favoriteIds, scoresById } = useFavoriteComponents(pickerSlot);

  const handleMacroFit = useCallback(async () => {
    if (composer.selectedSlotsCount === 0) {
      Alert.alert('Pick a slot first', 'Sazon needs at least one slot to balance the rest.');
      return;
    }
    setMacroFitState('loading');
    try {
      const lockedSlots = (Object.entries(composer.selections) as [MealComponentSlot, MealComponent | undefined][])
        .filter(([slot, component]) => Boolean(component) && composer.locks[slot])
        .map(([slot, component]) => ({
          slot,
          componentId: component!.id,
          portionMultiplier: composer.multipliers[slot] ?? 1,
        }));
      const slotsToFill = requiredSlotsForTier.filter((s) => !composer.locks[s] || !composer.selections[s]);
      const target = {
        // Sane defaults — backend re-pulls the user's daily target if not provided.
        calories: Math.max(300, composer.totals.calories || 600),
        protein: Math.max(20, composer.totals.protein || 30),
      };
      const res = await composedPlateApi.autoFit({ target, lockedSlots, slotsToFill });
      const result = res.data?.result;
      if (!result || !result.achievable) {
        setMacroFitState('impossible');
        HapticPatterns.error();
        return;
      }
      composer.applyAutoFit(result.filled);
      HapticPatterns.success();
      setMacroFitState('fit');
    } catch {
      setMacroFitState('impossible');
      HapticPatterns.error();
    }
  }, [composer, requiredSlotsForTier]);

  const handleBudgetToggle = useCallback(() => {
    setBudgetMode((prev) => !prev);
  }, []);

  const handleShowOriginal = useCallback(() => {
    setSubsBannerDismissed(true);
    Alert.alert(
      'Original plate',
      "Here's the original plate your friend shared — swap back any of the substitutions if you'd like.",
    );
  }, []);

  // Reset macro-fit pulse when the plate composition changes
  useEffect(() => {
    if (macroFitState === 'fit' || macroFitState === 'impossible') {
      const timer = setTimeout(() => setMacroFitState('idle'), 4000);
      return () => clearTimeout(timer);
    }
  }, [macroFitState]);

  return (
    <ScreenGradient style={{ ...styles.root, backgroundColor: isDark ? '#0F0F10' : '#FAF7F4' }} testID="build-a-plate-screen">
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <HapticTouchableOpacity
            onPress={() => router.back()}
            hapticStyle="light"
            style={styles.headerBtn}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={isDark ? '#FFF' : '#1F2937'} />
          </HapticTouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.eyebrow, { color: isDark ? '#FFD4A6' : '#8a4a00' }]}>BUILD A</Text>
            <Text style={[styles.title, { color: isDark ? '#FFF' : '#1F2937' }]}>Plate</Text>
          </View>
          <HapticTouchableOpacity
            onPress={() => router.push('/build-a-plate-family' as any)}
            hapticStyle="light"
            style={styles.headerBtn}
            accessibilityLabel="Cook for the family — switch to multi-plate composer"
            testID="family-mode-btn"
          >
            <Ionicons name="people-outline" size={22} color={isDark ? '#FFF' : '#1F2937'} />
          </HapticTouchableOpacity>
          <HapticTouchableOpacity
            onPress={handleRoll}
            hapticStyle="medium"
            style={[styles.headerBtn, styles.rollBtn]}
            accessibilityLabel="Roll the dice — randomize unlocked slots"
            testID="roll-the-dice-btn"
          >
            <Ionicons name="dice" size={22} color="#FFFFFF" />
          </HapticTouchableOpacity>
        </View>

        <View style={styles.headerPills} testID="build-a-plate-header-pills">
          <MacroFitButton
            state={macroFitState}
            onPress={handleMacroFit}
            testID="macro-fit-btn"
          />
          <BudgetToggle
            active={budgetMode}
            onToggle={handleBudgetToggle}
            testID="budget-toggle"
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          testID="build-a-plate-scroll"
        >
          {plateId && subsCount > 0 && !subsBannerDismissed && (
            <SubstitutionBanner
              substitutionsCount={subsCount}
              onShowOriginal={handleShowOriginal}
              testID="substitution-banner"
            />
          )}

          <TechniqueChallengeBanner
            title="Caramelize the onions"
            body="Slow and low — 30 minutes turns onions into jam. A free flavor upgrade for any plate this week."
            testID="technique-banner"
          />

          <HapticTouchableOpacity
            onPress={composer.togglePantryOnly}
            hapticStyle="light"
            style={[
              styles.pantryToggle,
              composer.pantryOnly && { backgroundColor: Accent.sage },
            ]}
            testID="pantry-only-toggle"
            accessibilityLabel={`Cook with what I have, ${composer.pantryOnly ? 'on' : 'off'}`}
          >
            <Ionicons
              name="basket"
              size={16}
              color={composer.pantryOnly ? '#FFFFFF' : Accent.sage}
            />
            <Text
              style={[
                styles.pantryToggleText,
                composer.pantryOnly && { color: '#FFFFFF' },
              ]}
            >
              Cook with what I have
            </Text>
          </HapticTouchableOpacity>

          {visibleSlots.map((slot) => {
            const selected = composer.selections[slot];
            const pool = poolBySlot[slot] ?? [];
            const alternatives = selected
              ? pool.filter((c) => c.id !== selected.id)
              : [];
            const multiplier = composer.multipliers[slot] ?? 1;
            return (
              <View key={slot}>
                <SlotRow
                  slot={slot}
                  label={SLOT_META[slot].label}
                  emoji={SLOT_META[slot].emoji}
                  selected={selected}
                  locked={composer.locks[slot]}
                  onPress={() => handleOpenPicker(slot)}
                  onLongPress={() => handleLongPress(slot)}
                  testID={`slot-row-${slot}`}
                />
                {selected && (
                  <View style={styles.portionRow}>
                    <PortionStepper
                      value={multiplier}
                      onChange={(v) => composer.setMultiplier(slot, v)}
                      testID={`portion-stepper-${slot}`}
                    />
                  </View>
                )}
                {selected && alternatives.length > 0 && (
                  <SwapStrip
                    alternatives={alternatives}
                    current={selected}
                    onSwap={(componentId) => {
                      const next = pool.find((c) => c.id === componentId);
                      if (next) composer.setSlot(slot, next);
                    }}
                    testID={`swap-strip-${slot}`}
                  />
                )}
              </View>
            );
          })}

          {!showGarnish && !composer.selections.garnish && (
            <HapticTouchableOpacity
              onPress={handleAddGarnish}
              hapticStyle="light"
              style={styles.garnishCta}
              testID="add-garnish-btn"
              accessibilityLabel="Add an optional garnish"
            >
              <Ionicons name="add-circle-outline" size={18} color="#6B7280" />
              <Text style={styles.garnishText}>+ Add a garnish (optional)</Text>
            </HapticTouchableOpacity>
          )}

          <PlatePreview
            totals={composer.totals}
            slotsFilled={slotsFilled}
            testID="plate-preview"
          />

          {composer.selectedSlotsCount > 0 && composer.totals.cost > 0 && (
            <View style={styles.costRow} testID="plate-cost-row">
              <CostPill totalCost={composer.totals.cost} testID="cost-pill" />
            </View>
          )}

          {composer.selectedSlotsCount > 0 && (
            <PermutationCarousel
              lockedSlots={Object.entries(composer.locks)
                .filter(([, locked]) => locked)
                .map(([slot]) => ({
                  slot: slot as MealComponentSlot,
                  componentId: composer.selections[slot as MealComponentSlot]?.id ?? '',
                }))
                .filter((ls) => ls.componentId !== '')}
              slotsToFill={REQUIRED_SLOTS.filter((s) => !composer.locks[s])}
              onApply={handleApplyPermutation}
              testID="permutation-carousel"
            />
          )}

          <View style={{ height: 180 }} />
        </ScrollView>

        <StickyBottomBar fadeColor={isDark ? '#0F0F10' : '#FAF7F4'} testID="build-a-plate-actions">
          <BrandButton
            label="Save"
            variant="sage"
            icon="bookmark-outline"
            onPress={handleSave}
            loading={saving}
            disabled={composer.selectedSlotsCount === 0}
            style={{ flex: 1 }}
            accessibilityLabel="Save to cookbook"
            testID="save-to-cookbook-btn"
          />
          <BrandButton
            label="Cook"
            variant="brand"
            icon="flame"
            onPress={handleCookNow}
            loading={saving}
            disabled={composer.selectedSlotsCount === 0}
            style={{ flex: 1 }}
            accessibilityLabel="Cook now"
            testID="cook-now-btn"
          />
          {hasMissing && (
            <BrandButton
              label="List"
              variant="golden"
              icon="cart-outline"
              onPress={handleAddMissing}
              style={{ flex: 1 }}
              accessibilityLabel="Add missing ingredients to shopping list"
              testID="add-missing-btn"
            />
          )}
        </StickyBottomBar>
      </SafeAreaView>

      <SlotPicker
        visible={pickerSlot !== null}
        slot={pickerSlot}
        components={pickerComponents}
        loading={loadingSlot !== null && loadingSlot === pickerSlot}
        pantryOnly={composer.pantryOnly}
        onSelect={handleSelect}
        onClose={() => setPickerSlot(null)}
        testID="slot-picker"
        favoriteIds={favoriteIds}
        scoresById={scoresById}
        leftovers={pickerSlot ? leftoversBySlot[pickerSlot] : undefined}
        onSelectLeftover={handleLeftoverSelect}
        variants={
          pickerSlot && composer.selections[pickerSlot] && skillTier.isVariantChipsVisible
            ? variantsByComponent[composer.selections[pickerSlot]!.id]
            : undefined
        }
        onSelectVariant={handleVariantSelect}
        topNutrientGap={topNutrientGap}
        greenVegCount={weeklyPlates.isLoading ? undefined : weeklyPlates.greenVegCount}
        totalPlatesThisWeek={weeklyPlates.isLoading ? undefined : weeklyPlates.totalPlatesThisWeek}
      />

      {showBeginnerTutorial && (
        <HapticTouchableOpacity
          onPress={handleDismissBeginnerTutorial}
          hapticStyle="light"
          style={styles.tutorialOverlay}
          testID="beginner-tutorial-overlay"
          accessibilityLabel="Beginner tutorial. Tap to dismiss."
        >
          <View style={styles.tutorialCard}>
            <Text style={styles.tutorialEmoji}>👨‍🍳</Text>
            <Text style={styles.tutorialTitle}>You're in the kitchen.</Text>
            <Text style={styles.tutorialBody}>
              Long-press a slot to lock it.{'\n'}
              Roll the dice to randomize the rest.
            </Text>
            <Text style={styles.tutorialDismiss}>Tap anywhere to dismiss</Text>
          </View>
        </HapticTouchableOpacity>
      )}
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  rollBtn: {
    backgroundColor: '#FB923C',
  },
  headerTitle: {
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
  },
  headerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  portionRow: {
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 4,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -6,
    marginBottom: 6,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  pantryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Pastel.sage,
    marginBottom: 16,
  },
  pantryToggleText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#2E5931',
  },
  garnishCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 16,
  },
  garnishText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  tutorialCard: {
    backgroundColor: '#FAF7F4',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 32,
    alignItems: 'center',
    gap: 10,
  },
  tutorialEmoji: {
    fontSize: 44,
  },
  tutorialTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: '#1F2937',
    textAlign: 'center',
  },
  tutorialBody: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  tutorialDismiss: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
