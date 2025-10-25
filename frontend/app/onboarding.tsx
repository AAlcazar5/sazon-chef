// frontend/app/onboarding.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { recipeApi } from '../lib/api';
import type { SuggestedRecipe } from '../types';

export default function OnboardingScreen() {
  const [recipes, setRecipes] = useState<SuggestedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipeApi.getSuggestedRecipes();
      setRecipes(response.data || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
      Alert.alert('Error', 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipeSelection = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipes(newSelected);
  };

  const savePreferences = async () => {
    if (selectedRecipes.size === 0) {
      Alert.alert('Please select at least one recipe', 'Choose recipes you like to get better recommendations');
      return;
    }

    try {
      setSaving(true);
      
      // Like the selected recipes
      for (const recipeId of selectedRecipes) {
        await recipeApi.likeRecipe(recipeId);
      }
      
      Alert.alert(
        'Preferences saved!',
        `You've liked ${selectedRecipes.size} recipes. We'll use this to give you better recommendations.`,
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const skipOnboarding = () => {
    Alert.alert(
      'Skip onboarding?',
      'You can always set your preferences later in the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#ea580c" />
        <Text className="text-gray-600 mt-4">Loading recipes...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Sazon Chef! 👨‍🍳
          </Text>
          <Text className="text-lg text-gray-600">
            Help us learn your taste by selecting recipes you like. This will improve your recommendations.
          </Text>
        </View>

        {/* Recipe Selection */}
        <View className="flex-1">
          <Text className="text-xl font-semibold text-gray-900 mb-4">
            Select recipes you like:
          </Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="space-y-4">
              {recipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  onPress={() => toggleRecipeSelection(recipe.id)}
                  className={`p-4 rounded-xl border-2 ${
                    selectedRecipes.has(recipe.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 mb-1">
                        {recipe.title}
                      </Text>
                      <Text className="text-sm text-gray-600 mb-2">
                        {recipe.cuisine} • {recipe.cookTime} min
                      </Text>
                      <Text className="text-sm text-gray-500" numberOfLines={2}>
                        {recipe.description}
                      </Text>
                    </View>
                    
                    <View className="ml-4">
                      {selectedRecipes.has(recipe.id) ? (
                        <View className="w-8 h-8 bg-orange-500 rounded-full items-center justify-center">
                          <Ionicons name="checkmark" size={20} color="white" />
                        </View>
                      ) : (
                        <View className="w-8 h-8 border-2 border-gray-300 rounded-full" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View className="pt-6 space-y-3">
          <TouchableOpacity
            onPress={savePreferences}
            disabled={saving || selectedRecipes.size === 0}
            className={`py-4 rounded-xl ${
              selectedRecipes.size === 0
                ? 'bg-gray-300'
                : 'bg-orange-500'
            }`}
          >
            {saving ? (
              <View className="flex-row items-center justify-center">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-semibold ml-2">Saving...</Text>
              </View>
            ) : (
              <Text className="text-white font-semibold text-center text-lg">
                Save Preferences ({selectedRecipes.size} selected)
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={skipOnboarding}
            className="py-3"
          >
            <Text className="text-gray-500 text-center">
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
