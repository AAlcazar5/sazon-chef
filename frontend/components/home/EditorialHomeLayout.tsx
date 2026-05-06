import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { EditorialMacroWidgets } from './EditorialMacroWidgets';
import { VerticalCategoryRail } from '../ui/VerticalCategoryRail';
import { PlateHeroCard } from '../ui/PlateHeroCard';
import PantryPlateHeroCard from './PantryPlateHeroCard';
import DidYouKnowCard from './DidYouKnowCard';
import KitchenIQPromoCard from './KitchenIQPromoCard';
import { useTonightsPlate } from '../../hooks/useTonightsPlate';
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
          </View>
        </View>
      )}

      {/* Tonight's pantry plate hero card — renders between hero and macro widgets */}
      {tonightsPlate && (
        <PantryPlateHeroCard plate={tonightsPlate} />
      )}

      {/* Group 10R Surface 3 — rotating "Did You Know?" tip */}
      <DidYouKnowCard />

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
    marginBottom: 28,
  },
  heroCard: {
    flex: 1,
    marginRight: 20,
  },
});
