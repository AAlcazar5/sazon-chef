// frontend/components/kitchen/KitchenDiscoverView.tsx
// ROADMAP 4.0 Tier A3-b — Kitchen → Discover view.
//
// Hosts the surfaces that used to live on Today: NewToYou + BrowseByFamily,
// plus the new craving chips + Cravings-Made-Real prominent tile. Tap on a
// craving chip routes back to Today with `?craving=…` because the recipe
// search machinery still lives there (A1-f leaves the search results landing
// on Today; this view is purely a discovery launcher).

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useTheme } from '../../contexts/ThemeContext';
import { Pastel, PastelDark, Accent, Colors, DarkColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { Shadows } from '../../constants/Shadows';
import { NewToYouSection } from '../home/NewToYouSection';
import { BrowseByFamilySection, type FamilyEntry } from '../home/BrowseByFamilySection';
import { useSurfaceTracking } from '../../hooks/useSurfaceTracking';

const CRAVING_CHIPS = [
  { label: 'Comfort Food', emoji: '🤗' },
  { label: 'Something Light', emoji: '🥗' },
  { label: 'Spicy', emoji: '🌶️' },
  { label: 'Sweet Tooth', emoji: '🍫' },
  { label: 'Crunchy', emoji: '🥨' },
  { label: 'Warm & Cozy', emoji: '☕' },
  { label: 'Fresh & Cold', emoji: '❄️' },
  { label: 'Cheesy', emoji: '🧀' },
  { label: 'Carb Fix', emoji: '🍝' },
  { label: 'Snacky', emoji: '🍿' },
] as const;

interface KitchenDiscoverViewProps {
  isDark: boolean;
}

export default function KitchenDiscoverView({ isDark }: KitchenDiscoverViewProps) {
  useTheme();
  const router = useRouter();
  const surfaceTracker = useSurfaceTracking();

  const eyebrow = isDark ? Accent.lavender : Accent.lavender;
  const cardBg = isDark ? PastelDark.peach : Pastel.peach;
  const accent = Accent.peach;
  const textPrimary = isDark ? DarkColors.text.primary : Colors.text.primary;
  const textSecondary = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  const handleCravingPress = (label: string) => {
    surfaceTracker.track({ surface: 'cravings_made_real', action: 'tap', recipeId: null });
    router.push(`/?craving=${encodeURIComponent(label)}` as never);
  };

  const handleCravingsTilePress = () => {
    surfaceTracker.track({ surface: 'cravings_made_real', action: 'tap', recipeId: null });
    router.push(
      `/smart-collection?id=cravings_made_real&name=${encodeURIComponent('Cravings, Made Real')}` as never,
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      testID="kitchen-discover-view"
    >
      {/* Cravings, Made Real — flagship tile */}
      <HapticTouchableOpacity
        accessibilityLabel="Cravings, Made Real collection"
        accessibilityRole="button"
        onPress={handleCravingsTilePress}
        style={[styles.flagshipTile, Shadows.SM as object, { backgroundColor: cardBg }]}
      >
        <Text style={[styles.flagshipEyebrow, { color: accent }]}>FLAGSHIP COLLECTION</Text>
        <Text style={[styles.flagshipTitle, { color: textPrimary }]}>Cravings, Made Real</Text>
        <Text style={[styles.flagshipBody, { color: textSecondary }]}>
          Real-ingredient versions of the comfort food you actually want.
        </Text>
      </HapticTouchableOpacity>

      {/* I'm craving section */}
      <View style={styles.section}>
        <Text style={[styles.sectionEyebrow, { color: eyebrow }]}>I'M CRAVING</Text>
        <View style={styles.chipRow}>
          {CRAVING_CHIPS.map((chip) => (
            <HapticTouchableOpacity
              key={chip.label}
              accessibilityLabel={`Craving ${chip.label}`}
              accessibilityRole="button"
              onPress={() => handleCravingPress(chip.label)}
              style={[
                styles.chip,
                { backgroundColor: isDark ? '#374151' : '#F3F4F6' },
              ]}
            >
              <Text style={styles.chipEmoji}>{chip.emoji}</Text>
              <Text
                style={[
                  styles.chipLabel,
                  { color: isDark ? '#D1D5DB' : '#374151' },
                ]}
              >
                {chip.label}
              </Text>
            </HapticTouchableOpacity>
          ))}
        </View>
      </View>

      {/* Existing surfaces relocated from Today */}
      <NewToYouSection
        isDark={isDark}
        userFeedback={{}}
        feedbackLoading={null}
        onRecipePress={(recipeId) => {
          surfaceTracker.track({ surface: 'new_to_you', action: 'tap', recipeId });
          router.push(`/recipe/${recipeId}` as never);
        }}
        onRecipeLongPress={() => {}}
        onLike={() => {}}
        onDislike={() => {}}
        onSave={() => {}}
      />

      <BrowseByFamilySection
        isDark={isDark}
        onFamilyPress={(entry: FamilyEntry) => {
          surfaceTracker.track({
            surface: 'browse_by_family',
            action: 'tap',
            recipeId: null,
          });
          router.push(
            `/?cuisines=${encodeURIComponent(entry.cuisines.join(','))}` as never,
          );
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
    gap: 16,
  },
  flagshipTile: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 20,
    gap: 6,
  },
  flagshipEyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  flagshipTitle: {
    fontFamily: EditorialFontFamily.display.bold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  flagshipBody: {
    fontFamily: EditorialFontFamily.body.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    gap: 10,
  },
  sectionEyebrow: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    paddingHorizontal: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    gap: 5,
  },
  chipEmoji: {
    fontSize: 15,
  },
  chipLabel: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 13,
  },
});
