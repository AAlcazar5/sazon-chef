// frontend/components/meal-plan/NutrientNudge.tsx
// Group 10R Surface 5 — contextual nutrient gap nudge surfaced below the daily macros widget.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors, Pastel, PastelDark, Accent } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';
import useFoodIntelUserState from '../../hooks/useFoodIntelUserState';
import { pantryApi, recipeApi } from '../../lib/api';

type Nutrient = 'protein' | 'fiber' | 'iron';
type SuggestionSource = 'pantry' | 'cookbook' | 'generic';

interface DayMacros {
  fiberG: number;
  proteinG: number;
  proteinTargetG: number;
  ingredients: string[];
}

interface NutrientNudgeProps {
  dayMacros: DayMacros;
  testID?: string;
}

interface Suggestion {
  source: SuggestionSource;
  id: string;
  text: string;
}

const NUTRIENT_FOOD_MAP: Record<Nutrient, string[]> = {
  iron: ['spinach', 'beef', 'lentils', 'kale', 'beans', 'liver', 'sardines', 'tofu'],
  protein: ['chicken', 'beef', 'salmon', 'eggs', 'greek yogurt', 'tofu', 'lentils', 'tuna'],
  fiber: ['black beans', 'lentils', 'chia', 'oats', 'raspberries', 'avocado', 'broccoli'],
};

const IRON_KEYWORDS = NUTRIENT_FOOD_MAP.iron;

const GENERIC_FALLBACKS: Record<Nutrient, { id: string; text: string }> = {
  fiber: {
    id: 'generic-fiber-pumpkin-seeds',
    text: 'add a handful of pumpkin seeds (~150 cal, 37% DV magnesium) to any meal.',
  },
  protein: {
    id: 'generic-protein-greek-yogurt',
    text: 'stir in some greek yogurt (~100 cal, 17g protein) — easy add to breakfast or a snack.',
  },
  iron: {
    id: 'generic-iron-spinach',
    text: 'toss a handful of spinach into your next meal — iron-rich and barely changes the calories.',
  },
};

const NUTRIENT_LABEL: Record<Nutrient, string> = {
  protein: 'protein',
  fiber: 'fiber',
  iron: 'iron',
};

const NUTRIENT_TINT: Record<Nutrient, { light: string; dark: string; accent: string }> = {
  protein: { light: Pastel.sage, dark: PastelDark.sage, accent: Accent.sage },
  fiber: { light: Pastel.golden, dark: PastelDark.golden, accent: Accent.golden },
  iron: { light: Pastel.peach, dark: PastelDark.peach, accent: Accent.peach },
};

function extractPantryItems(resp: unknown): Array<{ id?: string; name: string }> {
  if (!resp || typeof resp !== 'object') return [];
  const data = (resp as { data?: unknown }).data;
  const candidates =
    Array.isArray(data) ? data
      : data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)
        ? (data as { items: unknown[] }).items
        : [];
  const out: Array<{ id?: string; name: string }> = [];
  for (const c of candidates) {
    if (c && typeof c === 'object' && typeof (c as { name?: unknown }).name === 'string') {
      const item = c as { id?: unknown; name: string };
      out.push({
        id: typeof item.id === 'string' ? item.id : undefined,
        name: item.name,
      });
    }
  }
  return out;
}

function extractRecipes(
  resp: unknown,
): Array<{ id: string; title: string; ingredients?: Array<{ name: string }> }> {
  if (!resp || typeof resp !== 'object') return [];
  const data = (resp as { data?: unknown }).data;
  const candidates =
    Array.isArray(data) ? data
      : data && typeof data === 'object' && Array.isArray((data as { recipes?: unknown }).recipes)
        ? (data as { recipes: unknown[] }).recipes
        : [];
  const out: Array<{ id: string; title: string; ingredients?: Array<{ name: string }> }> = [];
  for (const c of candidates) {
    if (
      c && typeof c === 'object' &&
      typeof (c as { id?: unknown }).id === 'string' &&
      typeof (c as { title?: unknown }).title === 'string'
    ) {
      const r = c as { id: string; title: string; ingredients?: unknown };
      const ingredients = Array.isArray(r.ingredients)
        ? r.ingredients
            .filter((i): i is { name: string } =>
              !!i && typeof i === 'object' && typeof (i as { name?: unknown }).name === 'string',
            )
        : undefined;
      out.push({ id: r.id, title: r.title, ingredients });
    }
  }
  return out;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function detectGap(dayMacros: DayMacros): Nutrient | null {
  const proteinGap = dayMacros.proteinG < dayMacros.proteinTargetG * 0.8;
  const fiberGap = dayMacros.fiberG < 15;
  const lowerIngredients = dayMacros.ingredients.map((i) => i.toLowerCase());
  const ironGap = !IRON_KEYWORDS.some((kw) => lowerIngredients.some((ing) => ing.includes(kw)));

  if (proteinGap) return 'protein';
  if (fiberGap) return 'fiber';
  if (ironGap) return 'iron';
  return null;
}

function findPantryMatch(
  pantryItems: Array<{ id?: string; name: string }>,
  nutrient: Nutrient,
): { id: string; name: string } | null {
  const keywords = NUTRIENT_FOOD_MAP[nutrient];
  for (const item of pantryItems) {
    const lower = (item.name || '').toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return { id: item.id ?? lower, name: item.name };
      }
    }
  }
  return null;
}

