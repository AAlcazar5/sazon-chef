// frontend/components/recipe/CookedNextRow.tsx
// ROADMAP 4.0 RD5.2 — "Cooked this and then…" cohort co-cook row.
//
// Mounts below MoreLikeThisRow on the recipe-detail screen. Reads from the
// RD5.1 cookedNext recommender (which itself wraps the N7.3 cohort service
// with N8.2 privacy + ≥30 anchor-cooker k-anonymity floor).
//
// Hides silently when:
//   - api returns < 4 cards (privacy-floor creep guard — never show
//     "1 person cooked this and then…")
//   - api signals belowKAnonFloor or privacyOptOut
//   - api errors

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Colors, DarkColors } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';
import { track } from '../../lib/analytics';

const MIN_VISIBLE_CARDS = 4;
const CARD_W = 140;
const CARD_H = 180;

export interface CookedNextRowProps {
  recipeId: string | null | undefined;
  referrer?: string;
}

interface Card {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
  cookCount: number;
}

export default function CookedNextRow({
  recipeId,
  referrer = 'detail-cookednext',
}: CookedNextRowProps) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const cardBg = isDark ? PastelDark.peach : Pastel.peach;

  useEffect(() => {
    if (!recipeId) {
      setCards(null);
      return;
    }
    let cancelled = false;
    recipeApi
      .getCookedNext(recipeId, MIN_VISIBLE_CARDS)
      .then((res) => {
        if (cancelled) return;
        const payload = (res?.data ?? res) as {
          recipes?: Card[];
          privacyOptOut?: boolean;
          belowKAnonFloor?: boolean;
        };
        if (payload?.privacyOptOut || payload?.belowKAnonFloor) {
          setCards([]);
          return;
        }
        setCards(payload?.recipes ?? []);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  if (!recipeId) return null;
  if (!cards || cards.length < MIN_VISIBLE_CARDS) return null;

  return (
    <View testID="cooked-next-row" style={styles.block}>
      <Text style={[styles.heading, { color: text }]}>Cooked this and then…</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {cards.map((card, index) => (
          <HapticTouchableOpacity
            key={card.id}
            testID={`cooked-next-card-${card.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${card.title}, ${card.cuisine ?? 'recipe'}`}
            onPress={() => {
              track('recipe_detail_cookednext_tap', {
                anchorRecipeId: recipeId ?? null,
                targetRecipeId: card.id,
                position: index,
              });
              router.push(
                `/recipe/${encodeURIComponent(card.id)}?referrer=${encodeURIComponent(referrer)}` as never,
              );
            }}
            style={[styles.card, { backgroundColor: cardBg }]}
          >
            {card.imageUrl ? (
              <Image
                source={{ uri: card.imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
            )}
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: text }]} numberOfLines={2}>
                {card.title}
              </Text>
              <Text style={[styles.cardSub, { color: subtle }]} numberOfLines={1}>
                {card.cuisine ?? 'Recipe'}
                {card.cookTime ? ` · ${card.cookTime} min` : ''}
              </Text>
            </View>
          </HapticTouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginVertical: 16 },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scroll: { paddingHorizontal: 16, gap: 12 },
  card: { width: CARD_W, height: CARD_H, borderRadius: 20, overflow: 'hidden' },
  cardImage: { width: '100%', height: 110 },
  cardImagePlaceholder: { backgroundColor: '#E5E7EB' },
  cardBody: { padding: 8 },
  cardTitle: { fontSize: 13, fontWeight: '600', lineHeight: 16 },
  cardSub: { fontSize: 11, marginTop: 2 },
});
