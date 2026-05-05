// 10Y Phase 3 + Phase 7: inline Coach tool-call rendering.
// Variants:
//   - find_recipes / search_cookbook → recipe carousel with personalization.
//   - get_pantry / get_today_remaining_macros → compact summary card.
//   - compose_plate → Build-a-Plate result card (sage tint).
//   - log_meal → "Logged ✓" chip (peach tint).
//   - compose_plate allergen-blocked → amber warning card.

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Pastel, PastelDark, Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import { useSurfaceTracking } from '../../hooks/useSurfaceTracking';

interface ToolRecipe {
  id: string;
  title: string;
  cuisine: string;
  cookTime: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string | null;
  personalization: {
    pantryCoverage: number;
    macroFit: 'green' | 'amber' | 'red';
    affinityScore: number;
  };
}

interface RecipeResult {
  recipes: ToolRecipe[];
}

interface PantryResult {
  pantry: Array<{ id: string; name: string; category: string | null }>;
  leftoverInventory: Array<{ id: string; componentId: string; slot: string; portionsRemaining: number; expiresAt: string }>;
}

interface MacroResult {
  remaining: { calories: number; protein: number; carbs: number; fat: number; fiber?: number } | null;
}

interface ComposePlateResult {
  plateId: string;
  slots: Array<{ slot: string; componentId: string; name: string }>;
  totalMacros: { calories: number; protein: number; carbs: number; fat: number };
  pantryCoverage: number;
  allergenSafe: true | { violations: string[] };
}

interface ComposePlateBlocked {
  allergenSafe: { violations: string[] };
  slots?: Array<{ slot: string; componentId: string; name: string }>;
}

interface LogMealResult {
  id: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealType: string;
  eatenAt?: string;
}

interface ToolCallCardProps {
  name: string;
  result: unknown;
}

const PANTRY_COVERAGE_GREEN_THRESHOLD = 0.7;

function isRecipeResult(name: string, result: unknown): result is RecipeResult {
  if (name !== 'find_recipes' && name !== 'search_cookbook') return false;
  return (
    typeof result === 'object' &&
    result !== null &&
    Array.isArray((result as RecipeResult).recipes)
  );
}

function isPantryResult(name: string, result: unknown): result is PantryResult {
  return (
    name === 'get_pantry' &&
    typeof result === 'object' &&
    result !== null &&
    Array.isArray((result as PantryResult).pantry)
  );
}

function isMacroResult(name: string, result: unknown): result is MacroResult {
  return (
    name === 'get_today_remaining_macros' &&
    typeof result === 'object' &&
    result !== null &&
    'remaining' in (result as MacroResult)
  );
}

function isComposePlateBlocked(
  name: string,
  result: unknown,
): result is ComposePlateBlocked {
  if (name !== 'compose_plate') return false;
  if (typeof result !== 'object' || result === null) return false;
  const safe = (result as { allergenSafe?: unknown }).allergenSafe;
  return (
    typeof safe === 'object' &&
    safe !== null &&
    Array.isArray((safe as { violations?: unknown }).violations)
  );
}

function isComposePlateResult(
  name: string,
  result: unknown,
): result is ComposePlateResult {
  if (name !== 'compose_plate') return false;
  if (typeof result !== 'object' || result === null) return false;
  const r = result as ComposePlateResult;
  return (
    typeof r.plateId === 'string' &&
    Array.isArray(r.slots) &&
    typeof r.totalMacros === 'object' &&
    r.totalMacros !== null &&
    r.allergenSafe === true
  );
}

function isLogMealResult(name: string, result: unknown): result is LogMealResult {
  if (name !== 'log_meal') return false;
  if (typeof result !== 'object' || result === null) return false;
  const r = result as LogMealResult;
  return typeof r.id === 'string' && typeof r.totalCalories === 'number';
}

