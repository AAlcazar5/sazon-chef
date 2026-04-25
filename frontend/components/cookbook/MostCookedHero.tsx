import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';

interface MostCookedHeroProps {
  title: string;
  accentWord: string;
  imageUrl?: string;
  cookCount: number;
}

export function MostCookedHero({ title, accentWord, imageUrl, cookCount }: MostCookedHeroProps) {
  const parts = title.split(accentWord);
  const plateShadow = Platform.select({
    ios: EditorialShadows.platePhoto.ios,
    android: EditorialShadows.platePhoto.android,
    default: {},
  });

  return (
    <View style={styles.container} testID="most-cooked-hero">
      <Text style={styles.eyebrow}>MOST COOKED</Text>
      <View style={styles.card}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badge}>MADE {cookCount} TIMES</Text>
        </View>
        <View style={styles.textContent}>
          <Text style={styles.title}>
            {parts[0]}
            <Text style={styles.titleAccent}>{accentWord}</Text>
            {parts[1] || ''}
          </Text>
        </View>
        {imageUrl && (
          <View style={[styles.photoContainer, plateShadow]}>
            <Image source={{ uri: imageUrl }} style={styles.photo} testID="most-cooked-photo" />
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
    color: '#9CA3AF',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FCE4EC',
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
    color: '#fa7e12',
    textTransform: 'uppercase',
  },
  textContent: {
    maxWidth: '60%',
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 22,
    letterSpacing: -0.5,
    color: '#111827',
    lineHeight: 28,
  },
  titleAccent: {
    fontFamily: EditorialFontFamily.displayItalic.semibold,
    fontSize: 22,
    color: '#111827',
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
    borderColor: '#FFFFFF',
  },
});
