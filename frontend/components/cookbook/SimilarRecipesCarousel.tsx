import React from 'react';
// frontend/components/cookbook/SimilarRecipesCarousel.tsx
// Horizontal carousel showing similar recipe recommendations

import { View, Text, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { RecipeCard } from '../recipe/RecipeCard';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { HapticPatterns } from '../../constants/Haptics';
import type { SavedRecipe } from '../../types';

interface RecipeFeedback {
  liked: boolean;
  disliked: boolean;
}

interface SimilarRecipesCarouselProps {
  /** Similar recipes to display */
  recipes: SavedRecipe[];
  /** Whether the carousel is collapsed */
  isCollapsed: boolean;
  /** Toggle collapse state */
  onToggleCollapse: () => void;
  /** User feedback state for recipes */
  userFeedback: Record<string, RecipeFeedback>;
  /** Recipe ID currently loading feedback */
  feedbackLoading: string | null;
  /** Called when a recipe is pressed */
  onRecipePress: (recipeId: string) => void;
  /** Called when a recipe is long-pressed */
  onRecipeLongPress: (recipe: SavedRecipe) => void;
  /** Called when like button is pressed */
  onLike: (recipeId: string) => void;
  /** Called when dislike button is pressed */
  onDislike: (recipeId: string) => void;
  /** Called when delete/unsave button is pressed (for saved view) */
  onDelete?: (recipeId: string) => void;
  /** Called when save button is pressed (for liked/disliked view) */
  onSave?: (recipeId: string) => void;
  /** Current view mode */
  viewMode: 'saved' | 'liked' | 'disliked';
}

/**
 * Horizontal carousel showing similar recipe recommendations
 * Collapsible section with recipe cards
 */
function SimilarRecipesCarousel({
  recipes,
  isCollapsed,
  onToggleCollapse,
  userFeedback,
  feedbackLoading,
  onRecipePress,
  onRecipeLongPress,
  onLike,
  onDislike,
  onDelete,
  onSave,
  viewMode,
}: SimilarRecipesCarouselProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (recipes.length === 0) {
    return null;
  }

  return (
    <View className="mt-8 mb-12">
      <View className="px-4">
        <HapticTouchableOpacity
          onPress={() => {
            onToggleCollapse();
            HapticPatterns.buttonPress();
          }}
          className="mb-3 flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1">
            <View className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
              <Text className="text-lg">💡</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                You might also like
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <Icon
            name={isCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
            size={IconSizes.SM}
            color={isDark ? '#9CA3AF' : '#6B7280'}
            accessibilityLabel={isCollapsed ? 'Expand section' : 'Collapse section'}
          />
        </HapticTouchableOpacity>
      </View>

      {!isCollapsed && (
        <ScrollView
          horizontal
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 20 }}
          decelerationRate="fast"
          snapToInterval={292}
          snapToAlignment="start"
        >
          {recipes.map((recipe) => {
            const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
            const isFeedbackLoading = feedbackLoading === recipe.id;

            return (
              <View key={recipe.id} style={{ width: 280, marginRight: 12 }}>
                <RecipeCard
                  recipe={recipe as any}
                  variant="carousel"
                  onPress={onRecipePress}
                  onLongPress={() => onRecipeLongPress(recipe)}
                  onLike={onLike}
                  onDislike={onDislike}
                  onDelete={viewMode === 'saved' ? onDelete : undefined}
                  onSave={viewMode !== 'saved' ? onSave : undefined}
                  feedback={feedback}
                  isFeedbackLoading={isFeedbackLoading}
                  isDark={isDark}
                  showDescription={true}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default React.memo(SimilarRecipesCarousel);
