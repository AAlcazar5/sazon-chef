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

import React, { useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { ServingStepper } from '../ui/ServingStepper';
import { Brand, PastelTokens, Type, Radius, Elevation } from '../../constants/tokens';
import {
  rescaleStepText,
  scaleQuantityDisplay,
  type ScalableIngredientLite,
} from '../../lib/cooking/rescaleStepText';

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
            <Image key={uri} source={{ uri }} style={styles.thumb} />
          ))}
        </View>
      ) : null}

      <Text style={[styles.title, isDark && styles.dark]}>{title}</Text>
      <Text style={[styles.desc, isDark && styles.descDark]}>
        {description}
      </Text>

      <View style={styles.controls}>
        <ServingStepper servings={servings} onChangeServings={setServings} />
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

      <Text style={[styles.eyebrow, { color: accent }]}>INGREDIENTS</Text>
      {ingredients.map((ing, i) => (
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
