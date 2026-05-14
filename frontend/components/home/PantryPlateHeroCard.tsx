// frontend/components/home/PantryPlateHeroCard.tsx
// Group 10X Phase 2 — "Tonight's plate is in your pantry" editorial home hero card.

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import BrandButton from '../ui/BrandButton';
import { EditorialFontFamily, EditorialTypography } from '../../constants/Typography';
import { Pastel, PastelDark, Accent } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { BorderRadius } from '../../constants/Spacing';
import type { PermutationCandidate, MealComponentSlot } from '../../lib/api';

const SLOT_EMOJI: Record<MealComponentSlot, string> = {
  protein: '🥩',
  base: '🍚',
  vegetable: '🥬',
  sauce: '🥣',
  garnish: '🌿',
};

const SLOT_PASTEL_BG: Record<MealComponentSlot, string> = {
  protein: Pastel.peach,
  base: Pastel.golden,
  vegetable: Pastel.sage,
  sauce: Pastel.sky,
  garnish: Pastel.lavender,
};

const SLOT_PASTEL_BG_DARK: Record<MealComponentSlot, string> = {
  protein: PastelDark.peach,
  base: PastelDark.golden,
  vegetable: PastelDark.sage,
  sauce: PastelDark.sky,
  garnish: PastelDark.lavender,
};

interface PantryPlateHeroCardProps {
  plate: PermutationCandidate;
}

export default function PantryPlateHeroCard({ plate }: PantryPlateHeroCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const totalCal = plate.components.reduce(
    (sum, { component, portionMultiplier }) => sum + Math.round(component.caloriesPerPortion * portionMultiplier),
    0,
  );
  const totalProtein = plate.components.reduce(
    (sum, { component, portionMultiplier }) => sum + Math.round(component.proteinG * portionMultiplier),
    0,
  );
  const totalCarbs = plate.components.reduce(
    (sum, { component, portionMultiplier }) => sum + Math.round(component.carbsG * portionMultiplier),
    0,
  );
  const totalFat = plate.components.reduce(
    (sum, { component, portionMultiplier }) => sum + Math.round(component.fatG * portionMultiplier),
    0,
  );

  const macroLine = `${totalCal} cal · ${totalProtein}g pro · ${totalCarbs}g carbs · ${totalFat}g fat`;

  const handleCookThis = useCallback(async () => {
    await AsyncStorage.setItem(
      `tonights_plate_preset:${plate.id}`,
      JSON.stringify(plate),
    ).catch(() => undefined);
    router.push({
      pathname: '/build-a-plate',
      params: { pantryOnly: 'true', preset: plate.id },
    });
  }, [plate, router]);

  const gradientColors = isDark
    ? (['rgba(129,199,132,0.14)', '#1C1C1E'] as const)
    : ([Pastel.sage, '#FAF7F4'] as const);

  const eyebrowColor = isDark ? Accent.sage : '#2E5931';
  const titleColor = isDark ? '#F9FAFB' : '#1F2937';
  const subtitleColor = isDark ? '#9CA3AF' : '#6B7280';
  const macroColor = isDark ? '#909090' : '#6B6B6B';
  const accentOrange = '#FB923C';

  return (
    <View
      style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}
      accessibilityLabel={`Tonight's plate — ${plate.components.length} ingredients already in your pantry`}
    >
      <LinearGradient colors={gradientColors} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={[EditorialTypography.eyebrow, styles.eyebrow, { color: eyebrowColor }]}>
          TONIGHT
        </Text>

        <View style={styles.titleRow} testID="pantry-plate-title">
          <Text style={[styles.title, { color: titleColor }]}>
            {"Plate's "}
          </Text>
          <Text style={[styles.titleItalic, { color: titleColor }]}>
            waiting
          </Text>
          <Text style={[styles.titlePeriod, { color: accentOrange }]}>.</Text>
        </View>

        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          {`${plate.components.length} components in your pantry — already a plate.`}
        </Text>

        <View style={styles.slotIconRow}>
          {plate.components.map(({ slot }) => (
            <View
              key={slot}
              testID={`pantry-plate-slot-icon-${slot}`}
              style={[
                styles.slotIcon,
                {
                  backgroundColor: isDark
                    ? SLOT_PASTEL_BG_DARK[slot as MealComponentSlot]
                    : SLOT_PASTEL_BG[slot as MealComponentSlot],
                },
              ]}
            >
              <Text style={styles.slotEmoji}>{SLOT_EMOJI[slot as MealComponentSlot]}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.macros, { color: macroColor }]} testID="pantry-plate-macros">
          {macroLine}
        </Text>

        <BrandButton
          label="Cook this"
          variant="sage"
          onPress={handleCookThis}
          accessibilityLabel="Cook tonight's pantry plate"
          testID="pantry-plate-cta"
          style={styles.cta}
        />
      </LinearGradient>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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
    ...cardShadow,
  },
  cardLight: {
    backgroundColor: Pastel.sage,
  },
  cardDark: {
    backgroundColor: '#1C1C1E',
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
  },
  eyebrow: {
    color: '#2E5931',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 0,
  },
  title: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  titleItalic: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  titlePeriod: {
    fontFamily: EditorialFontFamily.displayItalic.bold,
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  slotIconRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  slotIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmoji: {
    fontSize: 18,
  },
  macros: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  cta: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
});
