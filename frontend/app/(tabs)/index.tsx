import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi } from '../../hooks/useApi';
import { recipeApi } from '../../lib/api';
import type { SuggestedRecipe } from '../../types';
import * as Haptics from 'expo-haptics';

// Track user feedback state
interface UserFeedback {
  liked: boolean;
  disliked: boolean;
}

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<Record<string, UserFeedback>>({});

  // Use the useApi hook for fetching suggested recipes
  const { data: recipesData, loading, error, refetch } = useApi('/recipes/suggested');

  // Update local state when API data loads
  useEffect(() => {
    if (recipesData) {
      console.log('📱 HomeScreen: Received recipes data', recipesData.length);
      setSuggestedRecipes(recipesData);
      
      // Initialize feedback state
      const initialFeedback: Record<string, UserFeedback> = {};
      recipesData.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
    }
  }, [recipesData]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('📱 HomeScreen: API Error', error);
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    }
  }, [error]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRecipePress = (recipeId: string) => {
    console.log('📱 HomeScreen: Recipe pressed', recipeId);
    router.push(`../modal?id=${recipeId}`);
  };

  const handleLike = async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);
      console.log('📱 HomeScreen: Liking recipe', recipeId);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Update UI immediately
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: true, disliked: false }
      }));
      
      await recipeApi.likeRecipe(recipeId);
      
      // Update local state to reflect the like
      setSuggestedRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, score: { ...recipe.score, total: recipe.score.total + 5 } }
          : recipe
      ));
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Liked!', 'We\'ll show you more recipes like this');
    } catch (error: any) {
      console.error('📱 HomeScreen: Like error', error);
      
      // Error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Revert UI state on error
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: false }
      }));
      
      Alert.alert('Error', 'Failed to like recipe');
    } finally {
      setFeedbackLoading(null);
    }
  };

  const handleDislike = async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);
      console.log('📱 HomeScreen: Disliking recipe', recipeId);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Update UI immediately
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: true }
      }));
      
      await recipeApi.dislikeRecipe(recipeId);
      
      // Update local state to reflect the dislike
      setSuggestedRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, score: { ...recipe.score, total: Math.max(0, recipe.score.total - 5) } }
          : recipe
      ));
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Noted', 'We\'ll show fewer recipes like this');
    } catch (error: any) {
      console.error('📱 HomeScreen: Dislike error', error);
      
      // Error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Revert UI state on error
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: false }
      }));
      
      Alert.alert('Error', 'Failed to dislike recipe');
    } finally {
      setFeedbackLoading(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Loading state
  if (loading && suggestedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">Sazon Chef</Text>
          <Text className="text-gray-500 mt-1">Personalized recipe suggestions</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="restaurant-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-500 mt-4">Loading recipes...</Text>
          <Text className="text-gray-400 text-center mt-2">
            Finding the perfect recipes for you
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && suggestedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">Sazon Chef</Text>
          <Text className="text-gray-500 mt-1">Personalized recipe suggestions</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Failed to load recipes
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            {error}
          </Text>
          <TouchableOpacity 
            onPress={refetch}
            className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (suggestedRecipes.length === 0 && !loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">Sazon Chef</Text>
          <Text className="text-gray-500 mt-1">Personalized recipe suggestions</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="search-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-500 mt-4 text-center">
            No recipes found
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            We couldn't find any recipes to suggest at the moment
          </Text>
          <TouchableOpacity 
            onPress={refetch}
            className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header - Fixed height */}
      <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Sazon Chef</Text>
        <Text className="text-gray-500 mt-1">
          {suggestedRecipes.length} recipe suggestions
        </Text>
      </View>

      {/* Main content area - FIXED SCROLLING ISSUE */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Recommendation */}
        <View className="mb-6 p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Today's Recommendation
          </Text>
          {suggestedRecipes.length > 0 && (() => {
            const recipe = suggestedRecipes[0];
            const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
            const isFeedbackLoading = feedbackLoading === recipe.id;
            
            return (
              <TouchableOpacity
                onPress={() => handleRecipePress(recipe.id)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="text-xl font-bold text-gray-900 flex-1">
                    {recipe.title}
                  </Text>
                  <View className={`bg-green-100 px-2 py-1 rounded-full ml-2`}>
                    <Text className={`text-green-800 text-sm font-semibold`}>
                      {recipe.score?.matchPercentage || 0}% Match
                    </Text>
                  </View>
                </View>
                
                <Text className="text-gray-600 mb-3">
                  {recipe.description}
                </Text>

                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center space-x-4">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text className="text-gray-500 text-sm ml-1">
                        {recipe.cookTime} min
                      </Text>
                    </View>
                    <View className="bg-orange-100 px-2 py-1 rounded-full">
                      <Text className="text-orange-800 text-xs font-medium">
                        {recipe.cuisine}
                      </Text>
                    </View>
                  </View>

                  {/* Feedback Buttons */}
                  <View className="flex-row space-x-2">
                    {/* Dislike Button */}
                    <TouchableOpacity
                      onPress={() => handleDislike(recipe.id)}
                      disabled={isFeedbackLoading}
                      className={`p-2 rounded-full ${
                        feedback.disliked 
                          ? 'bg-red-100 border border-red-200' 
                          : 'bg-gray-100 border border-gray-200'
                      } ${isFeedbackLoading ? 'opacity-50' : ''}`}
                    >
                      <Ionicons 
                        name={feedback.disliked ? "thumbs-down" : "thumbs-down-outline"} 
                        size={18} 
                        color={feedback.disliked ? "#EF4444" : "#6B7280"} 
                      />
                    </TouchableOpacity>
                    
                    {/* Like Button */}
                    <TouchableOpacity
                      onPress={() => handleLike(recipe.id)}
                      disabled={isFeedbackLoading}
                      className={`p-2 rounded-full ${
                        feedback.liked 
                          ? 'bg-green-100 border border-green-200' 
                          : 'bg-gray-100 border border-gray-200'
                      } ${isFeedbackLoading ? 'opacity-50' : ''}`}
                    >
                      <Ionicons 
                        name={feedback.liked ? "thumbs-up" : "thumbs-up-outline"} 
                        size={18} 
                        color={feedback.liked ? "#10B981" : "#6B7280"} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* More Suggestions */}
        {suggestedRecipes.length > 1 && (
          <View className="px-4 pb-8">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              More Suggestions
            </Text>
            {suggestedRecipes.slice(1).map((recipe) => {
              const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
              const isFeedbackLoading = feedbackLoading === recipe.id;
              
              return (
                <TouchableOpacity
                  key={recipe.id}
                  onPress={() => handleRecipePress(recipe.id)}
                  className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-lg font-semibold text-gray-900 flex-1">
                      {recipe.title}
                    </Text>
                    <Text className={`text-base font-semibold ${getScoreColor(recipe.score?.total || 0)} ml-2`}>
                      {recipe.score?.total || 0}
                    </Text>
                  </View>
                  
                  <Text className="text-gray-600 text-sm mb-2">
                    {recipe.description}
                  </Text>

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center space-x-3">
                      <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">
                          {recipe.cookTime} min
                        </Text>
                      </View>
                      <View className="bg-orange-100 px-2 py-1 rounded-full">
                        <Text className="text-orange-800 text-xs">
                          {recipe.cuisine}
                        </Text>
                      </View>
                    </View>

                    {/* Feedback Buttons - FIXED: No stray text strings */}
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        onPress={() => handleDislike(recipe.id)}
                        disabled={isFeedbackLoading}
                        className={`p-2 rounded-full ${
                          feedback.disliked 
                            ? 'bg-red-100 border border-red-200' 
                            : 'bg-gray-100 border border-gray-200'
                        } ${isFeedbackLoading ? 'opacity-50' : ''}`}
                      >
                        <Ionicons 
                          name={feedback.disliked ? "thumbs-down" : "thumbs-down-outline"} 
                          size={18} 
                          color={feedback.disliked ? "#EF4444" : "#6B7280"} 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleLike(recipe.id)}
                        disabled={isFeedbackLoading}
                        className={`p-2 rounded-full ${
                          feedback.liked 
                            ? 'bg-green-100 border border-green-200' 
                            : 'bg-gray-100 border border-gray-200'
                        } ${isFeedbackLoading ? 'opacity-50' : ''}`}
                      >
                        <Ionicons 
                          name={feedback.liked ? "thumbs-up" : "thumbs-up-outline"} 
                          size={18} 
                          color={feedback.liked ? "#10B981" : "#6B7280"} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}