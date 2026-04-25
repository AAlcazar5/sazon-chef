import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';

interface MealSlotRecipe {
  id: string;
  title: string;
  imageUrl?: string;
  calories: number;
  protein: number;
  cookTime: number;
}

interface MealSlotCardProps {
  time: string;
  mealType: string;
  recipe?: MealSlotRecipe;
  onPress: () => void;
}

export function MealSlotCard({ time, mealType, recipe, onPress }: MealSlotCardProps) {
  const shadowStyle = Platform.select({
    ios: EditorialShadows.cardRaised.ios,
    android: EditorialShadows.cardRaised.android,
    default: {},
  });

  return (
    <Pressable
      testID={`meal-slot-${mealType.toLowerCase()}`}
      onPress={onPress}
      style={[styles.container, shadowStyle]}
      accessibilityRole="button"
      accessibilityLabel={recipe ? `${mealType}: ${recipe.title}` : `Add ${mealType}`}
    >
      <View style={styles.content}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.mealType}>{mealType}</Text>
        {recipe ? (
          <>
            <Text style={styles.recipeTitle}>{recipe.title}</Text>
            <Text style={styles.meta}>
              {recipe.calories} · {recipe.protein}g protein · {recipe.cookTime} min
            </Text>
          </>
        ) : (
          <Text style={styles.placeholder}>Tap to add a recipe</Text>
        )}
      </View>
      {recipe?.imageUrl && (
        <Image source={{ uri: recipe.imageUrl }} style={styles.photo} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },
  content: {
    flex: 1,
  },
  time: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  mealType: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 16,
    color: '#111827',
    marginBottom: 6,
  },
  recipeTitle: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  meta: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 12,
    color: '#9CA3AF',
  },
  placeholder: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    color: '#D1D5DB',
    fontStyle: 'italic',
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginLeft: 12,
  },
});
