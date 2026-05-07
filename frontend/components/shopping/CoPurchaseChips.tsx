// frontend/components/shopping/CoPurchaseChips.tsx
// ROADMAP 4.0 IG5.2 — "You usually grab X with Y" chip suggestions.
//
// Powered by IG2.2 GET /api/ingredients/pairs?with=<anchor>&k=5. Renders the
// top-5 co-purchase suggestions across the user's current list-creation
// anchors, deduped + sorted by coCount. Tap → onAdd(name). Hides silently
// when no signals are available — never an empty editorial state.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { ingredientPairsApi, type IngredientPair } from '../../lib/api';

const MAX_CHIPS = 5;
const MAX_ANCHORS = 5; // Cap fan-out so a 30-item list doesn't trigger 30 calls.

export interface CoPurchaseChipsProps {
  currentItems: string[];
  onAdd: (ingredient: string) => void;
}

interface ChipModel {
  ingredient: string;
  coCount: number;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export default function CoPurchaseChips({
  currentItems,
  onAdd,
}: CoPurchaseChipsProps) {
  const [chips, setChips] = useState<ChipModel[]>([]);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? PastelDark.peach : Pastel.peach;
  const accent = Accent.peach;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  useEffect(() => {
    if (!currentItems || currentItems.length === 0) {
      setChips([]);
      return;
    }
    let cancelled = false;
    const anchors = currentItems.slice(0, MAX_ANCHORS);
    const existing = new Set(currentItems.map(normalize));
    Promise.all(
      anchors.map((a) =>
        ingredientPairsApi
          .getPairs(a, MAX_CHIPS)
          .then(
            (res) =>
              ((res?.data ?? res) as { pairs?: IngredientPair[] })?.pairs ?? [],
          )
          .catch(() => [] as IngredientPair[]),
      ),
    )
      .then((results) => {
        if (cancelled) return;
        // Merge across anchors — dedupe by ingredient name, keeping max coCount.
        const merged = new Map<string, ChipModel>();
        for (const list of results) {
          for (const p of list) {
            const key = normalize(p.ingredient);
            if (existing.has(key)) continue; // skip items already on the list
            const prev = merged.get(key);
            if (!prev || p.coCount > prev.coCount) {
              merged.set(key, { ingredient: p.ingredient, coCount: p.coCount });
            }
          }
        }
        const top = [...merged.values()]
          .sort((a, b) => b.coCount - a.coCount)
          .slice(0, MAX_CHIPS);
        setChips(top);
      })
      .catch(() => {
        if (!cancelled) setChips([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentItems.join('|')]);

  if (chips.length === 0) return null;

  return (
    <View
      testID="co-purchase-chips"
      accessibilityRole="list"
      accessibilityLabel={`You usually grab: ${chips
        .map((c) => c.ingredient)
        .join(', ')}`}
      style={[styles.card, { backgroundColor: bg }]}
    >
      <Text style={[styles.headline, { color: subtle }]}>You usually grab</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {chips.map((c) => (
          <HapticTouchableOpacity
            key={c.ingredient}
            testID={`co-purchase-chip-${c.ingredient}`}
            accessibilityRole="button"
            accessibilityLabel={`Add ${c.ingredient}`}
            onPress={() => onAdd(c.ingredient)}
            style={[styles.chip, { borderColor: accent }]}
          >
            <Text style={[styles.chipText, { color: text }]} numberOfLines={1}>
              {c.ingredient}
            </Text>
          </HapticTouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
  },
  headline: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
