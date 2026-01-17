import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Animated } from 'react-native';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import PulsingLoader from '../components/ui/PulsingLoader';
import SuccessModal from '../components/ui/SuccessModal';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useColorScheme } from 'nativewind';
import { recipeApi, collectionsApi, aiRecipeApi } from '../lib/api';
import type { Recipe } from '../types';
import { Colors, DarkColors } from '../constants/Colors';
import { Spacing, BorderRadius } from '../constants/Spacing';
import { Duration, Spring } from '../constants/Animations';
import { HapticPatterns } from '../constants/Haptics';

export default function RecipeFormScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const recipeId = params.id as string | undefined;
  const isEditMode = !!recipeId;

  const [loading, setLoading] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(isEditMode);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [recipeType, setRecipeType] = useState<'meal' | 'snack' | 'dessert'>('meal');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState<string[]>(['']);
  
  // Collections state
  const [collections, setCollections] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Animation values for collection picker modal
  const pickerScale = useRef(new Animated.Value(0)).current;
  const pickerOpacity = useRef(new Animated.Value(0)).current;

  // Animation values for AI generation button
  const generateButtonScale = useRef(new Animated.Value(1)).current;
  const generateButtonOpacity = useRef(new Animated.Value(1)).current;

  // Animate collection picker modal
  useEffect(() => {
    if (pickerVisible) {
      pickerScale.setValue(0);
      pickerOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(pickerScale, {
          toValue: 1,
          ...Spring.stiff,
        }),
        Animated.timing(pickerOpacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(pickerScale, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(pickerOpacity, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [pickerVisible]);

  // Load collections on mount (for create mode)
  useEffect(() => {
    if (!isEditMode) {
      loadCollections();
    }
  }, [isEditMode]);

  // Load recipe data if editing
  useEffect(() => {
    if (isEditMode && recipeId) {
      loadRecipe(recipeId);
    }
  }, [recipeId]);

  const loadCollections = async () => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Array<{ id: string; name: string; isDefault?: boolean }>;
      setCollections(cols);
    } catch (e) {
      console.log('📱 Recipe Form: Failed to load collections');
    }
  };

  const openCollectionPicker = async () => {
    await loadCollections();
    setPickerVisible(true);
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
      HapticPatterns.error();
      Alert.alert('Error', e?.message || 'Failed to create collection');
    }
  };

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

      // Set recipeType and mealType based on recipe.mealType
      if (recipe.mealType) {
        if (recipe.mealType === 'snack') {
          setRecipeType('snack');
        } else if (recipe.mealType === 'dessert') {
          setRecipeType('dessert');
        } else {
          setRecipeType('meal');
          if (recipe.mealType === 'breakfast' || recipe.mealType === 'lunch' || recipe.mealType === 'dinner') {
            setMealType(recipe.mealType);
          }
        }
      }

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
      HapticPatterns.error();
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

  // Animate AI generation button
  useEffect(() => {
    if (generatingAI) {
      // Expanding pulse effect when generating
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.spring(generateButtonScale, {
              toValue: 1.02,
              friction: 4,
              tension: 50,
              useNativeDriver: true,
            }),
            Animated.timing(generateButtonOpacity, {
              toValue: 0.9,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(generateButtonScale, {
              toValue: 1,
              friction: 4,
              tension: 50,
              useNativeDriver: true,
            }),
            Animated.timing(generateButtonOpacity, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      // Reset to normal state
      generateButtonScale.setValue(1);
      generateButtonOpacity.setValue(1);
    }
  }, [generatingAI]);

  const handleGenerateRandomRecipe = async () => {
    try {
      setGeneratingAI(true);

      const recipeTitle = title.trim();
      const hasTitle = recipeTitle.length > 0;

      Alert.alert(
        '🤖 Generating Recipe...',
        hasTitle 
          ? `Creating "${recipeTitle}" recipe with AI (15-20 seconds)`
          : 'Creating a random recipe with AI (15-20 seconds)',
        [],
        { cancelable: false }
      );

      // Determine mealType based on recipeType selection
      let aiMealType: string;
      if (recipeType === 'snack') {
        aiMealType = 'snack';
      } else if (recipeType === 'dessert') {
        aiMealType = 'dessert';
      } else {
        aiMealType = mealType; // breakfast, lunch, or dinner
      }

      // Generate recipe using AI - with title if provided, random otherwise
      const response = await aiRecipeApi.generateRecipe({
        mealType: aiMealType,
        cuisine: cuisine.trim() || undefined,
        recipeTitle: hasTitle ? recipeTitle : undefined, // Pass title if provided
      });

      if (response.data && response.data.recipe) {
        const generatedRecipe = response.data.recipe;

        // Pre-fill form with generated recipe
        // Only update title if it was empty (to preserve user's custom title if they typed one)
        if (!recipeTitle) {
          setTitle(generatedRecipe.title || '');
        }
        setDescription(generatedRecipe.description || '');
        setCookTime(generatedRecipe.cookTime?.toString() || '');
        setCuisine(generatedRecipe.cuisine || '');
        setCalories(generatedRecipe.calories?.toString() || '');
        setProtein(generatedRecipe.protein?.toString() || '');
        setCarbs(generatedRecipe.carbs?.toString() || '');
        setFat(generatedRecipe.fat?.toString() || '');
        setFiber(generatedRecipe.fiber?.toString() || '');

        // Handle ingredients - convert to string array
        if (generatedRecipe.ingredients && Array.isArray(generatedRecipe.ingredients)) {
          const ingredientTexts = generatedRecipe.ingredients.map((ing: any) => {
            if (typeof ing === 'string') return ing;
            if (ing.text) return ing.text;
            if (ing.name) {
              // Handle name/amount/unit format
              const amount = ing.amount || '';
              const unit = ing.unit || '';
              return `${amount} ${unit} ${ing.name}`.trim();
            }
            return String(ing);
          });
          setIngredients(ingredientTexts.length > 0 ? ingredientTexts : ['']);
        }

        // Handle instructions - convert to string array
        if (generatedRecipe.instructions && Array.isArray(generatedRecipe.instructions)) {
          const instructionTexts = generatedRecipe.instructions.map((inst: any) => {
            if (typeof inst === 'string') return inst;
            if (inst.text) return inst.text;
            if (inst.instruction) return inst.instruction;
            return String(inst);
          });
          setInstructions(instructionTexts.length > 0 ? instructionTexts : ['']);
        }

        HapticPatterns.success();
        setSuccessMessage({
          title: 'Recipe Generated!',
          message: hasTitle 
            ? `"${recipeTitle}" recipe has been generated. Review and edit as needed before saving.`
            : 'A random recipe has been generated. Review and edit as needed before saving.',
        });
        setShowSuccessModal(true);
      } else {
        throw new Error('Failed to generate recipe');
      }
    } catch (error: any) {
      console.error('❌ AI Generate error:', error);
      
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.message?.includes('quota') ||
                          error.message?.includes('429');
      
      Alert.alert(
        'Generation Failed',
        isQuotaError
          ? 'AI recipe generation is temporarily unavailable due to quota limits. Please try again later.'
          : error.message || 'Failed to generate recipe. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter a recipe title');
      return false;
    }
    if (!description.trim()) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter a description');
      return false;
    }
    if (!cookTime || isNaN(parseInt(cookTime))) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter a valid cook time');
      return false;
    }
    if (!cuisine.trim()) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter a cuisine type');
      return false;
    }
    if (!calories || isNaN(parseInt(calories))) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter valid calorie amount');
      return false;
    }
    if (!protein || isNaN(parseInt(protein))) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter valid protein amount');
      return false;
    }
    if (!carbs || isNaN(parseInt(carbs))) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter valid carbs amount');
      return false;
    }
    if (!fat || isNaN(parseInt(fat))) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please enter valid fat amount');
      return false;
    }

    const validIngredients = ingredients.filter(ing => ing.trim());
    if (validIngredients.length === 0) {
      HapticPatterns.error();
      Alert.alert('Validation Error', 'Please add at least one ingredient');
      return false;
    }

    const validInstructions = instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      HapticPatterns.error();
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

      // Determine mealType based on recipeType
      let finalMealType: string;
      if (recipeType === 'snack') {
        finalMealType = 'snack';
      } else if (recipeType === 'dessert') {
        finalMealType = 'dessert';
      } else {
        finalMealType = mealType; // breakfast, lunch, or dinner
      }

      const recipeData = {
        title: title.trim(),
        description: description.trim(),
        cookTime: parseInt(cookTime),
        cuisine: cuisine.trim(),
        mealType: finalMealType,
        calories: parseInt(calories),
        protein: parseInt(protein),
        carbs: parseInt(carbs),
        fat: parseInt(fat),
        fiber: fiber ? parseInt(fiber) : undefined,
        sugar: sugar ? parseInt(sugar) : undefined,
        ingredients: ingredients.filter(ing => ing.trim()),
        instructions: instructions.filter(inst => inst.trim()),
        collectionIds: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
      };

      if (isEditMode && recipeId) {
        await recipeApi.updateRecipe(recipeId, recipeData);
        HapticPatterns.success();
        Alert.alert('Success', 'Recipe updated successfully!');
        router.back();
      } else {
        const response = await recipeApi.createRecipe(recipeData);
        const createdRecipe = (response.data?.data || response.data) as Recipe;
        
        // Backend already saves to collections if collectionIds are provided in recipeData
        // No additional API call needed
        
        HapticPatterns.success();
        Alert.alert(
          'Success', 
          'Recipe created and saved to your cookbook!',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Navigate to cookbook to see the new recipe
                router.replace('/(tabs)/cookbook');
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to save recipe:', error);
      HapticPatterns.error();
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
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} edges={['top']}>
      {/* Header */}
      <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} px-4 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'} flex-row items-center justify-between`}>
        <HapticTouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color={isDark ? "#E5E7EB" : "#111827"} />
        </HapticTouchableOpacity>
        <Text className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {isEditMode ? 'Edit Recipe' : 'Create Recipe'}
        </Text>
        <HapticTouchableOpacity 
          onPress={handleSubmit}
          disabled={loading}
          className="p-2"
        >
          <Text className={`text-lg font-semibold ${loading ? (isDark ? 'text-gray-400' : 'text-gray-500') : 'text-orange-500'}`}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </HapticTouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Generate Recipe Button (only in create mode) */}
        {!isEditMode && (
          <Animated.View
            style={{
              transform: [{ scale: generateButtonScale }],
              opacity: generateButtonOpacity,
            }}
          >
            <HapticTouchableOpacity
              onPress={handleGenerateRandomRecipe}
              disabled={generatingAI}
              hapticStyle="medium"
              className={`flex-row items-center justify-center px-4 py-3 rounded-lg mb-4 ${generatingAI ? 'bg-gray-300' : 'bg-red-600 dark:bg-red-400'}`}
            >
              {generatingAI ? (
                <>
                  <PulsingLoader size={16} color="white" />
                  <Text className="text-white font-semibold ml-3">
                    {title.trim() ? `Generating "${title.trim()}" Recipe...` : 'Generating Random Recipe...'}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-semibold">
                    {title.trim() ? `🤖 Generate "${title.trim()}" Recipe` : '🎲 Generate Random Recipe'}
                  </Text>
                </>
              )}
            </HapticTouchableOpacity>
          </Animated.View>
        )}

        {/* Basic Information */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-3`}>Basic Information</Text>
          
          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Recipe Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter recipe title"
            className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3 mb-3`}
            placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
          />

          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your recipe"
            multiline
            numberOfLines={3}
            className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3 mb-3`}
            placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
            style={{ textAlignVertical: 'top' }}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Cook Time (min) *</Text>
              <TextInput
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="30"
                keyboardType="numeric"
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Cuisine *</Text>
              <TextInput
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="Italian"
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
          </View>

          {/* Recipe Type Selection */}
          <View className="mt-3">
            <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Recipe Type *</Text>
            <View className="flex-row gap-2 mb-2">
              <HapticTouchableOpacity
                onPress={() => setRecipeType('meal')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                  recipeType === 'meal'
                    ? isDark
                      ? 'bg-orange-500/20 border-orange-500'
                      : 'bg-orange-50 border-orange-500'
                    : isDark
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-center font-medium ${
                  recipeType === 'meal'
                    ? 'text-orange-500'
                    : isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Meal
                </Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => setRecipeType('snack')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                  recipeType === 'snack'
                    ? isDark
                      ? 'bg-orange-500/20 border-orange-500'
                      : 'bg-orange-50 border-orange-500'
                    : isDark
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-center font-medium ${
                  recipeType === 'snack'
                    ? 'text-orange-500'
                    : isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Snack
                </Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => setRecipeType('dessert')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 ${
                  recipeType === 'dessert'
                    ? isDark
                      ? 'bg-orange-500/20 border-orange-500'
                      : 'bg-orange-50 border-orange-500'
                    : isDark
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className={`text-center font-medium ${
                  recipeType === 'dessert'
                    ? 'text-orange-500'
                    : isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Dessert
                </Text>
              </HapticTouchableOpacity>
            </View>
            
            {/* Meal Type Selection (only shown when recipeType is 'meal') */}
            {recipeType === 'meal' && (
              <View className="flex-row gap-2">
                <HapticTouchableOpacity
                  onPress={() => setMealType('breakfast')}
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    mealType === 'breakfast'
                      ? isDark
                        ? 'bg-orange-500/20 border-orange-500'
                        : 'bg-orange-50 border-orange-500'
                      : isDark
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`text-center text-sm ${
                    mealType === 'breakfast'
                      ? 'text-orange-500 font-semibold'
                      : isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Breakfast
                  </Text>
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={() => setMealType('lunch')}
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    mealType === 'lunch'
                      ? isDark
                        ? 'bg-orange-500/20 border-orange-500'
                        : 'bg-orange-50 border-orange-500'
                      : isDark
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`text-center text-sm ${
                    mealType === 'lunch'
                      ? 'text-orange-500 font-semibold'
                      : isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Lunch
                  </Text>
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={() => setMealType('dinner')}
                  className={`flex-1 py-2 px-3 rounded-lg border ${
                    mealType === 'dinner'
                      ? isDark
                        ? 'bg-orange-500/20 border-orange-500'
                        : 'bg-orange-50 border-orange-500'
                      : isDark
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text className={`text-center text-sm ${
                    mealType === 'dinner'
                      ? 'text-orange-500 font-semibold'
                      : isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Dinner
                  </Text>
                </HapticTouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Nutrition Information */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-3`}>Nutrition Information</Text>
          
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Calories *</Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                placeholder="500"
                keyboardType="numeric"
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Protein (g) *</Text>
              <TextInput
                value={protein}
                onChangeText={setProtein}
                placeholder="30"
                keyboardType="numeric"
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Carbs (g) *</Text>
              <TextInput
                value={carbs}
                onChangeText={setCarbs}
                placeholder="50"
                keyboardType="numeric"
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Fat (g) *</Text>
              <TextInput
                value={fat}
                onChangeText={setFat}
                placeholder="15"
                keyboardType="numeric"
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Fiber (g)</Text>
              <TextInput
                value={fiber}
                onChangeText={setFiber}
                placeholder="5"
                keyboardType="numeric"
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Sugar (g)</Text>
              <TextInput
                value={sugar}
                onChangeText={setSugar}
                placeholder="10"
                keyboardType="numeric"
                className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Ingredients */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <View className="flex-row justify-between items-center mb-3">
            <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Ingredients *</Text>
            <HapticTouchableOpacity onPress={addIngredient} className="p-2">
              <Ionicons name="add-circle" size={24} color={Colors.secondaryRed} />
            </HapticTouchableOpacity>
          </View>

          {ingredients.map((ingredient, index) => (
            <View key={index} className="flex-row items-center mb-2">
              <View className="flex-1 mr-2">
                <TextInput
                  value={ingredient}
                  onChangeText={(value) => updateIngredient(index, value)}
                  placeholder={`Ingredient ${index + 1}`}
                  className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                />
              </View>
              {ingredients.length > 1 && (
                <HapticTouchableOpacity onPress={() => removeIngredient(index)} className="p-2">
                  <Ionicons name="remove-circle" size={24} color={Colors.secondaryRed} />
                </HapticTouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <View className="flex-row justify-between items-center mb-3">
            <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Instructions *</Text>
            <HapticTouchableOpacity onPress={addInstruction} className="p-2">
              <Ionicons name="add-circle" size={24} color={Colors.secondaryRed} />
            </HapticTouchableOpacity>
          </View>

          {instructions.map((instruction, index) => (
            <View key={index} className="mb-3">
              <View className="flex-row items-start">
                <View className="flex-1 mr-2">
                  <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mb-1`}>Step {index + 1}</Text>
                  <TextInput
                    value={instruction}
                    onChangeText={(value) => updateInstruction(index, value)}
                    placeholder={`Step ${index + 1} instructions`}
                    multiline
                    numberOfLines={2}
                    className={`${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200'} border rounded-lg px-4 py-3`}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>
                {instructions.length > 1 && (
                  <HapticTouchableOpacity onPress={() => removeInstruction(index)} className="p-2 mt-6">
                    <Ionicons name="remove-circle" size={24} color={Colors.secondaryRed} />
                  </HapticTouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Collections Selection (create mode only) */}
        {!isEditMode && (
          <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 mb-4 shadow-sm border ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Collections</Text>
              <HapticTouchableOpacity onPress={openCollectionPicker} className="p-2">
                <Ionicons name="add-circle" size={24} color="#F97316" />
              </HapticTouchableOpacity>
            </View>
            
            {selectedCollectionIds.length > 0 ? (
              <View className="flex-row flex-wrap gap-2 mb-3">
                {selectedCollectionIds.map((id) => {
                  const collection = collections.find(c => c.id === id);
                  return collection ? (
                    <HapticTouchableOpacity
                      key={id}
                      onPress={() => setSelectedCollectionIds(prev => prev.filter(i => i !== id))}
                      className="bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full flex-row items-center border border-red-200 dark:border-red-800"
                    >
                      <Text className="text-red-800 dark:text-red-300 font-medium mr-2">{collection.name}</Text>
                      <Ionicons name="close-circle" size={16} color={Colors.secondaryRed} />
                    </HapticTouchableOpacity>
                  ) : null;
                })}
              </View>
            ) : (
              <Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-sm mb-3`}>
                No collections selected. Recipe will be saved to "All".
              </Text>
            )}
            
            <HapticTouchableOpacity
              onPress={openCollectionPicker}
              className="border border-red-600 dark:border-red-400 rounded-lg px-4 py-3 flex-row items-center justify-center"
            >
              <Ionicons name="folder-outline" size={20} color={Colors.secondaryRed} />
              <Text className="text-red-600 dark:text-red-400 font-semibold ml-2">
                {selectedCollectionIds.length > 0 ? 'Change Collections' : 'Select Collections'}
              </Text>
            </HapticTouchableOpacity>
          </View>
        )}

        {/* Bottom padding for safe scrolling */}
        <View className="h-8" />
      </ScrollView>
      
      {/* Collection Picker Modal */}
      <Modal
        visible={pickerVisible}
        animationType="none"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <Animated.View 
          className="flex-1 bg-black/40 justify-center items-center px-4"
          style={{ opacity: pickerOpacity }}
        >
          <Animated.View 
            className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-4 w-full max-w-sm max-h-[70%]`}
            style={{
              transform: [{ scale: pickerScale }],
            }}
          >
            <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-3`}>Select Collections</Text>
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
                  className={`flex-row items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}
                >
                  <View className={`w-5 h-5 mr-3 rounded border ${selectedCollectionIds.includes(c.id) ? 'bg-red-600 dark:bg-red-400 border-red-600 dark:border-red-400' : (isDark ? 'border-gray-600' : 'border-gray-300')}`}>
                    {selectedCollectionIds.includes(c.id) && (
                      <Ionicons name="checkmark" size={14} color="white" style={{ position: 'absolute', top: 1, left: 1 }} />
                    )}
                  </View>
                  <Text className={`${isDark ? 'text-gray-100' : 'text-gray-900'} flex-1`}>{c.name}</Text>
                </HapticTouchableOpacity>
              ))}
              {creatingCollection ? (
                <View className="flex-row items-center py-3">
                  <TextInput
                    value={newCollectionName}
                    onChangeText={setNewCollectionName}
                    placeholder="New collection name"
                    className={`flex-1 border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'} rounded-lg px-3 py-2 mr-2`}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                  />
                  <HapticTouchableOpacity onPress={handleCreateCollection} className="bg-red-600 dark:bg-red-400 px-3 py-2 rounded-lg">
                    <Text className="text-white font-semibold">Create</Text>
                  </HapticTouchableOpacity>
                </View>
              ) : (
                <HapticTouchableOpacity onPress={() => setCreatingCollection(true)} className="py-3">
                  <Text className="text-red-600 dark:text-red-400 font-medium">+ Create new collection</Text>
                </HapticTouchableOpacity>
              )}
            </ScrollView>
            <View className="flex-row justify-end space-x-3">
              <HapticTouchableOpacity onPress={() => setPickerVisible(false)} className="px-4 py-3">
                <Text className={isDark ? 'text-gray-300' : 'text-gray-700'}>Done</Text>
              </HapticTouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Recipe Generation Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        expression="chef-kiss"
        onDismiss={() => setShowSuccessModal(false)}
      />
    </SafeAreaView>
  );
}

