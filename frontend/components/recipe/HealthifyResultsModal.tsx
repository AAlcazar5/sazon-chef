// frontend/components/recipe/HealthifyResultsModal.tsx
// "Healthified" recipe results — before/after macros, substitutions list,
// improvements, ingredients + instructions, with save / close actions.
// Extracted from app/modal.tsx as part of the batch 4 split.

import React from 'react';
import { View, Text, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import { recipeApi } from '../../lib/api';
import { router } from 'expo-router';

type StringOrTextObject = string | { text?: string };

const getTextContent = (item: StringOrTextObject): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'text' in item && item.text) return item.text;
  return String(item);
};

interface NutritionRow {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface HealthifiedRecipe {
  title: string;
  description: string;
  cuisine?: string;
  cookTime?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients?: any[];
  instructions?: any[];
  nutritionComparison?: { before: NutritionRow; after: NutritionRow };
  substitutions?: Array<{ original: string; replacement: string; reason: string }>;
  improvements?: Array<{ aspect: string; before: string; after: string; benefit: string }>;
}

export interface HealthifyResultsModalProps {
  visible: boolean;
  healthifiedRecipe: HealthifiedRecipe | null;
  isDark: boolean;
  onClose: () => void;
}

export default function HealthifyResultsModal({
  visible,
  healthifiedRecipe,
  isDark,
  onClose,
}: HealthifyResultsModalProps) {
  const handleSave = async () => {
    if (!healthifiedRecipe) return;
    try {
      const recipeData = {
        title: healthifiedRecipe.title,
        description: healthifiedRecipe.description,
        cuisine: healthifiedRecipe.cuisine,
        cookTime: healthifiedRecipe.cookTime,
        calories: healthifiedRecipe.calories,
        protein: healthifiedRecipe.protein,
        carbs: healthifiedRecipe.carbs,
        fat: healthifiedRecipe.fat,
        ingredients: (healthifiedRecipe.ingredients ?? []).map((ing: any) =>
          typeof ing === 'string' ? ing : ing.text,
        ),
        instructions: (healthifiedRecipe.instructions ?? []).map((inst: any) =>
          typeof inst === 'string' ? inst : inst.text,
        ),
      };
      await recipeApi.createRecipe(recipeData);
      Alert.alert(
        'Recipe Saved',
        'Your healthified recipe has been saved to your cookbook!',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              router.back();
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Oops!', error.message || 'Couldn\'t save the recipe — try again?');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <HapticTouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close healthified recipe"
            className="p-2"
          >
            <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#374151'} />
          </HapticTouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Healthified Recipe</Text>
          <View className="w-8" />
        </View>

        {healthifiedRecipe && (
          <ScrollView className="flex-1">
            <View className="p-4">
              <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {healthifiedRecipe.title}
              </Text>
              <Text className="text-gray-600 dark:text-gray-300 mb-6">
                {healthifiedRecipe.description}
              </Text>

              {/* Nutrition Comparison */}
              <View className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Nutrition Comparison</Text>

                {healthifiedRecipe.nutritionComparison && (
                  <View>
                    {(['calories', 'protein', 'carbs', 'fat'] as const).map((key, i, arr) => {
                      const before = healthifiedRecipe.nutritionComparison!.before[key];
                      const after = healthifiedRecipe.nutritionComparison!.after[key];
                      const unit = key === 'calories' ? '' : 'g';
                      const label = key === 'calories' ? 'Calories' : key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <View
                          key={key}
                          className={`flex-row justify-between items-center ${i < arr.length - 1 ? 'mb-3' : ''}`}
                        >
                          <Text className="text-gray-700 dark:text-gray-300 font-medium">{label}</Text>
                          <View className="flex-row items-center">
                            <Text className="text-gray-500 dark:text-gray-400 mr-2">{before}{unit}</Text>
                            <Ionicons name="arrow-forward" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            <Text className="text-green-600 dark:text-green-400 font-semibold ml-2">{after}{unit}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Substitutions */}
              {healthifiedRecipe.substitutions && healthifiedRecipe.substitutions.length > 0 && (
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Smart Substitutions</Text>
                  {healthifiedRecipe.substitutions.map((sub, index) => (
                    <View
                      key={index}
                      className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <View className="flex-row items-start mb-2">
                        <Ionicons name="swap-horizontal" size={20} color="#10B981" style={{ marginRight: 8, marginTop: 2 }} />
                        <View className="flex-1">
                          <Text className="text-gray-900 dark:text-gray-100 font-medium">
                            <Text className="text-red-600 dark:text-red-400 line-through">{sub.original}</Text>
                            {' → '}
                            <Text className="text-green-600 dark:text-green-400">{sub.replacement}</Text>
                          </Text>
                          <Text className="text-gray-600 dark:text-gray-300 text-sm mt-1">{sub.reason}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Improvements */}
              {healthifiedRecipe.improvements && healthifiedRecipe.improvements.length > 0 && (
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Health Improvements</Text>
                  {healthifiedRecipe.improvements.map((improvement, index) => (
                    <View
                      key={index}
                      className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <Text className="text-gray-900 dark:text-gray-100 font-medium mb-1">{improvement.aspect}</Text>
                      <View className="flex-row items-center mb-1">
                        <Text className="text-gray-500 dark:text-gray-400 text-sm">Before: {improvement.before}</Text>
                      </View>
                      <View className="flex-row items-center mb-1">
                        <Text className="text-green-600 dark:text-green-400 text-sm font-semibold">After: {improvement.after}</Text>
                      </View>
                      <Text className="text-gray-600 dark:text-gray-300 text-sm mt-1">💡 {improvement.benefit}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Ingredients */}
              <View className="mb-6">
                <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Ingredients</Text>
                {healthifiedRecipe.ingredients?.map((ingredient: any, index: number) => (
                  <MotiView
                    key={index}
                    from={{ opacity: 0, translateX: -12 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'spring', delay: index * 35, damping: 20, stiffness: 200 }}
                  >
                    <View className="flex-row items-center mb-2">
                      <View className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                      <Text className="text-gray-700 dark:text-gray-300 flex-1">{getTextContent(ingredient)}</Text>
                    </View>
                  </MotiView>
                ))}
              </View>

              {/* Instructions */}
              <View className="mb-6">
                <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Instructions</Text>
                {healthifiedRecipe.instructions?.map((instruction: any, index: number) => (
                  <View key={index} className="flex-row mb-3">
                    <Text className="font-bold text-green-500 dark:text-green-400 mr-3">{index + 1}.</Text>
                    <Text className="flex-1 text-gray-700 dark:text-gray-300">{getTextContent(instruction)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Action Buttons */}
        <View className="p-4 border-t border-gray-200 dark:border-gray-700">
          <BrandButton
            label="Save Healthified Recipe"
            onPress={handleSave}
            variant="sage"
            icon="leaf"
            style={{ marginBottom: 8 }}
          />
          <HapticTouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="py-3 px-6 items-center"
          >
            <Text className="text-gray-700 dark:text-gray-300 font-semibold text-lg">Close</Text>
          </HapticTouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
