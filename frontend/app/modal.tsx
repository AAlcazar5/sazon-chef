import { View, Text, ScrollView, Alert, Share, Platform, Modal, TextInput, Animated } from 'react-native';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import AnimatedText from '../components/ui/AnimatedText';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { recipeApi, collectionsApi, shoppingListApi, costTrackingApi, shoppingAppApi, ingredientAvailabilityApi } from '../lib/api';
import type { Recipe } from '../types';
import * as Haptics from 'expo-haptics';

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
  
  // Animation for modal expansion
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  
  // Animation for collection picker modal
  const pickerScale = useRef(new Animated.Value(0)).current;
  const pickerOpacity = useRef(new Animated.Value(0)).current;
  
  const [isSaving, setIsSaving] = useState(false);
  const [collections, setCollections] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [healthifying, setHealthifying] = useState(false);
  const [healthifiedRecipe, setHealthifiedRecipe] = useState<any>(null);
  const [showHealthifyModal, setShowHealthifyModal] = useState(false);
  const [addingToShoppingList, setAddingToShoppingList] = useState(false);
  const [recipeSavings, setRecipeSavings] = useState<any>(null);
  const [loadingSavings, setLoadingSavings] = useState(false);
  const [recipeAvailability, setRecipeAvailability] = useState<any>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);

  // Animate modal entrance
  useEffect(() => {
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate collection picker modal
  useEffect(() => {
    if (pickerVisible) {
      pickerScale.setValue(0);
      pickerOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(pickerScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(pickerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(pickerScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pickerOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [pickerVisible]);

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

  // Load recipe savings when recipe is loaded
  useEffect(() => {
    const loadSavings = async () => {
      if (!recipe?.id) return;
      
      try {
        setLoadingSavings(true);
        const response = await costTrackingApi.getRecipeSavings(recipe.id);
        setRecipeSavings(response.data);
      } catch (error) {
        // Savings are optional, don't show errors
        console.log('Savings not available:', error);
      } finally {
        setLoadingSavings(false);
      }
    };

    if (recipe) {
      loadSavings();
      loadAvailability();
      loadIntegrations();
    }
  }, [recipe]);

  // Load recipe availability
  const loadAvailability = async () => {
    if (!recipe?.id) return;
    
    try {
      setLoadingAvailability(true);
      const response = await ingredientAvailabilityApi.analyzeRecipe(recipe.id);
      setRecipeAvailability(response.data);
    } catch (error) {
      // Availability is optional
      console.log('Availability not available:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Load shopping app integrations
  const loadIntegrations = async () => {
    try {
      const response = await shoppingAppApi.getIntegrations();
      setIntegrations(response.data || []);
    } catch (error) {
      console.log('Integrations not available:', error);
    }
  };

  // Sync recipe to shopping app
  const handleSyncRecipeToApp = async (appName: string) => {
    if (!recipe) return;

    try {
      const response = await shoppingAppApi.syncRecipe(appName, recipe.id);
      
      if (response.data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          '✅ Synced!',
          `${response.data.itemsAdded || 0} ingredients added to ${appName} shopping list`
        );
      } else {
        throw new Error(response.data.message || 'Failed to sync');
      }
    } catch (error: any) {
      console.error('Error syncing recipe to app:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sync Failed', error.message || 'Failed to sync recipe to shopping app');
    }
  };

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const handleAddToShoppingList = async () => {
    if (!recipe) return;

    try {
      setAddingToShoppingList(true);

      // Generate shopping list from recipe
      const response = await shoppingListApi.generateFromRecipes([recipe.id]);

      if (response.data.shoppingList) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Added to Shopping List!',
          `${response.data.itemsAdded || 0} items added to "${response.data.shoppingList.name}"`,
          [
            { text: 'OK' },
            {
              text: 'View List',
              onPress: () => {
                router.back();
                router.push('/(tabs)/shopping-list');
              },
            },
          ]
        );
      } else {
        throw new Error('Failed to add items to shopping list');
      }
    } catch (error: any) {
      console.error('❌ Add to shopping list error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to add items to shopping list');
    } finally {
      setAddingToShoppingList(false);
    }
  };

  const handleHealthify = async () => {
    if (!recipe) return;
    
    try {
      setHealthifying(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      Alert.alert(
        '💚 Healthifying Recipe...',
        'Creating a healthier version of this recipe (15-20 seconds)',
        [],
        { cancelable: false }
      );

      const response = await recipeApi.healthifyRecipe(recipe.id);
      
      if (response.data.success && response.data.recipe) {
        setHealthifiedRecipe(response.data.recipe);
        setShowHealthifyModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error('Failed to healthify recipe');
      }
    } catch (error: any) {
      console.error('❌ Healthify error:', error);
      
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.message?.includes('quota') ||
                          error.message?.includes('429');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Healthify Failed',
        isQuotaError
          ? 'AI healthify is temporarily unavailable due to quota limits. Please try again later.'
          : error.message || 'Failed to healthify recipe. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setHealthifying(false);
    }
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
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Removed', 'Recipe removed from your cookbook');
            router.back();
          } catch (error) {
            console.error('📱 Modal: Error removing recipe', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Thanks!', 'Your feedback helps us improve recommendations');
          } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to submit rating');
          }
        },
      },
      {
        text: 'Dislike',
        onPress: async () => {
          try {
            await recipeApi.dislikeRecipe(recipe.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Thanks!', 'Your feedback helps us improve recommendations');
          } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      <Animated.View
        style={{
          flex: 1,
          transform: [{ scale: modalScale }],
          opacity: modalOpacity,
        }}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <HapticTouchableOpacity 
            onPress={() => router.back()}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#374151" />
          </HapticTouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Recipe Details</Text>
          <View className="w-8" />
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="restaurant-outline" size={48} color="#9CA3AF" />
          <Text className="text-lg font-semibold text-gray-500 mt-4">Loading recipe...</Text>
        </View>
      </SafeAreaView>
      </Animated.View>
    );
  }

  // Error state
  if (error || !recipe) {
    return (
      <Animated.View
        style={{
          flex: 1,
          transform: [{ scale: modalScale }],
          opacity: modalOpacity,
        }}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <HapticTouchableOpacity 
            onPress={() => router.back()}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#374151" />
          </HapticTouchableOpacity>
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
          <HapticTouchableOpacity 
            onPress={() => router.back()}
            className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </HapticTouchableOpacity>
        </View>
      </SafeAreaView>
      </Animated.View>
    );
  }

  return (
    <>
    <Animated.View
      style={{
        flex: 1,
        transform: [{ scale: modalScale }],
        opacity: modalOpacity,
      }}
    >
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header - Single title with close button */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <HapticTouchableOpacity 
          onPress={() => router.back()}
          className="p-2"
        >
          <Ionicons name="close" size={24} color="#374151" />
        </HapticTouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Recipe Details</Text>
        {isUserRecipe ? (
          <HapticTouchableOpacity 
            onPress={handleEditRecipe}
            className="p-2"
          >
            <Ionicons name="create-outline" size={24} color="#F97316" />
          </HapticTouchableOpacity>
        ) : (
          <View className="w-8" />
        )}
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Recipe Title - Removed the duplicate title here */}
          <AnimatedText className="text-2xl font-bold text-gray-900 mb-2">
            {recipe.title}
          </AnimatedText>
          
          {/* Description */}
          <AnimatedText className="text-gray-600 mb-4">
            {recipe.description}
          </AnimatedText>

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

          {/* Health Grade Badge */}
          {(recipe.healthGrade || recipe.healthGradeScore) && (
            <View className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-600 mb-1">Health Grade</Text>
                  <Text className="text-xs text-gray-500">
                    Objective nutritional quality rating
                  </Text>
                </View>
                <View className={`px-4 py-2 rounded-lg border-2 ${
                  recipe.healthGrade === 'A' ? 'bg-green-100 border-green-300' :
                  recipe.healthGrade === 'B' ? 'bg-blue-100 border-blue-300' :
                  recipe.healthGrade === 'C' ? 'bg-yellow-100 border-yellow-300' :
                  recipe.healthGrade === 'D' ? 'bg-orange-100 border-orange-300' :
                  recipe.healthGrade === 'F' ? 'bg-red-100 border-red-300' :
                  'bg-gray-100 border-gray-300'
                }`}>
                  <Text className={`text-2xl font-bold ${
                    recipe.healthGrade === 'A' ? 'text-green-700' :
                    recipe.healthGrade === 'B' ? 'text-blue-700' :
                    recipe.healthGrade === 'C' ? 'text-yellow-700' :
                    recipe.healthGrade === 'D' ? 'text-orange-700' :
                    recipe.healthGrade === 'F' ? 'text-red-700' :
                    'text-gray-700'
                  }`}>
                    {recipe.healthGrade}
                  </Text>
                  {recipe.healthGradeScore !== undefined && (
                    <Text className={`text-xs text-center mt-1 ${
                      recipe.healthGrade === 'A' ? 'text-green-600' :
                      recipe.healthGrade === 'B' ? 'text-blue-600' :
                      recipe.healthGrade === 'C' ? 'text-yellow-600' :
                      recipe.healthGrade === 'D' ? 'text-orange-600' :
                      recipe.healthGrade === 'F' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {Math.round(recipe.healthGradeScore)}/100
                    </Text>
                  )}
                </View>
              </View>
              {recipe.healthGradeBreakdown && (
                <View className="mt-3 pt-3 border-t border-gray-200">
                  <Text className="text-xs font-medium text-gray-600 mb-2">Breakdown</Text>
                  <View className="space-y-2">
                    <View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-600">Macro Balance</Text>
                        <Text className="text-xs font-semibold text-gray-900">{recipe.healthGradeBreakdown.macronutrientBalance}/25</Text>
                      </View>
                      <View className="w-full bg-gray-200 rounded-full h-1.5">
                        <View 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${(recipe.healthGradeBreakdown.macronutrientBalance / 25) * 100}%` }}
                        />
                      </View>
                    </View>
                    <View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-600">Nutrient Density</Text>
                        <Text className="text-xs font-semibold text-gray-900">{recipe.healthGradeBreakdown.nutrientDensity}/25</Text>
                      </View>
                      <View className="w-full bg-gray-200 rounded-full h-1.5">
                        <View 
                          className="bg-green-500 h-1.5 rounded-full" 
                          style={{ width: `${(recipe.healthGradeBreakdown.nutrientDensity / 25) * 100}%` }}
                        />
                      </View>
                    </View>
                    <View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-600">Ingredient Quality</Text>
                        <Text className="text-xs font-semibold text-gray-900">{recipe.healthGradeBreakdown.ingredientQuality}/20</Text>
                      </View>
                      <View className="w-full bg-gray-200 rounded-full h-1.5">
                        <View 
                          className="bg-purple-500 h-1.5 rounded-full" 
                          style={{ width: `${(recipe.healthGradeBreakdown.ingredientQuality / 20) * 100}%` }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Nutritional Analysis */}
          {recipe.nutritionalAnalysis && (
            <View className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Text className="text-lg font-semibold text-gray-900 mb-3">Advanced Nutritional Analysis</Text>
              
              {/* Nutritional Density Score */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm font-medium text-gray-700">Nutritional Density Score</Text>
                  <Text className="text-lg font-bold text-purple-700">{Math.round(recipe.nutritionalAnalysis.nutritionalDensityScore)}/100</Text>
                </View>
                <View className="w-full bg-gray-200 rounded-full h-2">
                  <View 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${Math.round(recipe.nutritionalAnalysis.nutritionalDensityScore)}%` }}
                  />
                </View>
              </View>

              {/* Key Nutrients */}
              {recipe.nutritionalAnalysis.keyNutrients.length > 0 && (
                <View className="mb-3">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Key Nutrients</Text>
                  <View className="flex-row flex-wrap">
                    {recipe.nutritionalAnalysis.keyNutrients.map((nutrient, idx) => (
                      <View key={idx} className="bg-green-100 px-2 py-1 rounded-full mr-2 mb-2">
                        <Text className="text-xs font-medium text-green-700">{nutrient}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Omega-3 */}
              {recipe.nutritionalAnalysis.omega3.totalOmega3 > 0 && (
                <View className="mb-3 p-3 bg-blue-50 rounded-lg">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Omega-3 Fatty Acids</Text>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600">Total: {recipe.nutritionalAnalysis.omega3.totalOmega3.toFixed(2)}g</Text>
                    {recipe.nutritionalAnalysis.omega3.epa > 0 && (
                      <Text className="text-xs text-gray-600">EPA: {recipe.nutritionalAnalysis.omega3.epa.toFixed(2)}g</Text>
                    )}
                    {recipe.nutritionalAnalysis.omega3.dha > 0 && (
                      <Text className="text-xs text-gray-600">DHA: {recipe.nutritionalAnalysis.omega3.dha.toFixed(2)}g</Text>
                    )}
                  </View>
                  <Text className="text-xs text-blue-600 mt-1">Score: {Math.round(recipe.nutritionalAnalysis.omega3.omega3Score)}/100</Text>
                </View>
              )}

              {/* Antioxidants */}
              {recipe.nutritionalAnalysis.antioxidants.oracValue > 0 && (
                <View className="mb-3 p-3 bg-orange-50 rounded-lg">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Antioxidants</Text>
                  <Text className="text-xs text-gray-600">ORAC Value: {recipe.nutritionalAnalysis.antioxidants.oracValue.toLocaleString()}</Text>
                  {recipe.nutritionalAnalysis.antioxidants.polyphenols > 0 && (
                    <Text className="text-xs text-gray-600">Polyphenols: {recipe.nutritionalAnalysis.antioxidants.polyphenols}mg</Text>
                  )}
                  <Text className="text-xs text-orange-600 mt-1">Score: {Math.round(recipe.nutritionalAnalysis.antioxidants.antioxidantScore)}/100</Text>
                </View>
              )}

              {/* Micronutrients Summary */}
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 mb-2">Micronutrients</Text>
                <View className="flex-row flex-wrap">
                  {recipe.nutritionalAnalysis.micronutrients.vitamins.vitaminC > 0 && (
                    <View className="bg-yellow-100 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-yellow-700">C: {Math.round(recipe.nutritionalAnalysis.micronutrients.vitamins.vitaminC)}mg</Text>
                    </View>
                  )}
                  {recipe.nutritionalAnalysis.micronutrients.vitamins.vitaminA > 0 && (
                    <View className="bg-orange-100 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-orange-700">A: {Math.round(recipe.nutritionalAnalysis.micronutrients.vitamins.vitaminA)}IU</Text>
                    </View>
                  )}
                  {recipe.nutritionalAnalysis.micronutrients.minerals.calcium > 0 && (
                    <View className="bg-blue-100 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-blue-700">Ca: {Math.round(recipe.nutritionalAnalysis.micronutrients.minerals.calcium)}mg</Text>
                    </View>
                  )}
                  {recipe.nutritionalAnalysis.micronutrients.minerals.iron > 0 && (
                    <View className="bg-red-100 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-red-700">Fe: {recipe.nutritionalAnalysis.micronutrients.minerals.iron.toFixed(1)}mg</Text>
                    </View>
                  )}
                  {recipe.nutritionalAnalysis.micronutrients.minerals.potassium > 0 && (
                    <View className="bg-green-100 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-green-700">K: {Math.round(recipe.nutritionalAnalysis.micronutrients.minerals.potassium)}mg</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Nutrient Gaps */}
              {recipe.nutritionalAnalysis.nutrientGaps.length > 0 && (
                <View className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Text className="text-sm font-medium text-yellow-800 mb-1">Nutrient Gaps</Text>
                  <Text className="text-xs text-yellow-700">
                    Consider adding: {recipe.nutritionalAnalysis.nutrientGaps.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          )}

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

          {/* Ingredient Availability */}
          {recipeAvailability && (
            <View className="mb-6 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle-outline" size={20} color="#9333EA" />
                  <Text className="text-lg font-semibold text-gray-900 ml-2">Ingredient Availability</Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${
                  recipeAvailability.overallAvailability >= 80 ? 'bg-green-100' :
                  recipeAvailability.overallAvailability >= 50 ? 'bg-yellow-100' :
                  'bg-red-100'
                }`}>
                  <Text className={`font-bold ${
                    recipeAvailability.overallAvailability >= 80 ? 'text-green-700' :
                    recipeAvailability.overallAvailability >= 50 ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {recipeAvailability.overallAvailability}%
                  </Text>
                </View>
              </View>
              
              <View className="mb-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-gray-600">Available Ingredients</Text>
                  <Text className="text-gray-900 font-semibold">
                    {recipeAvailability.availableIngredients} / {recipeAvailability.totalIngredients}
                  </Text>
                </View>
                {recipeAvailability.unavailableIngredients && recipeAvailability.unavailableIngredients.length > 0 && (
                  <View className="mt-2">
                    <Text className="text-sm text-gray-600 mb-1">May be unavailable:</Text>
                    <Text className="text-sm text-red-600">
                      {recipeAvailability.unavailableIngredients.slice(0, 5).join(', ')}
                      {recipeAvailability.unavailableIngredients.length > 5 && '...'}
                    </Text>
                  </View>
                )}
              </View>

              {recipeAvailability.recommendations && recipeAvailability.recommendations.length > 0 && (
                <View className="mt-2 pt-2 border-t border-purple-200">
                  {recipeAvailability.recommendations.map((rec: string, idx: number) => (
                    <Text key={idx} className="text-sm text-gray-700 mb-1">
                      • {rec}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Cost Information */}
          {(recipe.estimatedCost || recipe.estimatedCostPerServing || recipe.pricePerServing) && (
            <View className="mb-6 p-4 bg-emerald-50 rounded-lg">
              <Text className="text-lg font-semibold text-gray-900 mb-2">Cost</Text>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-gray-500 text-sm">Total Cost</Text>
                  <Text className="text-2xl font-bold text-emerald-700">
                    ${recipe.estimatedCost ? Math.round(recipe.estimatedCost * 100) / 100 : (recipe.pricePerServing ? Math.round(recipe.pricePerServing * recipe.servings * 100) / 100 : 'N/A')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-500 text-sm">Per Serving</Text>
                  <Text className="text-xl font-semibold text-emerald-700">
                    ${Math.round((recipe.estimatedCostPerServing || recipe.pricePerServing || 0) * 100) / 100}
                  </Text>
                </View>
              </View>
              {recipe.costSource && (
                <Text className="text-xs text-gray-500 mt-2">
                  Source: {recipe.costSource === 'user' ? 'User provided' : recipe.costSource === 'api' ? 'External API' : recipe.costSource === 'calculated' ? 'Calculated from ingredients' : 'Estimated'}
                </Text>
              )}
            </View>
          )}

          {/* Price Comparison & Savings */}
          {recipeSavings && recipeSavings.potentialSavings > 0 && (
            <View className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="pricetag-outline" size={20} color="#3B82F6" />
                  <Text className="text-lg font-semibold text-gray-900 ml-2">💰 Savings Opportunity</Text>
                </View>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 font-bold">
                    Save ${recipeSavings.potentialSavings.toFixed(2)}
                  </Text>
                </View>
              </View>
              
              <View className="mb-3">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-gray-600">Current Cost</Text>
                  <Text className="text-gray-900 font-semibold">${recipeSavings.currentCost.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-gray-600">Optimized Cost</Text>
                  <Text className="text-green-600 font-semibold">${recipeSavings.optimizedCost.toFixed(2)}</Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-600">Savings</Text>
                  <Text className="text-green-700 font-bold">
                    ${recipeSavings.potentialSavings.toFixed(2)} ({recipeSavings.savingsPercent.toFixed(0)}%)
                  </Text>
                </View>
              </View>

              {recipeSavings.recommendations && recipeSavings.recommendations.length > 0 && (
                <View className="mt-3 pt-3 border-t border-blue-200">
                  <Text className="text-sm font-semibold text-gray-900 mb-2">Recommendations:</Text>
                  {recipeSavings.recommendations.map((rec: string, idx: number) => (
                    <View key={idx} className="flex-row items-start mb-1">
                      <Text className="text-blue-600 mr-2">•</Text>
                      <Text className="text-sm text-gray-700 flex-1">{rec}</Text>
                    </View>
                  ))}
                </View>
              )}

              {recipeSavings.ingredientComparisons && recipeSavings.ingredientComparisons.length > 0 && (
                <View className="mt-3 pt-3 border-t border-blue-200">
                  <Text className="text-sm font-semibold text-gray-900 mb-2">Ingredient Price Comparisons:</Text>
                  {recipeSavings.ingredientComparisons.slice(0, 3).map((comp: any, idx: number) => (
                    <View key={idx} className="mb-2 p-2 bg-white rounded">
                      <Text className="text-sm font-semibold text-gray-900">{comp.ingredientName}</Text>
                      <View className="flex-row justify-between items-center mt-1">
                        <Text className="text-xs text-gray-600">
                          Current: ${comp.currentPrice.toFixed(2)} {comp.currentStore ? `@ ${comp.currentStore}` : ''}
                        </Text>
                        {comp.alternatives.length > 0 && (
                          <Text className="text-xs text-green-600 font-semibold">
                            Best: ${comp.bestPrice.toFixed(2)} @ {comp.alternatives[0].store}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

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
        {/* Add to Shopping List Button - Available for all recipes */}
        <HapticTouchableOpacity 
          onPress={handleAddToShoppingList}
          disabled={addingToShoppingList || !recipe}
          hapticStyle="medium"
          className={`${addingToShoppingList ? 'opacity-50' : ''} bg-blue-500 py-3 px-6 rounded-lg items-center mb-2 flex-row justify-center`}
        >
          <Ionicons name="cart" size={20} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white font-semibold text-lg">
            {addingToShoppingList ? 'Adding...' : '🛒 Add to Shopping List'}
          </Text>
        </HapticTouchableOpacity>

        {/* Sync to Shopping Apps */}
        {integrations.length > 0 && (
          <View className="mb-2">
            <Text className="text-sm font-medium text-gray-700 mb-2 px-2">Sync Recipe to Shopping App:</Text>
            {integrations.map((integration) => (
              <HapticTouchableOpacity
                key={integration.id}
                onPress={() => handleSyncRecipeToApp(integration.appName)}
                hapticStyle="medium"
                className="bg-blue-100 py-3 px-4 rounded-lg items-center mb-2 flex-row justify-center"
              >
                <Ionicons name="link-outline" size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text className="text-blue-700 font-semibold">
                  Sync to {integration.appName.charAt(0).toUpperCase() + integration.appName.slice(1)}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        )}

        {/* Healthify Button - Available for all recipes */}
        <HapticTouchableOpacity 
          onPress={handleHealthify}
          disabled={healthifying}
          className={`${healthifying ? 'opacity-50' : ''} bg-green-500 py-3 px-6 rounded-lg items-center mb-2 flex-row justify-center`}
        >
          <Ionicons name="leaf" size={20} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white font-semibold text-lg">
            {healthifying ? 'Healthifying...' : '💚 Healthify Recipe'}
          </Text>
        </HapticTouchableOpacity>

        {isUserRecipe ? (
          // User-created recipe actions
          <>
            <HapticTouchableOpacity 
              onPress={handleEditRecipe}
              className="bg-orange-500 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-white font-semibold text-lg">Edit Recipe</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity 
              onPress={handleDeleteRecipe}
              className="border border-red-500 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-red-500 font-semibold">Delete Recipe</Text>
            </HapticTouchableOpacity>
          </>
        ) : source === 'cookbook' ? (
          // System recipe actions (in cookbook context)
          <>
            <HapticTouchableOpacity 
              onPress={handleRemoveFromCookbook}
              className="bg-red-500 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-white font-semibold text-lg">Remove from Cookbook</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity 
              onPress={handleRateRecipe}
              className="border border-orange-500 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-orange-500 font-semibold">Rate Recipe</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity 
              onPress={handleShareRecipe}
              className="border border-gray-300 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-gray-700 font-semibold">Share Recipe</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity 
              onPress={handleAddToMealPlan}
              className="border border-blue-500 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-blue-500 font-semibold">Add to Meal Plan</Text>
            </HapticTouchableOpacity>
          </>
        ) : source === 'random' ? (
          // System recipe actions (from random button)
          <>
            <HapticTouchableOpacity 
              onPress={handleSaveRecipe}
              disabled={isSaving}
              className={`py-3 px-6 rounded-lg items-center mb-2 ${
                isSaving ? 'bg-orange-300' : 'bg-orange-500'
              }`}
            >
              <Text className="text-white font-semibold text-lg">
                {isSaving ? 'Saving...' : 'Save to Cookbook'}
              </Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity 
              onPress={handleNotInterested}
              className="border border-gray-300 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-gray-700 font-semibold">Not Interested</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity 
              onPress={handleShareRecipe}
              className="border border-gray-300 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-gray-700 font-semibold">Share Recipe</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity 
              onPress={handleAddToMealPlan}
              className="border border-blue-500 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-blue-500 font-semibold">Add to Meal Plan</Text>
            </HapticTouchableOpacity>
          </>
        ) : (
          // System recipe actions (from home screen)
          <>
            <HapticTouchableOpacity 
              onPress={handleSaveRecipe}
              disabled={isSaving}
              className={`py-3 px-6 rounded-lg items-center mb-2 ${
                isSaving ? 'bg-orange-300' : 'bg-orange-500'
              }`}
            >
              <Text className="text-white font-semibold text-lg">
                {isSaving ? 'Saving...' : 'Save to Cookbook'}
              </Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity 
              onPress={handleNotInterested}
              className="border border-gray-300 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-gray-700 font-semibold">Not Interested</Text>
            </HapticTouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
    
    {/* Collection Picker Modal */}
    <Modal
      visible={pickerVisible}
      animationType="none"
      transparent
      onRequestClose={() => setPickerVisible(false)}
    >
      <Animated.View className="flex-1 bg-black/40 justify-center items-center px-4" style={{ opacity: pickerOpacity }}>
        <Animated.View 
          className="bg-white rounded-2xl p-4 w-full max-h-[70%]"
          style={{
            transform: [{ scale: pickerScale }],
          }}
        >
          <Text className="text-lg font-semibold mb-3">Save to Collection</Text>
          <ScrollView className="mb-3">
              {collections.map((c) => (
                <HapticTouchableOpacity
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
                </HapticTouchableOpacity>
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
                <HapticTouchableOpacity onPress={handleCreateCollection} className="bg-orange-500 px-3 py-2 rounded-lg">
                  <Text className="text-white font-semibold">Create</Text>
                </HapticTouchableOpacity>
              </View>
            ) : (
              <HapticTouchableOpacity onPress={() => setCreatingCollection(true)} className="py-3">
                <Text className="text-orange-600 font-medium">+ Create new collection</Text>
              </HapticTouchableOpacity>
            )}
          </ScrollView>
          <View className="flex-row justify-end space-x-3">
            <HapticTouchableOpacity onPress={() => setPickerVisible(false)} className="px-4 py-3">
              <Text className="text-gray-700">Cancel</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity onPress={handleConfirmPicker} className="bg-orange-500 px-4 py-3 rounded-lg">
              <Text className="text-white font-semibold">Save</Text>
            </HapticTouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
      </Modal>

      {/* Healthify Results Modal */}
      <Modal
        visible={showHealthifyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHealthifyModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <HapticTouchableOpacity 
              onPress={() => setShowHealthifyModal(false)}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="#374151" />
            </HapticTouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">Healthified Recipe</Text>
            <View className="w-8" />
          </View>

          {healthifiedRecipe && (
            <ScrollView className="flex-1">
              <View className="p-4">
                {/* Title */}
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  {healthifiedRecipe.title}
                </Text>
                
                {/* Description */}
                <Text className="text-gray-600 mb-6">
                  {healthifiedRecipe.description}
                </Text>

                {/* Nutrition Comparison */}
                <View className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Text className="text-lg font-semibold text-gray-900 mb-4">Nutrition Comparison</Text>
                  
                  {healthifiedRecipe.nutritionComparison && (
                    <View>
                      {/* Calories */}
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-gray-700 font-medium">Calories</Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 mr-2">{healthifiedRecipe.nutritionComparison.before.calories}</Text>
                          <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                          <Text className="text-green-600 font-semibold ml-2">{healthifiedRecipe.nutritionComparison.after.calories}</Text>
                        </View>
                      </View>
                      
                      {/* Protein */}
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-gray-700 font-medium">Protein</Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 mr-2">{healthifiedRecipe.nutritionComparison.before.protein}g</Text>
                          <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                          <Text className="text-green-600 font-semibold ml-2">{healthifiedRecipe.nutritionComparison.after.protein}g</Text>
                        </View>
                      </View>
                      
                      {/* Carbs */}
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-gray-700 font-medium">Carbs</Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 mr-2">{healthifiedRecipe.nutritionComparison.before.carbs}g</Text>
                          <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                          <Text className="text-green-600 font-semibold ml-2">{healthifiedRecipe.nutritionComparison.after.carbs}g</Text>
                        </View>
                      </View>
                      
                      {/* Fat */}
                      <View className="flex-row justify-between items-center">
                        <Text className="text-gray-700 font-medium">Fat</Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 mr-2">{healthifiedRecipe.nutritionComparison.before.fat}g</Text>
                          <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                          <Text className="text-green-600 font-semibold ml-2">{healthifiedRecipe.nutritionComparison.after.fat}g</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Substitutions */}
                {healthifiedRecipe.substitutions && healthifiedRecipe.substitutions.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-xl font-semibold text-gray-900 mb-3">Smart Substitutions</Text>
                    {healthifiedRecipe.substitutions.map((sub: any, index: number) => (
                      <View key={index} className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <View className="flex-row items-start mb-2">
                          <Ionicons name="swap-horizontal" size={20} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
                          <View className="flex-1">
                            <Text className="text-gray-900 font-medium">
                              <Text className="text-red-600 line-through">{sub.original}</Text>
                              {' → '}
                              <Text className="text-green-600">{sub.replacement}</Text>
                            </Text>
                            <Text className="text-gray-600 text-sm mt-1">{sub.reason}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Improvements */}
                {healthifiedRecipe.improvements && healthifiedRecipe.improvements.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-xl font-semibold text-gray-900 mb-3">Health Improvements</Text>
                    {healthifiedRecipe.improvements.map((improvement: any, index: number) => (
                      <View key={index} className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Text className="text-gray-900 font-medium mb-1">{improvement.aspect}</Text>
                        <View className="flex-row items-center mb-1">
                          <Text className="text-gray-500 text-sm">Before: {improvement.before}</Text>
                        </View>
                        <View className="flex-row items-center mb-1">
                          <Text className="text-green-600 text-sm font-semibold">After: {improvement.after}</Text>
                        </View>
                        <Text className="text-gray-600 text-sm mt-1">💡 {improvement.benefit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Ingredients */}
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-gray-900 mb-3">Ingredients</Text>
                  {healthifiedRecipe.ingredients && healthifiedRecipe.ingredients.map((ingredient: any, index: number) => (
                    <View key={index} className="flex-row items-center mb-2">
                      <View className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                      <Text className="text-gray-700 flex-1">{getTextContent(ingredient)}</Text>
                    </View>
                  ))}
                </View>

                {/* Instructions */}
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-gray-900 mb-3">Instructions</Text>
                  {healthifiedRecipe.instructions && healthifiedRecipe.instructions.map((instruction: any, index: number) => (
                    <View key={index} className="flex-row mb-3">
                      <Text className="font-bold text-green-500 mr-3">{index + 1}.</Text>
                      <Text className="flex-1 text-gray-700">{getTextContent(instruction)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}

          {/* Action Buttons */}
          <View className="p-4 border-t border-gray-200">
            <HapticTouchableOpacity 
              onPress={async () => {
                if (!healthifiedRecipe) return;
                
                try {
                  // Save the healthified recipe as a new recipe
                  const recipeData = {
                    title: healthifiedRecipe.title,
                    description: healthifiedRecipe.description,
                    cuisine: healthifiedRecipe.cuisine,
                    cookTime: healthifiedRecipe.cookTime,
                    calories: healthifiedRecipe.calories,
                    protein: healthifiedRecipe.protein,
                    carbs: healthifiedRecipe.carbs,
                    fat: healthifiedRecipe.fat,
                    ingredients: healthifiedRecipe.ingredients.map((ing: any) => 
                      typeof ing === 'string' ? ing : ing.text
                    ),
                    instructions: healthifiedRecipe.instructions.map((inst: any) => 
                      typeof inst === 'string' ? inst : inst.text
                    ),
                  };
                  
                  await recipeApi.createRecipe(recipeData);
                  
                  Alert.alert(
                    'Recipe Saved',
                    'Your healthified recipe has been saved to your cookbook!',
                    [
                      { text: 'OK', onPress: () => {
                        setShowHealthifyModal(false);
                        router.back();
                      }}
                    ]
                  );
                } catch (error: any) {
                  Alert.alert('Error', error.message || 'Failed to save recipe');
                }
              }}
              className="bg-green-500 py-3 px-6 rounded-lg items-center mb-2"
            >
              <Text className="text-white font-semibold text-lg">Save Healthified Recipe</Text>
            </HapticTouchableOpacity>
            
            <HapticTouchableOpacity 
              onPress={() => setShowHealthifyModal(false)}
              className="border border-gray-300 py-3 px-6 rounded-lg items-center"
            >
              <Text className="text-gray-700 font-semibold text-lg">Close</Text>
            </HapticTouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </Animated.View>
    </>
  );
}