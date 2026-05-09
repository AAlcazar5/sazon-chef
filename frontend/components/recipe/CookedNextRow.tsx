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
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';
import { track } from '../../lib/analytics';
import HorizontalRecipeRow, {
  type HorizontalRecipeCard,
} from './HorizontalRecipeRow';

const MIN_VISIBLE_CARDS = 4;

export interface CookedNextRowProps {
  recipeId: string | null | undefined;
  referrer?: string;
}

export default function CookedNextRow({
  recipeId,
  referrer = 'detail-cookednext',
}: CookedNextRowProps) {
  const [cards, setCards] = useState<HorizontalRecipeCard[] | null>(null);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
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
          recipes?: HorizontalRecipeCard[];
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
    <HorizontalRecipeRow
      testID="cooked-next-row"
      cardTestIdPrefix="cooked-next-card"
      title="Cooked this and then…"
      cards={cards}
      cardBackgroundColor={cardBg}
      onCardPress={(card, index) => {
        track('recipe_detail_cookednext_tap', {
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
