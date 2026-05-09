// frontend/components/recipe/HorizontalRecipeRow.tsx
// K14: shared horizontal-scroll recipe carousel layout for the recipe-detail
// screen. Both MoreLikeThisRow and CookedNextRow used to inline the same
// 50-LOC card grid; both now compute their cards (each with its own fetch,
// privacy guard, and analytics) and pass them into this component.
//
// The wrapping Row owns *what to fetch* and *how to track taps*; this owns
// *how the row looks*.

import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import { useColorScheme } from 'nativewind';
import { Colors, DarkColors } from '../../constants/Colors';

const CARD_W = 140;
const CARD_H = 180;

export interface HorizontalRecipeCard {
  id: string;
  title: string;
  cuisine: string | null;
  cookTime: number | null;
  imageUrl: string | null;
}

export interface HorizontalRecipeRowProps {
  /** Section heading (e.g., "More like this", "Cooked this and then…"). */
  title: string;
  /** Cards to render. */
  cards: HorizontalRecipeCard[];
  /** Pastel background tint for each card. */
  cardBackgroundColor: string;
  /** Tap handler — receives the card and its position in the row. */
  onCardPress: (card: HorizontalRecipeCard, index: number) => void;
  /** testID for the outer block (also used as loading-state suffix). */
  testID: string;
  /** Prefix for per-card testIDs. Cards render as `${cardTestIdPrefix}-${id}`.
   * Required because the legacy card prefix often differs from the outer testID
   * (e.g., outer="more-like-this-row" but cards="more-like-this-card-${id}"). */
  cardTestIdPrefix: string;
  /** When true, render a centered spinner block (parent gates whether to mount). */
  loading?: boolean;
}

export default function HorizontalRecipeRow({
  title,
  cards,
  cardBackgroundColor,
  onCardPress,
  testID,
  cardTestIdPrefix,
  loading = false,
}: HorizontalRecipeRowProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const text = isDark ? DarkColors.text.primary : Colors.text.primary;
  const subtle = isDark ? DarkColors.text.secondary : Colors.text.secondary;

  if (loading) {
    return (
      <View testID={`${testID}-loading`} style={styles.loadingBlock}>
        <AnimatedActivityIndicator color={subtle} />
      </View>
    );
  }

  return (
    <View testID={testID} style={styles.block}>
      <Text style={[styles.heading, { color: text }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {cards.map((card, index) => (
          <HapticTouchableOpacity
            key={card.id}
            testID={`${cardTestIdPrefix}-${card.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${card.title}, ${card.cuisine ?? 'recipe'}`}
            onPress={() => onCardPress(card, index)}
            style={[styles.card, { backgroundColor: cardBackgroundColor }]}
          >
            {card.imageUrl ? (
              <Image
                source={{ uri: card.imageUrl }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cardImage, styles.cardImagePlaceholder]} />
            )}
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: text }]} numberOfLines={2}>
                {card.title}
              </Text>
              <Text style={[styles.cardSub, { color: subtle }]} numberOfLines={1}>
                {card.cuisine ?? 'Recipe'}
                {card.cookTime ? ` · ${card.cookTime} min` : ''}
              </Text>
            </View>
          </HapticTouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginVertical: 16 },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scroll: { paddingHorizontal: 16, gap: 12 },
  card: { width: CARD_W, height: CARD_H, borderRadius: 20, overflow: 'hidden' },
  cardImage: { width: '100%', height: 110 },
  cardImagePlaceholder: { backgroundColor: '#E5E7EB' },
  cardBody: { padding: 8 },
  cardTitle: { fontSize: 13, fontWeight: '600', lineHeight: 16 },
  cardSub: { fontSize: 11, marginTop: 2 },
  loadingBlock: { paddingVertical: 24, alignItems: 'center' },
});
