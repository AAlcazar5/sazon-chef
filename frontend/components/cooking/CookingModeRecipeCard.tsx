// frontend/components/cooking/CookingModeRecipeCard.tsx
//
// Tier Y-3 — the headline replica: the in-chat Cooking Mode recipe card.
// When a recipe is asked for, this is what renders. The defining
// behavior (founder screenshots): the servings stepper rescales the
// ingredient list AND the quantities baked into step prose in lockstep
// (rescaleStepText, Y-1), while oven temps / times / sizes stay put.
// Per-serving macros are invariant to the servings count (a per-serving
// value doesn't change when you cook more servings) — only displayed,
// never rescaled.
//
// Designer rails: food-forward collage, Radius.card, Elevation (no
// borders), pastel surface, tokens single-source, Haptic + a11y.

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { ServingStepper } from '../ui/ServingStepper';
import { Brand, PastelTokens, Type, Radius, Elevation } from '../../constants/tokens';
import {
  rescaleStepText,
  scaleQuantityDisplay,
  type ScalableIngredientLite,
} from '../../lib/cooking/rescaleStepText';
import {
  convertIngredientUnits,
  type UnitMode,
} from '../../lib/cooking/convertIngredientUnits';

const UNIT_MODE_LABEL: Record<UnitMode, string> = {
  'as-written': 'As written',
  us: 'US',
  metric: 'Metric',
};

interface Macros {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

interface CookingModeRecipeCardProps {
  title: string;
  description: string;
  imageUrls?: string[];
  baseServings: number;
  ingredients: ScalableIngredientLite[];
  steps: string[];
  macros?: Macros;
  notes?: string;
  onGetCooking?: () => void;
}

function macrosLine(m: Macros): string {
  const parts: string[] = [];
  if (m.calories != null) parts.push(`${m.calories} cal`);
  if (m.protein != null) parts.push(`${m.protein}g protein`);
  if (m.carbs != null) parts.push(`${m.carbs}g carbs`);
  if (m.fat != null) parts.push(`${m.fat}g fat`);
  if (m.fiber != null) parts.push(`${m.fiber}g fiber`);
  return parts.join(' · ');
}

export default function CookingModeRecipeCard({
  title,
  description,
  imageUrls,
  baseServings,
  ingredients,
  steps,
  macros,
  notes,
  onGetCooking,
}: CookingModeRecipeCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [servings, setServings] = useState(
    baseServings > 0 ? baseServings : 1,
  );
  const factor = servings / (baseServings > 0 ? baseServings : 1);

  // Y-Live-4 — kitchen-mode units menu (As written / US / Metric).
  // Only affects the displayed ingredient list. Step prose keeps the
  // original base units so rescaleStepText (Y-1) anchors correctly when
  // the servings stepper moves.
  const [unitMode, setUnitMode] = useState<UnitMode>('as-written');
  const [unitsOpen, setUnitsOpen] = useState(false);
  const displayIngredients = useMemo(
    () => convertIngredientUnits(ingredients, unitMode),
    [ingredients, unitMode],
  );

  const accent = isDark ? Brand.dark.base : Brand.light.base;
  const surface = isDark ? PastelTokens.dark.peach : PastelTokens.light.peach;
  const images = (imageUrls ?? []).slice(0, 3);

  return (
    <ScrollView
      accessibilityLabel={`${title} recipe`}
      style={[styles.card, { backgroundColor: surface }, Elevation.md]}
      contentContainerStyle={styles.content}
    >
      {images.length > 0 ? (
        <View style={styles.collage}>
          {images.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={styles.thumb}
              cachePolicy="memory-disk"
            />
          ))}
        </View>
      ) : null}

      <Text style={[styles.title, isDark && styles.dark]}>{title}</Text>
      <Text style={[styles.desc, isDark && styles.descDark]}>
        {description}
      </Text>

      <View style={styles.controls}>
        <ServingStepper servings={servings} onChangeServings={setServings} />
        <View style={styles.controlsRight}>
          <HapticTouchableOpacity
            onPress={() => setUnitsOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityLabel="Change units"
            pressedScale={0.97}
            style={styles.iconBtn}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={accent} />
          </HapticTouchableOpacity>
          <HapticTouchableOpacity
            onPress={onGetCooking}
            accessibilityRole="button"
            accessibilityLabel="Get cooking"
            pressedScale={0.97}
            style={[styles.cook, { backgroundColor: accent }]}
          >
            <Text style={styles.cookText}>Get cooking</Text>
          </HapticTouchableOpacity>
        </View>
      </View>

      {unitsOpen ? (
        <View
          style={[
            styles.unitsMenu,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : '#FFFFFF' },
          ]}
        >
          {(['as-written', 'us', 'metric'] as const).map((m) => {
            const label = UNIT_MODE_LABEL[m];
            const isActive = m === unitMode;
            return (
              <HapticTouchableOpacity
                key={m}
                onPress={() => {
                  setUnitMode(m);
                  setUnitsOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                pressedScale={0.97}
                style={styles.unitOption}
              >
                <Text
                  style={[
                    styles.unitOptionText,
                    isDark && styles.dark,
                    isActive && { color: accent },
                  ]}
                >
                  {label}
                </Text>
              </HapticTouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <Text style={[styles.eyebrow, { color: accent }]}>INGREDIENTS</Text>
      {displayIngredients.map((ing, i) => (
        <Text
          key={`${ing.name}-${i}`}
          style={[styles.line, isDark && styles.dark]}
        >
          {`${scaleQuantityDisplay(ing.amount * factor)} ${ing.unit} ${ing.name}`}
        </Text>
      ))}

      <Text style={[styles.eyebrow, { color: accent }]}>STEPS</Text>
      {steps.map((s, i) => (
        <Text
          key={`step-${i}`}
          style={[styles.step, isDark && styles.dark]}
        >
          {`${i + 1}. ${rescaleStepText(s, ingredients, factor)}`}
        </Text>
      ))}

      {macros && macrosLine(macros).length > 0 ? (
        <View
          style={[
            styles.notes,
            { backgroundColor: isDark ? PastelTokens.dark.sage : PastelTokens.light.sage },
          ]}
        >
          <Text style={[styles.eyebrow, { color: accent }]}>NOTES</Text>
          <Text style={[styles.line, isDark && styles.dark]}>
            {`Per serving: ${macrosLine(macros)}`}
          </Text>
          {notes ? (
            <Text style={[styles.noteText, isDark && styles.descDark]}>
              {notes}
            </Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, marginHorizontal: 16, marginVertical: 12 },
  content: { padding: 20, gap: 10 },
  collage: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  thumb: { flex: 1, height: 96, borderRadius: Radius.card },
  title: { ...Type.heading, color: '#1F2937' },
  dark: { color: '#F9FAFB' },
  desc: { ...Type.body, color: '#4B5563' },
  descDark: { color: '#D1D5DB' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 12,
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitsMenu: {
    alignSelf: 'flex-end',
    borderRadius: Radius.card,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 4,
    marginTop: -4,
    ...Elevation.sm,
  },
  unitOption: {
    paddingVertical: 8,
  },
  unitOptionText: { ...Type.body, color: '#1F2937' },
  cook: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radius.pill,
  },
  cookText: { ...Type.label, color: '#FFFFFF' },
  eyebrow: { ...Type.eyebrow, marginTop: 10 },
  line: { ...Type.body, color: '#1F2937' },
  step: { ...Type.body, color: '#1F2937', marginTop: 6 },
  notes: { borderRadius: Radius.card, padding: 16, marginTop: 12, gap: 6 },
  noteText: { ...Type.bodySm, color: '#4B5563' },
});
