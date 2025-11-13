import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FeedbackButtons from './FeedbackButtons';
import AnimatedText from '../ui/AnimatedText';

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
    source?: 'database' | 'user-created' | 'ai-generated' | 'external';
    isUserCreated?: boolean;
    healthGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
    healthGradeScore?: number;
    enhancedScore?: {
      total: number;
      cookTimeScore: number;
      convenienceScore: number;
      breakdown: {
        cookTimeMatch: number;
        convenienceFactor: number;
        timeEfficiency: number;
      };
    };
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
    if (score >= 80) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  const getHealthGradeColor = (grade: 'A' | 'B' | 'C' | 'D' | 'F' | undefined) => {
    if (!grade) return 'text-gray-600 dark:text-gray-200 bg-gray-100 dark:bg-gray-700';
    switch (grade) {
      case 'A':
        return 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800';
      case 'B':
        return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800';
      case 'C':
        return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-800';
      case 'D':
        return 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800';
      case 'F':
        return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800';
      default:
        return 'text-gray-600 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600';
    }
  };


  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRecipePlaceholder = (cuisine: string) => {
    const placeholders: Record<string, { icon: string; color: string; bg: string }> = {
      'Mediterranean': { icon: 'fish-outline', color: '#3B82F6', bg: '#DBEAFE' },
      'Asian': { icon: 'restaurant-outline', color: '#EF4444', bg: '#FEE2E2' },
      'Mexican': { icon: 'flame-outline', color: '#F59E0B', bg: '#FEF3C7' },
      'Italian': { icon: 'pizza-outline', color: '#10B981', bg: '#D1FAE5' },
      'American': { icon: 'fast-food-outline', color: '#6366F1', bg: '#E0E7FF' },
      'Indian': { icon: 'restaurant-outline', color: '#F97316', bg: '#FFEDD5' },
      'Thai': { icon: 'leaf-outline', color: '#14B8A6', bg: '#CCFBF1' },
      'French': { icon: 'wine-outline', color: '#8B5CF6', bg: '#EDE9FE' },
      'Japanese': { icon: 'fish-outline', color: '#EC4899', bg: '#FCE7F3' },
      'Chinese': { icon: 'restaurant-outline', color: '#DC2626', bg: '#FEE2E2' },
    };

    return placeholders[cuisine] || { icon: 'restaurant-outline', color: '#9CA3AF', bg: '#F3F4F6' };
  };

  // Variant styles
  const variantStyles = {
    default: {
      container: 'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700',
      title: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
      description: 'text-gray-600 dark:text-gray-100 text-sm',
      meta: 'flex-row justify-between items-center'
    },
    compact: {
      container: 'bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-700',
      title: 'text-base font-semibold text-gray-900 dark:text-gray-100',
      description: 'text-gray-600 dark:text-gray-100 text-xs',
      meta: 'flex-row justify-between items-center'
    },
    featured: {
      container: 'bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-200 dark:border-gray-700',
      title: 'text-xl font-bold text-gray-900 dark:text-gray-100',
      description: 'text-gray-600 dark:text-gray-100 text-base',
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
        <View className="flex-1 mr-2">
          <AnimatedText className={styles.title}>
            {recipe.title}
          </AnimatedText>
          {/* Source Attribution */}
          {recipe.source === 'ai-generated' && (
            <View className="flex-row items-center mt-1">
              <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                <Text className="text-purple-700 dark:text-purple-300 text-xs font-medium">
                  🤖 AI Generated
                </Text>
              </View>
            </View>
          )}
        </View>
        
        <View className="flex-row items-center space-x-2">
          {/* Health Grade Badge */}
          {(recipe.healthGrade || recipe.score?.healthGrade) && (
            <View className={`px-2 py-1 rounded-full border ${getHealthGradeColor(recipe.healthGrade || recipe.score?.healthGrade)}`}>
              <Text className="font-bold text-sm">
                {recipe.healthGrade || recipe.score?.healthGrade}
              </Text>
            </View>
          )}
          
          {/* Match Score */}
          {recipe.score && recipe.score.matchPercentage && (
            <View className={`px-2 py-1 rounded-full ${getScoreColor(recipe.score.total)}`}>
              <Text className="font-semibold text-xs">
                {Math.round(recipe.score.total)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      <AnimatedText className={`${styles.description} mb-3`}>
        {recipe.description}
      </AnimatedText>

      {/* Meta Information */}
      <View className={styles.meta}>
        <View className="flex-row items-center space-x-3 flex-1">
          {/* Cook Time */}
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-gray-500 dark:text-gray-200 text-sm ml-1">
              {recipe.cookTime} min
            </Text>
          </View>

          {/* Cuisine */}
          <View className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
            <Text className="text-orange-800 dark:text-orange-300 text-xs font-medium">
              {recipe.cuisine}
            </Text>
          </View>

          {/* Match Percentage for featured variant */}
          {variant === 'featured' && recipe.score?.matchPercentage && (
            <View className={`px-2 py-1 rounded-full ${getMatchColor(recipe.score.matchPercentage)}`}>
              <Text className="text-white text-xs font-semibold">
                {Math.round(recipe.score.matchPercentage)}% Match
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
      <View className="flex-row space-x-2 mt-3 flex-wrap">
        <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
          <Text className="text-blue-800 dark:text-blue-300 text-xs">
            {recipe.macros.calories} cal
          </Text>
        </View>
        <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
          <Text className="text-green-800 dark:text-green-300 text-xs">
            P: {recipe.macros.protein}g
          </Text>
        </View>
        <View className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
          <Text className="text-yellow-800 dark:text-yellow-300 text-xs">
            C: {recipe.macros.carbs}g
          </Text>
        </View>
        <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
          <Text className="text-purple-800 dark:text-purple-300 text-xs">
            F: {recipe.macros.fat}g
          </Text>
        </View>
        {/* Cost Display */}
        {(recipe.estimatedCostPerServing || recipe.pricePerServing) && (
          <View className="bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
            <Text className="text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              ${Math.round((recipe.estimatedCostPerServing || recipe.pricePerServing || 0) * 100) / 100}/serving
            </Text>
          </View>
        )}
      </View>


      {/* Score Breakdown for featured variant */}
      {variant === 'featured' && recipe.score && (
        <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Text className="text-gray-500 dark:text-gray-200 text-xs mb-2">Score Breakdown</Text>
          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-gray-600 dark:text-gray-100 text-xs">Macros</Text>
              <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                <View 
                  className="bg-green-500 h-1.5 rounded-full" 
                  style={{ width: `${Math.round(recipe.score.macroScore)}%` }}
                />
              </View>
              <Text className="text-gray-500 dark:text-gray-200 text-xs mt-1">{Math.round(recipe.score.macroScore)}%</Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-600 dark:text-gray-100 text-xs">Taste</Text>
              <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                <View 
                  className="bg-orange-500 h-1.5 rounded-full" 
                  style={{ width: `${Math.round(recipe.score.tasteScore)}%` }}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">{Math.round(recipe.score.tasteScore)}%</Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}