// frontend/components/cookbook/CollectionCarousel.tsx
// Horizontal carousel for a single collection's recipes (P6: purposeful motion)

import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { RecipeCard } from '../recipe/RecipeCard';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { HapticPatterns } from '../../constants/Haptics';
import type { SavedRecipe, Collection } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.72;
const CARD_GAP = 12;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

interface RecipeFeedback {
  liked: boolean;
  disliked: boolean;
}

interface CollectionCarouselProps {
  /** Collection metadata */
  collection: Collection;
  /** Recipes belonging to this collection */
  recipes: SavedRecipe[];
  /** Whether the carousel is collapsed */
  isCollapsed: boolean;
  /** Toggle collapse state */
  onToggleCollapse: () => void;
  /** Called when a recipe is pressed */
  onRecipePress: (recipeId: string) => void;
  /** Called when a recipe is long-pressed */
  onRecipeLongPress: (recipe: SavedRecipe) => void;
  /** Whether dark mode is active */
  isDark: boolean;
  /** User feedback state */
  userFeedback?: Record<string, RecipeFeedback>;
  /** Recipe ID currently loading feedback */
  feedbackLoading?: string | null;
  /** Called when like button is pressed */
  onLike?: (recipeId: string) => void;
  /** Called when dislike button is pressed */
  onDislike?: (recipeId: string) => void;
  /** Called when save/unsave button is pressed */
  onSave?: (recipeId: string) => void;
}

function CollectionCarousel({
  collection,
  recipes,
  isCollapsed,
  onToggleCollapse,
  onRecipePress,
  onRecipeLongPress,
  isDark,
  userFeedback = {},
  feedbackLoading = null,
  onLike,
  onDislike,
  onSave,
}: CollectionCarouselProps) {
  const { colorScheme } = useColorScheme();

  if (recipes.length === 0) return null;

  return (
    <View className="mt-6 mb-2">
      <View className="px-4">
        <HapticTouchableOpacity
          onPress={() => {
            onToggleCollapse();
            HapticPatterns.buttonPress();
          }}
          className="mb-3 flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
            >
              <Icon
                name={Icons.BOOKMARK}
                size={IconSizes.SM}
                color={isDark ? '#D1D5DB' : '#6B7280'}
                accessibilityLabel={collection.name}
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {collection.name}
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
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 12 }}
          decelerationRate={0.92}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          disableIntervalMomentum
        >
          {recipes.map((recipe, index) => {
            const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
            const isFeedbackLoading = feedbackLoading === recipe.id;
            const delay = Math.min(index * 80, 400);

            return (
              <Animated.View
                key={recipe.id}
                entering={FadeInRight.delay(delay).duration(350).springify()}
                style={{ width: CARD_WIDTH, marginRight: CARD_GAP }}
              >
                <RecipeCard
                  recipe={recipe as any}
                  variant="carousel"
                  onPress={onRecipePress}
                  onLongPress={() => onRecipeLongPress(recipe)}
                  onLike={onLike}
                  onDislike={onDislike}
                  onSave={onSave}
                  feedback={feedback}
                  isFeedbackLoading={isFeedbackLoading}
                  isDark={isDark}
                  showDescription={true}
                />
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default React.memo(CollectionCarousel);
