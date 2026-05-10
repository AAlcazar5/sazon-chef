// frontend/components/tonight/TonightSwapSheet.tsx
// ROADMAP 4.0 T2.2 — three-card alternative sheet for the Tonight proposal.
//
// Spring entrance + dim backdrop. Tap a card → onSwap(recipeId). Backdrop
// press → onDismiss. HapticTouchableOpacity with pressedScale 0.97. Cards
// use BorderRadius.card (20).

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { BorderRadius, Spacing } from '../../constants/Spacing';
import type { Recipe } from '../../types';

interface TonightSwapSheetProps {
  visible: boolean;
  alternatives: Recipe[];
  onSwap: (recipeId: string) => void;
  onDismiss: () => void;
}

export default function TonightSwapSheet({
  visible,
  alternatives,
  onSwap,
  onDismiss,
}: TonightSwapSheetProps) {
  if (!visible) return null;

  const cards = alternatives.slice(0, 3);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable
        testID="tonight-swap-backdrop"
        accessibilityLabel="Dismiss swap sheet"
        style={styles.backdrop}
        onPress={onDismiss}
      />
      <View style={styles.sheet} accessibilityRole="menu">
        <Text style={styles.heading}>Try one of these instead</Text>
        {cards.map((recipe) => (
          <HapticTouchableOpacity
            key={recipe.id}
            testID={`tonight-swap-card-${recipe.id}`}
            accessibilityLabel={`Swap to ${recipe.title}`}
            pressedScale={0.97}
            onPress={() => onSwap(recipe.id)}
            style={styles.card}
          >
            {recipe.imageUrl ? (
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : null}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{recipe.title}</Text>
              <Text style={styles.cardMeta}>
                {recipe.cuisine} · {recipe.cookTime} min
              </Text>
            </View>
          </HapticTouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FAF7F4',
    borderTopLeftRadius: BorderRadius.sheet,
    borderTopRightRadius: BorderRadius.sheet,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: '#1F1B16',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1B16',
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#7A6F65',
    textTransform: 'capitalize',
  },
});
