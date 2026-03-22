import React from 'react';
// frontend/components/home/RecipeOfTheDayCard.tsx
// Recipe of the Day featured card with prominent gradient banner treatment

import { View, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { RecipeCard } from '../recipe/RecipeCard';
import { Colors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import type { SuggestedRecipe } from '../../types';
import type { UserFeedback } from '../../utils/recipeUtils';

interface RecipeOfTheDayCardProps {
  /** The featured recipe */
  recipe: SuggestedRecipe;
  /** User feedback for this recipe */
  feedback: UserFeedback;
  /** Whether feedback is loading */
  isFeedbackLoading: boolean;
  /** Called when recipe is pressed */
  onPress: (recipeId: string) => void;
  /** Called when recipe is long-pressed */
  onLongPress: (recipe: SuggestedRecipe) => void;
  /** Called when like button is pressed */
  onLike: (recipeId: string) => void;
  /** Called when dislike button is pressed */
  onDislike: (recipeId: string) => void;
  /** Called when save button is pressed */
  onSave: (recipeId: string) => void;
}

/**
 * Recipe of the Day featured card component
 * Displays a special featured recipe with a prominent gradient banner
 */
function RecipeOfTheDayCard({
  recipe,
  feedback,
  isFeedbackLoading,
  onPress,
  onLongPress,
  onLike,
  onDislike,
  onSave,
}: RecipeOfTheDayCardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="px-4 mb-6">
      {/* Gradient Banner Header */}
      <LinearGradient
        colors={isDark ? ['#F97316', '#E85D04'] : ['#FF9F43', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.bannerStar}>⭐</Text>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Recipe of the Day</Text>
            <Text style={styles.bannerSubtitle}>Hand-picked just for you</Text>
          </View>
          <View style={styles.bannerBadge}>
            <Text style={styles.bannerBadgeText}>Featured</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Recipe Card — sits directly below the banner for visual continuity */}
      <View style={styles.cardWrap}>
        <RecipeCard
          recipe={recipe}
          variant="list"
          onPress={onPress}
          onLongPress={onLongPress}
          onLike={onLike}
          onDislike={onDislike}
          onSave={onSave}
          feedback={feedback}
          isFeedbackLoading={isFeedbackLoading}
          isDark={isDark}
          showDescription={true}
          showTopMatchBadge={true}
          recommendationReason="Today's Pick"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Shadows.MD,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerStar: {
    fontSize: 26,
    marginRight: 10,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  bannerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bannerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardWrap: {
    marginTop: -2, // overlap slightly with banner for seamless look
  },
});

export default React.memo(RecipeOfTheDayCard);
