// frontend/components/build-a-plate/SlotPicker.tsx
// Group 10X Phase 1+6+9 — bottom sheet picker, horizontal scrolling pastel cards sorted by pantry coverage.
// Phase 6: leftover strip + variant chips. Phase 9: nutrient badges + rainbow hint (vegetable).

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
import LoadingState from '../ui/LoadingState';
import LeftoverStrip, { type LeftoverInventoryItem } from './LeftoverStrip';
import VariantChips, { type ComponentVariant } from './VariantChips';
import NutrientBadge from './NutrientBadge';
import RainbowHint from './RainbowHint';
import { Pastel, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import {
  filterByPantryOnly,
  sortByPantryCoverage,
  PANTRY_ONLY_THRESHOLD,
} from '../../hooks/useBuildAPlate';
import type { MealComponent, MealComponentSlot, TrackedNutrient } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

interface SlotPickerProps {
  visible: boolean;
  slot: MealComponentSlot | null;
  components: MealComponent[];
  loading?: boolean;
  pantryOnly: boolean;
  onSelect: (component: MealComponent) => void;
  onClose: () => void;
  testID?: string;
  favoriteIds?: Set<string>;
  scoresById?: Map<string, number>;
  /** Phase 6 — leftovers from last night for this slot */
  leftovers?: LeftoverInventoryItem[];
  onSelectLeftover?: (leftover: LeftoverInventoryItem) => void;
  /** Phase 6 — variant chips for the highlighted component (chef tier) */
  variants?: ComponentVariant[];
  onSelectVariant?: (variant: ComponentVariant) => void;
  /** Phase 9 — top nutrient gap highlights */
  topNutrientGap?: TrackedNutrient | null;
  nutrientAmountById?: Map<string, number>;
  /** Phase 9 — rainbow hint props (vegetable picker only) */
  greenVegCount?: number;
  totalPlatesThisWeek?: number;
}

const SLOT_TINTS: Record<MealComponentSlot, string> = {
  protein: Pastel.sage,
  base: Pastel.golden,
  vegetable: '#E0F2E1',
  sauce: Pastel.lavender,
  garnish: Pastel.peach,
};

const SLOT_LABEL: Record<MealComponentSlot, string> = {
  protein: 'Protein',
  base: 'Base',
  vegetable: 'Vegetable',
  sauce: 'Sauce',
  garnish: 'Garnish',
};

function uniqueTags(items: MealComponent[], key: 'cuisineTags' | 'dietaryTags'): string[] {
  const set = new Set<string>();
  items.forEach((c) => c[key].forEach((t) => set.add(t)));
  return Array.from(set).slice(0, 8);
}

export default function SlotPicker({
  visible,
  slot,
  components,
  loading,
  pantryOnly,
  onSelect,
  onClose,
  testID,
  favoriteIds = new Set(),
  scoresById = new Map(),
  leftovers,
  onSelectLeftover,
  variants,
  onSelectVariant,
  topNutrientGap = null,
  nutrientAmountById,
  greenVegCount,
  totalPlatesThisWeek,
}: SlotPickerProps) {
  const [activeDietary, setActiveDietary] = useState<string | null>(null);
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const bodyColor = isDark ? '#9CA3AF' : '#6B7280';

  const filtered = useMemo(() => {
    let list = components;
    if (activeDietary) list = list.filter((c) => c.dietaryTags.includes(activeDietary));
    if (activeCuisine) list = list.filter((c) => c.cuisineTags.includes(activeCuisine));
    list = filterByPantryOnly(list, pantryOnly);
    return [...list].sort((a, b) => {
      const pantryDiff = b.pantryCoveragePercent - a.pantryCoveragePercent;
      if (pantryDiff !== 0) return pantryDiff;
      const scoreA = scoresById.get(a.id) ?? 0;
      const scoreB = scoresById.get(b.id) ?? 0;
      const scoreDiff = scoreB - scoreA;
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    });
  }, [components, activeDietary, activeCuisine, pantryOnly, scoresById]);

  const dietaryChips = useMemo(() => uniqueTags(components, 'dietaryTags'), [components]);
  const cuisineChips = useMemo(() => uniqueTags(components, 'cuisineTags'), [components]);

  const tint = slot ? SLOT_TINTS[slot] : Pastel.peach;
  const title = slot ? `Pick a ${SLOT_LABEL[slot]}` : '';
  const missingHint = pantryOnly && filtered.length === 0 && components.length > 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} snapPoints={['72%']} scrollable>
      <View style={[styles.tintBar, { backgroundColor: tint }]} testID={`${testID}-tint`} />

      {leftovers && leftovers.length > 0 && onSelectLeftover && (
        <LeftoverStrip
          leftovers={leftovers}
          onSelect={onSelectLeftover}
          testID={`${testID}-leftovers`}
        />
      )}

      {slot === 'vegetable' &&
        typeof greenVegCount === 'number' &&
        typeof totalPlatesThisWeek === 'number' && (
          <RainbowHint
            greenVegCount={greenVegCount}
            totalPlates={totalPlatesThisWeek}
            testID={`${testID}-rainbow-hint`}
          />
        )}

      {variants && variants.length > 0 && onSelectVariant && (
        <View style={styles.variantsRow}>
          <VariantChips
            variants={variants}
            onSelect={onSelectVariant}
            testID={`${testID}-variants`}
          />
        </View>
      )}

      {(dietaryChips.length > 0 || cuisineChips.length > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          testID={`${testID}-filter-chips`}
        >
          {dietaryChips.map((tag) => {
            const active = activeDietary === tag;
            return (
              <HapticTouchableOpacity
                key={`d-${tag}`}
                onPress={() => setActiveDietary(active ? null : tag)}
                hapticStyle="light"
                style={[styles.chip, active && styles.chipActive]}
                accessibilityLabel={`${active ? 'Remove' : 'Filter by'} ${tag}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
              </HapticTouchableOpacity>
            );
          })}
          {cuisineChips.map((tag) => {
            const active = activeCuisine === tag;
            return (
              <HapticTouchableOpacity
                key={`c-${tag}`}
                onPress={() => setActiveCuisine(active ? null : tag)}
                hapticStyle="light"
                style={[styles.chip, active && styles.chipCuisineActive]}
                accessibilityLabel={`${active ? 'Remove' : 'Filter by'} ${tag}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
              </HapticTouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading && (
        <View style={styles.loading} testID={`${testID}-loading`}>
          <LoadingState message="Picking options…" expression="thinking" size="small" animationType="pulse" />
        </View>
      )}

      {!loading && missingHint && (
        <View style={styles.missing} testID={`${testID}-missing-hint`}>
          <Ionicons name="basket-outline" size={28} color={Accent.peach} />
          <Text style={[styles.missingTitle, { color: titleColor }]}>Pantry coverage too low</Text>
          <Text style={[styles.missingBody, { color: bodyColor }]}>
            Nothing in this slot is fully in your pantry. Turn off "Cook with what I have" to see all options.
          </Text>
        </View>
      )}

      {!loading && !missingHint && (
        <ScrollView
          horizontal={false}
          contentContainerStyle={styles.list}
          testID={`${testID}-list`}
        >
          {filtered.map((component) => {
            const isFavorite = favoriteIds.has(component.id);
            const nutrientAmount = nutrientAmountById?.get(component.id) ?? 0;
            return (
              <HapticTouchableOpacity
                key={component.id}
                onPress={() => onSelect(component)}
                hapticStyle="medium"
                pressedScale={0.97}
                style={[styles.card, { backgroundColor: isDark ? '#1F1F22' : tint }, Shadows.SM as any]}
                testID={`${testID}-option-${component.id}`}
                accessibilityLabel={`Select ${component.name}, ${Math.round(component.caloriesPerPortion)} calories, ${component.pantryCoveragePercent}% pantry coverage${isFavorite ? ', your favorite' : ''}`}
              >
                {isFavorite && (
                  <View style={styles.favoriteChip} testID={`${testID}-favorite-chip-${component.id}`}>
                    <Text style={styles.favoriteChipText}>❤️ Your favorite</Text>
                  </View>
                )}
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: titleColor }]} numberOfLines={1}>{component.name}</Text>
                    {component.description && (
                      <Text style={[styles.cardDescription, { color: bodyColor }]} numberOfLines={2}>{component.description}</Text>
                    )}
                    {topNutrientGap && nutrientAmount > 0 && (
                      <View style={styles.nutrientBadgeWrap}>
                        <NutrientBadge
                          topGap={topNutrientGap}
                          amountForGap={nutrientAmount}
                          testID={`${testID}-nutrient-badge-${component.id}`}
                        />
                      </View>
                    )}
                    <View style={styles.cardChips}>
                      <Text style={styles.cardChip}>{Math.round(component.caloriesPerPortion)} cal</Text>
                      <Text style={styles.cardChip}>{Math.round(component.proteinG)}g P</Text>
                      {component.pantryCoveragePercent >= 100 && (
                        <Text style={[styles.cardChip, styles.pantryChip]} testID={`${testID}-option-${component.id}-pantry`}>
                          ✓ In your pantry
                        </Text>
                      )}
                      {component.pantryCoveragePercent > 0 && component.pantryCoveragePercent < 100 && (
                        <Text style={[styles.cardChip, styles.partialChip]}>
                          {component.pantryCoveragePercent}% pantry
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </HapticTouchableOpacity>
            );
          })}

          {filtered.length === 0 && !loading && (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: bodyColor }]}>Nothing matches those filters yet.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

export const __testing__ = { PANTRY_ONLY_THRESHOLD };

const styles = StyleSheet.create({
  tintBar: {
    height: 6,
    marginHorizontal: 16,
    borderRadius: 100,
    marginBottom: 12,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
  },
  chipActive: {
    backgroundColor: Accent.sage,
  },
  chipCuisineActive: {
    backgroundColor: Accent.lavender,
  },
  chipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    padding: 14,
    borderRadius: BorderRadius.card,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: '#1F2937',
  },
  cardDescription: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  cardChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  cardChip: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: '#374151',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    overflow: 'hidden',
  },
  pantryChip: {
    backgroundColor: Accent.sage,
    color: '#FFFFFF',
  },
  partialChip: {
    backgroundColor: Pastel.peach,
    color: '#8a4a00',
  },
  loading: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  missing: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  missingTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: '#1F2937',
  },
  missingBody: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  favoriteChip: {
    alignSelf: 'flex-end',
    backgroundColor: Pastel.peach,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  favoriteChipText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    color: '#8a4a00',
  },
  variantsRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  nutrientBadgeWrap: {
    marginTop: 6,
  },
});
