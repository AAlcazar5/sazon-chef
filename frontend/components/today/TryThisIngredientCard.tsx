// frontend/components/today/TryThisIngredientCard.tsx
// ROADMAP 4.0 IG8.2 — "Try this ingredient" weekly cultural discovery card.
//
// Editorial nudge surfaced once per week. "Sumac is the Persian pantry's
// secret sour." Pairs with a beginner-friendly recipe link. Hides for 7
// days after dismiss OR after the user cooks the suggested-pairing recipe.
//
// Lifestyle voice — never didactic. Uses the `curious` mascot expression.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import CapabilityReveal from '../ui/CapabilityReveal';
import { registerCapability } from '../../services/capabilityRegistry';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import {
  ingredientDiscoveryApi,
  type DiscoverySuggestion,
} from '../../lib/api';

// ROADMAP 4.0 N6.2 — register at module load.
registerCapability({
  featureKey: 'try-this-ingredient',
  priority: 40,
  copyShort: 'New: Try this ingredient',
  copyLong:
    "Sazon now suggests one ingredient a week from a cuisine you haven't cooked from yet.",
});

const DISMISS_KEY = '@sazon/try_this_ingredient/last_dismissed_at';
const DISMISS_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface TryThisIngredientCardProps {
  /** When false, the card never fetches and never renders. Cold-start gating. */
  enabled?: boolean;
  /** Inject `now` for tests; defaults to `new Date()`. */
  now?: Date;
}

async function isWithinDismissWindow(now: Date): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(DISMISS_KEY);
    if (!stored) return false;
    const dismissedAt = Number.parseInt(stored, 10);
    if (!Number.isFinite(dismissedAt)) return false;
    return now.getTime() - dismissedAt < DISMISS_DAYS * MS_PER_DAY;
  } catch {
    return false;
  }
}

export default function TryThisIngredientCard({
  enabled = true,
  now,
}: TryThisIngredientCardProps) {
  const [suggestion, setSuggestion] = useState<DiscoverySuggestion | null>(null);
  const [hidden, setHidden] = useState(false);
  const referenceTime = now ?? new Date();
  const { isDark } = useTheme();
  const bg = isDark ? PastelDark.peach : Pastel.peach;
  const accent = Accent.peach;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const dismissed = await isWithinDismissWindow(referenceTime);
      if (cancelled) return;
      if (dismissed) {
        setHidden(true);
        return;
      }
      try {
        const res = await ingredientDiscoveryApi.weekly();
        if (cancelled) return;
        const payload = (res?.data ?? res) as {
          suggestion: DiscoverySuggestion | null;
        };
        setSuggestion(payload?.suggestion ?? null);
      } catch {
        if (!cancelled) setSuggestion(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, referenceTime]);

  if (!enabled || hidden || !suggestion) return null;

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(
        DISMISS_KEY,
        String(referenceTime.getTime()),
      );
    } catch {
      // best-effort
    }
    setHidden(true);
  };

  const handleRecipeTap = () => {
    if (!suggestion.recipeId) return;
    router.push(
      `/recipe/${encodeURIComponent(suggestion.recipeId)}?referrer=try-this-ingredient` as never,
    );
  };

  const cuisineLabel = suggestion.cuisine.toUpperCase();
  const headline =
    suggestion.primerTitle ??
    `${capitalize(suggestion.ingredient)} — a ${capitalize(suggestion.cuisine)} kitchen staple`;
  const body = suggestion.primerBody ?? `Want to try it?`;

  return (
    <CapabilityReveal featureKey="try-this-ingredient">
      <View
        testID="try-this-ingredient-card"
        accessibilityRole="summary"
        accessibilityLabel={`Try this ingredient: ${suggestion.ingredient} from ${suggestion.cuisine} cuisine`}
        style={[styles.card, { backgroundColor: bg }]}
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: accent }]}>{cuisineLabel}</Text>
          <HapticTouchableOpacity
            testID="try-this-ingredient-dismiss"
            accessibilityRole="button"
            accessibilityLabel="Dismiss for a week"
            onPress={handleDismiss}
            style={styles.dismissBtn}
          >
            <Text style={[styles.dismissText, { color: subtle }]}>×</Text>
          </HapticTouchableOpacity>
        </View>
        <Text style={[styles.headline, { color: text }]} numberOfLines={2}>
          {headline}
        </Text>
        <Text style={[styles.body, { color: subtle }]} numberOfLines={3}>
          {body}
        </Text>
        {suggestion.recipeId && suggestion.recipeTitle ? (
          <HapticTouchableOpacity
            testID="try-this-ingredient-recipe"
            accessibilityRole="button"
            accessibilityLabel={`Open recipe: ${suggestion.recipeTitle}`}
            onPress={handleRecipeTap}
            style={[styles.recipePill, { borderColor: accent }]}
          >
            <Text style={[styles.recipeLabel, { color: accent }]} numberOfLines={1}>
              Try {suggestion.recipeTitle} →
            </Text>
          </HapticTouchableOpacity>
        ) : null}
      </View>
    </CapabilityReveal>
  );
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  dismissBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 22,
  },
  headline: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  recipePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  recipeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
