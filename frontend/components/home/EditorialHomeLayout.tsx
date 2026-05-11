import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { EditorialMacroWidgets } from './EditorialMacroWidgets';
import { VerticalCategoryRail } from '../ui/VerticalCategoryRail';
import { PlateHeroCard } from '../ui/PlateHeroCard';
import HeroCohortOverlay from './HeroCohortOverlay';
import PantryPlateHeroCard from './PantryPlateHeroCard';
import KitchenIQPromoCard from './KitchenIQPromoCard';
import ReverseDiscoveryCard, {
  type ReverseDiscoveryCandidate,
} from '../today/ReverseDiscoveryCard';
import { useTonightsPlate } from '../../hooks/useTonightsPlate';
import { useReverseDiscovery } from '../../hooks/useReverseDiscovery';
import { openSazonWithSeed } from '../../lib/sazonTabShortcut';
import type { SuggestedRecipe } from '../../types';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'];

function getDefaultCategoryForHour(hour: number): string {
  if (hour >= 4 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 15) return 'Lunch';
  if (hour >= 15 && hour < 17) return 'Snacks';
  if (hour >= 17 && hour < 21) return 'Dinner';
  return 'Dessert';
}

interface MacroPair {
  consumed: number;
  goal: number;
}

interface EditorialHomeLayoutProps {
  heroRecipe: SuggestedRecipe | null;
  recipePool?: SuggestedRecipe[];
  savedIds: Set<string>;
  /** ROADMAP 4.0 HX1.4 — macro widgets render only when all five are
   *  provided. Pass `undefined` (instead of fake placeholders) when no
   *  D14 snapshot is available so the page never ships fake numbers. */
  calories?: MacroPair;
  protein?: MacroPair;
  carbs?: MacroPair;
  fat?: MacroPair;
  fiber?: MacroPair;
  onRecipePress: (id: string) => void;
  onToggleSave: (id: string) => void;
}

export function EditorialHomeLayout({
  heroRecipe,
  recipePool,
  savedIds,
  calories,
  protein,
  carbs,
  fat,
  fiber,
  onRecipePress,
  onToggleSave,
}: EditorialHomeLayoutProps) {
  const [activeCategory, setActiveCategory] = useState(() =>
    getDefaultCategoryForHour(new Date().getHours())
  );

  const displayedHero = React.useMemo(() => {
    if (!recipePool || recipePool.length === 0) return heroRecipe;
    const wanted = activeCategory.toLowerCase();
    const match = recipePool.find(
      (r) => (((r as unknown as { mealType?: string }).mealType ?? '')).toLowerCase()
        === wanted.replace(/s$/, ''),
    );
    return match || heroRecipe;
  }, [activeCategory, recipePool, heroRecipe]);

  const { plate: tonightsPlate } = useTonightsPlate();
  // ROADMAP 4.0 I2.4 — "your market has X" reverse-discovery card.
  // Auto-hides for en/en-US users via the backend short-circuit.
  const { payload: reverseDiscovery } = useReverseDiscovery();
  const handleAskAboutDiscovery = React.useCallback(
    (candidate: ReverseDiscoveryCandidate) => {
      const seed = `Tell me about ${candidate.localName} — what's a good way in?`;
      openSazonWithSeed(seed);
    },
    []
  );

  return (
    <>
      {/* Hero: plate-on-pastel + vertical category rail */}
      {displayedHero && (
        <View style={styles.heroRow}>
          <VerticalCategoryRail
            categories={CATEGORIES}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
          <View style={styles.heroCard}>
            <PlateHeroCard
              testID="home-hero-card"
              recipe={{
                id: displayedHero.id,
                title: displayedHero.title,
                imageUrl: displayedHero.imageUrl,
                /* ROADMAP 4.0 A1-a — cuisine-led eyebrow, lifestyle voice */
                eyebrow: (() => {
                  const cuisine = (displayedHero as { cuisine?: string }).cuisine?.toString().toUpperCase() || 'TONIGHT';
                  const matchPct = displayedHero.score?.matchPercentage;
                  return matchPct ? `${cuisine} · ${matchPct}% MATCH` : cuisine;
                })(),
                cookTime: displayedHero.cookTime,
                calories: displayedHero.calories,
              }}
              onPress={() => onRecipePress(displayedHero.id)}
              saved={savedIds.has(displayedHero.id)}
              onToggleSave={() => onToggleSave(displayedHero.id)}
            />
            {/* ROADMAP 4.0 HX2.3 — Friend cohort overlay. Hides silently when
                <2 friends cooked or below privacy floor. */}
            <HeroCohortOverlay recipeId={displayedHero.id} />
          </View>
        </View>
      )}

      {/* I2.4 — reverse-discovery surface ("YOUR MARKET HAS mandioca").
          Returns null for en-US users; visible only for non-en locales
          where the catalog has a fresh-to-you common ingredient. */}
      <ReverseDiscoveryCard
        payload={reverseDiscovery}
        onAsk={handleAskAboutDiscovery}
      />

      {/* Tonight's pantry plate hero card — renders between hero and macro widgets */}
      {tonightsPlate && (
        <PantryPlateHeroCard plate={tonightsPlate} />
      )}

      {/* DidYouKnowCard moved to Kitchen → Discover view (its natural home —
          educational discovery surface, not the personalized Today feed). */}

      {/* Group 10S Surface 4 — Kitchen IQ promo for the most recent unlock */}
      <KitchenIQPromoCard />

      {/* Macro widget row — HX1.4: renders only when real macro data is
          wired. Hardcoded placeholders are gone; the grid hides cleanly
          on cold-start (no D14 snapshot) instead of shipping fake numbers. */}
      {calories && protein && carbs && fat && fiber && (
        <EditorialMacroWidgets
          calories={calories}
          protein={protein}
          carbs={carbs}
          fat={fat}
          fiber={fiber}
        />
      )}

    </>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    paddingTop: 18,
    // HX3.2 follow-up: trimmed 28 → 16. The original 28 made sense when
    // the recipe hero stacked above 5 full-width discovery cards; now
    // that those discovery surfaces live in a horizontal DiscoveryStrip
    // (often null on cold-start), 28 produced a visible gap between the
    // hero and the next section. 16 matches standard card spacing.
    marginBottom: 16,
  },
  heroCard: {
    flex: 1,
    marginRight: 20,
  },
});
