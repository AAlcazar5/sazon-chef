import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { Pastel, PastelDark } from '../../constants/Colors';
import { CATEGORY_COLORS } from '../../constants/CategoryColors';

export interface PantryMatchCardData {
  id: string;
  title: string;
  cuisine: string;
  cookTime: number;
  imageUrl: string | null;
  calories: number;
  matchPercentage: number;
  missingIngredients: string[];
}

interface Props {
  recipe: PantryMatchCardData;
  index: number;
  isDark: boolean;
  onPress: (id: string) => void;
}

const PASTEL_ROTATION_LIGHT = [Pastel.peach, Pastel.sage, Pastel.lavender, Pastel.sky, Pastel.blush, Pastel.golden];
const PASTEL_ROTATION_DARK = [PastelDark.peach, PastelDark.sage, PastelDark.lavender, PastelDark.sky, PastelDark.blush, PastelDark.golden];

const PHOTO_SIZE = 84;

export function PantryMatchCard({ recipe, index, isDark, onPress }: Props) {
  const cuisineToken = CATEGORY_COLORS[recipe.cuisine];
  const fallbackBg = isDark
    ? PASTEL_ROTATION_DARK[index % PASTEL_ROTATION_DARK.length]
    : PASTEL_ROTATION_LIGHT[index % PASTEL_ROTATION_LIGHT.length];
  const bg = cuisineToken
    ? (isDark ? cuisineToken.bgDark : cuisineToken.bg)
    : fallbackBg;
  const emoji = cuisineToken?.emoji ?? '🍽️';

  const titleColor = isDark ? '#F3F4F6' : '#111827';
  const metaColor = isDark ? 'rgba(255,255,255,0.7)' : '#6B7280';

  const matchPct = recipe.matchPercentage;
  const matchTone =
    matchPct >= 90 ? { bg: '#10B981', fg: '#FFFFFF' }
    : matchPct >= 70 ? { bg: '#FA7E12', fg: '#FFFFFF' }
    : { bg: '#FFFFFF', fg: '#111827' };

  const hasEverything = recipe.missingIngredients.length === 0;
  const shadow = Platform.OS === 'ios' ? EditorialShadows.cardRaised.ios : EditorialShadows.cardRaised.android;

  return (
    <HapticTouchableOpacity
      testID={`pantry-match-item-${recipe.id}`}
      accessibilityLabel={`${recipe.title}, ${matchPct}% match`}
      onPress={() => onPress(recipe.id)}
      style={[styles.card, { backgroundColor: bg }, shadow]}
    >
      <View style={styles.photoWrap}>
        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} style={styles.photo} contentFit="cover" />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={{ fontSize: 38 }}>{emoji}</Text>
          </View>
        )}
        <View style={[styles.matchPill, { backgroundColor: matchTone.bg }]}>
          <Text style={[styles.matchText, { color: matchTone.fg }]}>{matchPct}%</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={[styles.meta, { color: metaColor }]} numberOfLines={1}>
          {emoji} {recipe.cuisine} · {recipe.cookTime}m · {recipe.calories} cal
        </Text>

        {hasEverything ? (
          <View style={[styles.statusPill, styles.everythingPill]}>
            <Text style={styles.everythingText}>✓ You have everything</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, isDark ? styles.needPillDark : styles.needPillLight]}>
            <Text style={[styles.needText, { color: isDark ? '#FDE68A' : '#92400E' }]} numberOfLines={1}>
              Need: {recipe.missingIngredients.slice(0, 2).join(', ')}
              {recipe.missingIngredients.length > 2 ? ` +${recipe.missingIngredients.length - 2}` : ''}
            </Text>
          </View>
        )}
      </View>
    </HapticTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
    gap: 14,
  },
  photoWrap: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 18,
    overflow: 'visible',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 18,
  },
  photoPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPill: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    minWidth: 38,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  matchText: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: EditorialFontFamily.display.semibold,
    fontSize: 17,
    letterSpacing: -0.3,
    lineHeight: 21,
    marginBottom: 4,
  },
  meta: {
    fontFamily: EditorialFontFamily.body.medium,
    fontSize: 12,
    marginBottom: 8,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    maxWidth: '100%',
  },
  everythingPill: {
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  everythingText: {
    fontFamily: EditorialFontFamily.body.bold,
    fontSize: 11,
    color: '#047857',
    letterSpacing: 0.2,
  },
  needPillLight: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  needPillDark: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  needText: {
    fontFamily: EditorialFontFamily.body.semibold,
    fontSize: 11,
  },
});
