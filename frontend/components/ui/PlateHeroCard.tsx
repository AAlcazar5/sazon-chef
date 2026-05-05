import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewProps, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';
import { HeroPlatesDark, DarkColors } from '../../constants/Colors';

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
  /** Dark-mode plate variant key — defaults to "blue" (Tonight's picks navy). */
  darkPlate?: keyof typeof HeroPlatesDark;
  onPress: () => void;
  saved: boolean;
  onToggleSave: () => void;
}

export function PlateHeroCard({
  recipe,
  gradientColors = ['#E3F2FD', '#DCE8F3'],
  darkPlate = 'blue',
  onPress,
  saved,
  onToggleSave,
  testID,
  style,
  ...props
}: PlateHeroCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const plate = HeroPlatesDark[darkPlate];

  const resolvedGradient = isDark ? plate.bg : gradientColors;
  const eyebrowColor = isDark ? plate.accent : '#9CA3AF';
  const eyebrowDotColor = isDark ? plate.accent : '#fa7e12';
  const titleColor = isDark ? plate.ink : '#111827';
  const subtitleColor = isDark ? plate.ink : '#6B7280';
  const metaColor = isDark ? plate.ink : '#9CA3AF';
  const saveChipBg = isDark ? plate.accent : '#fa7e12';
  const saveChipIcon = isDark ? DarkColors.text.inverse : '#FFFFFF';
  const plateShadow = Platform.select({
    ios: EditorialShadows.platePhoto.ios,
    android: EditorialShadows.platePhoto.android,
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
      style={[styles.container, style]}
      accessibilityLabel={recipe.title}
      accessibilityRole="button"
      {...props}
    >
      <LinearGradient
        testID={testID ? `${testID}-gradient` : 'hero-gradient'}
        colors={resolvedGradient as [string, string]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.content}>
        <View style={styles.textBlock}>
          {recipe.eyebrow && (
            <Text style={[styles.eyebrow, { color: eyebrowColor }]}>
              <View style={[styles.eyebrowDot, { backgroundColor: eyebrowDotColor }]} />
              {'  '}{recipe.eyebrow}
            </Text>
          )}
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>{recipe.title}</Text>
          {recipe.subtitle && (
            <Text style={[styles.subtitle, { color: subtitleColor }]}>{recipe.subtitle}</Text>
          )}
          {(recipe.cookTime || recipe.calories) && (
            <Text style={[styles.meta, { color: metaColor }]}>
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
            cachePolicy="memory-disk"
          />
        </View>
      </View>

      <Pressable
        testID={testID ? `${testID}-save` : 'hero-save'}
        onPress={handleSave}
        style={[styles.saveChip, { backgroundColor: saveChipBg }]}
        accessibilityLabel={saved ? 'Unsave recipe' : 'Save recipe'}
        accessibilityRole="button"
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={18}
          color={saveChipIcon}
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
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    ...EditorialTypography.heroTitle,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 16,
    marginBottom: 8,
  },
  meta: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});
