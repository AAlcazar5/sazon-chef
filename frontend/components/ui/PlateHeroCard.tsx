import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewProps, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface PlateHeroRecipe {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  eyebrow?: string;
  cookTime?: number;
  calories?: number;
}

interface PlateHeroCardProps extends ViewProps {
  recipe: PlateHeroRecipe;
  gradientColors?: readonly [string, string];
  onPress: () => void;
  saved: boolean;
  onToggleSave: () => void;
}

export function PlateHeroCard({
  recipe,
  gradientColors = ['#E3F2FD', '#DCE8F3'],
  onPress,
  saved,
  onToggleSave,
  testID,
  style,
  ...props
}: PlateHeroCardProps) {
  const plateShadow = Platform.select({
    ios: EditorialShadows.platePhoto.ios,
    android: EditorialShadows.platePhoto.android,
    default: {},
  });

  const handleSave = () => {
    triggerHaptic(ImpactStyle.LIGHT);
    onToggleSave();
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.container, style]}
      accessibilityLabel={recipe.title}
      accessibilityRole="button"
      {...props}
    >
      <LinearGradient
        testID={testID ? `${testID}-gradient` : 'hero-gradient'}
        colors={gradientColors as [string, string]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        <View style={styles.textBlock}>
          {recipe.eyebrow && (
            <Text style={styles.eyebrow}>
              <View style={styles.eyebrowDot} />
              {'  '}{recipe.eyebrow}
            </Text>
          )}
          <Text style={styles.title} numberOfLines={2}>{recipe.title}</Text>
          {recipe.subtitle && (
            <Text style={styles.subtitle}>{recipe.subtitle}</Text>
          )}
          {(recipe.cookTime || recipe.calories) && (
            <Text style={styles.meta}>
              {recipe.cookTime && `${recipe.cookTime} min`}
              {recipe.cookTime && recipe.calories && ' · '}
              {recipe.calories && `${recipe.calories} cal`}
            </Text>
          )}
        </View>

        <View testID={testID ? `${testID}-photo` : 'hero-photo'} style={[styles.photo, plateShadow]}>
          <Image
            source={{ uri: recipe.imageUrl }}
            style={styles.photoImage}
            contentFit="cover"
          />
        </View>
      </View>

      <Pressable
        testID={testID ? `${testID}-save` : 'hero-save'}
        onPress={handleSave}
        style={styles.saveChip}
        accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'}
        accessibilityRole="button"
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={18}
          color="#FFFFFF"
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'visible',
    minHeight: 180,
    position: 'relative',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  content: {
    flexDirection: 'row',
    padding: 20,
    paddingRight: 0,
  },
  textBlock: {
    flex: 1,
    paddingRight: 16,
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 10,
    letterSpacing: 1.0,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fa7e12',
  },
  title: {
    ...EditorialTypography.heroTitle,
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  meta: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 12,
    color: '#9CA3AF',
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginRight: -36,
    alignSelf: 'center',
  },
  photoImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  saveChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fa7e12',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
