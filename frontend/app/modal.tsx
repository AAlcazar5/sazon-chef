import { View, Text, ScrollView, TouchableOpacity, Alert, Share, Platform, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { recipeApi, collectionsApi } from '../lib/api';
import type { Recipe } from '../types';

// Helper function to extract text from ingredients/instructions
const getTextContent = (item: any): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'text' in item) return item.text;
  return String(item);
};

export default function RecipeModal() {
  const { id, source } = useLocalSearchParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [collections, setCollections] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

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

  const openCollectionPicker = async () => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Array<{ id: string; name: string; isDefault?: boolean }>;
      setCollections(cols);
      // Start with no collections selected (will save to "All")
      setSelectedCollectionIds([]);
      setPickerVisible(true);
    } catch (e) {
      // If collections fail to load, fallback to default save
      setPickerVisible(false);
      await performSave();
    }
  };

  const performSave = async (collectionIds?: string[]) => {
    if (!recipe) return;
    
    try {
      setIsSaving(true);
      console.log('📱 Modal: Saving recipe', recipe.id);
      await recipeApi.saveRecipe(recipe.id, collectionIds && collectionIds.length > 0 ? { collectionIds } : undefined);
      console.log('📱 Modal: Recipe saved successfully');
      // Show confirmation, then close modal
      Alert.alert('Saved', 'Recipe saved to your cookbook!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      if (error.code === 'HTTP_409' || /already\s*saved/i.test(error.message)) {
        // If already saved, try to add to collections
        if (collectionIds && collectionIds.length > 0) {
          try {
            await collectionsApi.moveSavedRecipe(recipe.id, collectionIds);
            Alert.alert('Moved', 'Recipe moved to collections!', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          } catch (e) {
            Alert.alert('Already Saved', 'This recipe is already in your cookbook!', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          }
        } else {
          Alert.alert('Already Saved', 'This recipe is already in your cookbook!', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      } else {
        console.error('📱 Modal: Save error', error);
        Alert.alert('Error', error.message || 'Failed to save recipe');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRecipe = async () => {
    await openCollectionPicker();
  };

  const handleConfirmPicker = async () => {
    setPickerVisible(false);
    await performSave(selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined);
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
      }
      setNewCollectionName('');
      setCreatingCollection(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create collection');
    }
  };

  const handleNotInterested = () => {
    console.log('📱 Modal: Not interested in recipe');
    router.back();
  };

  const handleRemoveFromCookbook = async () => {
    if (!recipe) return;
    
    Alert.alert(
      'Remove from Cookbook',
      'Are you sure you want to remove this recipe from your cookbook?',
      [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('📱 Modal: Removing recipe from cookbook', recipe.id);
            await recipeApi.unsaveRecipe(recipe.id);
            console.log('📱 Modal: Recipe removed from cookbook');
            
            Alert.alert('Removed', 'Recipe removed from your cookbook');
            router.back();
          } catch (error) {
            console.error('📱 Modal: Error removing recipe', error);
            Alert.alert('Error', 'Failed to remove recipe from cookbook');
          }
        },
      },
    ]);
  };

  const handleRateRecipe = async () => {
    if (!recipe) return;
    
    Alert.alert(
      'Rate Recipe',
      'How would you rate this recipe?',
      [
      {
        text: 'Like',
        onPress: async () => {
          try {
            await recipeApi.likeRecipe(recipe.id);
            Alert.alert('Thanks!', 'Your feedback helps us improve recommendations');
          } catch (error) {
            Alert.alert('Error', 'Failed to submit rating');
          }
        },
      },
      {
        text: 'Dislike',
        onPress: async () => {
          try {
            await recipeApi.dislikeRecipe(recipe.id);
            Alert.alert('Thanks!', 'Your feedback helps us improve recommendations');
          } catch (error) {
            Alert.alert('Error', 'Failed to submit rating');
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleShareRecipe = async () => {
    if (!recipe) return;
    
    try {
      const shareContent = {
        title: `Check out this recipe: ${recipe.title}`,
        message: `🍽️ ${recipe.title}\n\n${recipe.description}\n\n⏱️ Cook Time: ${recipe.cookTime} minutes\n🔥 Calories: ${recipe.calories}\n🥩 Protein: ${recipe.protein}g\n🍞 Carbs: ${recipe.carbs}g\n🥑 Fat: ${recipe.fat}g\n\nDownload Sazon Chef to discover more amazing recipes!`,
        url: `https://sazonchef.app/recipe/${recipe.id}`, // Future deep link
      };

      const result = await Share.share(shareContent);
      
      if (result.action === Share.sharedAction) {
        console.log('📱 Recipe shared successfully');
      } else if (result.action === Share.dismissedAction) {
        console.log('📱 Share dismissed');
      }
    } catch (error) {
      console.error('📱 Error sharing recipe:', error);
      Alert.alert('Error', 'Failed to share recipe');
    }
  };

  const handleAddToMealPlan = () => {
    if (!recipe) return;
    
    // Navigate to meal plan tab with recipe context
    router.push(`/(tabs)/meal-plan?recipeId=${recipe.id}&recipeTitle=${encodeURIComponent(recipe.title)}`);
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
    <>
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
        ) : source === 'cookbook' ? (
          // System recipe actions (in cookbook context)
          <>
            <TouchableOpacity 
              onPress={handleRemoveFromCookbook}
              className="bg-red-500 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-white font-semibold text-lg">Remove from Cookbook</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleRateRecipe}
              className="border border-orange-500 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-orange-500 font-semibold">Rate Recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleShareRecipe}
              className="border border-gray-300 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-gray-700 font-semibold">Share Recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleAddToMealPlan}
              className="border border-blue-500 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-blue-500 font-semibold">Add to Meal Plan</Text>
            </TouchableOpacity>
          </>
        ) : source === 'random' ? (
          // System recipe actions (from random button)
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
              className="border border-gray-300 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-gray-700 font-semibold">Not Interested</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleShareRecipe}
              className="border border-gray-300 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-gray-700 font-semibold">Share Recipe</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleAddToMealPlan}
              className="border border-blue-500 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-blue-500 font-semibold">Add to Meal Plan</Text>
            </TouchableOpacity>
          </>
        ) : (
          // System recipe actions (from home screen)
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
    
    {/* Collection Picker Modal */}
    <Modal
      visible={pickerVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setPickerVisible(false)}
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
            <TouchableOpacity onPress={() => setPickerVisible(false)} className="px-4 py-3">
              <Text className="text-gray-700">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirmPicker} className="bg-orange-500 px-4 py-3 rounded-lg">
              <Text className="text-white font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}