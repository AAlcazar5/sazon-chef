import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FeedbackButtons from './FeedbackButtons';

// Interfaces for this component
interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface RecipeScore {
  total: number;
  macroScore: number;
  tasteScore: number;
  matchPercentage: number;
}

interface RecipeCardProps {
  recipe: {
    id: string;
    title: string;
    description: string;
    cookTime: number;
    macros: MacroNutrients;
    cuisine: string;
    score?: RecipeScore;
    imageUrl?: string;
  };
  variant?: 'default' | 'compact' | 'featured';
  showFeedback?: boolean;
  onLike?: (recipeId: string) => void;
  onDislike?: (recipeId: string) => void;
}

export default function RecipeCard({ 
  recipe, 
  variant = 'default',
  showFeedback = true,
  onLike,
  onDislike 
}: RecipeCardProps) {
  const handleRecipePress = () => {
    router.push(`/modal?id=${recipe.id}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Variant styles
  const variantStyles = {
    default: {
      container: 'bg-white rounded-xl p-4 shadow-sm border border-gray-100',
      title: 'text-lg font-semibold text-gray-900',
      description: 'text-gray-600 text-sm',
      meta: 'flex-row justify-between items-center'
    },
    compact: {
      container: 'bg-white rounded-lg p-3 shadow-sm border border-gray-100',
      title: 'text-base font-semibold text-gray-900',
      description: 'text-gray-600 text-xs',
      meta: 'flex-row justify-between items-center'
    },
    featured: {
      container: 'bg-white rounded-2xl p-6 shadow-md border border-gray-200',
      title: 'text-xl font-bold text-gray-900',
      description: 'text-gray-600 text-base',
      meta: 'flex-row justify-between items-start'
    }
  };

  const styles = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={handleRecipePress}
      className={styles.container}
    >
      {/* Header with Title and Score */}
      <View className="flex-row justify-between items-start mb-2">
        <Text className={`${styles.title} flex-1 mr-2`}>
          {recipe.title}
        </Text>
        
        {recipe.score && (
          <View className="flex-row items-center space-x-2">
            {recipe.score.matchPercentage && (
              <View className={`px-2 py-1 rounded-full ${getScoreColor(recipe.score.total)}`}>
                <Text className="font-semibold text-xs">
                  {recipe.score.total}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Description */}
      <Text className={`${styles.description} mb-3`}>
        {recipe.description}
      </Text>

      {/* Meta Information */}
      <View className={styles.meta}>
        <View className="flex-row items-center space-x-3 flex-1">
          {/* Cook Time */}
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-gray-500 text-sm ml-1">
              {recipe.cookTime} min
            </Text>
          </View>

          {/* Cuisine */}
          <View className="bg-orange-100 px-2 py-1 rounded-full">
            <Text className="text-orange-800 text-xs font-medium">
              {recipe.cuisine}
            </Text>
          </View>

          {/* Match Percentage for featured variant */}
          {variant === 'featured' && recipe.score?.matchPercentage && (
            <View className={`px-2 py-1 rounded-full ${getMatchColor(recipe.score.matchPercentage)}`}>
              <Text className="text-white text-xs font-semibold">
                {recipe.score.matchPercentage}% Match
              </Text>
            </View>
          )}
        </View>

        {/* Feedback Buttons */}
        {showFeedback && (
          <FeedbackButtons
            recipeId={recipe.id}
            onLike={onLike}
            onDislike={onDislike}
            size={variant === 'compact' ? 'sm' : 'md'}
          />
        )}
      </View>

      {/* Macro Nutrients */}
      <View className="flex-row space-x-2 mt-3">
        <View className="bg-blue-100 px-2 py-1 rounded-full">
          <Text className="text-blue-800 text-xs">
            {recipe.macros.calories} cal
          </Text>
        </View>
        <View className="bg-green-100 px-2 py-1 rounded-full">
          <Text className="text-green-800 text-xs">
            P: {recipe.macros.protein}g
          </Text>
        </View>
        <View className="bg-yellow-100 px-2 py-1 rounded-full">
          <Text className="text-yellow-800 text-xs">
            C: {recipe.macros.carbs}g
          </Text>
        </View>
        <View className="bg-purple-100 px-2 py-1 rounded-full">
          <Text className="text-purple-800 text-xs">
            F: {recipe.macros.fat}g
          </Text>
        </View>
      </View>

      {/* Score Breakdown for featured variant */}
      {variant === 'featured' && recipe.score && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-gray-500 text-xs mb-2">Score Breakdown</Text>
          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-gray-600 text-xs">Macros</Text>
              <View className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <View 
                  className="bg-green-500 h-1.5 rounded-full" 
                  style={{ width: `${recipe.score.macroScore}%` }}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">{recipe.score.macroScore}%</Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-600 text-xs">Taste</Text>
              <View className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <View 
                  className="bg-orange-500 h-1.5 rounded-full" 
                  style={{ width: `${recipe.score.tasteScore}%` }}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">{recipe.score.tasteScore}%</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}