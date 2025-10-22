import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { recipeApi } from '../lib/api';
import type { Recipe } from '../types';

export default function RecipeFormScreen() {
  const params = useLocalSearchParams();
  const recipeId = params.id as string | undefined;
  const isEditMode = !!recipeId;

  const [loading, setLoading] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(isEditMode);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);

  // Load recipe data if editing
  useEffect(() => {
    if (isEditMode && recipeId) {
      loadRecipe(recipeId);
    }
  }, [recipeId]);

  const loadRecipe = async (id: string) => {
    try {
      setLoadingRecipe(true);
      const response = await recipeApi.getRecipe(id);
      const recipe = response.data;

      // Populate form with recipe data
      setTitle(recipe.title);
      setDescription(recipe.description);
      setCookTime(recipe.cookTime.toString());
      setCuisine(recipe.cuisine);
      setCalories(recipe.calories.toString());
      setProtein(recipe.protein.toString());
      setCarbs(recipe.carbs.toString());
      setFat(recipe.fat.toString());
      setFiber(recipe.fiber?.toString() || '');
      setSugar(recipe.sugar?.toString() || '');

      // Handle both string[] and object array formats
      const ingredientTexts = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((ing: any) => 
            typeof ing === 'string' ? ing : ing.text
          )
        : [];
      setIngredients(ingredientTexts.length > 0 ? ingredientTexts : ['']);

      const instructionTexts = Array.isArray(recipe.instructions)
        ? recipe.instructions.map((inst: any) => 
            typeof inst === 'string' ? inst : inst.text
          )
        : [];
      setInstructions(instructionTexts.length > 0 ? instructionTexts : ['']);

      setLoadingRecipe(false);
    } catch (error: any) {
      console.error('Failed to load recipe:', error);
      Alert.alert('Error', error.message || 'Failed to load recipe');
      setLoadingRecipe(false);
      router.back();
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = value;
    setIngredients(updated);
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length > 1) {
      setInstructions(instructions.filter((_, i) => i !== index));
    }
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index] = value;
    setInstructions(updated);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a recipe title');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return false;
    }
    if (!cookTime || isNaN(parseInt(cookTime))) {
      Alert.alert('Validation Error', 'Please enter a valid cook time');
      return false;
    }
    if (!cuisine.trim()) {
      Alert.alert('Validation Error', 'Please enter a cuisine type');
      return false;
    }
    if (!calories || isNaN(parseInt(calories))) {
      Alert.alert('Validation Error', 'Please enter valid calorie amount');
      return false;
    }
    if (!protein || isNaN(parseInt(protein))) {
      Alert.alert('Validation Error', 'Please enter valid protein amount');
      return false;
    }
    if (!carbs || isNaN(parseInt(carbs))) {
      Alert.alert('Validation Error', 'Please enter valid carbs amount');
      return false;
    }
    if (!fat || isNaN(parseInt(fat))) {
      Alert.alert('Validation Error', 'Please enter valid fat amount');
      return false;
    }

    const validIngredients = ingredients.filter(ing => ing.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one ingredient');
      return false;
    }

    const validInstructions = instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one instruction');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const recipeData = {
        title: title.trim(),
        description: description.trim(),
        cookTime: parseInt(cookTime),
        cuisine: cuisine.trim(),
        calories: parseInt(calories),
        protein: parseInt(protein),
        carbs: parseInt(carbs),
        fat: parseInt(fat),
        fiber: fiber ? parseInt(fiber) : undefined,
        sugar: sugar ? parseInt(sugar) : undefined,
        ingredients: ingredients.filter(ing => ing.trim()),
        instructions: instructions.filter(inst => inst.trim()),
      };

      if (isEditMode && recipeId) {
        await recipeApi.updateRecipe(recipeId, recipeData);
        Alert.alert('Success', 'Recipe updated successfully!');
      } else {
        await recipeApi.createRecipe(recipeData);
        Alert.alert('Success', 'Recipe created successfully!');
      }

      router.back();
    } catch (error: any) {
      console.error('Failed to save recipe:', error);
      Alert.alert('Error', error.message || 'Failed to save recipe');
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecipe) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading recipe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">
          {isEditMode ? 'Edit Recipe' : 'Create Recipe'}
        </Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading}
          className="p-2"
        >
          <Text className={`text-lg font-semibold ${loading ? 'text-gray-400' : 'text-orange-500'}`}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Basic Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Basic Information</Text>
          
          <Text className="text-gray-700 font-medium mb-2">Recipe Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter recipe title"
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-3"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-gray-700 font-medium mb-2">Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your recipe"
            multiline
            numberOfLines={3}
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-3"
            placeholderTextColor="#9CA3AF"
            style={{ textAlignVertical: 'top' }}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-gray-700 font-medium mb-2">Cook Time (min) *</Text>
              <TextInput
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="30"
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-700 font-medium mb-2">Cuisine *</Text>
              <TextInput
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="Italian"
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Nutrition Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Nutrition Information</Text>
          
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-gray-700 font-medium mb-2">Calories *</Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                placeholder="500"
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-700 font-medium mb-2">Protein (g) *</Text>
              <TextInput
                value={protein}
                onChangeText={setProtein}
                placeholder="30"
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-gray-700 font-medium mb-2">Carbs (g) *</Text>
              <TextInput
                value={carbs}
                onChangeText={setCarbs}
                placeholder="50"
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-700 font-medium mb-2">Fat (g) *</Text>
              <TextInput
                value={fat}
                onChangeText={setFat}
                placeholder="15"
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-gray-700 font-medium mb-2">Fiber (g)</Text>
              <TextInput
                value={fiber}
                onChangeText={setFiber}
                placeholder="5"
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-700 font-medium mb-2">Sugar (g)</Text>
              <TextInput
                value={sugar}
                onChangeText={setSugar}
                placeholder="10"
                keyboardType="numeric"
                className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">Ingredients *</Text>
            <TouchableOpacity onPress={addIngredient} className="p-2">
              <Ionicons name="add-circle" size={24} color="#F97316" />
            </TouchableOpacity>
          </View>

          {ingredients.map((ingredient, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <View className="flex-1 mr-2">
                <TextInput
                  value={ingredient}
                  onChangeText={(value) => updateIngredient(index, value)}
                  placeholder={`Ingredient ${index + 1}`}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              {ingredients.length > 1 && (
                <TouchableOpacity onPress={() => removeIngredient(index)} className="p-2">
                  <Ionicons name="remove-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-900">Instructions *</Text>
            <TouchableOpacity onPress={addInstruction} className="p-2">
              <Ionicons name="add-circle" size={24} color="#F97316" />
            </TouchableOpacity>
          </View>

          {instructions.map((instruction, index) => (
            <View key={index} className="mb-3">
              <View className="flex-row items-start">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-600 text-sm mb-1">Step {index + 1}</Text>
                  <TextInput
                    value={instruction}
                    onChangeText={(value) => updateInstruction(index, value)}
                    placeholder={`Step ${index + 1} instructions`}
                    multiline
                    numberOfLines={2}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
                    placeholderTextColor="#9CA3AF"
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>
                {instructions.length > 1 && (
                  <TouchableOpacity onPress={() => removeInstruction(index)} className="p-2 mt-6">
                    <Ionicons name="remove-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Bottom padding for safe scrolling */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

