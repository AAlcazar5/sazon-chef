import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Pastel, PastelDark } from '../../constants/Colors';
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

const PASTEL_ROTATION_LIGHT = [Pastel.peach, Pastel.sage, Pastel.lavender, Pastel.sky];
const PASTEL_ROTATION_DARK = [PastelDark.peach, PastelDark.sage, PastelDark.lavender, PastelDark.sky];
const TITLE_ROTATION_LIGHT = [
  EditorialColors.pastelTitle.peach,
  EditorialColors.pastelTitle.sage,
  EditorialColors.pastelTitle.lavender,
  EditorialColors.pastelTitle.sky,
];
const TITLE_ROTATION_DARK = ['#FFD9B0', '#C8E6CA', '#E1BEE7', '#BBDEFB'];

export function EditorialQuickPicks({ recipes, savedIds, onRecipePress, onToggleSave, onSeeAll }: EditorialQuickPicksProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const displayRecipes = recipes.slice(0, 4);
  const headerColor = isDark ? '#F5EFE6' : '#111827';
  const rotation = isDark ? PASTEL_ROTATION_DARK : PASTEL_ROTATION_LIGHT;
  const titleRotation = isDark ? TITLE_ROTATION_DARK : TITLE_ROTATION_LIGHT;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: headerColor }]}>
          Quick{' '}
          <Text style={[styles.sectionAccent, { color: headerColor }]}>picks</Text>
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
              bg={rotation[i % rotation.length]}
              titleColor={titleRotation[i % titleRotation.length]}
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
