import React, { useCallback } from 'react';
// frontend/components/cookbook/CookbookRecipeList.tsx
// Grid and list views for cookbook recipes

import { View, Text, FlatList } from 'react-native';
import { Spacing } from '../../constants/Spacing';
import { RecipeCard } from '../recipe/RecipeCard';
import AnimatedRecipeCard from '../recipe/AnimatedRecipeCard';
import StarRating from './StarRating';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import type { SavedRecipe } from '../../types';

interface RecipeFeedback {
  liked: boolean;
  disliked: boolean;
}

interface CookbookRecipeListProps {
  /** Recipes to display */
  recipes: SavedRecipe[];
  /** Display mode */
  displayMode: 'grid' | 'list';
  /** Whether dark mode is active */
  isDark: boolean;
  /** User feedback state */
  userFeedback: Record<string, RecipeFeedback>;
  /** Recipe ID currently loading feedback */
  feedbackLoading: string | null;
  /** Set of already-animated recipe IDs */
  animatedRecipeIds: Set<string>;
  /** Callback when a recipe finishes animating */
  onAnimated: (id: string) => void;
  /** Called when a recipe is pressed */
  onRecipePress: (recipeId: string) => void;
  /** Called when a recipe is long-pressed */
  onRecipeLongPress: (recipe: SavedRecipe) => void;
  /** Called when like is pressed */
  onLike: (recipeId: string) => void;
  /** Called when dislike is pressed */
  onDislike: (recipeId: string) => void;
  /** Called when save/unsave is pressed */
  onSave: (recipeId: string) => void;
  /** Called when rating changes */
  onRate?: (recipeId: string, rating: number | null) => void;
}

const DEFAULT_FEEDBACK = { liked: false, disliked: false };

function CookbookRecipeList({
  recipes,
  displayMode,
  isDark,
  userFeedback,
  feedbackLoading,
  animatedRecipeIds,
  onAnimated,
  onRecipePress,
  onRecipeLongPress,
  onLike,
  onDislike,
  onSave,
  onRate,
}: CookbookRecipeListProps) {
  const RecipeMeta = useCallback(({ recipe }: { recipe: SavedRecipe }) => {
    const hasNotes = !!recipe.notes;
    const hasCookCount = (recipe.cookCount || 0) > 0;
    const hasRating = recipe.rating != null;
    if (!hasNotes && !hasCookCount && !hasRating && !onRate) return null;

    return (
      <View className="flex-row items-center mt-1.5 px-1" style={{ gap: 8 }}>
        <StarRating
          rating={recipe.rating ?? null}
          onRate={onRate ? (r) => onRate(recipe.id, r) : undefined}
          size="sm"
          readonly={!onRate}
          isDark={isDark}
        />
        {hasNotes && (
          <Icon name={Icons.NOTE_OUTLINE} size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
        )}
        {hasCookCount && (
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {recipe.cookCount}x cooked
          </Text>
        )}
      </View>
    );
  }, [isDark, onRate]);

  const keyExtractor = useCallback((item: SavedRecipe) => item.id, []);

  const renderGridItem = useCallback(({ item: recipe }: { item: SavedRecipe }) => {
    const feedback = userFeedback[recipe.id] || DEFAULT_FEEDBACK;
    const isFeedbackLoading = feedbackLoading === recipe.id;

    return (
      <View style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.lg }}>
        <RecipeCard
          recipe={recipe as any}
          variant="grid"
          onPress={onRecipePress}
          onLongPress={() => onRecipeLongPress(recipe)}
          onLike={onLike}
          onDislike={onDislike}
          onSave={onSave}
          feedback={feedback}
          isFeedbackLoading={isFeedbackLoading}
          isDark={isDark}
          footer={<RecipeMeta recipe={recipe} />}
        />
      </View>
    );
  }, [userFeedback, feedbackLoading, isDark, onRecipePress, onRecipeLongPress, onLike, onDislike, onSave, RecipeMeta]);

  const renderListItem = useCallback(({ item: recipe, index }: { item: SavedRecipe; index: number }) => {
    const feedback = userFeedback[recipe.id] || DEFAULT_FEEDBACK;
    const isFeedbackLoading = feedbackLoading === recipe.id;

    return (
      <AnimatedRecipeCard
        index={index}
        recipeId={recipe.id}
        animatedIds={animatedRecipeIds}
        onAnimated={onAnimated}
      >
        <RecipeCard
          recipe={recipe as any}
          variant="list"
          onPress={onRecipePress}
          onLongPress={() => onRecipeLongPress(recipe)}
          onLike={onLike}
          onDislike={onDislike}
          onSave={onSave}
          feedback={feedback}
          isFeedbackLoading={isFeedbackLoading}
          isDark={isDark}
          showDescription={true}
          className="mb-1"
          footer={<RecipeMeta recipe={recipe} />}
        />
      </AnimatedRecipeCard>
    );
  }, [userFeedback, feedbackLoading, isDark, animatedRecipeIds, onAnimated, onRecipePress, onRecipeLongPress, onLike, onDislike, onSave, RecipeMeta]);

  if (recipes.length === 0) {
    return (
      <View className={`${displayMode === 'grid' ? 'w-full' : ''} py-8 items-center`}>
        <Text className="text-gray-500 dark:text-gray-400">No recipes on this page</Text>
      </View>
    );
  }

  if (displayMode === 'grid') {
    return (
      <FlatList
        data={recipes}
        renderItem={renderGridItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        scrollEnabled={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        windowSize={5}
        style={{ marginHorizontal: -Spacing.sm }}
      />
    );
  }

  // List View - With animations
  return (
    <FlatList
      data={recipes}
      renderItem={renderListItem}
      keyExtractor={keyExtractor}
      scrollEnabled={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      windowSize={5}
    />
  );
}

export default React.memo(CookbookRecipeList);
