// frontend/app/build-a-plate.tsx
// Group 10X Phase 1 — Build-a-Plate composer (P0 launch blocker).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import BrandButton from '../components/ui/BrandButton';
import ScreenGradient from '../components/ui/ScreenGradient';
import { StickyBottomBar } from '../components/ui/StickyBottomBar';
import { SlotRow, SlotPicker, PlatePreview } from '../components/build-a-plate';
import useBuildAPlate, { SLOT_ORDER, REQUIRED_SLOTS } from '../hooks/useBuildAPlate';
import {
  mealComponentApi,
  composedPlateApi,
  shoppingListApi,
  type MealComponent,
  type MealComponentSlot,
} from '../lib/api';
import { Pastel, Accent } from '../constants/Colors';
import { useTheme } from '../contexts/ThemeContext';
import { HapticPatterns } from '../constants/Haptics';

const SLOT_META: Record<MealComponentSlot, { label: string; emoji: string }> = {
  protein: { label: 'Protein', emoji: '🥩' },
  base: { label: 'Base', emoji: '🍚' },
  vegetable: { label: 'Vegetables', emoji: '🥬' },
  sauce: { label: 'Sauce', emoji: '🥣' },
  garnish: { label: 'Garnish', emoji: '🌿' },
};

export default function BuildAPlateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pantryOnly?: string; plateId?: string }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const initialPantryOnly = params.pantryOnly === 'true';
  const plateId = typeof params.plateId === 'string' ? params.plateId : undefined;

  const composer = useBuildAPlate({ pantryOnly: initialPantryOnly });
  const [showGarnish, setShowGarnish] = useState<boolean>(false);
  const [pickerSlot, setPickerSlot] = useState<MealComponentSlot | null>(null);
  const [poolBySlot, setPoolBySlot] = useState<Partial<Record<MealComponentSlot, MealComponent[]>>>({});
  const [loadingSlot, setLoadingSlot] = useState<MealComponentSlot | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

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
  }, []);

  const handleOpenPicker = useCallback(async (slot: MealComponentSlot) => {
    await loadSlot(slot);
    setPickerSlot(slot);
  }, [loadSlot]);

  const handleSelect = useCallback((component: MealComponent) => {
    if (!pickerSlot) return;
    composer.setSlot(pickerSlot, component);
    setPickerSlot(null);
  }, [pickerSlot, composer]);

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
      const recipeId = res.data?.recipe?.id ?? res.data?.plate?.recipeId;
      if (recipeId) {
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

  const visibleSlots = useMemo(
    () => (showGarnish || composer.selections.garnish ? SLOT_ORDER : REQUIRED_SLOTS),
    [showGarnish, composer.selections.garnish],
  );

  const hasMissing = composer.totals.pantryCoveragePercent < 100 && composer.selectedSlotsCount > 0;
  const pickerComponents = pickerSlot ? poolBySlot[pickerSlot] ?? [] : [];

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
            onPress={handleRoll}
            hapticStyle="medium"
            style={[styles.headerBtn, styles.rollBtn]}
            accessibilityLabel="Roll the dice — randomize unlocked slots"
            testID="roll-the-dice-btn"
          >
            <Ionicons name="dice" size={22} color="#FFFFFF" />
          </HapticTouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          testID="build-a-plate-scroll"
        >
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

          {visibleSlots.map((slot) => (
            <SlotRow
              key={slot}
              slot={slot}
              label={SLOT_META[slot].label}
              emoji={SLOT_META[slot].emoji}
              selected={composer.selections[slot]}
              locked={composer.locks[slot]}
              onPress={() => handleOpenPicker(slot)}
              onLongPress={() => handleLongPress(slot)}
              testID={`slot-row-${slot}`}
            />
          ))}

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
      />
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
});
