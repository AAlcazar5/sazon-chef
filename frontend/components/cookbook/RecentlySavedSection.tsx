import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, type ListRenderItem } from 'react-native';
import { Image } from 'expo-image';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel } from '../../constants/Colors';

interface SavedRecipe {
  id: string;
  title: string;
  imageUrl?: string;
}

interface RecentlySavedSectionProps {
  recipes: SavedRecipe[];
  onSort: () => void;
  onRecipePress: (id: string) => void;
}

const BG_ROTATION = [Pastel.peach, Pastel.sage, Pastel.lavender];

export function RecentlySavedSection({ recipes, onSort, onRecipePress }: RecentlySavedSectionProps) {
  const renderItem = useCallback<ListRenderItem<SavedRecipe>>(
    ({ item: recipe, index }) => (
      <Pressable
        testID={`saved-recipe-${recipe.id}`}
        onPress={() => onRecipePress(recipe.id)}
        style={styles.card}
        accessibilityLabel={recipe.title}
        accessibilityRole="button"
      >
        <View
          style={[
            styles.photoCircle,
            { backgroundColor: BG_ROTATION[index % BG_ROTATION.length] },
          ]}
        >
          {recipe.imageUrl && (
            <Image
              source={{ uri: recipe.imageUrl }}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          )}
        </View>
        <Text style={styles.recipeName} numberOfLines={2}>{recipe.title}</Text>
      </Pressable>
    ),
    [onRecipePress],
  );

  const keyExtractor = useCallback((r: SavedRecipe) => r.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>
          Recently{' '}
          <Text style={styles.sectionAccent}>saved</Text>
        </Text>
        <Pressable onPress={onSort} testID="sort-button" accessibilityRole="link">
          <Text style={styles.sortLink}>SORT</Text>
        </Pressable>
      </View>

      <FlatList
        horizontal
        data={recipes}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID="recently-saved-scroll"
        initialNumToRender={6}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
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
  sortLink: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#fa7e12',
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    alignItems: 'center',
    width: 100,
  },
  photoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  recipeName: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
});
