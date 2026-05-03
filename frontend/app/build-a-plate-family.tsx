// frontend/app/build-a-plate-family.tsx
// Group 10X Phase 7 — Family mode composer.
//
// Standalone route from /build-a-plate. Renders 2-6 plate "tabs", each with
// its own slot picker. "Diverge from shared" copies the active plate's
// protein + base to every other plate and clears divergent slots so the user
// can fill veg/sauce/garnish per family member.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ScreenGradient from '../components/ui/ScreenGradient';
import BrandButton from '../components/ui/BrandButton';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import Sazon, { expressionToSazon } from '../components/mascot/Sazon';
import {
  mealComponentApi,
  type MealComponent,
  type MealComponentSlot,
} from '../lib/api';
import { useFamilyComposer } from '../hooks/useFamilyComposer';
import { useTheme } from '../contexts/ThemeContext';
import { Pastel, Accent } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { BorderRadius } from '../constants/Spacing';
import { EditorialTypography } from '../constants/Typography';

const SLOT_ORDER: MealComponentSlot[] = ['protein', 'base', 'vegetable', 'sauce', 'garnish'];
const SLOT_LABEL: Record<MealComponentSlot, string> = {
  protein: 'Protein',
  base: 'Base',
  vegetable: 'Vegetable',
  sauce: 'Sauce',
  garnish: 'Garnish',
};
const SHARED_BASE_SLOTS: MealComponentSlot[] = ['protein', 'base'];

