import { View, Text, ScrollView, TextInput, Alert, Modal, Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import PulsingLoader from '../components/ui/PulsingLoader';
import SuccessModal from '../components/ui/SuccessModal';
import KeyboardAvoidingContainer from '../components/ui/KeyboardAvoidingContainer';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useColorScheme } from 'nativewind';
import { recipeApi, collectionsApi, aiRecipeApi } from '../lib/api';
import type { Recipe } from '../types';
import { Colors, DarkColors } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { Spacing, BorderRadius } from '../constants/Spacing';
import { Duration, Spring } from '../constants/Animations';
import { HapticPatterns } from '../constants/Haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';

// Reusable animated focus ring wrapper for TextInputs
const AnimatedInput = (props: React.ComponentProps<typeof TextInput> & { isDark?: boolean }) => {
  const { isDark: inputDark, style, ...inputProps } = props;
  const focusProgress = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    Animated.spring(focusProgress, {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: false,
    }).start();
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    Animated.spring(focusProgress, {
      toValue: 0,
      friction: 8,
      tension: 100,
      useNativeDriver: false,
    }).start();
    props.onBlur?.(e);
  };

  const borderColor = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', Colors.primary],
  });

  const scale = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });

  const shadowOpacity = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        borderRadius: 12,
        borderWidth: 2,
        borderColor,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity,
        shadowRadius: 6,
      }}
    >
      <TextInput
        {...inputProps}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[style, { borderWidth: 0 }]}
      />
    </Animated.View>
  );
};

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

  // Section pills
  const SECTION_LABELS = ['Details', 'Ingredients', 'Instructions', 'Notes'] as const;
  const scrollRef = useRef<ScrollView>(null);
  const sectionYOffsets = useRef<number[]>([0, 0, 0, 0]);
  const [activeSection, setActiveSection] = useState(0);

  // Progressive disclosure
  const [showNutrition, setShowNutrition] = useState(isEditMode);
  const [notes, setNotes] = useState('');
  const nutritionMaxHeight = useRef(new Animated.Value(isEditMode ? 1 : 0)).current;
  const interpolatedNutritionHeight = nutritionMaxHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

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

  // Animate nutrition section expansion (spring for natural feel)
  useEffect(() => {
    Animated.spring(nutritionMaxHeight, {
      toValue: showNutrition ? 1 : 0,
      friction: 10,
      tension: 120,
      useNativeDriver: false,
    }).start();
  }, [showNutrition]);

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
      Alert.alert('Oops!', e?.message || 'Couldn\'t create the collection — try again?');
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
      Alert.alert('Oops!', error.message || 'Couldn\'t load the recipe — try again?');
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
        'Hmm, That Didn\'t Work',
        isQuotaError
          ? 'Our AI is a bit overwhelmed right now — try again in a few minutes!'
          : error.message || 'Couldn\'t generate a recipe — give it another shot?',
        [{ text: 'OK' }]
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const scrollToSection = (index: number) => {
    scrollRef.current?.scrollTo({ y: sectionYOffsets.current[index], animated: true });
    setActiveSection(index);
  };

  const handleFormScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const offsets = sectionYOffsets.current;
    let active = 0;
    for (let i = offsets.length - 1; i >= 0; i--) {
      if (y >= offsets[i] - 60) { active = i; break; }
    }
    setActiveSection(active);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter a recipe title');
      return false;
    }
    if (!description.trim()) {
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter a description');
      return false;
    }
    if (!cookTime || isNaN(parseInt(cookTime))) {
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter a valid cook time');
      return false;
    }
    if (!cuisine.trim()) {
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter a cuisine type');
      return false;
    }
    if (!calories || isNaN(parseInt(calories))) {
      setShowNutrition(true);
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter valid calorie amount');
      return false;
    }
    if (!protein || isNaN(parseInt(protein))) {
      setShowNutrition(true);
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter valid protein amount');
      return false;
    }
    if (!carbs || isNaN(parseInt(carbs))) {
      setShowNutrition(true);
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter valid carbs amount');
      return false;
    }
    if (!fat || isNaN(parseInt(fat))) {
      setShowNutrition(true);
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please enter valid fat amount');
      return false;
    }

    const validIngredients = ingredients.filter(ing => ing.trim());
    if (validIngredients.length === 0) {
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please add at least one ingredient');
      return false;
    }

    const validInstructions = instructions.filter(inst => inst.trim());
    if (validInstructions.length === 0) {
      HapticPatterns.error();
      Alert.alert('Hold On', 'Please add at least one instruction');
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
        setSuccessMessage({
          title: 'Recipe Updated!',
          message: 'Your changes have been saved.',
        });
        setShowSuccessModal(true);
        setTimeout(() => router.back(), 1500);
      } else {
        const response = await recipeApi.createRecipe(recipeData);
        const createdRecipe = (response.data?.data || response.data) as Recipe;

        // Backend already saves to collections if collectionIds are provided in recipeData
        // No additional API call needed

        HapticPatterns.success();
        setSuccessMessage({
          title: 'Recipe Created!',
          message: 'Your recipe has been saved to your cookbook!',
        });
        setShowSuccessModal(true);
        setTimeout(() => router.replace('/(tabs)/cookbook'), 1500);
      }
    } catch (error: any) {
      console.error('Failed to save recipe:', error);
      HapticPatterns.error();
      Alert.alert('Oops!', error.message || 'Couldn\'t save the recipe — try again?');
    } finally {
      setLoading(false);
    }
  };

  if (loadingRecipe) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Loading recipe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-surface-dark' : 'bg-surface'}`} edges={['top']}>
      <KeyboardAvoidingContainer>
      {/* Header */}
      <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} px-4 py-4 flex-row items-center justify-between`}>
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

      {/* Section pills nav */}
      <View className={`${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
        >
          {SECTION_LABELS.map((label, i) => (
            <HapticTouchableOpacity
              key={label}
              onPress={() => scrollToSection(i)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: activeSection === i
                  ? Colors.primary
                  : 'transparent',
                borderWidth: 1,
                borderColor: activeSection === i ? Colors.primary : (isDark ? '#374151' : '#E5E7EB'),
                transform: [{ scale: activeSection === i ? 1.08 : 1 }],
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: activeSection === i ? '700' : '400',
                color: activeSection === i ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280'),
              }}>
                {label}
              </Text>
            </HapticTouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1 p-4"
        onScroll={handleFormScroll}
        scrollEventThrottle={16}
      >
        {/* Generate Recipe Button — Hero Card (only in create mode) */}
        {!isEditMode && (
          <Animated.View
            style={{
              transform: [{ scale: generateButtonScale }],
              opacity: generateButtonOpacity,
              marginBottom: 16,
              borderRadius: 16,
              ...Shadows.MD,
            }}
          >
            <LinearGradient
              colors={isDark ? ['#7C3AED', '#DB2777'] : ['#F97316', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, padding: 16 }}
            >
              <View className="flex-row items-center mb-2">
                <Ionicons name="sparkles" size={18} color="white" style={{ marginRight: 6 }} />
                <Text style={{ color: 'white', fontSize: 13, fontWeight: '600', opacity: 0.9 }}>Quick Start</Text>
              </View>
              <HapticTouchableOpacity
                onPress={handleGenerateRandomRecipe}
                disabled={generatingAI}
                hapticStyle="medium"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
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
                    <Ionicons name="flash" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>
                      {title.trim() ? `Generate "${title.trim()}" Recipe` : 'Generate Random Recipe'}
                    </Text>
                  </>
                )}
              </HapticTouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ── Details ──────────────────────────────────────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 0 }}
          onLayout={(e) => { sectionYOffsets.current[0] = e.nativeEvent.layout.y; }}
        >
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-card p-4 mb-4 shadow-sm`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-3`}>Details</Text>
          
          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Recipe Title *</Text>
          <View className="mb-3">
          <AnimatedInput
            value={title}
            onChangeText={setTitle}
            placeholder="Enter recipe title"
            className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
            placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
          />
          </View>

          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Description *</Text>
          <View className="mb-3">
          <AnimatedInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your recipe"
            multiline
            numberOfLines={3}
            className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
            placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
            style={{ textAlignVertical: 'top' }}
          />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Cook Time (min) *</Text>
              <AnimatedInput
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="30"
                keyboardType="numeric"
                className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
                placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
              />
            </View>
            <View className="flex-1">
              <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Cuisine *</Text>
              <AnimatedInput
                value={cuisine}
                onChangeText={setCuisine}
                placeholder="Italian"
                className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
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
                className={`flex-1 py-3 px-4 rounded-xl ${
                  recipeType === 'meal'
                    ? isDark
                      ? 'bg-orange-500/20'
                      : 'bg-orange-50'
                    : isDark
                    ? 'bg-gray-700'
                    : 'bg-gray-50'
                }`}
                style={recipeType === 'meal' ? Shadows.MD : Shadows.SM}
              >
                <Text className={`text-center font-semibold ${
                  recipeType === 'meal'
                    ? 'text-orange-500'
                    : isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  🍽 Meal
                </Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => setRecipeType('snack')}
                className={`flex-1 py-3 px-4 rounded-xl ${
                  recipeType === 'snack'
                    ? isDark
                      ? 'bg-orange-500/20'
                      : 'bg-orange-50'
                    : isDark
                    ? 'bg-gray-700'
                    : 'bg-gray-50'
                }`}
                style={recipeType === 'snack' ? Shadows.MD : Shadows.SM}
              >
                <Text className={`text-center font-semibold ${
                  recipeType === 'snack'
                    ? 'text-orange-500'
                    : isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  🥨 Snack
                </Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => setRecipeType('dessert')}
                className={`flex-1 py-3 px-4 rounded-xl ${
                  recipeType === 'dessert'
                    ? isDark
                      ? 'bg-orange-500/20'
                      : 'bg-orange-50'
                    : isDark
                    ? 'bg-gray-700'
                    : 'bg-gray-50'
                }`}
                style={recipeType === 'dessert' ? Shadows.MD : Shadows.SM}
              >
                <Text className={`text-center font-semibold ${
                  recipeType === 'dessert'
                    ? 'text-orange-500'
                    : isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  🍰 Dessert
                </Text>
              </HapticTouchableOpacity>
            </View>
            
            {/* Meal Type Selection (only shown when recipeType is 'meal') */}
            {recipeType === 'meal' && (
              <View className="flex-row gap-2">
                <HapticTouchableOpacity
                  onPress={() => setMealType('breakfast')}
                  className={`flex-1 py-2 px-3 rounded-xl ${
                    mealType === 'breakfast'
                      ? isDark ? 'bg-orange-500/20' : 'bg-orange-50'
                      : isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                  style={mealType === 'breakfast' ? Shadows.SM : undefined}
                >
                  <Text className={`text-center text-sm ${
                    mealType === 'breakfast'
                      ? 'text-orange-500 font-semibold'
                      : isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    🌅 Breakfast
                  </Text>
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={() => setMealType('lunch')}
                  className={`flex-1 py-2 px-3 rounded-xl ${
                    mealType === 'lunch'
                      ? isDark ? 'bg-orange-500/20' : 'bg-orange-50'
                      : isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                  style={mealType === 'lunch' ? Shadows.SM : undefined}
                >
                  <Text className={`text-center text-sm ${
                    mealType === 'lunch'
                      ? 'text-orange-500 font-semibold'
                      : isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    ☀️ Lunch
                  </Text>
                </HapticTouchableOpacity>
                <HapticTouchableOpacity
                  onPress={() => setMealType('dinner')}
                  className={`flex-1 py-2 px-3 rounded-xl ${
                    mealType === 'dinner'
                      ? isDark ? 'bg-orange-500/20' : 'bg-orange-50'
                      : isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                  style={mealType === 'dinner' ? Shadows.SM : undefined}
                >
                  <Text className={`text-center text-sm ${
                    mealType === 'dinner'
                      ? 'text-orange-500 font-semibold'
                      : isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    🌙 Dinner
                  </Text>
                </HapticTouchableOpacity>
              </View>
            )}
          </View>

          {/* Nutrition & Macros toggle */}
          <HapticTouchableOpacity
            testID="toggle-nutrition-btn"
            onPress={() => setShowNutrition(v => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 16,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: isDark ? '#374151' : '#F3F4F6',
            }}
          >
            <Ionicons
              name={showNutrition ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 14 }}>
              {showNutrition ? 'Hide Nutrition & Macros' : 'Nutrition & Macros'}
            </Text>
            {!showNutrition && (
              <View style={{
                marginLeft: 8,
                backgroundColor: '#FEF3C7',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
                <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '600' }}>Required</Text>
              </View>
            )}
          </HapticTouchableOpacity>

          {/* Collapsible nutrition fields — always rendered so tests can interact */}
          <Animated.View style={{ maxHeight: interpolatedNutritionHeight, overflow: 'hidden' }}>
            <View style={{ paddingTop: 12 }}>
              <View className="flex-row gap-3 mb-3">
                <View className="flex-1">
                  <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Calories *</Text>
                  <TextInput
                    value={calories}
                    onChangeText={setCalories}
                    placeholder="500"
                    keyboardType="numeric"
                    className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
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
                    className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
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
                    className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
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
                    className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
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
                    className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
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
                    className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        </View>
        </MotiView>

        {/* ── Ingredients ─────────────────────────────────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 80 }}
          onLayout={(e) => { sectionYOffsets.current[1] = e.nativeEvent.layout.y; }}
        >
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-card p-4 mb-4 shadow-sm`}>
          <View className="flex-row justify-between items-center mb-3">
            <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Ingredients *</Text>
            <HapticTouchableOpacity testID="add-ingredient-btn" onPress={addIngredient} className="p-2">
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
                  className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                />
              </View>
              {ingredients.length > 1 && (
                <HapticTouchableOpacity testID={`remove-ingredient-${index}`} onPress={() => removeIngredient(index)} className="p-2">
                  <Ionicons name="remove-circle" size={24} color={Colors.secondaryRed} />
                </HapticTouchableOpacity>
              )}
            </View>
          ))}
        </View>
        </MotiView>

        {/* ── Instructions ─────────────────────────────────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 160 }}
          onLayout={(e) => { sectionYOffsets.current[2] = e.nativeEvent.layout.y; }}
        >
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-card p-4 mb-4 shadow-sm`}>
          <View className="flex-row justify-between items-center mb-3">
            <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Instructions *</Text>
            <HapticTouchableOpacity testID="add-step-btn" onPress={addInstruction} className="p-2">
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
                    className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3`}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                    style={{ textAlignVertical: 'top' }}
                  />
                </View>
                {instructions.length > 1 && (
                  <HapticTouchableOpacity testID={`remove-instruction-${index}`} onPress={() => removeInstruction(index)} className="p-2 mt-6">
                    <Ionicons name="remove-circle" size={24} color={Colors.secondaryRed} />
                  </HapticTouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
        </MotiView>

        {/* ── Notes ────────────────────────────────────────────── */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 240 }}
          onLayout={(e) => { sectionYOffsets.current[3] = e.nativeEvent.layout.y; }}
        >
        <View className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-card p-4 mb-4 shadow-sm`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-3`}>Notes</Text>

          <Text className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-medium mb-2`}>Private Notes</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add personal tips, substitutions, or reminders..."
            multiline
            numberOfLines={3}
            className={`${isDark ? 'bg-gray-700 text-gray-100' : 'bg-surface-tint'} rounded-input px-4 py-3 mb-4`}
            placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
            style={{ textAlignVertical: 'top' }}
          />

          {/* Collections (create mode only) */}
          {!isEditMode && (
            <>
              <View className="flex-row justify-between items-center mb-3">
                <Text className={`text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Collections</Text>
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
            </>
          )}
        </View>
        </MotiView>

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
                  <GradientButton
                    label="Create"
                    onPress={handleCreateCollection}
                    colors={GradientPresets.brand}
                    style={{ paddingVertical: 0, minWidth: 70 }}
                  />
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
      </KeyboardAvoidingContainer>
    </SafeAreaView>
  );
}

