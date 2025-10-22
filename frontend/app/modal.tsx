import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { recipeApi } from '../lib/api';
import type { Recipe } from '../types';

// Helper function to extract text from ingredients/instructions
const getTextContent = (item: any): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'text' in item) return item.text;
  return String(item);
};

export default function Modal() {
  const { id } = useLocalSearchParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch recipe data when modal opens
  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('📱 Modal: Fetching recipe', id);
        
        const response = await recipeApi.getRecipe(id as string);
        console.log('📱 Modal: Received recipe data', response.data);
        setRecipe(response.data);
      } catch (err: any) {
        console.error('📱 Modal: Error fetching recipe', err);
        setError(err.message || 'Failed to load recipe');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  const handleSaveRecipe = async () => {
    if (!recipe) return;
    
    try {
      setIsSaving(true);
      console.log('📱 Modal: Saving recipe', recipe.id);
      await recipeApi.saveRecipe(recipe.id);
      Alert.alert('Success', 'Recipe saved to cookbook!', [
        { text: 'OK', onPress: () => console.log('Recipe saved successfully') }
      ]);
    } catch (error: any) {
      console.error('📱 Modal: Save error', error);
      if (error.message?.includes('already saved') || error.code === 'HTTP_409') {
        Alert.alert('Already Saved', 'This recipe is already in your cookbook!');
      } else {
        Alert.alert('Error', error.message || 'Failed to save recipe');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotInterested = () => {
    console.log('📱 Modal: Not interested in recipe');
    router.back();
  };

  const handleEditRecipe = () => {
    if (!recipe) return;
    console.log('📱 Modal: Editing recipe', recipe.id);
    router.push(`/recipe-form?id=${recipe.id}`);
  };

  const handleDeleteRecipe = async () => {
    if (!recipe) return;
    
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('📱 Modal: Deleting recipe', recipe.id);
              await recipeApi.deleteRecipe(recipe.id);
              Alert.alert('Success', 'Recipe deleted successfully!');
              router.back();
            } catch (error: any) {
              console.error('📱 Modal: Delete error', error);
              Alert.alert('Error', error.message || 'Failed to delete recipe');
            }
          }
        }
      ]
    );
  };

  // Check if this is a user-created recipe
  // For now, we'll check if the recipe has userId and isUserCreated fields
  // TODO: Replace with actual user ID check when auth is implemented
  const isUserRecipe = recipe && (recipe as any).isUserCreated === true;

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Recipe Details</Text>
          <View className="w-8" />
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
          <Text className="text-lg font-semibold text-gray-500 mt-4">Loading recipe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !recipe) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Recipe Details</Text>
          <View className="w-8" />
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-lg font-semibold text-gray-900 mt-4 text-center">
            Failed to load recipe
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            {error || 'Recipe not found'}
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header - Single title with close button */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="p-2"
        >
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Recipe Details</Text>
        {isUserRecipe ? (
          <TouchableOpacity 
            onPress={handleEditRecipe}
            className="p-2"
          >
            <Ionicons name="create-outline" size={24} color="#F97316" />
          </TouchableOpacity>
        ) : (
          <View className="w-8" />
        )}
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Recipe Title - Removed the duplicate title here */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {recipe.title}
          </Text>
          
          {/* Description */}
          <Text className="text-gray-600 mb-4">
            {recipe.description}
          </Text>

          {/* Quick Stats */}
          <View className="flex-row justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            <View className="items-center">
              <Text className="text-gray-500 text-sm">Cook Time</Text>
              <Text className="font-semibold text-gray-900">{recipe.cookTime} min</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-sm">Calories</Text>
              <Text className="font-semibold text-gray-900">{recipe.calories}</Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-500 text-sm">Protein</Text>
              <Text className="font-semibold text-gray-900">{recipe.protein}g</Text>
            </View>
          </View>

          {/* Macro Nutrients */}
          <View className="mb-6 p-4 bg-blue-50 rounded-lg">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Nutrition</Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-gray-500 text-sm">Carbs</Text>
                <Text className="font-semibold text-gray-900">{recipe.carbs}g</Text>
              </View>
              <View className="items-center">
                <Text className="text-gray-500 text-sm">Fat</Text>
                <Text className="font-semibold text-gray-900">{recipe.fat}g</Text>
              </View>
              {recipe.fiber && (
                <View className="items-center">
                  <Text className="text-gray-500 text-sm">Fiber</Text>
                  <Text className="font-semibold text-gray-900">{recipe.fiber}g</Text>
                </View>
              )}
            </View>
          </View>

          {/* Ingredients */}
          <View className="mb-6">
            <Text className="text-xl font-semibold text-gray-900 mb-3">Ingredients</Text>
            {recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.map((ingredient: any, index: number) => (
              <View key={index} className="flex-row items-center mb-2">
                <View className="w-2 h-2 bg-orange-500 rounded-full mr-3" />
                <Text className="text-gray-700 flex-1">{getTextContent(ingredient)}</Text>
              </View>
            ))}
          </View>

          {/* Instructions */}
          <View className="mb-6">
            <Text className="text-xl font-semibold text-gray-900 mb-3">Instructions</Text>
            {recipe.instructions && Array.isArray(recipe.instructions) && recipe.instructions.map((instruction: any, index: number) => (
              <View key={index} className="flex-row mb-3">
                <Text className="font-bold text-orange-500 mr-3">{index + 1}.</Text>
                <Text className="flex-1 text-gray-700">{getTextContent(instruction)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="p-4 border-t border-gray-200">
        {isUserRecipe ? (
          // User-created recipe actions
          <>
            <TouchableOpacity 
              onPress={handleEditRecipe}
              className="bg-orange-500 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-white font-semibold text-lg">Edit Recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleDeleteRecipe}
              className="border border-red-500 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-red-500 font-semibold">Delete Recipe</Text>
            </TouchableOpacity>
          </>
        ) : (
          // System recipe actions
          <>
            <TouchableOpacity 
              onPress={handleSaveRecipe}
              disabled={isSaving}
              className={`py-3 px-6 rounded-lg items-center mb-2 ${
                isSaving ? 'bg-orange-300' : 'bg-orange-500'
              }`}
            >
              <Text className="text-white font-semibold text-lg">
                {isSaving ? 'Saving...' : 'Save to Cookbook'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleNotInterested}
              className="border border-gray-300 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-gray-700 font-semibold">Not Interested</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}