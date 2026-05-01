import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { EditorialMacroWidgets } from './EditorialMacroWidgets';
import { VerticalCategoryRail } from '../ui/VerticalCategoryRail';
import { PlateHeroCard } from '../ui/PlateHeroCard';
import type { SuggestedRecipe } from '../../types';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'];

function getDefaultCategoryForHour(hour: number): string {
  if (hour >= 4 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 15) return 'Lunch';
  if (hour >= 15 && hour < 17) return 'Snacks';
  if (hour >= 17 && hour < 21) return 'Dinner';
  return 'Dessert';
}

interface EditorialHomeLayoutProps {
  heroRecipe: SuggestedRecipe | null;
  savedIds: Set<string>;
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  fiber: { consumed: number; goal: number };
  onRecipePress: (id: string) => void;
  onToggleSave: (id: string) => void;
}

export function EditorialHomeLayout({
  heroRecipe,
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

  return (
    <>
      {/* Hero: plate-on-pastel + vertical category rail */}
      {heroRecipe && (
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
                id: heroRecipe.id,
                title: heroRecipe.title,
                imageUrl: heroRecipe.imageUrl,
                eyebrow: `Featured · ${heroRecipe.score?.matchPercentage || 0}% match`,
                cookTime: heroRecipe.cookTime,
                calories: heroRecipe.calories,
              }}
              onPress={() => onRecipePress(heroRecipe.id)}
              saved={savedIds.has(heroRecipe.id)}
              onToggleSave={() => onToggleSave(heroRecipe.id)}
            />
          </View>
        </View>
      )}

      {/* Macro widget row */}
      <EditorialMacroWidgets
        calories={calories}
        protein={protein}
        carbs={carbs}
        fat={fat}
        fiber={fiber}
      />

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
