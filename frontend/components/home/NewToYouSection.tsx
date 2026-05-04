// frontend/components/home/NewToYouSection.tsx
//
// Group 11 Phase 5 — "New to you" personalized adjacency feed.
//
// Surfaces recipes from cuisines adjacent to (but not yet explored by)
// the user. Each card carries a `personalizationReason` string from the
// backend so the surface answers the question "why am I seeing this?"
// out of the box. This is the *only acceptable form of editorial in an
// N=1 product*: a personalized ranking dressed in editorial copy.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { recipeApi } from '../../lib/api';
import { Pastel, EditorialColors } from '../../constants/Colors';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialSectionHeader } from './EditorialSectionHeader';
import { EditorialRecipeCard } from './EditorialRecipeCard';
import HomeLoadingState from './HomeLoadingState';
import type { SuggestedRecipe } from '../../types';
import type { UserFeedback } from '../../utils/recipeUtils';

const PASTEL_ROTATION = [Pastel.peach, Pastel.sage, Pastel.lavender, Pastel.sky, Pastel.golden, Pastel.blush];
const TITLE_ROTATION = [
  EditorialColors.pastelTitle.peach,
  EditorialColors.pastelTitle.sage,
  EditorialColors.pastelTitle.lavender,
  EditorialColors.pastelTitle.sky,
  EditorialColors.pastelTitle.golden,
  EditorialColors.pastelTitle.blush,
];

export interface NewToYouRecipe extends SuggestedRecipe {
  personalizationReason: string;
  sourceCuisine: string;
}

export interface NewToYouFeed {
  recipes: NewToYouRecipe[];
  isColdStart: boolean;
  sourceCuisines: string[];
  adjacentCuisines: string[];
}

interface NewToYouSectionProps {
  isDark: boolean;
  userFeedback: Record<string, UserFeedback>;
  feedbackLoading: string | null;
  onRecipePress: (recipeId: string) => void;
  onRecipeLongPress: (recipe: SuggestedRecipe) => void;
  onLike: (recipeId: string) => void;
  onDislike: (recipeId: string) => void;
  onSave: (recipeId: string) => void;
  /** Optional override — primarily for tests. */
  feedOverride?: NewToYouFeed | null;
}

export function NewToYouSection({
  isDark,
  userFeedback,
  feedbackLoading,
  onRecipePress,
  onRecipeLongPress,
  onLike,
  onDislike,
  onSave,
  feedOverride,
}: NewToYouSectionProps) {
  const [feed, setFeed] = useState<NewToYouFeed | null>(feedOverride ?? null);
  const [loading, setLoading] = useState<boolean>(feedOverride === undefined);
  const [error, setError] = useState<boolean>(false);

  const fetchFeed = useCallback(async () => {
    if (feedOverride !== undefined) return;
    try {
      setError(false);
      setLoading(true);
      const res = await recipeApi.getNewToYou({ limit: 8 });
      const data = (res.data ?? res) as NewToYouFeed;
      setFeed(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [feedOverride]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  if (loading) {
    return (
      <View accessibilityLabel="Loading new-to-you feed">
        <HomeLoadingState />
      </View>
    );
  }

  if (error || !feed || feed.recipes.length === 0) {
    // Silent skip — the home feed has plenty of other surfaces. An empty
    // "New to you" rail is the failure mode where no adjacents exist
    // (very rare; the engine covers ~100 cuisines).
    return null;
  }

  const subtitle = feed.isColdStart
    ? `From your onboarding picks: ${feed.sourceCuisines.slice(0, 3).join(' · ')}`
    : `Adjacent to ${feed.sourceCuisines.slice(0, 3).join(' · ')}`;

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel="New to you — personalized cuisine recommendations"
    >
      <EditorialSectionHeader
        emoji="✨"
        title="New to you"
        subtitle={subtitle}
        isDark={isDark}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="New to you recipes scroll"
      >
        {feed.recipes.map((recipe, idx) => {
          const bg = PASTEL_ROTATION[idx % PASTEL_ROTATION.length];
          const titleColor = TITLE_ROTATION[idx % TITLE_ROTATION.length];
          return (
            <View key={recipe.id} style={styles.cardWrapper}>
              <EditorialRecipeCard
                recipe={recipe}
                bg={bg}
                titleColor={titleColor}
                feedback={userFeedback[recipe.id] ?? { liked: false, disliked: false }}
                isFeedbackLoading={feedbackLoading === recipe.id}
                onPress={onRecipePress}
                onLongPress={onRecipeLongPress}
                onLike={onLike}
                onDislike={onDislike}
                onSave={onSave}
                footer={
                  <View
                    style={styles.reasonRow}
                    accessibilityLabel={`Reason: ${recipe.personalizationReason}`}
                  >
                    <Ionicons
                      name="sparkles"
                      size={11}
                      color={isDark ? '#F5EFE6' : '#5B4636'}
                      style={styles.reasonIcon}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.reasonText, { color: isDark ? '#F5EFE6' : '#5B4636' }]}
                    >
                      {recipe.personalizationReason}
                    </Text>
                  </View>
                }
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  cardWrapper: {
    width: 280,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 12,
    marginTop: 8,
  },
  reasonIcon: {
    marginRight: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    fontFamily: EditorialFontFamily.serif,
    fontStyle: 'italic',
  },
});