export default function BuildAPlateFamilyScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const composer = useFamilyComposer(2);
  const [poolBySlot, setPoolBySlot] = useState<
    Partial<Record<MealComponentSlot, MealComponent[]>>
  >({});
  const [pickerSlot, setPickerSlot] = useState<MealComponentSlot | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const sazonConfig = expressionToSazon('chef-kiss');

  // Pre-load every slot's components on mount so picker open is instant.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Partial<Record<MealComponentSlot, MealComponent[]>> = {};
      await Promise.all(
        SLOT_ORDER.map(async (slot) => {
          try {
            const res = await mealComponentApi.list({ slot });
            next[slot] = res.data?.components ?? [];
          } catch {
            next[slot] = [];
          }
        }),
      );
      if (!cancelled) setPoolBySlot(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activePlate = composer.plates[composer.activeIndex];

  const handleSelectComponent = useCallback(
    (slot: MealComponentSlot, c: MealComponent) => {
      composer.setSlot(composer.activeIndex, slot, c.id);
      setPickerSlot(null);
    },
    [composer],
  );

  const handleDiverge = useCallback(() => {
    composer.divergeFromShared(SHARED_BASE_SLOTS);
  }, [composer]);

  const handleSave = useCallback(async () => {
    try {
      const res = await composer.persist('Family meal');
      if (res?.persisted) {
        setSavedToast('Saved! Head to the cookbook to cook it.');
        setTimeout(() => setSavedToast(null), 2400);
      }
    } catch {
      /* error already surfaced via composer.error */
    }
  }, [composer]);

  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <ScreenGradient testID="family-composer-screen">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <HapticTouchableOpacity
            onPress={() => router.back()}
            hapticStyle="light"
            accessibilityLabel="Back"
            testID="family-composer-back"
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={24} color={titleColor} />
          </HapticTouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[EditorialTypography.eyebrow, { color: Accent.sage }]}>
              COOK FOR THE FAMILY
            </Text>
            <Text style={[styles.title, { color: titleColor }]}>
              {composer.plates.length} plates · one cook
            </Text>
          </View>
          <HapticTouchableOpacity
            onPress={composer.addPlate}
            hapticStyle="light"
            accessibilityLabel="Add another plate"
            testID="family-composer-add-plate"
            style={styles.iconBtn}
            disabled={composer.plates.length >= 6}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={composer.plates.length >= 6 ? subtitleColor : titleColor}
            />
          </HapticTouchableOpacity>
        </View>

        {/* Plate tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
          testID="family-composer-tabs"
        >
          {composer.plates.map((plate, idx) => {
            const isActive = idx === composer.activeIndex;
            const filled = Object.keys(plate.slots).length;
            return (
              <HapticTouchableOpacity
                key={plate.plateId}
                onPress={() => composer.setActiveIndex(idx)}
                hapticStyle="light"
                pressedScale={0.97}
                accessibilityLabel={`Plate ${idx + 1}, ${filled} of 5 slots filled`}
                testID={`family-composer-tab-${idx}`}
                style={[
                  styles.tab,
                  isActive ? { backgroundColor: Pastel.sage } : { backgroundColor: 'rgba(255,255,255,0.4)' },
                  isActive ? Shadows.SM : undefined,
                ]}
              >
                <Text style={[styles.tabLabel, { color: isActive ? '#2E5931' : titleColor }]}>
                  Plate {idx + 1}
                </Text>
                <Text style={[styles.tabSub, { color: subtitleColor }]}>{`${filled}/5`}</Text>
              </HapticTouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {/* Slot rows for the active plate */}
          {SLOT_ORDER.map((slot) => {
            const componentId = activePlate?.slots[slot];
            const pool = poolBySlot[slot] ?? [];
            const selected = pool.find((c) => c.id === componentId);
            return (
              <View key={slot} style={styles.slotRow} testID={`family-slot-${slot}`}>
                <Text style={[styles.slotLabel, { color: subtitleColor }]}>
                  {SLOT_LABEL[slot]}
                </Text>
                <HapticTouchableOpacity
                  onPress={() => setPickerSlot(slot)}
                  hapticStyle="light"
                  pressedScale={0.97}
                  accessibilityLabel={`${SLOT_LABEL[slot]} — ${selected ? selected.name : 'pick one'}`}
                  testID={`family-slot-pick-${slot}`}
                  style={[
                    styles.slotCard,
                    { backgroundColor: selected ? Pastel.sky : Pastel.lavender },
                  ]}
                >
                  <Text style={[styles.slotValue, { color: titleColor }]}>
                    {selected ? selected.name : `+ Pick a ${SLOT_LABEL[slot]}`}
                  </Text>
                  {selected ? (
                    <HapticTouchableOpacity
                      onPress={() => composer.clearSlot(composer.activeIndex, slot)}
                      hapticStyle="light"
                      accessibilityLabel={`Clear ${SLOT_LABEL[slot]}`}
                      testID={`family-slot-clear-${slot}`}
                      style={styles.clearBtn}
                    >
                      <Ionicons name="close" size={18} color={subtitleColor} />
                    </HapticTouchableOpacity>
                  ) : null}
                </HapticTouchableOpacity>
              </View>
            );
          })}

          <View style={styles.actions}>
            <BrandButton
              label="Diverge from shared base"
              variant="lavender"
              icon="git-branch-outline"
              onPress={handleDiverge}
              accessibilityLabel="Copy this plate's protein and base to every other plate"
              testID="family-composer-diverge"
              style={styles.actionBtn}
            />
            <BrandButton
              label={composer.isPersisting ? 'Saving…' : 'Save family meal'}
              variant="sage"
              icon="checkmark-circle"
              onPress={handleSave}
              disabled={composer.isPersisting}
              accessibilityLabel="Save the family meal"
              testID="family-composer-save"
              style={styles.actionBtn}
            />
            {composer.plates.length > 1 ? (
              <BrandButton
                label="Remove this plate"
                variant="ghost"
                icon="trash-outline"
                onPress={() => composer.removePlate(composer.activeIndex)}
                accessibilityLabel="Remove the active plate"
                testID="family-composer-remove-plate"
                style={styles.actionBtn}
              />
            ) : null}
          </View>

          {composer.error ? (
            <Text
              style={[styles.errorMsg, { color: isDark ? '#FCA5A5' : '#B45309' }]}
              accessibilityLiveRegion="polite"
              testID="family-composer-error"
            >
              {composer.error}
            </Text>
          ) : null}

          {savedToast ? (
            <View style={styles.toast} testID="family-composer-toast">
              <Sazon
                variant={sazonConfig.variant}
                motion={sazonConfig.motion}
                fx={sazonConfig.fx}
                size={48}
              />
              <Text style={[styles.toastText, { color: titleColor }]}>{savedToast}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Picker modal — minimal inline list. */}
        {pickerSlot ? (
          <View style={styles.pickerOverlay} testID="family-composer-picker">
            <View style={[styles.pickerSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FAF7F4' }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { color: titleColor }]}>
                  Pick a {SLOT_LABEL[pickerSlot]}
                </Text>
                <HapticTouchableOpacity
                  onPress={() => setPickerSlot(null)}
                  hapticStyle="light"
                  accessibilityLabel="Close picker"
                  testID="family-composer-picker-close"
                >
                  <Ionicons name="close" size={22} color={subtitleColor} />
                </HapticTouchableOpacity>
              </View>
              <ScrollView style={styles.pickerList}>
                {(poolBySlot[pickerSlot] ?? []).map((c) => (
                  <HapticTouchableOpacity
                    key={c.id}
                    onPress={() => handleSelectComponent(pickerSlot, c)}
                    hapticStyle="light"
                    pressedScale={0.97}
                    accessibilityLabel={`Pick ${c.name}`}
                    testID={`family-composer-picker-option-${c.id}`}
                    style={styles.pickerOption}
                  >
                    <Text style={[styles.pickerOptionText, { color: titleColor }]}>{c.name}</Text>
                  </HapticTouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  iconBtn: { padding: 6 },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    letterSpacing: -0.4,
  },
  tabRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full ?? 100,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  tabSub: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  slotRow: { gap: 4 },
  slotLabel: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: BorderRadius.card,
    gap: 8,
    ...Shadows.SM,
  },
  slotValue: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
  },
  clearBtn: { padding: 4 },
  actions: { gap: 10, marginTop: 12 },
  actionBtn: { alignSelf: 'stretch' },
  errorMsg: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    marginTop: 4,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Pastel.sage,
    borderRadius: BorderRadius.card,
  },
  toastText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
  },
  pickerOverlay: {
    position: 'absolute',
    inset: 0 as unknown as number,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
  },
  pickerList: { flexGrow: 0 },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.card,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  pickerOptionText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
  },
});