function findCookbookMatch(
  recipes: Array<{ id: string; title: string; ingredients?: Array<{ name: string }> }>,
  nutrient: Nutrient,
): { id: string; title: string } | null {
  const keywords = NUTRIENT_FOOD_MAP[nutrient];
  for (const recipe of recipes) {
    const ingNames = (recipe.ingredients ?? []).map((i) => (i.name || '').toLowerCase());
    if (ingNames.some((n) => keywords.some((kw) => n.includes(kw)))) {
      return { id: recipe.id, title: recipe.title };
    }
  }
  return null;
}

function buildSuggestion(
  nutrient: Nutrient,
  pantryItems: Array<{ id?: string; name: string }>,
  recipes: Array<{ id: string; title: string; ingredients?: Array<{ name: string }> }>,
): Suggestion {
  const pantryHit = findPantryMatch(pantryItems, nutrient);
  if (pantryHit) {
    return {
      source: 'pantry',
      id: pantryHit.id,
      text: `you've got ${pantryHit.name} in your pantry — toss some into your next meal.`,
    };
  }
  const recipeHit = findCookbookMatch(recipes, nutrient);
  if (recipeHit) {
    return {
      source: 'cookbook',
      id: recipeHit.id,
      text: `${recipeHit.title} from your cookbook would help.`,
    };
  }
  const generic = GENERIC_FALLBACKS[nutrient];
  return { source: 'generic', id: generic.id, text: generic.text };
}

async function recordNudgeAction(
  userId: string,
  nutrient: Nutrient,
  suggestionType: SuggestionSource,
  suggestionId: string,
): Promise<void> {
  const key = `nutrient_nudge_actions::${userId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    const next = [
      ...list,
      { date: todayKey(), nutrient, suggestionType, suggestionId },
    ];
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Best-effort; ignore storage errors.
  }
}

function NutrientNudge({ dayMacros, testID }: NutrientNudgeProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { userId } = useFoodIntelUserState();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const gap = useMemo(() => detectGap(dayMacros), [dayMacros]);
  const dismissKey = `nutrient_nudge_dismissed::${todayKey()}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(dismissKey);
        if (!cancelled) setDismissed(stored === '1');
      } catch {
        if (!cancelled) setDismissed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dismissKey]);

  useEffect(() => {
    if (!gap || dismissed !== false) return;
    let cancelled = false;
    (async () => {
      let pantryItems: Array<{ id?: string; name: string }> = [];
      let recipes: Array<{ id: string; title: string; ingredients?: Array<{ name: string }> }> = [];
      try {
        const pantryResp = (await pantryApi.getAll()) as unknown;
        pantryItems = extractPantryItems(pantryResp);
      } catch {
        pantryItems = [];
      }
      if (cancelled) return;
      const hasPantryMatch = !!findPantryMatch(pantryItems, gap);
      if (!hasPantryMatch) {
        try {
          const recipeResp = (await recipeApi.getSavedRecipes()) as unknown;
          recipes = extractRecipes(recipeResp);
        } catch {
          recipes = [];
        }
      }
      if (cancelled) return;
      setSuggestion(buildSuggestion(gap, pantryItems, recipes));
    })();
    return () => {
      cancelled = true;
    };
  }, [gap, dismissed]);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    try {
      await AsyncStorage.setItem(dismissKey, '1');
    } catch {
      // ignore
    }
  }, [dismissKey]);

  const handleAction = useCallback(() => {
    if (!gap || !suggestion) return;
    void recordNudgeAction(userId, gap, suggestion.source, suggestion.id);
  }, [gap, suggestion, userId]);

  if (!gap || dismissed !== false || !suggestion) return null;

  const tint = NUTRIENT_TINT[gap];
  const bg = isDark ? tint.dark : tint.light;
  const titleColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const headline = `Low on ${NUTRIENT_LABEL[gap]} today?`;
  const a11y = `${headline} ${suggestion.text}`;

  return (
    <View
      testID={testID ?? 'nutrient-nudge'}
      accessibilityRole="alert"
      accessibilityLabel={a11y}
      style={[styles.container, { backgroundColor: bg }]}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>💡</Text>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: titleColor }]}>{headline}</Text>
          <HapticTouchableOpacity
            onPress={handleAction}
            accessibilityLabel={`Try ${suggestion.text}`}
            testID="nutrient-nudge-action"
          >
            <Text style={[styles.body, { color: subColor }]}>{suggestion.text}</Text>
          </HapticTouchableOpacity>
        </View>
        <HapticTouchableOpacity
          onPress={handleDismiss}
          accessibilityLabel="Dismiss nutrient nudge"
          testID="nutrient-nudge-dismiss"
          style={styles.dismiss}
        >
          <Icon name={Icons.CLOSE} size={IconSizes.SM} color={subColor} />
        </HapticTouchableOpacity>
      </View>
    </View>
  );
}

export default React.memo(NutrientNudge);

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 22,
    marginTop: 2,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.md,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 2,
  },
  body: {
    fontSize: FontSize.sm,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: FontSize.sm * 1.4,
  },
  dismiss: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
});
