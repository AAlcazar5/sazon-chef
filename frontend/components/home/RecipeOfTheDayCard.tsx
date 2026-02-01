// frontend/components/home/RecipeOfTheDayCard.tsx
// Recipe of the Day featured card component

import { View, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { RecipeCard } from '../recipe/RecipeCard';
import { Colors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
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
  onPress: (recipe: SuggestedRecipe) => void;
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
 * Displays a special featured recipe with prominent styling
 */
export default function RecipeOfTheDayCard({
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
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <Text className="text-xl">🌟</Text>
        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-2">
          Recipe of the Day
        </Text>
        <View
          className="ml-2 px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: isDark ? `${Colors.primary}33` : `${Colors.primary}22`,
          }}
        >
          <Text
            className="text-xs font-medium"
            style={{ color: isDark ? Colors.primaryLight : Colors.primaryDark }}
          >
            Featured
          </Text>
        </View>
      </View>

      {/* Recipe Card */}
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
  );
}
