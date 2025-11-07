import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal, Linking, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi } from '../../hooks/useApi';
import { recipeApi, aiRecipeApi, collectionsApi } from '../../lib/api';
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
  const [reloadLoading, setReloadLoading] = useState(false);
  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<Record<string, UserFeedback>>({});
  const [reloadOffset, setReloadOffset] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>(filterStorage.getDefaultFilters());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  
  // Collections state for save to collection
  const [collections, setCollections] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [savePickerVisible, setSavePickerVisible] = useState(false);
  const [savePickerRecipeId, setSavePickerRecipeId] = useState<string | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

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
      
      // Preload images for the next few recipes (improves perceived performance)
      recipesData.slice(0, 5).forEach((recipe: SuggestedRecipe) => {
        if (recipe.imageUrl) {
          Image.prefetch(recipe.imageUrl).catch(() => {
            // Silently fail - prefetch is just an optimization
          });
        }
      });
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

  const handleReload = async () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setReloadLoading(true);
    try {
      // Increment offset to get different recipes (rotate through batches)
      const newOffset = (reloadOffset + 1) % 10; // Cycle through 10 batches
      setReloadOffset(newOffset);
      
      // Fetch fresh recipe suggestions with offset for variety
      const response = await recipeApi.getSuggestedRecipes({
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty : undefined,
        offset: newOffset
      });
      
      setSuggestedRecipes(response.data);
      
      // Initialize feedback state
      const initialFeedback: Record<string, UserFeedback> = {};
      response.data.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
      
      // Preload images for the next few recipes (improves perceived performance)
      response.data.slice(0, 5).forEach((recipe: SuggestedRecipe) => {
        if (recipe.imageUrl) {
          Image.prefetch(recipe.imageUrl).catch(() => {
            // Silently fail - prefetch is just an optimization
          });
        }
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Error reloading recipes:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setReloadLoading(false);
    }
  };

  const handleRecipePress = (recipeId: string) => {
    console.log('📱 HomeScreen: Recipe pressed', recipeId);
    router.push(`../modal?id=${recipeId}`);
  };

  const openSavePicker = async (recipeId: string) => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Array<{ id: string; name: string; isDefault?: boolean }>;
      setCollections(cols);
      setSavePickerRecipeId(recipeId);
      setSelectedCollectionIds([]);
      setSavePickerVisible(true);
    } catch (e) {
      console.log('⚠️  Failed to load collections');
    }
  };

  const handleSaveToCollections = async () => {
    if (!savePickerRecipeId) return;
    
    try {
      // Save to cookbook with selected collections (multi-collection support)
      await recipeApi.saveRecipe(savePickerRecipeId, selectedCollectionIds.length > 0 ? { collectionIds: selectedCollectionIds } : undefined);
      
      setSavePickerVisible(false);
      setSavePickerRecipeId(null);
      setSelectedCollectionIds([]);
      Alert.alert('Saved', 'Recipe saved to cookbook!');
    } catch (error: any) {
      if (error.code === 'HTTP_409' || /already\s*saved/i.test(error.message)) {
        // Already saved, try to move to collections
        if (selectedCollectionIds.length > 0) {
          try {
            await collectionsApi.moveSavedRecipe(savePickerRecipeId, selectedCollectionIds);
            Alert.alert('Moved', 'Recipe moved to collections!');
          } catch (e) {
            Alert.alert('Already Saved', 'This recipe is already in your cookbook!');
          }
        } else {
          Alert.alert('Already Saved', 'This recipe is already in your cookbook!');
        }
      } else {
        Alert.alert('Error', error.message || 'Failed to save recipe');
      }
      setSavePickerVisible(false);
      setSavePickerRecipeId(null);
      setSelectedCollectionIds([]);
    }
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    try {
      const res = await collectionsApi.create(name);
      const created = (Array.isArray(res.data) ? null : (res.data?.data || res.data)) as { id: string; name: string; isDefault?: boolean } | null;
      if (created) {
        setCollections(prev => [created, ...prev]);
        setSelectedCollectionIds(prev => [...prev, created.id]);
        setNewCollectionName('');
        setCreatingCollection(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create collection');
    }
  };

  const handleRandomRecipe = async () => {
    try {
      console.log('🤖 HomeScreen: Generating AI recipe with filters:', filters);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Show loading indicator with estimated time
      Alert.alert(
        '🤖 Generating Recipe...',
        'Creating a personalized recipe for you (10-15 seconds)',
        [],
        { cancelable: false }
      );
      
      // Pass active filters to AI generation for more targeted recipes
      const params: any = {};
      
      // If user has filtered to specific cuisines, pick one randomly from the filtered list
      if (filters.cuisines.length > 0) {
        const randomCuisine = filters.cuisines[Math.floor(Math.random() * filters.cuisines.length)];
        params.cuisine = randomCuisine;
        console.log('🎲 Using filtered cuisine:', randomCuisine);
      }
      
      // If user has filtered by max cook time, respect that
      if (filters.maxCookTime) {
        params.maxCookTime = filters.maxCookTime;
        console.log('⏱️ Respecting max cook time:', filters.maxCookTime);
      }
      
      // Note: Dietary restrictions are handled by the backend via saved user preferences
      // The AI will automatically respect the user's dietary restrictions from onboarding
      
      const response = await aiRecipeApi.generateRecipe(params);
      const aiRecipe = response.data.recipe;
      
      console.log('✅ HomeScreen: AI recipe generated', aiRecipe.title);
      
      // Success haptic feedback to let user know it's ready
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-navigate after 2 seconds (no need to click OK)
      setTimeout(() => {
        router.push(`../modal?id=${aiRecipe.id}`);
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ HomeScreen: Error generating AI recipe', error);
      
      // Check if it's a quota/billing error
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.message?.includes('quota') || 
                          error.message?.includes('429');
      
      // Fallback to existing random recipe from database if AI fails
      if (isQuotaError) {
        try {
          console.log('🔄 Falling back to random recipe from database...');
          const fallbackResponse = await recipeApi.getRandomRecipe();
          const fallbackRecipe = fallbackResponse.data;
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Show info alert and navigate to the recipe
          Alert.alert(
            'Using Existing Recipe',
            'AI generation is temporarily unavailable. Here\'s a great recipe from our collection!',
            [],
            { cancelable: false }
          );
          
          setTimeout(() => {
            router.push(`../modal?id=${fallbackRecipe.id}`);
          }, 1500);
          
          return; // Exit early, we got a fallback recipe
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError);
          // Continue to show error below
        }
      }
      
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR';
      const message = isQuotaError
        ? 'AI recipe generation is temporarily unavailable due to quota limits. Try again later or browse our existing recipes!'
        : isTimeout 
        ? 'The recipe took too long to generate. This is usually temporary - try again!' 
        : 'Unable to generate a recipe right now. Please check your connection and try again.';
      
      Alert.alert(
        'Generation Failed',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleRandomRecipe() },
          // Add option to browse existing recipes
          { text: 'Browse Recipes', onPress: () => {
            // Refresh suggestions to show existing recipes
            onRefresh();
          }}
        ]
      );
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

  // Truncate description to approximately 2-3 lines (100-120 characters)
  const truncateDescription = (text: string, maxLength: number = 120): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
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
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleReload}
              activeOpacity={1}
              className="bg-gray-100 px-3 py-2 rounded-lg flex-row items-center border border-gray-300 mr-2"
              style={{ opacity: 1 }}
            >
              {reloadLoading ? (
                <ActivityIndicator size="small" color="#6B7280" style={{ marginRight: 6 }} />
              ) : (
                <Ionicons name="reload" size={16} color="#6B7280" style={{ marginRight: 4 }} />
              )}
              <Text className="text-gray-700 font-semibold">
                {reloadLoading ? 'Loading...' : 'Reload'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRandomRecipe}
              className="bg-orange-500 px-4 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="shuffle" size={16} color="white" />
              <Text className="text-white font-semibold ml-2">Random</Text>
            </TouchableOpacity>
          </View>
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
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 mb-4"
              >
                {/* Recipe Image with Unsplash Attribution */}
                {recipe.imageUrl && (
                  <View>
                    <Image 
                      source={{ uri: recipe.imageUrl }}
                      style={{ width: '100%', height: 192 }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                      priority="high"
                    />
                    {/* Unsplash Attribution Overlay - Link to photographer profile per Unsplash guidelines */}
                    {(recipe as any).unsplashPhotographerName && (
                      <TouchableOpacity
                        onPress={() => {
                          const username = (recipe as any).unsplashPhotographerUsername;
                          if (username) {
                            const profileUrl = `https://unsplash.com/@${username}?utm_source=Sazon%20Chef&utm_medium=referral`;
                            Linking.openURL(profileUrl);
                          }
                        }}
                        className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded"
                      >
                        <Text className="text-white text-xs">
                          Photo by {(recipe as any).unsplashPhotographerName} on Unsplash
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                <View className="p-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-xl font-bold text-gray-900">
                        {recipe.title}
                      </Text>
                      {/* Source Attribution */}
                      {(recipe as any).source === 'ai-generated' && (
                        <View className="flex-row items-center mt-1">
                          <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                            <Text className="text-purple-700 text-xs font-medium">
                              🤖 AI Generated
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                    <View className={`bg-green-100 px-2 py-1 rounded-full ml-2`}>
                      <Text className={`text-green-800 text-sm font-semibold`}>
                        {Math.round(recipe.score?.matchPercentage || 0)}% Match
                      </Text>
                    </View>
                  </View>
                  
                  <Text className="text-gray-600 mb-3" numberOfLines={3}>
                    {truncateDescription(recipe.description)}
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

                  {/* Feedback Buttons and Save */}
                  <View className="flex-row space-x-2">
                    {/* Save to Collection Button */}
                    <TouchableOpacity
                      onPress={() => openSavePicker(recipe.id)}
                      className="p-2 rounded-full bg-orange-100 border border-orange-200"
                    >
                      <Ionicons 
                        name="bookmark-outline" 
                        size={18} 
                        color="#F97316" 
                      />
                    </TouchableOpacity>
                    
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
                  className="bg-white rounded-lg overflow-hidden mb-3 shadow-sm border border-gray-100"
                >
                  {/* Recipe Image with Unsplash Attribution */}
                  {recipe.imageUrl && (
                    <View>
                      <Image 
                        source={{ uri: recipe.imageUrl }}
                        style={{ width: '100%', height: 160 }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                      />
                      {/* Unsplash Attribution Overlay - Link to photographer profile per Unsplash guidelines */}
                      {(recipe as any).unsplashPhotographerName && (
                        <TouchableOpacity
                          onPress={() => {
                            const username = (recipe as any).unsplashPhotographerUsername;
                            if (username) {
                              const profileUrl = `https://unsplash.com/@${username}?utm_source=Sazon%20Chef&utm_medium=referral`;
                              Linking.openURL(profileUrl);
                            }
                          }}
                          className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded"
                        >
                          <Text className="text-white text-xs">
                            Photo by {(recipe as any).unsplashPhotographerName} on Unsplash
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                  
                  <View className="p-4">
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-lg font-semibold text-gray-900 flex-1">
                        {recipe.title}
                      </Text>
                      <Text className={`text-base font-semibold ${getScoreColor(recipe.score?.total || 0)} ml-2`}>
                        {Math.round(recipe.score?.total || 0)}
                      </Text>
                    </View>
                    
                    <Text className="text-gray-600 text-sm mb-2" numberOfLines={2}>
                      {truncateDescription(recipe.description, 100)}
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

                    {/* Feedback Buttons and Save */}
                    <View className="flex-row">
                      {/* Save to Collection Button */}
                      <TouchableOpacity
                        onPress={() => openSavePicker(recipe.id)}
                        className="p-2 rounded-full bg-orange-100 border border-orange-200 mr-2"
                      >
                        <Ionicons 
                          name="bookmark-outline" 
                          size={18} 
                          color="#F97316" 
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => handleDislike(recipe.id)}
                        disabled={isFeedbackLoading}
                        className={`p-2 rounded-full mr-2 ${
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

      {/* Collection Save Picker Modal */}
      <Modal
        visible={savePickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSavePickerVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-2xl p-4 max-h-[70%]">
            <Text className="text-lg font-semibold mb-3">Save to Collection</Text>
            <ScrollView className="mb-3">
              {collections.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => {
                    setSelectedCollectionIds(prev => 
                      prev.includes(c.id) 
                        ? prev.filter(id => id !== c.id)
                        : [...prev, c.id]
                    );
                  }}
                  className="flex-row items-center py-3 border-b border-gray-100"
                >
                  <View className={`w-5 h-5 mr-3 rounded border ${selectedCollectionIds.includes(c.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                    {selectedCollectionIds.includes(c.id) && (
                      <Ionicons name="checkmark" size={14} color="white" style={{ position: 'absolute', top: 1, left: 1 }} />
                    )}
                  </View>
                  <Text className="text-gray-900 flex-1">{c.name}</Text>
                </TouchableOpacity>
              ))}
              {creatingCollection ? (
                <View className="flex-row items-center py-3">
                  <TextInput
                    value={newCollectionName}
                    onChangeText={setNewCollectionName}
                    placeholder="New collection name"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 mr-2"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity onPress={handleCreateCollection} className="bg-orange-500 px-3 py-2 rounded-lg">
                    <Text className="text-white font-semibold">Create</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setCreatingCollection(true)} className="py-3">
                  <Text className="text-orange-600 font-medium">+ Create new collection</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity onPress={() => setSavePickerVisible(false)} className="px-4 py-3">
                <Text className="text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveToCollections} className="bg-orange-500 px-4 py-3 rounded-lg">
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}