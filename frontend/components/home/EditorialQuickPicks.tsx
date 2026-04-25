import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Pastel } from '../../constants/Colors';
import { EditorialColors } from '../../constants/Colors';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { EditorialCard } from '../ui/EditorialCard';

interface QuickPickRecipe {
  id: string;
  title: string;
  imageUrl?: string;
  cookTime: number;
  calories: number;
  matchScore: number;
}

interface EditorialQuickPicksProps {
  recipes: QuickPickRecipe[];
  savedIds: Set<string>;
  onRecipePress: (id: string) => void;
  onToggleSave: (id: string) => void;
  onSeeAll: () => void;
}

const PASTEL_ROTATION = [Pastel.peach, Pastel.sage, Pastel.lavender, Pastel.sky];
const TITLE_ROTATION = [
  EditorialColors.pastelTitle.peach,
  EditorialColors.pastelTitle.sage,
  EditorialColors.pastelTitle.lavender,
  EditorialColors.pastelTitle.sky,
];

export function EditorialQuickPicks({ recipes, savedIds, onRecipePress, onToggleSave, onSeeAll }: EditorialQuickPicksProps) {
  const displayRecipes = recipes.slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          Quick{' '}
          <Text style={styles.sectionAccent}>picks</Text>
        </Text>
        <Pressable onPress={onSeeAll} accessibilityRole="link" testID="see-all">
          <Text style={styles.seeAll}>SEE ALL →</Text>
        </Pressable>
      </View>

      <View style={styles.grid} testID="picks-grid">
        {displayRecipes.map((recipe, i) => (
          <View key={recipe.id} style={styles.gridItem}>
            <EditorialCard
              recipe={recipe}
              bg={PASTEL_ROTATION[i % PASTEL_ROTATION.length]}
              titleColor={TITLE_ROTATION[i % TITLE_ROTATION.length]}
              saved={savedIds.has(recipe.id)}
              onToggleSave={() => onToggleSave(recipe.id)}
              onPress={() => onRecipePress(recipe.id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    ...EditorialTypography.sectionTitle,
    color: '#111827',
  },
  sectionAccent: {
    ...EditorialTypography.sectionAccent,
    color: '#111827',
  },
  seeAll: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#fa7e12',
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
  },
});
