import React, { useRef, useEffect } from 'react';
// frontend/components/cookbook/SimilarRecipesCarousel.tsx
// Horizontal carousel showing similar recipe recommendations

import { View, Text, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { EditorialRecipeCard } from '../home/EditorialRecipeCard';
import { EditorialSectionHeader } from '../home/EditorialSectionHeader';
import { Pastel, EditorialColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import type { SavedRecipe } from '../../types';

const PASTEL_ROTATION = [Pastel.peach, Pastel.sage, Pastel.lavender, Pastel.sky, Pastel.golden, Pastel.blush];
const TITLE_ROTATION = [
  EditorialColors.pastelTitle.peach,
  EditorialColors.pastelTitle.sage,
  EditorialColors.pastelTitle.lavender,
  EditorialColors.pastelTitle.sky,
  EditorialColors.pastelTitle.golden,
  EditorialColors.pastelTitle.blush,
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.72; // ~72% of screen so next card peeks
const CARD_GAP = 12;
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

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
  viewMode:
    | 'saved'
    | 'liked'
    | 'disliked'
    | 'collections'
    | 'discover'
    | 'journey'
    | 'stories';
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

  const scrollRef = useRef<ScrollView>(null);
  const autoScrollIndexRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isCollapsed || recipes.length === 0) return;

    const DWELL_MS = 5000;

    const interval = setInterval(() => {
      if (isUserScrollingRef.current) return;

      const next = autoScrollIndexRef.current + 1;
      if (next >= recipes.length) {
        autoScrollIndexRef.current = 0;
        scrollRef.current?.scrollTo({ x: 0, animated: false });
      } else {
        autoScrollIndexRef.current = next;
        scrollRef.current?.scrollTo({ x: next * SNAP_INTERVAL, animated: true });
      }
    }, DWELL_MS);

    return () => clearInterval(interval);
  }, [isCollapsed, recipes.length]);

  if (recipes.length === 0) {
    return null;
  }

  return (
    <View className="mt-8">
      <EditorialSectionHeader
        title="You might also like"
        emoji="💡"
        count={recipes.length}
        isDark={isDark}
        isCollapsed={isCollapsed}
        onToggle={() => {
          onToggleCollapse();
          HapticPatterns.buttonPress();
        }}
      />

      {!isCollapsed && (
        <ScrollView
          ref={scrollRef}
          horizontal
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
          decelerationRate={0.92}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          disableIntervalMomentum
          onTouchStart={() => { isUserScrollingRef.current = true; }}
          onTouchEnd={() => {
            if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
            resumeTimeoutRef.current = setTimeout(() => { isUserScrollingRef.current = false; }, 3000);
          }}
          onScrollBeginDrag={() => { isUserScrollingRef.current = true; }}
          onScrollEndDrag={(e) => {
            autoScrollIndexRef.current = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
            if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
            resumeTimeoutRef.current = setTimeout(() => { isUserScrollingRef.current = false; }, 3000);
          }}
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
                <EditorialRecipeCard
                  recipe={recipe as any}
                  bg={PASTEL_ROTATION[index % PASTEL_ROTATION.length]}
                  titleColor={TITLE_ROTATION[index % TITLE_ROTATION.length]}
                  onPress={onRecipePress}
                  onLongPress={() => onRecipeLongPress(recipe)}
                  onLike={onLike}
                  onDislike={onDislike}
                  onSave={viewMode === 'saved' ? onDelete : onSave}
                  feedback={feedback}
                  isFeedbackLoading={isFeedbackLoading}
                  showDescription
                />
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default React.memo(SimilarRecipesCarousel);
