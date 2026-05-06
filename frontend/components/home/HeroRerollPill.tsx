// frontend/components/home/HeroRerollPill.tsx
// ROADMAP 4.0 HX2.1 — "↻ try another" pill that re-rolls the hero.
//
// Three re-rolls per session before falling through to SurpriseMeModal.
// Each press fetches the next-ranked candidate from the same retrieval
// call (no re-fetch round-trip) and bubbles it up via onReroll. Logs
// rerolls via homeSurfaceEvent (HX7 dovetail).

import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';
import { logHomeSurfaceEvent } from '../../lib/homeSurfaceEvents';

const MAX_REROLLS = 3;

export interface HeroRerollRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  cuisine: string | null;
  cookTime: number | null;
}

export interface HeroRerollPillProps {
  /** Called with the next-ranked recipe so the screen can swap the hero. */
  onReroll: (recipe: HeroRerollRecipe) => void;
  /** Called when the user has burned all rerolls — UI should fall through
   *  to SurpriseMeModal or similar. */
  onExhausted?: () => void;
}

export default function HeroRerollPill({ onReroll, onExhausted }: HeroRerollPillProps) {
  const [rerollCount, setRerollCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? PastelDark.peach : Pastel.peach;
  const accent = Accent.peach;
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;

  const exhausted = rerollCount >= MAX_REROLLS;

  const handlePress = useCallback(async () => {
    if (loading) return;
    if (exhausted) {
      onExhausted?.();
      return;
    }
    const nextRank = rerollCount + 2; // first reroll is rank=2
    setLoading(true);
    try {
      const res = await recipeApi.heroReroll(nextRank);
      const payload = (res?.data ?? res) as {
        recipe: HeroRerollRecipe | null;
        exhausted: boolean;
      };
      logHomeSurfaceEvent({
        surface: 'today_hero',
        eventType: 'reroll',
        position: nextRank - 1,
        metadata: {
          recipeId: payload?.recipe?.id ?? null,
          rank: nextRank,
        },
      });
      if (payload?.exhausted || !payload?.recipe) {
        setRerollCount(MAX_REROLLS);
        onExhausted?.();
        return;
      }
      setRerollCount((c) => c + 1);
      onReroll(payload.recipe);
    } catch {
      // Best-effort — silent fall-through.
    } finally {
      setLoading(false);
    }
  }, [exhausted, loading, onExhausted, onReroll, rerollCount]);

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
      <HapticTouchableOpacity
        testID="hero-reroll-pill"
        accessibilityRole="button"
        accessibilityLabel={exhausted ? 'No more re-rolls — try Surprise Me' : 'Try another pick'}
        onPress={handlePress}
        disabled={loading}
        style={{
          alignSelf: 'flex-start',
          backgroundColor: bg,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 100,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: accent, marginRight: 6 }}>↻</Text>
        <Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>
          {exhausted ? 'Surprise me' : 'Try another'}
        </Text>
      </HapticTouchableOpacity>
    </View>
  );
}