export default function ToolCallCard({ name, result }: ToolCallCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // ROADMAP 4.0 B3 — record taps from inline tool-call recipe cards
  const surfaceTracker = useSurfaceTracking();
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subText = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const surface = isDark ? PastelDark.sage : Pastel.sage;

  if (isRecipeResult(name, result)) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {result.recipes.map((r) => {
          const coverPct = Math.round(r.personalization.pantryCoverage * 100);
          const coverGreen = r.personalization.pantryCoverage >= PANTRY_COVERAGE_GREEN_THRESHOLD;
          const fitTint = pillTint(r.personalization.macroFit, isDark);
          return (
            <HapticTouchableOpacity
              key={r.id}
              accessibilityLabel={`Recipe ${r.title}`}
              accessibilityRole="button"
              onPress={() => {
                surfaceTracker.track({ surface: 'sazon_tool', action: 'tap', recipeId: r.id });
                router.push(`/recipe/${r.id}` as never);
              }}
              style={[styles.card, Shadows.SM as object, { backgroundColor: surface }]}
            >
              <Text style={[styles.title, { color: text }]} numberOfLines={2}>
                {r.title}
              </Text>
              <Text style={[styles.subtitle, { color: subText }]} numberOfLines={1}>
                {r.cuisine} · {r.cookTime} min
              </Text>
              <View style={styles.chipRow}>
                <View
                  style={[
                    styles.coverChip,
                    {
                      backgroundColor: coverGreen
                        ? (isDark ? PastelDark.sage : Pastel.sage)
                        : (isDark ? PastelDark.peach : Pastel.peach),
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: text }]}>{coverPct}% pantry</Text>
                </View>
                <View style={[styles.fitPill, { backgroundColor: fitTint }]}>
                  <Text style={[styles.chipText, { color: text }]}>
                    {r.personalization.macroFit}
                  </Text>
                </View>
              </View>
              <Text style={[styles.affinity, { color: subText }]}>
                Match {Math.round(r.personalization.affinityScore)}
              </Text>
            </HapticTouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }

  if (isPantryResult(name, result)) {
    return (
      <View
        accessibilityLabel="Pantry summary"
        style={[styles.summary, Shadows.SM as object, { backgroundColor: surface }]}
      >
        <Text style={[styles.summaryHead, { color: text }]}>Pantry</Text>
        <Text style={[styles.summaryBody, { color: subText }]}>
          {result.pantry.length} items · {result.leftoverInventory.length} leftover
        </Text>
      </View>
    );
  }

  if (isComposePlateBlocked(name, result)) {
    const amber = isDark ? PastelDark.golden : Pastel.golden;
    return (
      <View
        accessibilityLabel="Allergen blocked plate"
        style={[styles.summary, Shadows.SM as object, { backgroundColor: amber }]}
      >
        <Text style={[styles.summaryHead, { color: text }]}>
          Allergen blocked
        </Text>
        <Text style={[styles.summaryBody, { color: subText }]}>
          Switched to a safe option above. Violations: {result.allergenSafe.violations.join(', ')}
        </Text>
      </View>
    );
  }

  if (isComposePlateResult(name, result)) {
    const sage = isDark ? PastelDark.sage : Pastel.sage;
    const coverPct = Math.round(result.pantryCoverage);
    const macros = result.totalMacros;
    return (
      <HapticTouchableOpacity
        accessibilityLabel="Compose-plate result"
        accessibilityRole="button"
        onPress={() =>
          router.push(
            `/build-a-plate?prefilledPlateId=${result.plateId}` as never,
          )
        }
        style={[styles.summary, Shadows.SM as object, { backgroundColor: sage }]}
      >
        <Text style={[styles.summaryHead, { color: text }]}>Plate composed</Text>
        <Text style={[styles.summaryBody, { color: subText }]}>
          {result.slots.map((s) => s.name).join(' + ')}
        </Text>
        <View style={styles.chipRow}>
          <View style={[styles.coverChip, { backgroundColor: sage }]}>
            <Text style={[styles.chipText, { color: text }]}>
              {coverPct}% pantry
            </Text>
          </View>
          <View style={[styles.fitPill, { backgroundColor: sage }]}>
            <Text style={[styles.chipText, { color: text }]}>
              Allergen safe
            </Text>
          </View>
        </View>
        <Text style={[styles.affinity, { color: subText }]}>
          {Math.round(macros.calories)} cal · {Math.round(macros.protein)} P · {Math.round(macros.carbs)} C · {Math.round(macros.fat)} F
        </Text>
      </HapticTouchableOpacity>
    );
  }

  if (isLogMealResult(name, result)) {
    const peach = isDark ? PastelDark.peach : Pastel.peach;
    return (
      <HapticTouchableOpacity
        accessibilityLabel="Logged meal"
        accessibilityRole="button"
        onPress={() => router.push('/meal-plan' as never)}
        style={[styles.summary, Shadows.SM as object, { backgroundColor: peach }]}
      >
        <Text style={[styles.summaryHead, { color: text }]}>Logged ✓</Text>
        <Text style={[styles.summaryBody, { color: subText }]}>
          {Math.round(result.totalCalories)} cal · {result.mealType}
        </Text>
      </HapticTouchableOpacity>
    );
  }

  if (isMacroResult(name, result)) {
    if (!result.remaining) {
      return (
        <View style={[styles.summary, Shadows.SM as object, { backgroundColor: surface }]}>
          <Text style={[styles.summaryHead, { color: text }]}>Macros</Text>
          <Text style={[styles.summaryBody, { color: subText }]}>No goal set</Text>
        </View>
      );
    }
    const r = result.remaining;
    return (
      <View
        accessibilityLabel="Macros remaining"
        style={[styles.summary, Shadows.SM as object, { backgroundColor: surface }]}
      >
        <Text style={[styles.summaryHead, { color: text }]}>Remaining today</Text>
        <Text style={[styles.summaryBody, { color: subText }]}>
          {Math.round(r.calories)} cal · {Math.round(r.protein)} P · {Math.round(r.carbs)} C · {Math.round(r.fat)} F
        </Text>
      </View>
    );
  }

  return null;
}

function pillTint(fit: 'green' | 'amber' | 'red', isDark: boolean): string {
  if (fit === 'green') return isDark ? PastelDark.sage : Pastel.sage;
  if (fit === 'amber') return isDark ? PastelDark.golden : Pastel.golden;
  return isDark ? PastelDark.blush : Pastel.blush;
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  card: {
    width: 220,
    minHeight: 140,
    padding: 14,
    borderRadius: BorderRadius.card,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  coverChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  fitPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  affinity: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  summary: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
    borderRadius: BorderRadius.card,
    gap: 4,
  },
  summaryHead: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryBody: {
    fontSize: 13,
    fontWeight: '500',
  },
});
