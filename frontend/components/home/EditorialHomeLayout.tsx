import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { EditorialGreeting } from './EditorialGreeting';
import { EditorialMacroWidgets } from './EditorialMacroWidgets';
import { EditorialQuickPicks } from './EditorialQuickPicks';
import { SurpriseFAB } from './SurpriseFAB';
import { VerticalCategoryRail } from '../ui/VerticalCategoryRail';
import { PlateHeroCard } from '../ui/PlateHeroCard';
import type { SuggestedRecipe } from '../../types';

const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Dessert'];

interface EditorialHomeLayoutProps {
  userName?: string;
  heroRecipe: SuggestedRecipe | null;
  quickPickRecipes: SuggestedRecipe[];
  savedIds: Set<string>;
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  streak: number;
  onSearchPress: () => void;
  onNotificationsPress: () => void;
  onRecipePress: (id: string) => void;
  onToggleSave: (id: string) => void;
  onSeeAllPicks: () => void;
  onSurprisePress: () => void;
}

export function EditorialHomeLayout({
  userName,
  heroRecipe,
  quickPickRecipes,
  savedIds,
  calories,
  protein,
  streak,
  onSearchPress,
  onNotificationsPress,
  onRecipePress,
  onToggleSave,
  onSeeAllPicks,
  onSurprisePress,
}: EditorialHomeLayoutProps) {
  const [activeCategory, setActiveCategory] = useState('Dinner');

  const quickPicks = quickPickRecipes.slice(0, 4).map((r) => ({
    id: r.id,
    title: r.title,
    imageUrl: r.imageUrl,
    cookTime: r.cookTime || 0,
    calories: r.calories || 0,
    matchScore: r.score?.matchPercentage || 0,
  }));

  return (
    <>
      {/* Top bar + editorial headline */}
      <EditorialGreeting
        userName={userName}
        onSearchPress={onSearchPress}
        onNotificationsPress={onNotificationsPress}
      />

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
        streak={streak}
      />

      {/* Quick picks grid */}
      <EditorialQuickPicks
        recipes={quickPicks}
        savedIds={savedIds}
        onRecipePress={onRecipePress}
        onToggleSave={onToggleSave}
        onSeeAll={onSeeAllPicks}
      />

      {/* Surprise FAB — absolute positioned */}
      <SurpriseFAB onPress={onSurprisePress} />
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
