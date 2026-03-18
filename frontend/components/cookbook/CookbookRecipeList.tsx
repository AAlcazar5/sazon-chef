import React, { useCallback, useState } from 'react';
// frontend/components/cookbook/CookbookRecipeList.tsx
// Grid and list views for cookbook recipes with staggered entrance animations

import { View, Text, FlatList } from 'react-native';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { Spacing } from '../../constants/Spacing';
import { RecipeCard } from '../recipe/RecipeCard';
import AnimatedRecipeCard from '../recipe/AnimatedRecipeCard';
import StarRating from './StarRating';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import LogoMascot from '../mascot/LogoMascot';
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
  /** Whether multi-select mode is active */
  selectionMode?: boolean;
  /** Set of selected recipe IDs */
  selectedRecipeIds?: Set<string>;
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
  selectionMode = false,
  selectedRecipeIds,
}: CookbookRecipeListProps) {
  const [showChefKiss, setShowChefKiss] = useState(false);

  const handleRate = useCallback((recipeId: string, rating: number | null) => {
    if (rating === 5) {
      setShowChefKiss(true);
      setTimeout(() => setShowChefKiss(false), 1500);
    }
    onRate?.(recipeId, rating);
  }, [onRate]);

  const RecipeMeta = useCallback(({ recipe }: { recipe: SavedRecipe }) => {
    const hasNotes = !!recipe.notes;
    const hasCookCount = (recipe.cookCount || 0) > 0;
    const hasRating = recipe.rating != null;
    if (!hasNotes && !hasCookCount && !hasRating && !onRate) return null;

    return (
      <View className="flex-row items-center mt-1.5 px-1" style={{ gap: 8 }}>
        <StarRating
          rating={recipe.rating ?? null}
          onRate={onRate ? (r) => handleRate(recipe.id, r) : undefined}
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
  }, [isDark, onRate, handleRate]);

  const keyExtractor = useCallback((item: SavedRecipe) => item.id, []);

  const renderGridItem = useCallback(({ item: recipe, index }: { item: SavedRecipe; index: number }) => {
    const feedback = userFeedback[recipe.id] || DEFAULT_FEEDBACK;
    const isFeedbackLoading = feedbackLoading === recipe.id;
    // Stagger delay: 60ms per item, capped at 600ms
    const delay = Math.min(index * 60, 600);
    const isSelected = selectionMode && selectedRecipeIds?.has(recipe.id);

    return (
      <Animated.View
        entering={FadeIn.delay(delay).duration(350)}
        style={[
          { width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.lg },
          isSelected && { opacity: 0.85 },
        ]}
      >
        {selectionMode && (
          <View style={{
            position: 'absolute', top: 6, right: Spacing.sm + 6, zIndex: 10,
            width: 24, height: 24, borderRadius: 12, borderWidth: 2,
            borderColor: isSelected ? '#10B981' : (isDark ? '#6B7280' : '#D1D5DB'),
            backgroundColor: isSelected ? '#10B981' : (isDark ? 'rgba(31,41,55,0.8)' : 'rgba(255,255,255,0.8)'),
            alignItems: 'center', justifyContent: 'center',
          }}>
            {isSelected && (
              <Icon name={Icons.CHECKMARK as any} size={14} color="#FFFFFF" />
            )}
          </View>
        )}
        <RecipeCard
          recipe={recipe as any}
          variant="grid"
          onPress={onRecipePress}
          onLongPress={() => onRecipeLongPress(recipe)}
          onLike={selectionMode ? undefined : onLike}
          onDislike={selectionMode ? undefined : onDislike}
          onSave={selectionMode ? undefined : onSave}
          feedback={feedback}
          isFeedbackLoading={isFeedbackLoading}
          isDark={isDark}
          footer={selectionMode ? undefined : <RecipeMeta recipe={recipe} />}
        />
      </Animated.View>
    );
  }, [userFeedback, feedbackLoading, isDark, onRecipePress, onRecipeLongPress, onLike, onDislike, onSave, RecipeMeta, selectionMode, selectedRecipeIds]);

  const renderListItem = useCallback(({ item: recipe, index }: { item: SavedRecipe; index: number }) => {
    const feedback = userFeedback[recipe.id] || DEFAULT_FEEDBACK;
    const isFeedbackLoading = feedbackLoading === recipe.id;
    const isSelected = selectionMode && selectedRecipeIds?.has(recipe.id);

    return (
      <AnimatedRecipeCard
        index={index}
        recipeId={recipe.id}
        animatedIds={animatedRecipeIds}
        onAnimated={onAnimated}
      >
        <View style={[
          { flexDirection: 'row', alignItems: 'center' },
          isSelected && { opacity: 0.85 },
        ]}>
          {selectionMode && (
            <View style={{
              width: 24, height: 24, borderRadius: 12, borderWidth: 2, marginRight: 8,
              borderColor: isSelected ? '#10B981' : (isDark ? '#6B7280' : '#D1D5DB'),
              backgroundColor: isSelected ? '#10B981' : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {isSelected && (
                <Icon name={Icons.CHECKMARK as any} size={14} color="#FFFFFF" />
              )}
            </View>
          )}
          <View style={{ flex: 1 }}>
            <RecipeCard
              recipe={recipe as any}
              variant="list"
              onPress={onRecipePress}
              onLongPress={() => onRecipeLongPress(recipe)}
              onLike={selectionMode ? undefined : onLike}
              onDislike={selectionMode ? undefined : onDislike}
              onSave={selectionMode ? undefined : onSave}
              feedback={feedback}
              isFeedbackLoading={isFeedbackLoading}
              isDark={isDark}
              showDescription={!selectionMode}
              className="mb-1"
              footer={selectionMode ? undefined : <RecipeMeta recipe={recipe} />}
            />
          </View>
        </View>
      </AnimatedRecipeCard>
    );
  }, [userFeedback, feedbackLoading, isDark, animatedRecipeIds, onAnimated, onRecipePress, onRecipeLongPress, onLike, onDislike, onSave, RecipeMeta, selectionMode, selectedRecipeIds]);

  if (recipes.length === 0) {
    return (
      <View className={`${displayMode === 'grid' ? 'w-full' : ''} py-8 items-center`}>
        <Text className="text-gray-500 dark:text-gray-400">No recipes found</Text>
      </View>
    );
  }

  const chefKissMascot = showChefKiss ? (
    <View
      testID="chef-kiss-mascot"
      pointerEvents="none"
      style={{ position: 'absolute', alignSelf: 'center', top: '40%', zIndex: 99 }}
    >
      <LogoMascot expression="chef-kiss" size="large" />
    </View>
  ) : null;

  if (displayMode === 'grid') {
    return (
      <View style={{ position: 'relative' }}>
        <FlatList
          key="grid-2col"
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
        {chefKissMascot}
      </View>
    );
  }

  // List View - With animations
  return (
    <View style={{ position: 'relative' }}>
      <FlatList
        key="list-1col"
        data={recipes}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
      {chefKissMascot}
    </View>
  );
}

export default React.memo(CookbookRecipeList);
