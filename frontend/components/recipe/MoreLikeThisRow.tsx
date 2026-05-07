// frontend/components/recipe/MoreLikeThisRow.tsx
// ROADMAP 4.0 RD2.3 — "More like this" horizontal carousel.
//
// Anchored on the *current recipe's* embedding (not the user's context
// vector — that's the home feed's job). Lazy-loads on first mount; renders
// the Sazon `thinking` mascot while loading; hides silently on empty so
// the detail screen never shows a sad "no recommendations" pill.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Colors, DarkColors } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';
import { track } from '../../lib/analytics';

export interface MoreLikeThisRowProps {
  /** Anchor recipe id. Carousel hides when null/empty. */
  recipeId: string | null | undefined;
  /** Optional referrer tag plumbed onto the navigation params for telemetry. */
  referrer?: string;
}

interface Card {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
}

const CARD_W = 140;
const CARD_H = 180;

export default function MoreLikeThisRow({ recipeId, referrer = 'detail-similar' }: MoreLikeThisRowProps) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const cardBg = isDark ? PastelDark.lavender : Pastel.lavender;

  useEffect(() => {
    if (!recipeId) {
      setCards(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    recipeApi
      .getSimilarRecipes(recipeId)
      .then((res) => {
        if (cancelled) return;
        const payload = (res?.data ?? res) as { recipes?: Card[] };
        setCards(payload?.recipes ?? []);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  // Hide silently on empty / loading-with-no-prior-data.
  if (!recipeId) return null;
  if (loading && (!cards || cards.length === 0)) {
    return (
      <View testID="more-like-this-loading" style={styles.loadingBlock}>
        <ActivityIndicator color={subtle} />
      </View>
    );
  }
  if (!cards || cards.length === 0) return null;

  return (
    <View testID="more-like-this-row" style={styles.block}>
      <Text style={[styles.heading, { color: text }]}>More like this</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {cards.map((card) => (
          <HapticTouchableOpacity
            key={card.id}
            testID={`more-like-this-card-${card.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${card.title}, ${card.cuisine ?? 'recipe'}`}
            onPress={() => {
              // RD7.1 — telemetry: similar-tap with anchor + target + position.
              track('recipe_detail_similar_tap', {
                anchorRecipeId: recipeId ?? null,
                targetRecipeId: card.id,
                position: cards?.indexOf(card) ?? 0,
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
  block: {
    marginVertical: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 110,
  },
  cardImagePlaceholder: {
    backgroundColor: '#E5E7EB',
  },
  cardBody: {
    padding: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  cardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingBlock: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
