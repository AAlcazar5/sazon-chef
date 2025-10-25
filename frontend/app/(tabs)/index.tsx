import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi } from '../../hooks/useApi';
import { recipeApi } from '../../lib/api';
import { filterStorage, type FilterState } from '../../lib/filterStorage';
import type { SuggestedRecipe } from '../../types';
import * as Haptics from 'expo-haptics';

// Track user feedback state
interface UserFeedback {
  liked: boolean;
  disliked: boolean;
}

// Filter types are now imported from filterStorage

const CUISINE_OPTIONS = [
  'Mediterranean', 'Asian', 'Mexican', 'Italian', 'American', 
  'Indian', 'Thai', 'French', 'Japanese', 'Chinese'
];

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
  'Keto', 'Paleo', 'Low-Carb', 'High-Protein'
];

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<Record<string, UserFeedback>>({});
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>(filterStorage.getDefaultFilters());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Use the useApi hook for fetching suggested recipes
  const { data: recipesData, loading, error, refetch } = useApi('/recipes/suggested');

  // Load saved filters on component mount
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const savedFilters = await filterStorage.loadFilters();
        if (savedFilters) {
          setFilters(savedFilters);
          
          // Update active filters display
          const active: string[] = [];
          if (savedFilters.cuisines.length > 0) active.push(`${savedFilters.cuisines.length} cuisines`);
          if (savedFilters.dietaryRestrictions.length > 0) active.push(`${savedFilters.dietaryRestrictions.length} dietary`);
          if (savedFilters.maxCookTime) active.push(`≤${savedFilters.maxCookTime}min`);
          if (savedFilters.difficulty.length > 0) active.push(`${savedFilters.difficulty.length} difficulty`);
          
          setActiveFilters(active);
          
          // Apply saved filters to get filtered recipes
          if (active.length > 0) {
            const response = await recipeApi.getSuggestedRecipes({
              cuisines: savedFilters.cuisines.length > 0 ? savedFilters.cuisines : undefined,
              dietaryRestrictions: savedFilters.dietaryRestrictions.length > 0 ? savedFilters.dietaryRestrictions : undefined,
              maxCookTime: savedFilters.maxCookTime || undefined,
              difficulty: savedFilters.difficulty.length > 0 ? savedFilters.difficulty : undefined
            });
            
            setSuggestedRecipes(response.data);
            
            // Initialize feedback state
            const initialFeedback: Record<string, UserFeedback> = {};
            response.data.forEach((recipe: SuggestedRecipe) => {
              initialFeedback[recipe.id] = { liked: false, disliked: false };
            });
            setUserFeedback(initialFeedback);
          }
        }
        setFiltersLoaded(true);
      } catch (error) {
        console.error('❌ Error loading saved filters:', error);
        setFiltersLoaded(true);
      }
    };

    loadSavedFilters();
  }, []);

  // Update local state when API data loads (only if no saved filters)
  useEffect(() => {
    if (recipesData && filtersLoaded && activeFilters.length === 0) {
      console.log('📱 HomeScreen: Received recipes data', recipesData.length);
      setSuggestedRecipes(recipesData);
      
      // Initialize feedback state
      const initialFeedback: Record<string, UserFeedback> = {};
      recipesData.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
    }
  }, [recipesData, filtersLoaded, activeFilters.length]);

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

  const handleRandomRecipe = async () => {
    try {
      console.log('🎲 HomeScreen: Getting random recipe');
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const response = await recipeApi.getRandomRecipe();
      const randomRecipe = response.data;
      
      console.log('🎲 HomeScreen: Random recipe received', randomRecipe.title);
      
      // Navigate to the recipe modal
      router.push(`../modal?id=${randomRecipe.id}&source=random`);
      
    } catch (error: any) {
      console.error('❌ HomeScreen: Error getting random recipe', error);
      
      if (error.response?.status === 404) {
        Alert.alert(
          'No Random Recipe Found',
          'No recipes match your current preferences. Try adjusting your preferences in the Profile tab.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to get a random recipe. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Filter functions
  const handleFilterPress = () => {
    setShowFilterModal(true);
  };

  const handleFilterChange = (type: keyof FilterState, value: string | number) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (type === 'maxCookTime') {
        newFilters.maxCookTime = value as number;
      } else {
        const arrayType = type as 'cuisines' | 'dietaryRestrictions' | 'difficulty';
        const currentArray = newFilters[arrayType];
        const valueStr = value as string;
        
        if (currentArray.includes(valueStr)) {
          newFilters[arrayType] = currentArray.filter(item => item !== valueStr);
        } else {
          newFilters[arrayType] = [...currentArray, valueStr];
        }
      }
      
      return newFilters;
    });
  };

  const applyFilters = async () => {
    // Update active filters display
    const active: string[] = [];
    if (filters.cuisines.length > 0) active.push(`${filters.cuisines.length} cuisines`);
    if (filters.dietaryRestrictions.length > 0) active.push(`${filters.dietaryRestrictions.length} dietary`);
    if (filters.maxCookTime) active.push(`≤${filters.maxCookTime}min`);
    if (filters.difficulty.length > 0) active.push(`${filters.difficulty.length} difficulty`);
    
    setActiveFilters(active);
    setShowFilterModal(false);
    
    // Save filters to storage
    try {
      await filterStorage.saveFilters(filters);
      console.log('💾 Filters saved to storage');
    } catch (error) {
      console.error('❌ Error saving filters:', error);
    }
    
    // Apply filters to API call
    console.log('🔍 Filters applied:', filters);
    
    try {
      // Convert filters to API format
      const apiFilters = {
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty : undefined
      };
      
      const response = await recipeApi.getSuggestedRecipes(apiFilters);
      setSuggestedRecipes(response.data);
      
      // Initialize feedback state for new recipes
      const initialFeedback: Record<string, UserFeedback> = {};
      response.data.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
      
      console.log('✅ Filtered recipes loaded:', response.data.length);
    } catch (error: any) {
      console.error('❌ Error applying filters:', error);
      Alert.alert('Error', 'Failed to apply filters. Please try again.');
    }
  };

  const clearFilters = async () => {
    const defaultFilters = filterStorage.getDefaultFilters();
    setFilters(defaultFilters);
    setActiveFilters([]);
    
    // Clear filters from storage
    try {
      await filterStorage.clearFilters();
      console.log('🗑️ Filters cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing filters from storage:', error);
    }
    
    // Reload original recipes without filters
    try {
      const response = await recipeApi.getSuggestedRecipes();
      setSuggestedRecipes(response.data);
      
      // Initialize feedback state for new recipes
      const initialFeedback: Record<string, UserFeedback> = {};
      response.data.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
      
      console.log('✅ Filters cleared, original recipes loaded:', response.data.length);
    } catch (error: any) {
      console.error('❌ Error clearing filters:', error);
      Alert.alert('Error', 'Failed to clear filters. Please try again.');
    }
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
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">Sazon Chef</Text>
            <Text className="text-gray-500 mt-1">
              {suggestedRecipes.length} recipe suggestions
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRandomRecipe}
            className="bg-orange-500 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="shuffle" size={16} color="white" />
            <Text className="text-white font-semibold ml-2">Random</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-700">Filters</Text>
          <TouchableOpacity onPress={handleFilterPress} className="flex-row items-center">
            <Ionicons name="options-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-1">Filter</Text>
          </TouchableOpacity>
        </View>
        
        {activeFilters.length > 0 ? (
          <View className="flex-row flex-wrap">
            {activeFilters.map((filter, index) => (
              <View key={index} className="bg-orange-100 px-3 py-1 rounded-full mr-2 mb-2">
                <Text className="text-orange-800 text-xs font-medium">{filter}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={clearFilters} className="bg-gray-100 px-3 py-1 rounded-full mb-2">
              <Text className="text-gray-600 text-xs font-medium">Clear All</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text className="text-gray-400 text-sm">No filters applied</Text>
        )}
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

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          {/* Modal Header */}
          <View className="bg-white px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text className="text-blue-500 font-medium">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">Filter Recipes</Text>
            <TouchableOpacity onPress={applyFilters}>
              <Text className="text-blue-500 font-medium">Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            {/* Cuisine Filter */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Cuisine</Text>
              <View className="flex-row flex-wrap">
                {CUISINE_OPTIONS.map((cuisine) => (
                  <TouchableOpacity
                    key={cuisine}
                    onPress={() => handleFilterChange('cuisines', cuisine)}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                      filters.cuisines.includes(cuisine)
                        ? 'bg-orange-500 border-orange-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      filters.cuisines.includes(cuisine) ? 'text-white' : 'text-gray-700'
                    }`}>
                      {cuisine}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dietary Restrictions Filter */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Dietary</Text>
              <View className="flex-row flex-wrap">
                {DIETARY_OPTIONS.map((dietary) => (
                  <TouchableOpacity
                    key={dietary}
                    onPress={() => handleFilterChange('dietaryRestrictions', dietary)}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                      filters.dietaryRestrictions.includes(dietary)
                        ? 'bg-green-500 border-green-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      filters.dietaryRestrictions.includes(dietary) ? 'text-white' : 'text-gray-700'
                    }`}>
                      {dietary}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cook Time Filter */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Max Cook Time</Text>
              <View className="flex-row flex-wrap">
                {[15, 30, 45, 60, 90].map((time) => (
                  <TouchableOpacity
                    key={time}
                    onPress={() => handleFilterChange('maxCookTime', time)}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                      filters.maxCookTime === time
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      filters.maxCookTime === time ? 'text-white' : 'text-gray-700'
                    }`}>
                      ≤{time} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Difficulty Filter */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Difficulty</Text>
              <View className="flex-row flex-wrap">
                {DIFFICULTY_OPTIONS.map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty}
                    onPress={() => handleFilterChange('difficulty', difficulty)}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                      filters.difficulty.includes(difficulty)
                        ? 'bg-purple-500 border-purple-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      filters.difficulty.includes(difficulty) ? 'text-white' : 'text-gray-700'
                    }`}>
                      {difficulty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}