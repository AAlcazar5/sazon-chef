// frontend/components/recipe/MoreLikeThisRow.tsx
// ROADMAP 4.0 RD2.3 — "More like this" horizontal carousel.
//
// Anchored on the *current recipe's* embedding (not the user's context
// vector — that's the home feed's job). Lazy-loads on first mount; renders
// the Sazon `thinking` mascot while loading; hides silently on empty so
// the detail screen never shows a sad "no recommendations" pill.

import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';
import { track } from '../../lib/analytics';
import HorizontalRecipeRow, {
  type HorizontalRecipeCard,
} from './HorizontalRecipeRow';

export interface MoreLikeThisRowProps {
  /** Anchor recipe id. Carousel hides when null/empty. */
  recipeId: string | null | undefined;
  /** Optional referrer tag plumbed onto the navigation params for telemetry. */
  referrer?: string;
}

export default function MoreLikeThisRow({
  recipeId,
  referrer = 'detail-similar',
}: MoreLikeThisRowProps) {
  const [cards, setCards] = useState<HorizontalRecipeCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
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
        const payload = (res?.data ?? res) as { recipes?: HorizontalRecipeCard[] };
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
      <HorizontalRecipeRow
        testID="more-like-this"
        cardTestIdPrefix="more-like-this-card"
        title=""
        cards={[]}
        cardBackgroundColor={cardBg}
        onCardPress={() => {}}
        loading
      />
    );
  }
  if (!cards || cards.length === 0) return null;

  return (
    <HorizontalRecipeRow
      testID="more-like-this-row"
      cardTestIdPrefix="more-like-this-card"
      title="More like this"
      cards={cards}
      cardBackgroundColor={cardBg}
      onCardPress={(card, index) => {
        // RD7.1 — telemetry: similar-tap with anchor + target + position.
        track('recipe_detail_similar_tap', {
          anchorRecipeId: recipeId ?? null,
          targetRecipeId: card.id,
          position: index,
        });
        router.push(
          `/recipe/${encodeURIComponent(card.id)}?referrer=${encodeURIComponent(referrer)}` as never,
        );
      }}
    />
  );
}
