import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TextInput, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { scaleRecipe, ScaledRecipe } from '../../utils/recipeScaling';
import { mealPrepApi } from '../../lib/api';
import { getStorageMethods } from '../../utils/storageInstructions';
import { estimateBatchCookingTime, formatTimeEstimate, getTimeSavingsMessage, type BatchCookingTimeEstimate } from '../../utils/batchCookingTime';
import { getContainerRecommendations, formatContainerRecommendation, type ContainerRecommendation } from '../../utils/containerRecommendations';
import type { Recipe } from '../../types';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface MealPrepScalingModalProps {
  visible: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onConfirm: (scaledRecipe: ScaledRecipe) => void;
}

export default function MealPrepScalingModal({
  visible,
  recipe,
  onClose,
  onConfirm,
}: MealPrepScalingModalProps) {
  const [totalServings, setTotalServings] = useState('18');
  const [scaledRecipe, setScaledRecipe] = useState<ScaledRecipe | null>(null);
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [loadingCostAnalysis, setLoadingCostAnalysis] = useState(false);
  const [existingTemplate, setExistingTemplate] = useState<any>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState<BatchCookingTimeEstimate | null>(null);
  const [containerRecommendations, setContainerRecommendations] = useState<{
    freeze: ContainerRecommendation[];
    fresh: ContainerRecommendation[];
    all: ContainerRecommendation;
  } | null>(null);

  // Helper function to detect recipe type from title/description
  const detectRecipeType = (recipe: Recipe): 'soup' | 'stew' | 'solid' | 'liquid' | 'mixed' => {
    const titleLower = recipe.title.toLowerCase();
    const descLower = (recipe.description || '').toLowerCase();
    const combined = `${titleLower} ${descLower}`;

    // Check for soup indicators
    if (combined.includes('soup') || combined.includes('broth') || combined.includes('bisque') || combined.includes('chowder')) {
      return 'soup';
    }

    // Check for stew indicators
    if (combined.includes('stew') || combined.includes('braise') || combined.includes('ragout')) {
      return 'stew';
    }

    // Check for liquid indicators
    if (combined.includes('smoothie') || combined.includes('juice') || combined.includes('drink') || combined.includes('beverage')) {
      return 'liquid';
    }

    // Check for solid indicators (less common, but can detect)
    if (combined.includes('casserole') || combined.includes('lasagna') || combined.includes('bake') || combined.includes('roast')) {
      return 'solid';
    }

    // Default to mixed
    return 'mixed';
  };

  // Animation - start at 1 for immediate visibility, then animate
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset and animate in
      scale.setValue(0);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  useEffect(() => {
    if (recipe && visible) {
      const originalServings = recipe.servings || 1;
      const total = parseInt(totalServings) || originalServings;
      if (total > 0 && !isNaN(total)) {
        const scaled = scaleRecipe(recipe, total);
        setScaledRecipe(scaled);

        // Calculate batch cooking time estimate
        const estimate = estimateBatchCookingTime(
          recipe.cookTime,
          originalServings,
          total,
          recipe.difficulty || 'medium'
        );
        setTimeEstimate(estimate);

        // Calculate container recommendations (simplified - just total servings)
        const recipeType = detectRecipeType(recipe);
        const containerRecs = getContainerRecommendations(
          total,
          0, // No freeze tracking
          total, // All servings available
          recipeType,
          true // prefer single-serve
        );
        setContainerRecommendations(containerRecs);

        // Load cost analysis
        loadCostAnalysis(total);
      }

      // Load existing template for this recipe
      loadTemplate();
    }
  }, [recipe, totalServings, visible]);

  const loadTemplate = async () => {
    if (!recipe) return;
    
    try {
      const response = await mealPrepApi.getTemplateByRecipe(recipe.id);
      setExistingTemplate(response.data);
      
      // If template exists and modal just opened, load template values
      if (response.data && visible) {
        setTotalServings(response.data.defaultServings.toString());
      }
    } catch (error: any) {
      // Template doesn't exist, that's fine - don't log 404 errors
      const is404 = error.response?.status === 404 || error.code === 'HTTP_404';
      const isTemplateNotFound = error.message?.toLowerCase().includes('template not found') ||
                                 error.message?.toLowerCase().includes('no meal prep template exists');
      
      if (!is404 && !isTemplateNotFound) {
        console.error('Failed to load template:', error);
      }
      setExistingTemplate(null);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!recipe || !scaledRecipe) return;

    try {
      setSavingTemplate(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await mealPrepApi.createOrUpdateTemplate({
        recipeId: recipe.id,
        defaultServings: scaledRecipe.servings,
        defaultServingsToFreeze: 0, // No longer tracking
        defaultServingsForWeek: 0, // No longer tracking
      });

      // Reload template
      await loadTemplate();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save template:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingTemplate(false);
    }
  };

  const loadCostAnalysis = async (servings: number) => {
    if (!recipe) return;
    
    try {
      setLoadingCostAnalysis(true);
      const response = await mealPrepApi.getMealPrepCostAnalysis(recipe.id, servings);
      setCostAnalysis(response.data);
    } catch (error) {
      console.error('Failed to load cost analysis:', error);
    } finally {
      setLoadingCostAnalysis(false);
    }
  };

  const handleTotalServingsChange = (text: string) => {
    setTotalServings(text);
  };

  const handleConfirm = async () => {
    if (scaledRecipe && recipe) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onConfirm(scaledRecipe);
      onClose();
    }
  };

  const handleAddToMealPlan = () => {
    if (scaledRecipe && recipe) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Navigate to meal plan with recipe info
      router.push({
        pathname: '/(tabs)/meal-plan',
        params: {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          scaledServings: scaledRecipe.servings.toString(),
        },
      });
      onClose();
    }
  };

  if (!visible) return null;

  const originalServings = recipe?.servings || 1;
  const scaleFactor = scaledRecipe && originalServings > 0 
    ? scaledRecipe.servings / originalServings 
    : 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <Animated.View
          style={{
            transform: [{ scale }],
            opacity,
            maxHeight: '90%',
            width: '100%',
            maxWidth: 400,
          }}
          className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl"
        >
          <SafeAreaView edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-2">🍱</Text>
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Meal Prep Scaling
                </Text>
              </View>
              <HapticTouchableOpacity
                onPress={onClose}
                className="p-2"
                hapticStyle="light"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </HapticTouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
              style={{ maxHeight: 400 }}
            >
              <View className="p-4">
                {!recipe ? (
                  <View className="items-center justify-center py-8">
                    <Text className="text-gray-500 dark:text-gray-400">Loading recipe...</Text>
                  </View>
                ) : (
                  <>
                    {/* Recipe Info */}
                    <View className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {recipe.title}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Original: {originalServings} serving{originalServings !== 1 ? 's' : ''}
                      </Text>
                      
                      {/* Storage Method Indicators - Quick View */}
                      {recipe && getStorageMethods(recipe).length > 0 && (
                        <View className="flex-row space-x-2 mt-2">
                          {getStorageMethods(recipe).map((method) => {
                            const methodConfig = {
                              freezer: { emoji: '❄️', label: 'Freezer', icon: 'snow', color: '#3B82F6', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
                              fridge: { emoji: '🧊', label: 'Fridge', icon: 'snow-outline', color: '#06B6D4', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
                              shelf: { emoji: '📦', label: 'Shelf', icon: 'cube-outline', color: '#6B7280', bgColor: 'bg-gray-100 dark:bg-gray-700' },
                            }[method];
                            return (
                              <View
                                key={method}
                                className={`px-2 py-1 rounded-full flex-row items-center ${methodConfig.bgColor}`}
                              >
                                <Text className="text-xs mr-1">{methodConfig.emoji}</Text>
                                <Ionicons 
                                  name={methodConfig.icon as any} 
                                  size={12} 
                                  color={methodConfig.color} 
                                />
                                <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 ml-1">
                                  {methodConfig.label}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>

                {/* Servings Input */}
                <View className="mb-4">
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Total Servings
                  </Text>
                  <TextInput
                    value={totalServings}
                    onChangeText={handleTotalServingsChange}
                    keyboardType="number-pad"
                    className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-lg text-gray-900 dark:text-gray-100 text-lg"
                    placeholder="18"
                    placeholderTextColor="#9CA3AF"
                  />
                  {scaleFactor !== 1 && (
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Scaling by {scaleFactor.toFixed(2)}x
                    </Text>
                  )}
                </View>


                {/* Scaled Ingredients Preview */}
                {scaledRecipe && (
                  <View className="mb-4">
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Scaled Ingredients ({scaledRecipe.servings} servings)
                    </Text>
                    <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3" style={{ maxHeight: 200 }}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                        {scaledRecipe.ingredients.map((ing, index) => (
                          <View key={index} className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-600 last:border-0">
                            <Text className="text-sm text-gray-900 dark:text-gray-100">
                              {ing.scaledText}
                            </Text>
                            {ing.originalAmount !== ing.scaledAmount && (
                              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                (was {ing.originalAmount} {ing.unit})
                              </Text>
                            )}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                )}

                {/* Scaled Macros */}
                {scaledRecipe && (
                  <View className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Nutrition (per serving)
                    </Text>
                    <View className="flex-row justify-between">
                      <View className="items-center">
                        <Text className="text-xs text-gray-600 dark:text-gray-400">Calories</Text>
                        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {Math.round(scaledRecipe.calories / scaledRecipe.servings)}
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xs text-gray-600 dark:text-gray-400">Protein</Text>
                        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {Math.round(scaledRecipe.protein / scaledRecipe.servings)}g
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xs text-gray-600 dark:text-gray-400">Carbs</Text>
                        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {Math.round(scaledRecipe.carbs / scaledRecipe.servings)}g
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xs text-gray-600 dark:text-gray-400">Fat</Text>
                        <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {Math.round(scaledRecipe.fat / scaledRecipe.servings)}g
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Batch Cooking Time Estimate */}
                {timeEstimate && timeEstimate.scaleFactor > 1 && (
                  <View className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="time-outline" size={20} color="#9333EA" />
                      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 ml-2">
                        ⏱️ Batch Cooking Time Estimate
                      </Text>
                    </View>
                    
                    <View className="mb-3">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600 dark:text-gray-400">Original Recipe</Text>
                        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatTimeEstimate(timeEstimate.originalTime)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600 dark:text-gray-400">Batch Cooking ({timeEstimate.scaleFactor.toFixed(1)}x)</Text>
                        <Text className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                          {formatTimeEstimate(timeEstimate.estimatedTime)}
                        </Text>
                      </View>
                      <View className="pt-2 border-t border-purple-200 dark:border-purple-700">
                        <Text className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                          {getTimeSavingsMessage(timeEstimate)}
                        </Text>
                      </View>
                    </View>

                    {/* Time Breakdown */}
                    <View className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-3 mb-2">
                      <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Time Breakdown:
                      </Text>
                      <View className="space-y-1">
                        <View className="flex-row justify-between">
                          <Text className="text-xs text-gray-600 dark:text-gray-400">Prep Time</Text>
                          <Text className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {formatTimeEstimate(timeEstimate.breakdown.prepTime)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-xs text-gray-600 dark:text-gray-400">Active Cooking</Text>
                          <Text className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {formatTimeEstimate(timeEstimate.breakdown.activeCookingTime)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-xs text-gray-600 dark:text-gray-400">Passive Cooking</Text>
                          <Text className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {formatTimeEstimate(timeEstimate.breakdown.passiveCookingTime)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Tips */}
                    {timeEstimate.tips && timeEstimate.tips.length > 0 && (
                      <View className="mt-2">
                        <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          💡 Tips for Efficient Batch Cooking:
                        </Text>
                        {timeEstimate.tips.map((tip, idx) => (
                          <Text key={idx} className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            • {tip}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Cost Analysis */}
                {costAnalysis && (
                  <View className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      💰 Cost Analysis
                    </Text>
                    
                    <View className="mb-3">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600 dark:text-gray-400">Original (per serving)</Text>
                        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          ${costAnalysis.costComparison.original.costPerServing.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-sm text-gray-600 dark:text-gray-400">Meal Prep (per serving)</Text>
                        <Text className="text-sm font-semibold text-green-600 dark:text-green-400">
                          ${costAnalysis.costComparison.mealPrep.costPerServing.toFixed(2)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center pt-2 border-t border-green-200 dark:border-green-700">
                        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">Savings</Text>
                        <View className="items-end">
                          <Text className="text-base font-bold text-green-600 dark:text-green-400">
                            ${costAnalysis.costComparison.savings.perServing.toFixed(2)} per serving
                          </Text>
                          <Text className="text-xs text-gray-500 dark:text-gray-400">
                            {costAnalysis.costComparison.savings.percent.toFixed(1)}% savings
                          </Text>
                        </View>
                      </View>
                    </View>

                    {costAnalysis.costComparison.savings.total > 0 && (
                      <View className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2 mb-2">
                        <Text className="text-sm font-semibold text-green-700 dark:text-green-300 text-center">
                          Total Savings: ${costAnalysis.costComparison.savings.total.toFixed(2)} for {costAnalysis.costComparison.mealPrep.servings} servings
                        </Text>
                      </View>
                    )}

                    {costAnalysis.recommendations && costAnalysis.recommendations.length > 0 && (
                      <View className="mt-2">
                        <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Recommendations:
                        </Text>
                        {costAnalysis.recommendations.map((rec: string, idx: number) => (
                          <Text key={idx} className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            • {rec}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {loadingCostAnalysis && (
                  <View className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      Calculating cost analysis...
                    </Text>
                  </View>
                )}

                {/* Container Size Recommendations */}
                {containerRecommendations && (
                  <View className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="cube-outline" size={20} color="#6366F1" />
                      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 ml-2">
                        📦 Container Recommendations
                      </Text>
                    </View>

                    {/* Container Recommendations */}
                    {containerRecommendations && (
                      <View className="mb-3">
                        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          📦 Container Recommendations ({scaledRecipe?.servings || 0} servings)
                        </Text>
                        {containerRecommendations.all && (
                          <View className="mb-2 p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <View className="flex-row justify-between items-center mb-1">
                              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {formatContainerRecommendation(containerRecommendations.all)}
                              </Text>
                            </View>
                            {containerRecommendations.all.recommendations && containerRecommendations.all.recommendations.length > 0 && (
                              <View className="mt-1">
                                {containerRecommendations.all.recommendations.slice(0, 3).map((tip, tipIdx) => (
                                  <Text key={tipIdx} className="text-xs text-gray-600 dark:text-gray-400">
                                    • {tip}
                                  </Text>
                                ))}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Overall Recommendation */}
                    {containerRecommendations.all && (
                      <View className="pt-2 border-t border-indigo-200 dark:border-indigo-700">
                        <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          💡 Overall Recommendation:
                        </Text>
                        <Text className="text-xs text-gray-600 dark:text-gray-400">
                          {formatContainerRecommendation(containerRecommendations.all)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Storage Instructions - Enhanced Display */}
                {recipe && (recipe.freezable || recipe.weeklyPrepFriendly || recipe.storageInstructions || recipe.fridgeStorageDays || recipe.freezerStorageMonths) && (
                  <View className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center">
                        <Ionicons name="snow-outline" size={20} color="#3B82F6" />
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 ml-2">
                          📦 Storage Instructions
                        </Text>
                      </View>
                      {/* Storage Method Indicators */}
                      {getStorageMethods(recipe).length > 0 && (
                        <View className="flex-row space-x-1">
                          {getStorageMethods(recipe).map((method) => {
                            const methodConfig = {
                              freezer: { emoji: '❄️', icon: 'snow', color: '#3B82F6' },
                              fridge: { emoji: '🧊', icon: 'snow-outline', color: '#06B6D4' },
                              shelf: { emoji: '📦', icon: 'cube-outline', color: '#6B7280' },
                            }[method];
                            return (
                              <View
                                key={method}
                                className="bg-white dark:bg-gray-700 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800"
                              >
                                <Ionicons 
                                  name={methodConfig.icon as any} 
                                  size={14} 
                                  color={methodConfig.color} 
                                />
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                    
                    {recipe.storageInstructions ? (
                      <Text className="text-gray-700 dark:text-gray-300 text-sm leading-5">
                        {recipe.storageInstructions}
                      </Text>
                    ) : (
                      <View className="space-y-2">
                        {recipe.fridgeStorageDays && (
                          <View className="flex-row items-start">
                            <Text className="text-lg mr-2">🧊</Text>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Refrigerate
                              </Text>
                              <Text className="text-sm text-gray-700 dark:text-gray-300">
                                Up to {recipe.fridgeStorageDays} day{recipe.fridgeStorageDays !== 1 ? 's' : ''} in the refrigerator
                              </Text>
                            </View>
                          </View>
                        )}
                        {recipe.freezerStorageMonths && (
                          <View className="flex-row items-start">
                            <Text className="text-lg mr-2">❄️</Text>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Freeze
                              </Text>
                              <Text className="text-sm text-gray-700 dark:text-gray-300">
                                Up to {recipe.freezerStorageMonths} month{recipe.freezerStorageMonths !== 1 ? 's' : ''} in the freezer
                              </Text>
                            </View>
                          </View>
                        )}
                        {recipe.freezable && !recipe.freezerStorageMonths && (
                          <View className="flex-row items-start">
                            <Text className="text-lg mr-2">❄️</Text>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Freezable
                              </Text>
                              <Text className="text-sm text-gray-700 dark:text-gray-300">
                                Can be frozen for up to 3 months (recommended)
                              </Text>
                            </View>
                          </View>
                        )}
                        {recipe.weeklyPrepFriendly && !recipe.fridgeStorageDays && (
                          <View className="flex-row items-start">
                            <Text className="text-lg mr-2">🧊</Text>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Weekly Meal Prep
                              </Text>
                              <Text className="text-sm text-gray-700 dark:text-gray-300">
                                Good for weekly meal prep - refrigerate up to 5 days
                              </Text>
                            </View>
                          </View>
                        )}
                        {recipe.shelfStable && (
                          <View className="flex-row items-start">
                            <Text className="text-lg mr-2">📦</Text>
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Shelf-Stable
                              </Text>
                              <Text className="text-sm text-gray-700 dark:text-gray-300">
                                Can be stored at room temperature
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                    
                    {/* Storage guidance */}
                    {scaledRecipe && recipe && (
                      <View className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                        <Text className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          💡 Storage Tips:
                        </Text>
                        {recipe.freezable && (
                          <Text className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                            • Can be frozen: Store in airtight containers, label with date
                          </Text>
                        )}
                        {recipe.fridgeStorageDays && (
                          <Text className="text-xs text-gray-700 dark:text-gray-300">
                            • Refrigerate: Consume within {recipe.fridgeStorageDays} days
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
                  </>
                )}
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View className="p-4 border-t border-gray-200 dark:border-gray-700">
              {/* Save as Template Button */}
              {scaledRecipe && (
                <HapticTouchableOpacity
                  onPress={handleSaveAsTemplate}
                  disabled={savingTemplate}
                  className={`mb-3 py-2 px-4 bg-blue-500 dark:bg-blue-600 rounded-lg items-center flex-row justify-center ${savingTemplate ? 'opacity-50' : ''}`}
                  hapticStyle="light"
                >
                  <Ionicons 
                    name={existingTemplate ? "checkmark-circle" : "bookmark-outline"} 
                    size={18} 
                    color="white" 
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-white font-semibold text-sm">
                    {savingTemplate 
                      ? 'Saving...' 
                      : existingTemplate 
                        ? 'Update Template' 
                        : 'Save as Template'}
                  </Text>
                </HapticTouchableOpacity>
              )}
              
              <View className="space-y-3">
                {/* Add to Meal Plan Button */}
                {scaledRecipe && (
                  <HapticTouchableOpacity
                    onPress={handleAddToMealPlan}
                    disabled={!scaledRecipe || parseInt(totalServings) <= 0}
                    className={`bg-green-500 dark:bg-green-600 py-3 px-4 rounded-lg items-center flex-row justify-center ${
                      !scaledRecipe || parseInt(totalServings) <= 0 ? 'opacity-50' : ''
                    }`}
                    hapticStyle="medium"
                  >
                    <Ionicons name="calendar-outline" size={18} color="white" style={{ marginRight: 6 }} />
                    <Text className="text-white font-semibold">Add to Meal Plan</Text>
                  </HapticTouchableOpacity>
                )}
                
                <View className="flex-row space-x-3">
                  <HapticTouchableOpacity
                    onPress={onClose}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg items-center"
                    hapticStyle="light"
                  >
                    <Text className="text-gray-900 dark:text-gray-100 font-semibold">Close</Text>
                  </HapticTouchableOpacity>
                  <HapticTouchableOpacity
                    onPress={handleConfirm}
                    disabled={!scaledRecipe || parseInt(totalServings) <= 0}
                    className={`flex-1 bg-orange-500 dark:bg-orange-600 py-3 rounded-lg items-center ${
                      !scaledRecipe || parseInt(totalServings) <= 0 ? 'opacity-50' : ''
                    }`}
                    hapticStyle="medium"
                  >
                    <Text className="text-white font-semibold">Done</Text>
                  </HapticTouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

