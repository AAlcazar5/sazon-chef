import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewProps, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface EditorialCardRecipe {
  id: string;
  title: string;
  imageUrl?: string;
  cookTime: number;
  calories: number;
  matchScore: number;
}

interface EditorialCardProps extends ViewProps {
  recipe: EditorialCardRecipe;
  bg: string;
  titleColor: string;
  saved: boolean;
  onToggleSave: () => void;
  onPress: () => void;
}

export function EditorialCard({ recipe, bg, titleColor, saved, onToggleSave, onPress, testID, ...props }: EditorialCardProps) {
  const shadowStyle = Platform.select({
    ios: EditorialShadows.cardRaised.ios,
    android: EditorialShadows.cardRaised.android,
    default: {},
  });

  const handleSave = () => {
    triggerHaptic('impact', ImpactStyle.light);
    onToggleSave();
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.container, { backgroundColor: bg }, shadowStyle]}
      accessibilityLabel={recipe.title}
      accessibilityRole="button"
      {...props}
    >
      <Pressable
        testID="save-button"
        onPress={handleSave}
        style={styles.saveButton}
        accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'}
        accessibilityRole="button"
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={20}
          color={saved ? '#EF4444' : '#9CA3AF'}
        />
      </Pressable>

      <View style={styles.photoContainer}>
        <Image
          source={{ uri: recipe.imageUrl }}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
        {recipe.title}
      </Text>

      <Text style={styles.meta}>
        {recipe.cookTime} min · {recipe.calories} cal · {recipe.matchScore}%
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  photoContainer: {
    width: 104,
    height: 104,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  photo: {
    width: 104,
    height: 104,
    borderRadius: 9999,
  },
  title: {
    fontFamily: EditorialFontFamily.display.regular,
    fontSize: 16,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 6,
  },
  meta: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 11,
    color: '#6B6B6B',
    textAlign: 'center',
  },
});
