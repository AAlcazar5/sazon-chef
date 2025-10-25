import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { recipeApi } from '../../lib/api';
import type { SavedRecipe } from '../../types';

export default function CookbookScreen() {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(true);
  
  // Use the useApi hook for fetching saved recipes
  const { data: recipesData, loading: apiLoading, error: apiError, refetch } = useApi(
    '/recipes/saved', 
    { immediate: false } // Don't fetch immediately, we'll control it
  );

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Cookbook: Screen focused, refreshing data');
      refetch();
    }, [refetch])
  );

  // Also refresh when needsRefresh is triggered
  useEffect(() => {
    if (needsRefresh) {
      console.log('📱 Cookbook: Needs refresh, fetching data');
      refetch();
      setNeedsRefresh(false);
    }
  }, [needsRefresh, refetch]);

  // Update local state when API data loads
  useEffect(() => {
    if (recipesData) {
      console.log('📱 Cookbook: Received saved recipes data', recipesData.length);
      setSavedRecipes(recipesData);
    }
  }, [recipesData]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRecipePress = (recipeId: string) => {
    console.log('📱 Cookbook: Recipe pressed', recipeId);
    router.push(`../modal?id=${recipeId}&source=cookbook`);
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    try {
      console.log('📱 Cookbook: Removing recipe', recipeId);
      await recipeApi.unsaveRecipe(recipeId);
      
      // Update local state immediately for better UX
      setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      
      Alert.alert('Success', 'Recipe removed from cookbook!');
    } catch (error: any) {
      console.error('📱 Cookbook: Remove error', error);
      Alert.alert('Error', error.message || 'Failed to remove recipe');
    }
  };

  const handleDeleteRecipe = async (recipeId: string, recipeTitle: string) => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipeTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('📱 Cookbook: Deleting user recipe', recipeId);
              await recipeApi.deleteRecipe(recipeId);
              
              // Update local state immediately for better UX
              setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
              
              Alert.alert('Success', 'Recipe deleted successfully!');
            } catch (error: any) {
              console.error('📱 Cookbook: Delete error', error);
              Alert.alert('Error', error.message || 'Failed to delete recipe');
            }
          }
        }
      ]
    );
  };

  // Loading state
  if (apiLoading && savedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">My Cookbook</Text>
          <Text className="text-gray-500 mt-1">Loading saved recipes...</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="book-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-500 mt-4">Loading recipes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (apiError && savedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">My Cookbook</Text>
          <Text className="text-gray-500 mt-1">Failed to load recipes</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Failed to load saved recipes
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            {apiError}
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">My Cookbook</Text>
            <Text className="text-gray-500 mt-1">
              {savedRecipes.length} saved recipes
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleRefresh}
            className="p-2"
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={24} 
              color={refreshing ? "#9CA3AF" : "#6B7280"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Create Recipe Button */}
        <TouchableOpacity 
          onPress={() => router.push('/recipe-form')}
          className="bg-orange-500 px-4 py-3 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">Create Recipe</Text>
        </TouchableOpacity>
      </View>

      {savedRecipes.length === 0 ? (
        // Empty state
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="book-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-500 mt-4 text-center">
            No saved recipes yet
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            Save recipes you like to see them here
          </Text>
          <TouchableOpacity 
            onPress={() => router.push('/')}
            className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Browse Recipes</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Recipes list
        <ScrollView 
          className="flex-1 p-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {savedRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              onPress={() => handleRecipePress(recipe.id)}
              className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
            >
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-lg font-semibold text-gray-900 flex-1">
                      {recipe.title}
                    </Text>
                    {(recipe as any).isUserCreated && (
                      <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                        <Text className="text-green-800 text-xs font-medium">My Recipe</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-gray-500 text-sm mb-2">
                    {recipe.description}
                  </Text>
                  
                  <View className="flex-row items-center space-x-4 mb-2">
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

                  {/* Macro Pills */}
                  <View className="flex-row space-x-2">
                    <View className="bg-blue-100 px-2 py-1 rounded-full">
                      <Text className="text-blue-800 text-xs">
                        {recipe.calories} cal
                      </Text>
                    </View>
                    <View className="bg-green-100 px-2 py-1 rounded-full">
                      <Text className="text-green-800 text-xs">
                        P: {recipe.protein}g
                      </Text>
                    </View>
                    <View className="bg-yellow-100 px-2 py-1 rounded-full">
                      <Text className="text-yellow-800 text-xs">
                        C: {recipe.carbs}g
                      </Text>
                    </View>
                    <View className="bg-purple-100 px-2 py-1 rounded-full">
                      <Text className="text-purple-800 text-xs">
                        F: {recipe.fat}g
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Delete/Remove button */}
                <TouchableOpacity
                  onPress={() => {
                    if ((recipe as any).isUserCreated) {
                      handleDeleteRecipe(recipe.id, recipe.title);
                    } else {
                      handleRemoveRecipe(recipe.id);
                    }
                  }}
                  className="p-2 ml-2"
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Date label */}
              {recipe.savedDate && (
                <Text className="text-gray-400 text-xs mt-3">
                  {(recipe as any).isUserCreated ? 'Created on' : 'Saved on'} {recipe.savedDate}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}