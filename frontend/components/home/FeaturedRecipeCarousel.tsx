import React from 'react';
// frontend/components/home/FeaturedRecipeCarousel.tsx
// Featured recipe carousel with top 3 recipes and swipe functionality

import { View, Text, Animated, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import CardStack from '../ui/CardStack';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { RecipeCard } from '../recipe/RecipeCard';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Spacing } from '../../constants/Spacing';
import { HapticPatterns } from '../../constants/Haptics';
import type { SuggestedRecipe } from '../../types';
import type { UserFeedback } from '../../utils/recipeUtils';

interface FeaturedRecipeCarouselProps {
  /** All suggested recipes (will take top 3) */
  recipes: SuggestedRecipe[];
  /** Current index in the carousel */
  currentIndex: number;
  /** Called when index changes */
  onIndexChange: (index: number) => void;
  /** Whether meal prep mode is enabled */
  mealPrepMode: boolean;
  /** Random button scale animation */
  randomButtonScale: Animated.Value;
  /** Random button opacity animation */
  randomButtonOpacity: Animated.Value;
  /** Called when random recipe button is pressed */
  onRandomRecipe: () => void;
  /** User feedback for recipes */
  userFeedback: Record<string, UserFeedback>;
  /** Recipe ID that is currently loading feedback */
  feedbackLoading: string | null;
  /** Called when recipe is liked */
  onLike: (recipeId: string) => Promise<void>;
  /** Called when recipe is disliked */
  onDislike: (recipeId: string) => Promise<void>;
  /** Called when recipe is pressed */
  onRecipePress: (recipeId: string) => void;
  /** Called when recipe is long-pressed */
  onLongPress: (recipe: SuggestedRecipe) => void;
  /** Called when save button is pressed */
  onSave: (recipeId: string) => void;
}

/**
 * Generates recommendation reason based on recipe scoring
 */
function getRecommendationReason(recipe: SuggestedRecipe): string {
  const reasons: string[] = [];

  if (recipe.score?.matchPercentage && recipe.score.matchPercentage >= 85) {
    reasons.push('Perfect Match');
  }
  if (recipe.score?.macroScore && recipe.score.macroScore >= 80) {
    reasons.push('Matches Your Macros');
  }
  if (recipe.score?.tasteScore && recipe.score.tasteScore >= 80) {
    reasons.push('Your Preferred Cuisine');
  }
  if ((recipe as any).mealPrepSuitable || (recipe as any).freezable) {
    reasons.push('Great for Meal Prep');
  }
  if (recipe.cookTime && recipe.cookTime <= 30) {
    reasons.push('Quick Recipe');
  }
  if (recipe.healthGrade === 'A' || recipe.healthGrade === 'B') {
    reasons.push('Highly Nutritious');
  }

  return reasons.length > 0 ? reasons[0] : 'Recommended for You';
}

/**
 * Featured recipe carousel component
 * Shows top 3 recipes with swipe navigation
 */
function FeaturedRecipeCarousel({
  recipes,
  currentIndex,
  onIndexChange,
  mealPrepMode,
  randomButtonScale,
  randomButtonOpacity,
  onRandomRecipe,
  userFeedback,
  feedbackLoading,
  onLike,
  onDislike,
  onRecipePress,
  onLongPress,
  onSave,
}: FeaturedRecipeCarouselProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (recipes.length === 0) {
    return null;
  }

  // Get top 3 recipes for featured rotation
  const topRecipes = recipes.slice(0, Math.min(3, recipes.length));
  const recipe = topRecipes[currentIndex] || topRecipes[0];
  const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
  const isFeedbackLoading = feedbackLoading === recipe.id;

  const recommendationReason = getRecommendationReason(recipe);
  const isTopMatch = recipe.score?.matchPercentage && recipe.score.matchPercentage >= 85;

  // Handle swipe to next featured recipe
  const handleSwipeNext = () => {
    if (topRecipes.length > 1) {
      const nextIndex = (currentIndex + 1) % topRecipes.length;
      onIndexChange(nextIndex);
      HapticPatterns.buttonPress();
    }
  };

  // Handle swipe to previous featured recipe
  const handleSwipePrev = () => {
    if (topRecipes.length > 1) {
      const prevIndex = currentIndex === 0 ? topRecipes.length - 1 : currentIndex - 1;
      onIndexChange(prevIndex);
      HapticPatterns.buttonPress();
    }
  };

  return (
    <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl }}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text className="text-xl font-black text-gray-900 dark:text-gray-100">
            {mealPrepMode ? '🍱 Meal Prep Recipes' : "Today's Recommendation"}
          </Text>
          {recipes.length > 1 && !mealPrepMode && (
            <Text className="text-xs text-gray-500 dark:text-gray-400" style={{ marginTop: Spacing.xs }}>
              Swipe to see more top matches
            </Text>
          )}
        </View>

        {/* Surprise Me pill button */}
        <Animated.View
          style={{
            transform: [{ scale: randomButtonScale }],
            opacity: randomButtonOpacity,
          }}
        >
          <HapticTouchableOpacity
            onPress={onRandomRecipe}
            hapticStyle="medium"
            accessibilityLabel="Surprise Me"
            accessibilityRole="button"
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FB923C', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pill}
            >
              <Text style={styles.pillEmoji}>🎰</Text>
              <Text style={styles.pillLabel}>Surprise Me!</Text>
            </LinearGradient>
          </HapticTouchableOpacity>
        </Animated.View>
      </View>

      {/* Featured Recipe Card with Swipe */}
      <View>
        <CardStack
          onSwipeRight={() => {
            onLike(recipe.id);
            handleSwipeNext();
          }}
          onSwipeLeft={() => {
            onDislike(recipe.id);
            handleSwipeNext();
          }}
          onSwipeUp={handleSwipeNext}
          onSwipeDown={handleSwipePrev}
        >
          <RecipeCard
            recipe={recipe}
            variant="list"
            onPress={onRecipePress}
            onLongPress={onLongPress}
            onLike={onLike}
            onDislike={onDislike}
            onSave={onSave}
            feedback={feedback}
            isFeedbackLoading={isFeedbackLoading}
            isDark={isDark}
            showDescription={true}
            showTopMatchBadge={!!isTopMatch}
            recommendationReason={recommendationReason}
            showSwipeIndicators={topRecipes.length > 1}
            swipeIndicatorCount={topRecipes.length}
            swipeIndicatorIndex={currentIndex}
            className="mb-4"
          />
        </CardStack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 100,
    gap: Spacing.sm,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.30,
    shadowRadius: 6,
    elevation: 5,
  },
  pillEmoji: {
    fontSize: 16,
  },
  pillLabel: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

export default React.memo(FeaturedRecipeCarousel);
