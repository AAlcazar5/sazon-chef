import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from 'nativewind';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { DarkColors, HeroPlatesDark } from '../../constants/Colors';

interface MostCookedHeroProps {
  title: string;
  accentWord: string;
  imageUrl?: string;
  cookCount: number;
}

export function MostCookedHero({ title, accentWord, imageUrl, cookCount }: MostCookedHeroProps) {
  const parts = title.split(accentWord);
  const plateShadow =
    Platform.OS === 'ios' ? EditorialShadows.platePhoto.ios : EditorialShadows.platePhoto.android;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  // Wine plate per COLORS.md spec — Cookbook "Most cooked" hero
  const plate = HeroPlatesDark.pink;
  const eyebrowColor = isDark ? DarkColors.text.tertiary : '#9CA3AF';
  const cardBg = isDark ? plate.bg[0] : '#FCE4EC';
  const badgeColor = isDark ? plate.accent : '#fa7e12';
  const titleColor = isDark ? plate.ink : '#111827';
  const photoBorderColor = isDark ? plate.bg[0] : '#FFFFFF';

  return (
    <View style={styles.container} testID="most-cooked-hero">
      <Text style={[styles.eyebrow, { color: eyebrowColor }]}>MOST COOKED</Text>
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.badgeContainer}>
          <Text style={[styles.badge, { color: badgeColor }]}>MADE {cookCount} TIMES</Text>
        </View>
        <View style={styles.textContent}>
          <Text style={[styles.title, { color: titleColor }]}>
            {parts[0]}
            <Text style={[styles.titleAccent, { color: titleColor }]}>{accentWord}</Text>
            {parts[1] || ''}
          </Text>
        </View>
        {imageUrl && (
          <View style={[styles.photoContainer, plateShadow]}>
            <Image source={{ uri: imageUrl }} style={[styles.photo, { borderColor: photoBorderColor }]} testID="most-cooked-photo" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  eyebrow: {
    ...EditorialTypography.eyebrow,
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    overflow: 'visible',
    minHeight: 140,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badge: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  textContent: {
    maxWidth: '60%',
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 22,
  },
  photoContainer: {
    position: 'absolute',
    right: -36,
    top: 20,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
});
