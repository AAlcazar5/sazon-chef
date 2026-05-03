// frontend/components/home/PlateOfWeekCard.tsx
// Group 10X Phase 8 — "Plate of the week" editorial home card.
// Calls GET /api/composed-plates/of-the-week — gracefully renders nothing
// when the API responds with no plate (or 404).

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import BrandButton from '../ui/BrandButton';
import { usePlateOfTheWeek } from '../../hooks/usePlateOfTheWeek';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, Accent } from '../../constants/Colors';
import { BorderRadius } from '../../constants/Spacing';

export default function PlateOfWeekCard() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { plate, isLoading } = usePlateOfTheWeek();

  const handleCTA = useCallback(() => {
    if (!plate) return;
    router.push({
      pathname: '/build-a-plate',
      params: { plateId: plate.id },
    });
  }, [router, plate]);

  if (isLoading) return null;
  if (!plate) return null;

  const macroLine =
    `${Math.round(plate.totalCalories)} cal · ` +
    `${Math.round(plate.totalProtein)}g pro · ` +
    `${Math.round(plate.totalCarbs)}g carbs · ` +
    `${Math.round(plate.totalFat)}g fat`;

  const eyebrowColor = isDark ? Accent.sage : '#2E5931';
  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const macroColor = isDark ? '#9CA3AF' : '#4B5563';
  const accentOrange = '#FB923C';

  return (
    <View
      style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}
      accessibilityLabel={`Plate of the week — ${plate.title}`}
      testID="plate-of-week-card"
    >
      {plate.imageUrl ? (
        <Image
          source={{ uri: plate.imageUrl }}
          style={styles.heroImage}
          contentFit="cover"
          testID="plate-of-week-image"
        />
      ) : (
        <View
          style={[styles.heroImage, styles.heroFallback]}
          testID="plate-of-week-image"
        />
      )}
      <LinearGradient
        colors={isDark ? (['rgba(28,28,30,0.0)', 'rgba(28,28,30,0.92)'] as const) : (['rgba(255,255,255,0.0)', 'rgba(255,255,255,0.96)'] as const)}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.content}>
        <Text
          style={[EditorialTypography.eyebrow, { color: eyebrowColor }]}
        >
          PLATE OF THE WEEK
        </Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
            {plate.title}
          </Text>
          <Text style={[styles.titlePeriod, { color: accentOrange }]}>.</Text>
        </View>
        <Text
          style={[styles.macros, { color: macroColor }]}
          testID="plate-of-week-macros"
        >
          {macroLine}
        </Text>
        <BrandButton
          label="Build this plate"
          variant="sage"
          onPress={handleCTA}
          accessibilityLabel="Build this plate of the week"
          testID="plate-of-week-cta"
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {},
});

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 16,
    minHeight: 280,
    ...cardShadow,
  },
  cardLight: {
    backgroundColor: '#FAF7F4',
  },
  cardDark: {
    backgroundColor: '#1C1C1E',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroFallback: {
    backgroundColor: Pastel.sage,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '70%',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
    marginTop: 'auto',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  title: {
    flexShrink: 1,
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 26,
    letterSpacing: -0.7,
    lineHeight: 30,
  },
  titlePeriod: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 26,
    letterSpacing: -0.7,
    lineHeight: 30,
  },
  macros: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});
