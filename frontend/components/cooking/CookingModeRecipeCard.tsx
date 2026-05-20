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
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { ServingStepper } from '../ui/ServingStepper';
import { Brand, PastelTokens, Type, Radius, Elevation } from '../../constants/tokens';
import { CATEGORY_COLORS } from '../../constants/CategoryColors';
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
  /** Cuisine label — drives the gradient placeholder + emoji when no
   *  imageUrls are available (AI-gen recipes typically have neither
   *  cuisine-tagged photos nor any photo at all). */
  cuisine?: string;
  baseServings: number;
  ingredients: ScalableIngredientLite[];
  steps: string[];
  macros?: Macros;
  notes?: string;
  onGetCooking?: () => void;
  /** Founder ask 2026-05-19 — N=1 explainer rendered under the title.
   *  "Picked because you've got onion + garlic on hand." Makes the
   *  personalization visible (Kitchen / Journey principle). */
  rationale?: string;
  /** Swap to the next ranker-ordered alternate. Disabled when no
   *  alternates exist (AI-gen-only result). */
  onSwap?: () => void;
  /** Total recipes in the swap pool (including current). Used to render
   *  "2 of 5" alongside the chip; chip hides when ≤ 1. */
  swapPoolSize?: number;
  /** 0-based index into the pool — drives the "N of M" label. */
  swapIndex?: number;
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
  cuisine,
  baseServings,
  ingredients,
  steps,
  macros,
  notes,
  onGetCooking,
  rationale,
  onSwap,
  swapPoolSize,
  swapIndex,
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

  // Founder bug 2026-05-20: AI-gen recipes had no photo. Backend's
  // generateFromDescription doesn't return imageUrl. When images are
  // missing, fall back to a cuisine-tinted gradient + emoji so the
  // photo slot still anchors the card visually (food is the hero —
  // even when the hero is a vibe, not a literal photo).
  const cuisineKey = cuisine && CATEGORY_COLORS[cuisine] ? cuisine : 'American';
  const cuisineColor = CATEGORY_COLORS[cuisineKey];
  const placeholderBg = isDark ? cuisineColor.bgDark : cuisineColor.bg;
  const placeholderAccent = isDark ? cuisineColor.textDark : cuisineColor.text;

  // Founder bug 2026-05-20 (round 2): scroll still broken after PR #60.
  // The "let the parent ScrollView handle scroll" approach didn't work
  // (probably because the parent is also a keyboard-avoiding flex
  // container with its own scroll quirks). Going back to internal
  // scroll on the card — but this time:
  //   • the card has a bounded maxHeight (70% of screen) so it always
  //     has more content than viewport → there's something to scroll;
  //   • nestedScrollEnabled lets it coexist with the parent ScrollView
  //     on Android (iOS handles nested same-axis natively).
  // This matches the Claude Kitchen reference, which also uses an
  // internal-scrolling card with a "↓ more" indicator.
  const cardMaxHeight = Math.round(Dimensions.get('window').height * 0.7);

  return (
    <ScrollView
      accessibilityLabel={`${title} recipe`}
      style={[
        styles.card,
        { backgroundColor: surface, maxHeight: cardMaxHeight },
        Elevation.md,
      ]}
      contentContainerStyle={styles.content}
      nestedScrollEnabled
      showsVerticalScrollIndicator
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
      ) : (
        <LinearGradient
          colors={[placeholderBg, placeholderBg + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroPlaceholder}
          accessibilityLabel={`${cuisineKey} recipe placeholder`}
        >
          <Text style={styles.heroEmoji}>{cuisineColor.emoji}</Text>
          <Text style={[styles.heroLabel, { color: placeholderAccent }]}>
            {cuisineKey}
          </Text>
        </LinearGradient>
      )}

      <Text style={[styles.title, isDark && styles.dark]}>{title}</Text>
      {rationale ? (
        <Text
          style={[styles.rationale, isDark && styles.rationaleDark]}
          accessibilityLabel={rationale}
        >
          {rationale}
        </Text>
      ) : null}
      <Text style={[styles.desc, isDark && styles.descDark]}>
        {description}
      </Text>

      {swapPoolSize && swapPoolSize > 1 && onSwap ? (
        <View style={styles.swapRow}>
          <HapticTouchableOpacity
            onPress={onSwap}
            accessibilityRole="button"
            accessibilityLabel={`Show me another recipe — currently ${
              (swapIndex ?? 0) + 1
            } of ${swapPoolSize}`}
            pressedScale={0.97}
            style={[styles.swapChip, { borderColor: accent }]}
          >
            <Ionicons name="shuffle-outline" size={16} color={accent} />
            <Text style={[styles.swapChipText, { color: accent }]}>
              Show me another · {(swapIndex ?? 0) + 1}/{swapPoolSize}
            </Text>
          </HapticTouchableOpacity>
        </View>
      ) : null}

      {/* Founder bug 2026-05-20: the "Get cooking" button was clipping
          on narrow widths when stacked inline with the stepper + units.
          Split into two rows: stepper + units up top, full-width cook
          button below. Cook button can't overflow when it owns its
          own row. */}
      <View style={styles.controls}>
        <ServingStepper servings={servings} onChangeServings={setServings} />
        <HapticTouchableOpacity
          onPress={() => setUnitsOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityLabel="Change units"
          pressedScale={0.97}
          style={styles.iconBtn}
        >
          <Ionicons name="swap-horizontal-outline" size={20} color={accent} />
        </HapticTouchableOpacity>
      </View>
      <HapticTouchableOpacity
        onPress={onGetCooking}
        accessibilityRole="button"
        accessibilityLabel="Get cooking"
        pressedScale={0.97}
        style={[styles.cook, { backgroundColor: accent }]}
      >
        <Text style={styles.cookText}>Get cooking</Text>
      </HapticTouchableOpacity>

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
  rationale: { ...Type.caption, color: '#6B5B47', fontStyle: 'italic' },
  rationaleDark: { color: '#D6C8B0' },
  swapRow: { flexDirection: 'row', marginTop: 4 },
  swapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  swapChipText: { fontSize: 13, fontWeight: '600' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholder: {
    height: 140,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 6,
  },
  heroEmoji: { fontSize: 56 },
  heroLabel: { ...Type.eyebrow, opacity: 0.85 },
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
    alignItems: 'center',
    marginTop: 10,
  },
  cookText: { ...Type.label, color: '#FFFFFF' },
  eyebrow: { ...Type.eyebrow, marginTop: 10 },
  line: { ...Type.body, color: '#1F2937' },
  step: { ...Type.body, color: '#1F2937', marginTop: 6 },
  notes: { borderRadius: Radius.card, padding: 16, marginTop: 12, gap: 6 },
  noteText: { ...Type.bodySm, color: '#4B5563' },
});
