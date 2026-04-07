import { View, Text, ScrollView, Alert, Share, Platform, Modal, TextInput, Animated, StyleSheet } from 'react-native';
import ReAnimated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { MotiView } from 'moti';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../components/ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../components/ui/GradientButton';
import AnimatedText from '../components/ui/AnimatedText';
import LoadingState from '../components/ui/LoadingState';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import BottomSheet from '../components/ui/BottomSheet';
import LogoMascot from '../components/mascot/LogoMascot';
import MealPrepScalingModal from '../components/recipe/MealPrepScalingModal';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useColorScheme } from 'nativewind';
import { useApi } from '../hooks/useApi';
import { recipeApi, collectionsApi, shoppingListApi, costTrackingApi, shoppingAppApi, userApi } from '../lib/api';
import type { Recipe } from '../types';
import { ScaledRecipe } from '../utils/recipeScaling';
import { optimizedImageUrl } from '../utils/imageUtils';
import { generateStorageInstructions, getStorageMethods } from '../utils/storageInstructions';
import { getMealPrepTags } from '../utils/mealPrepTags';
import * as Haptics from 'expo-haptics';
import { Colors, DarkColors, BackgroundColors, TextColors, getDifficultyColor } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { CountingNumber } from '../components/ui/AnimatedStatCounter';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { HeartBurstAnimation } from '../components/celebrations';
import FrostedCard from '../components/ui/FrostedCard';
import MacroRingGrid from '../components/ui/MacroRingGrid';
import { getIngredientEmoji } from '../constants/IngredientEmoji';
import CookingStepsTimeline from '../components/recipe/CookingStepsTimeline';
import VisualIngredientList from '../components/recipe/VisualIngredientList';
import MacroPillsRow from '../components/recipe/MacroPillsRow';
import RecipeNotesModal from '../components/cookbook/RecipeNotesModal';
import IngredientSwapSheet from '../components/recipe/IngredientSwapSheet';
import type { IngredientSwap } from '../components/recipe/IngredientSwapSheet';

const HERO_HEIGHT = 300;

// Helper function to extract text from ingredients/instructions
const getTextContent = (item: any): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object' && 'text' in item) return item.text;
  return String(item);
};

// Module-level recipe detail cache — persists across modal opens within the same session
const RECIPE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const recipeDetailCache = new Map<string, { data: any; cachedAt: number }>();

function getCachedRecipe(id: string) {
  const entry = recipeDetailCache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > RECIPE_CACHE_TTL) {
    recipeDetailCache.delete(id);
    return null;
  }
  return entry.data;
}

function setCachedRecipe(id: string, data: any) {
  // Simple LRU eviction: if over 50 entries, remove oldest 25
  if (recipeDetailCache.size >= 50) {
    const entries = [...recipeDetailCache.entries()];
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    entries.slice(0, 25).forEach(([key]) => recipeDetailCache.delete(key));
  }
  recipeDetailCache.set(id, { data, cachedAt: Date.now() });
}

export default function RecipeModal() {
  const { id, source } = useLocalSearchParams();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation for modal expansion
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // Animation for collection picker modal
  const pickerScale = useRef(new Animated.Value(0)).current;
  const pickerOpacity = useRef(new Animated.Value(0)).current;

  // Scroll-driven hero parallax + collapsing header (Reanimated)
  const modalScrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      modalScrollY.value = event.contentOffset.y;
    },
  });

  const heroParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(
      modalScrollY.value,
      [0, HERO_HEIGHT],
      [0, -HERO_HEIGHT * 0.35],
      Extrapolation.CLAMP
    )}],
  }));

  const floatingHeaderAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      modalScrollY.value,
      [HERO_HEIGHT - 72, HERO_HEIGHT - 16],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const heroGradientAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      modalScrollY.value,
      [0, HERO_HEIGHT * 0.5],
      [1, 0.4],
      Extrapolation.CLAMP
    ),
  }));
  
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
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
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [showMealPrepModal, setShowMealPrepModal] = useState(false);
  const [similarRecipes, setSimilarRecipes] = useState<Recipe[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Notes state
  const [savedNotes, setSavedNotes] = useState<string | null>(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);

  // Daily macro targets for ring progress
  const [macroTargets, setMacroTargets] = useState<{ calories: number; protein: number; carbs: number; fat: number; fiber: number } | null>(null);

  // 10E: Ingredient swap state
  const [swapSheetVisible, setSwapSheetVisible] = useState(false);
  const [swapIngredient, setSwapIngredient] = useState('');
  const [activeSwaps, setActiveSwaps] = useState<Record<string, string>>({}); // ingredientText → swapped text

  // 10E: "Make It Healthier" lighter-version toggle
  const [lighterVersionActive, setLighterVersionActive] = useState(false);

  // 10E: "Make It Exciting" flavor boost state
  const [flavorBoosts, setFlavorBoosts] = useState<Array<{ addition: string; description: string; category: string; macroCost: { calories: number } }>>([]);
  const [loadingFlavorBoosts, setLoadingFlavorBoosts] = useState(false);
  const [flavorBoostsExpanded, setFlavorBoostsExpanded] = useState(false);

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

  // Fetch recipe data when modal opens (with module-level cache)
  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) return;

      // Check module-level cache first — zero network call for recently viewed recipes
      const cached = getCachedRecipe(id as string);
      if (cached) {
        console.log('📱 Modal: Serving recipe from cache', id);
        setRecipe(cached);
        setLoading(false);
        // Still record view non-blocking even on cache hit
        recipeApi.recordView(id as string).catch(() => {});
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('📱 Modal: Fetching recipe', id);

        const response = await recipeApi.getRecipe(id as string);
        console.log('📱 Modal: Received recipe data', response.data);
        setCachedRecipe(id as string, response.data);
        setRecipe(response.data);
        // Record view (non-blocking)
        recipeApi.recordView(id as string).catch(() => {});
      } catch (err: any) {
        // Don't fail the modal if it's just a quota error - recipe should still load
        const isQuotaError = err?.code === 'insufficient_quota' ||
          err?.message?.includes('quota') ||
          err?.message?.includes('Too many requests');
        if (!isQuotaError) {
          console.error('📱 Modal: Error fetching recipe', err);
          setError(err.message || 'Couldn\'t load this recipe');
        } else {
          // For quota errors, just log quietly - the recipe might still be cached or available
          console.log('📱 Modal: Recipe fetch hit quota limit, continuing anyway');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  // Fetch user's daily macro targets for ring progress display
  useEffect(() => {
    userApi.getMacroGoals()
      .then((res: any) => {
        const g = res.data;
        if (g && g.calories) {
          setMacroTargets({
            calories: g.calories,
            protein:  g.protein,
            carbs:    g.carbs,
            fat:      g.fat,
            // Fiber is stored in DB; fall back to 14g/1000kcal if missing (old records)
            fiber:    g.fiber ?? Math.max(20, Math.round((g.calories / 1000) * 14)),
          });
        }
      })
      .catch(() => {}); // non-critical — rings fall back to 100% fill
  }, []);

  // Load saved notes/rating when opened from cookbook
  useEffect(() => {
    if (source !== 'cookbook' || !id) return;
    recipeApi.getSavedMeta(id as string)
      .then((res) => setSavedNotes(res.data?.notes ?? null))
      .catch(() => {});
  }, [id, source]);

  // Load similar recipes when recipe is loaded
  useEffect(() => {
    const loadSimilarRecipes = async () => {
      if (!recipe?.id) return;
      
      try {
        setLoadingSimilar(true);
        
        // Check if meal prep mode is enabled
        const MEAL_PREP_STORAGE_KEY = '@sazon_meal_prep_mode';
        const savedMealPrepMode = await AsyncStorage.getItem(MEAL_PREP_STORAGE_KEY);
        const mealPrepMode = savedMealPrepMode === 'true';
        
        console.log(`🍱 Loading similar recipes (mealPrepMode: ${mealPrepMode})`);
        
        const response = await recipeApi.getSimilarRecipes(recipe.id, 5, mealPrepMode);
        setSimilarRecipes(response.data);
      } catch (error: any) {
        // Similar recipes are optional, don't show errors
        // Only log if it's not a quota/rate limit error
        const isQuotaError = error?.code === 'insufficient_quota' || 
          error?.message?.includes('quota') || 
          error?.message?.includes('Too many requests');
        if (!isQuotaError) {
          console.log('Similar recipes not available:', error);
        }
      } finally {
        setLoadingSimilar(false);
      }
    };

    loadSimilarRecipes();
  }, [recipe?.id]);

  // Load recipe savings when recipe is loaded
  useEffect(() => {
    const loadSavings = async () => {
      if (!recipe?.id) return;
      
      try {
        setLoadingSavings(true);
        const response = await costTrackingApi.getRecipeSavings(recipe.id);
        setRecipeSavings(response.data);
      } catch (error: any) {
        // Savings are optional, don't show errors
        // Only log if it's not a quota/rate limit error
        const isQuotaError = error?.code === 'insufficient_quota' || 
          error?.message?.includes('quota') || 
          error?.message?.includes('Too many requests');
        if (!isQuotaError) {
          console.log('Savings not available:', error);
        }
      } finally {
        setLoadingSavings(false);
      }
    };

    if (recipe) {
      loadSavings();
      loadIntegrations();
    }
  }, [recipe]);

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
      Alert.alert('Oops!', error.message || 'Couldn\'t sync to your shopping app — try again?');
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
      // Trigger heart burst animation, then auto-navigate back
      setSavedSuccess(true);
      setTimeout(() => router.back(), 1200);
    } catch (error: any) {
      if (error.code === 'HTTP_409' || /already\s*saved/i.test(error.message)) {
        // If already saved, try to add to collections
        if (collectionIds && collectionIds.length > 0) {
          try {
            await collectionsApi.moveSavedRecipe(recipe.id, collectionIds);
            setSavedSuccess(true);
            setTimeout(() => router.back(), 1200);
          } catch (e) {
            setSavedSuccess(true);
            setTimeout(() => router.back(), 1200);
          }
      } else {
          setSavedSuccess(true);
          setTimeout(() => router.back(), 1200);
        }
      } else {
        console.error('📱 Modal: Save error', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Oops!', error.message || 'Couldn\'t save the recipe — try again?');
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
      Alert.alert('Oops!', e.message || 'Couldn\'t create the collection — try again?');
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

      // Generate shopping list from recipe, using recipe name as list name
      const response = await shoppingListApi.generateFromRecipes([recipe.id], recipe.title);

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
        throw new Error('Couldn\'t add items to your shopping list');
      }
    } catch (error: any) {
      console.error('❌ Add to shopping list error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', error.message || 'Couldn\'t add items to your shopping list — try again?');
    } finally {
      setAddingToShoppingList(false);
    }
  };

  const handleHealthify = async () => {
    if (!recipe) return;
    
    // Check if recipe already has a healthy grade (A, B, or C)
    if (recipe.healthGrade && (recipe.healthGrade.toUpperCase() === 'A' || recipe.healthGrade.toUpperCase() === 'B' || recipe.healthGrade.toUpperCase() === 'C')) {
      Alert.alert(
        'Recipe Already Healthy',
        `This recipe already has a healthy grade (${recipe.healthGrade}) and doesn't need healthifying. Healthify is only available for recipes with grades D or F.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
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
      
      // Handle "already healthy" error specifically
      if (error.response?.data?.code === 'ALREADY_HEALTHY') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'Recipe Already Healthy',
          error.response.data.message || `This recipe already has a healthy grade and doesn't need healthifying.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.message?.includes('quota') ||
                          error.message?.includes('429');
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Hmm, That Didn\'t Work',
        isQuotaError
          ? 'Our AI is a bit overwhelmed right now — try again in a few minutes!'
          : error.message || 'Couldn\'t healthify this recipe — give it another shot?',
        [{ text: 'OK' }]
      );
    } finally {
      setHealthifying(false);
    }
  };

  // 10E: Handle ingredient swap icon tap
  const handleSwapIngredient = (ingredientText: string) => {
    setSwapIngredient(ingredientText);
    setSwapSheetVisible(true);
  };

  // 10E: Apply selected swap — updates activeSwaps map
  const handleSelectSwap = (swap: IngredientSwap) => {
    setActiveSwaps((prev) => ({ ...prev, [swapIngredient]: swap.alternative }));
    setSwapSheetVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // 10E: "Make It Healthier" toggle — calls healthify with force=true
  const handleLighterVersion = async () => {
    if (!recipe) return;
    if (lighterVersionActive) {
      setLighterVersionActive(false);
      setHealthifiedRecipe(null);
      return;
    }
    try {
      setHealthifying(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await recipeApi.healthifyRecipe(recipe.id, true);
      if (response.data.success && response.data.recipe) {
        setHealthifiedRecipe(response.data.recipe);
        setLighterVersionActive(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      const isQuotaError = error.code === 'insufficient_quota' || error.message?.includes('quota');
      Alert.alert(
        'Hmm, That Didn\'t Work',
        isQuotaError
          ? 'Our AI is a bit overwhelmed right now — try again in a few minutes!'
          : 'Couldn\'t build a lighter version right now — give it another shot?',
        [{ text: 'OK' }],
      );
    } finally {
      setHealthifying(false);
    }
  };

  // 10E: Load flavor boosts when "Make It Exciting" is expanded
  const handleToggleFlavorBoosts = async () => {
    if (flavorBoostsExpanded) {
      setFlavorBoostsExpanded(false);
      return;
    }
    setFlavorBoostsExpanded(true);
    if (flavorBoosts.length > 0 || !recipe) return;

    try {
      setLoadingFlavorBoosts(true);
      const response = await recipeApi.flavorBoost(recipe.id);
      if (response.data.success) {
        setFlavorBoosts(response.data.suggestions ?? []);
      }
    } catch {
      setFlavorBoosts([]);
    } finally {
      setLoadingFlavorBoosts(false);
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
            Alert.alert('Oops!', 'Couldn\'t remove that recipe — try again?');
          }
        },
      },
    ]);
  };

  const handleShareRecipe = async () => {
    if (!recipe) return;
    
    try {
      const shareContent = {
        title: `Check out this recipe: ${recipe.title}`,
        message: `🌶️ Sazon Chef Recipe: ${recipe.title}\n\n${recipe.description}\n\n⏱️ Cook Time: ${recipe.cookTime} minutes\n🔥 Calories: ${recipe.calories}\n🥩 Protein: ${recipe.protein}g\n🍞 Carbs: ${recipe.carbs}g\n🥑 Fat: ${recipe.fat}g\n\n🌶️ Discover more amazing recipes with Sazon Chef!`,
        url: `https://sazonchef.app/recipe/${recipe.id}`, // Future deep link
      };

      const result = await Share.share(shareContent);
      
      if (result.action === Share.sharedAction) {
        console.log('📱 Recipe shared successfully');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.action === Share.dismissedAction) {
        console.log('📱 Share dismissed');
      }
    } catch (error) {
      console.error('📱 Error sharing recipe:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Oops!', 'Couldn\'t share the recipe — try again?');
    }
  };

  const handleAddToMealPlan = () => {
    if (!recipe) return;
    
    // Navigate to meal plan tab with recipe context
    router.push(`/(tabs)/meal-plan?recipeId=${recipe.id}&recipeTitle=${encodeURIComponent(recipe.title)}`);
  };

  const handleMealPrepScaling = (scaledRecipe: ScaledRecipe) => {
    // Recipe has been scaled - user can add to meal plan from the scaling modal
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleEditRecipe = () => {
    if (!recipe) return;
    console.log('📱 Modal: Editing recipe', recipe.id);
    router.push(`/recipe-form?id=${recipe.id}`);
  };

  const [isForking, setIsForking] = useState(false);
  const handleSaveMyVersion = async () => {
    if (!recipe || isForking) return;
    try {
      setIsForking(true);
      const response = await recipeApi.forkRecipe(recipe.id);
      const forked = (response as any)?.data?.data || (response as any)?.data;
      if (!forked?.id) throw new Error('Fork did not return a recipe');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/recipe-form?id=${forked.id}` as any);
    } catch (error: any) {
      console.error('📱 Modal: Fork error', error);
      Alert.alert('Oops!', error?.message || "Couldn't create your version — try again?");
    } finally {
      setIsForking(false);
    }
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
              Alert.alert('Oops!', error.message || 'Couldn\'t delete the recipe — try again?');
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

  // Loading state — skeleton that matches the modal layout for better perceived speed
  if (loading) {
    return (
      <Animated.View
        style={{
          flex: 1,
          transform: [{ scale: modalScale }],
          opacity: modalOpacity,
        }}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <HapticTouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="close" size={24} color={isDark ? '#E5E7EB' : '#374151'} />
            </HapticTouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recipe Details</Text>
            <View className="w-8" />
          </View>
          <ScrollView>
            {/* Hero image skeleton */}
            <SkeletonLoader width="100%" height={220} borderRadius={0} isDark={isDark} />
            <View className="p-4">
              {/* Title */}
              <SkeletonLoader width="75%" height={26} borderRadius={6} isDark={isDark} style={{ marginBottom: 8 }} />
              {/* Subtitle / cuisine */}
              <SkeletonLoader width="45%" height={16} borderRadius={4} isDark={isDark} style={{ marginBottom: 20 }} />
              {/* Macro pills row */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {[1, 2, 3, 4].map(i => (
                  <SkeletonLoader key={i} width={72} height={36} borderRadius={18} isDark={isDark} />
                ))}
              </View>
              {/* Section heading */}
              <SkeletonLoader width="40%" height={18} borderRadius={4} isDark={isDark} style={{ marginBottom: 12 }} />
              {/* Ingredient lines */}
              {[90, 75, 85, 65, 80].map((w, i) => (
                <SkeletonLoader key={i} width={`${w}%`} height={14} borderRadius={4} isDark={isDark} style={{ marginBottom: 8 }} />
              ))}
              {/* Instructions heading */}
              <SkeletonLoader width="40%" height={18} borderRadius={4} isDark={isDark} style={{ marginTop: 16, marginBottom: 12 }} />
              {/* Instruction blocks */}
              {[100, 90, 95].map((w, i) => (
                <SkeletonLoader key={i} width={`${w}%`} height={14} borderRadius={4} isDark={isDark} style={{ marginBottom: 8 }} />
              ))}
            </View>
          </ScrollView>
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
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <HapticTouchableOpacity 
            onPress={() => router.back()}
            className="p-2"
          >
          <Ionicons name="close" size={24} color={isDark ? "#E5E7EB" : "#374151"} />
        </HapticTouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recipe Details</Text>
          <View className="w-8" />
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <LogoMascot 
            expression="supportive" 
            size="large" 
          />
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 text-center">
            Failed to load recipe
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-center mt-2">
            {error || 'Recipe not found'}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 mb-4">
            Don't worry, this happens sometimes. Try going back and selecting the recipe again.
          </Text>
          <GradientButton
            label="Go Back"
            onPress={() => router.back()}
            style={{ marginTop: 8 }}
          />
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
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['bottom']}>
      {/* Scrollable content with hero at top */}
      <ReAnimated.ScrollView
        className="flex-1"
        scrollEventThrottle={16}
        onScroll={scrollHandler}
      >
        {/* Hero image — full-bleed with blur-up loading via expo-image */}
        <View style={{ height: HERO_HEIGHT, overflow: 'hidden' }}>
          {recipe.imageUrl ? (
            <ReAnimated.View
              testID="hero-image"
              style={[
                StyleSheet.absoluteFill,
                { height: HERO_HEIGHT + 80 },
                heroParallaxStyle,
              ]}
            >
              <Image
                source={{ uri: optimizedImageUrl(recipe.imageUrl, 600) }}
                placeholder={{ thumbhash: undefined }}
                transition={300}
                contentFit="cover"
                style={{ width: '100%', height: '100%' }}
              />
            </ReAnimated.View>
          ) : (
            // Gradient placeholder when no image is available
            <LinearGradient
              testID="hero-placeholder"
              colors={isDark ? ['#1F2937', '#111827'] : ['#FED7AA', '#FEF3C7']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          {/* Dark gradient for readability */}
          {recipe.imageUrl && (
            <ReAnimated.View style={[StyleSheet.absoluteFill, heroGradientAnimStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0.4 }}
                end={{ x: 0, y: 1 }}
              />
            </ReAnimated.View>
          )}

          {/* Cook time + Difficulty badges on hero image */}
          <View style={{ position: 'absolute', bottom: 28, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {recipe.cookTime ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, marginRight: 4 }}>⏱</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{recipe.cookTime} min</Text>
              </View>
            ) : <View />}
            {recipe.difficulty ? (
              <View style={{ backgroundColor: getDifficultyColor(recipe.difficulty, true).bg, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text style={{ color: getDifficultyColor(recipe.difficulty, true).text, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
                  {recipe.difficulty}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="bg-white dark:bg-gray-900" style={{ marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
          {/* Drag handle indicator */}
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#48484A' : '#D1D5DB', marginBottom: 12 }} />
          {/* Recipe Title */}
          <AnimatedText className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-1" style={{ lineHeight: 36 }}>
            {recipe.title}
          </AnimatedText>

          {/* Cuisine tag */}
          {recipe.cuisine && (
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <View style={{
                paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100,
                backgroundColor: isDark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.1)',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#FB923C' : '#EA580C' }}>
                  {recipe.cuisine}
                </Text>
              </View>
            </View>
          )}

          {/* Macro pills row — pastel tinted */}
          <View style={{ marginBottom: 12 }}>
            <MacroPillsRow
              calories={recipe.calories}
              protein={recipe.protein}
              carbs={recipe.carbs}
              fat={recipe.fat}
              fiber={recipe.fiber}
              isDark={isDark}
            />
          </View>

          {/* Description */}
          <AnimatedText className="text-gray-600 dark:text-gray-300 mb-4">
            {recipe.description}
          </AnimatedText>

          {/* Quick Stats */}
          <FrostedCard style={{ marginBottom: 24, padding: 16 }}>
            <View className="flex-row items-center mb-3">
              <Text className="text-xl mr-2">⏱️</Text>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cook Time</Text>
            </View>
            <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Time</Text>
              <CountingNumber value={recipe.cookTime} suffix=" min" delay={0} style={{ fontWeight: '600', color: isDark ? '#F3F4F6' : '#111827' }} />
            </View>
            <View className="items-center">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Calories</Text>
              <CountingNumber value={recipe.calories} delay={100} style={{ fontWeight: '600', color: isDark ? '#F3F4F6' : '#111827' }} />
            </View>
            <View className="items-center">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Protein</Text>
              <CountingNumber value={recipe.protein} suffix="g" delay={200} style={{ fontWeight: '600', color: isDark ? '#F3F4F6' : '#111827' }} />
            </View>
            </View>
          </FrostedCard>

          {/* Macro Nutrients — 2×2 Ring Grid */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>🥗</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? DarkColors.text.primary : Colors.text.primary }}>Nutrition</Text>
            </View>
            <FrostedCard style={{ padding: 16 }}>
              <MacroRingGrid
                macros={{
                  calories: recipe.calories || 0,
                  protein: recipe.protein || 0,
                  carbs: recipe.carbs || 0,
                  fat: recipe.fat || 0,
                  fiber: recipe.fiber || 0,
                }}
                targets={macroTargets ?? undefined}
                testID="recipe-macro-grid"
              />
            </FrostedCard>
          </View>

          {/* Health Grade Badge */}
          {(recipe.healthGrade || recipe.healthGradeScore) && (
            <FrostedCard style={{ marginBottom: 16, padding: 16 }}>
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row items-start flex-1">
                  <Text className="text-xl mr-2 mt-0.5">⭐</Text>
                  <View>
                    <Text className="text-base font-medium text-gray-600 dark:text-gray-200">Health Grade</Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      Objective nutritional quality rating
                    </Text>
                  </View>
                </View>
                <View className={`px-1.5 py-0.5 rounded-lg border-2 ml-3 ${
                  recipe.healthGrade === 'A' ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' :
                  recipe.healthGrade === 'B' ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' :
                  recipe.healthGrade === 'C' ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700' :
                  recipe.healthGrade === 'D' ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700' :
                  recipe.healthGrade === 'F' ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-500' :
                  'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}>
                  <Text className={`text-sm font-bold ${
                    recipe.healthGrade === 'A' ? 'text-green-700 dark:text-green-300' :
                    recipe.healthGrade === 'B' ? 'text-blue-700 dark:text-blue-300' :
                    recipe.healthGrade === 'C' ? 'text-yellow-700 dark:text-yellow-300' :
                    recipe.healthGrade === 'D' ? 'text-orange-700 dark:text-orange-300' :
                    recipe.healthGrade === 'F' ? 'text-red-600 dark:text-red-400' :
                    'text-gray-700 dark:text-gray-300'
                  }`}>
                    {recipe.healthGrade}
                  </Text>
                  {recipe.healthGradeScore !== undefined && (
                    <Text className={`text-xs text-center mt-0.5 ${
                      recipe.healthGrade === 'A' ? 'text-green-600 dark:text-green-400' :
                      recipe.healthGrade === 'B' ? 'text-blue-600 dark:text-blue-400' :
                      recipe.healthGrade === 'C' ? 'text-yellow-600 dark:text-yellow-400' :
                      recipe.healthGrade === 'D' ? 'text-orange-600 dark:text-orange-400' :
                      recipe.healthGrade === 'F' ? 'text-red-600 dark:text-red-400' : // Using secondary red
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {Math.round(recipe.healthGradeScore)}/100
                    </Text>
                  )}
                </View>
              </View>
              {recipe.healthGradeBreakdown && (
                <View className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Text className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Breakdown</Text>
                  <View className="space-y-2">
                    <View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-600 dark:text-gray-400">Macro Balance</Text>
                        <Text className="text-xs font-semibold text-gray-900 dark:text-gray-100">{recipe.healthGradeBreakdown.macronutrientBalance}/25</Text>
                      </View>
                      <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <View 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${(recipe.healthGradeBreakdown.macronutrientBalance / 25) * 100}%` }}
                        />
                      </View>
                    </View>
                    <View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-600 dark:text-gray-400">Nutrient Density</Text>
                        <Text className="text-xs font-semibold text-gray-900 dark:text-gray-100">{recipe.healthGradeBreakdown.nutrientDensity}/25</Text>
                      </View>
                      <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <View 
                          className="bg-green-500 h-1.5 rounded-full" 
                          style={{ width: `${(recipe.healthGradeBreakdown.nutrientDensity / 25) * 100}%` }}
                        />
                      </View>
                    </View>
                    <View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-xs text-gray-600 dark:text-gray-400">Ingredient Quality</Text>
                        <Text className="text-xs font-semibold text-gray-900 dark:text-gray-100">{recipe.healthGradeBreakdown.ingredientQuality}/20</Text>
                      </View>
                      <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <View 
                          className="bg-purple-500 h-1.5 rounded-full" 
                          style={{ width: `${(recipe.healthGradeBreakdown.ingredientQuality / 20) * 100}%` }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </FrostedCard>
          )}

          {/* Nutritional Analysis */}
          {recipe.nutritionalAnalysis && (
            <FrostedCard style={{ marginBottom: 16, padding: 16 }}>
              <View className="flex-row items-center mb-3">
                <Text className="text-xl mr-2">🔬</Text>
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Advanced Nutritional Analysis</Text>
              </View>
              
              {/* Nutritional Density Score */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Nutritional Density Score</Text>
                  <Text className="text-lg font-bold text-purple-700 dark:text-purple-300">{Math.round(recipe.nutritionalAnalysis.nutritionalDensityScore)}/100</Text>
                </View>
                <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <View 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${Math.round(recipe.nutritionalAnalysis.nutritionalDensityScore)}%` }}
                  />
                </View>
              </View>

              {/* Key Nutrients */}
              {recipe.nutritionalAnalysis.keyNutrients.length > 0 && (
                <View className="mb-3">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Nutrients</Text>
                  <View className="flex-row flex-wrap">
                    {recipe.nutritionalAnalysis.keyNutrients.map((nutrient, idx) => (
                      <View key={idx} className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full mr-2 mb-2">
                        <Text className="text-xs font-medium text-green-700 dark:text-green-300">{nutrient}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Omega-3 */}
              {recipe.nutritionalAnalysis.omega3.totalOmega3 > 0 && (
                <View className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Omega-3 Fatty Acids</Text>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600 dark:text-gray-400">Total: {recipe.nutritionalAnalysis.omega3.totalOmega3.toFixed(2)}g</Text>
                    {recipe.nutritionalAnalysis.omega3.epa > 0 && (
                      <Text className="text-xs text-gray-600 dark:text-gray-400">EPA: {recipe.nutritionalAnalysis.omega3.epa.toFixed(2)}g</Text>
                    )}
                    {recipe.nutritionalAnalysis.omega3.dha > 0 && (
                      <Text className="text-xs text-gray-600 dark:text-gray-400">DHA: {recipe.nutritionalAnalysis.omega3.dha.toFixed(2)}g</Text>
                    )}
                  </View>
                  <Text className="text-xs text-blue-600 dark:text-blue-400 mt-1">Score: {Math.round(recipe.nutritionalAnalysis.omega3.omega3Score)}/100</Text>
                </View>
              )}

              {/* Antioxidants */}
              {recipe.nutritionalAnalysis.antioxidants.oracValue > 0 && (
                <View className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antioxidants</Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400">ORAC Value: {recipe.nutritionalAnalysis.antioxidants.oracValue.toLocaleString()}</Text>
                  {recipe.nutritionalAnalysis.antioxidants.polyphenols > 0 && (
                    <Text className="text-xs text-gray-600 dark:text-gray-400">Polyphenols: {recipe.nutritionalAnalysis.antioxidants.polyphenols}mg</Text>
                  )}
                  <Text className="text-xs text-orange-600 dark:text-orange-400 mt-1">Score: {Math.round(recipe.nutritionalAnalysis.antioxidants.antioxidantScore)}/100</Text>
                </View>
              )}

              {/* Micronutrients Summary */}
              <View className="mb-3">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Micronutrients</Text>
                <View className="flex-row flex-wrap">
                  {recipe.nutritionalAnalysis.micronutrients.vitamins.vitaminC > 0 && (
                    <View className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-yellow-700 dark:text-yellow-300">C: {Math.round(recipe.nutritionalAnalysis.micronutrients.vitamins.vitaminC)}mg</Text>
                    </View>
                  )}
                  {recipe.nutritionalAnalysis.micronutrients.vitamins.vitaminA > 0 && (
                    <View className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-orange-700 dark:text-orange-300">A: {Math.round(recipe.nutritionalAnalysis.micronutrients.vitamins.vitaminA)}IU</Text>
                    </View>
                  )}
                  {recipe.nutritionalAnalysis.micronutrients.minerals.calcium > 0 && (
                    <View className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-blue-700 dark:text-blue-300">Ca: {Math.round(recipe.nutritionalAnalysis.micronutrients.minerals.calcium)}mg</Text>
                    </View>
                  )}
                  {recipe.nutritionalAnalysis.micronutrients.minerals.iron > 0 && (
                    <View className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-red-600 dark:text-red-400">Fe: {recipe.nutritionalAnalysis.micronutrients.minerals.iron.toFixed(1)}mg</Text>
                    </View>
                  )}
                  {recipe.nutritionalAnalysis.micronutrients.minerals.potassium > 0 && (
                    <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded mr-2 mb-2">
                      <Text className="text-xs text-green-700 dark:text-green-300">K: {Math.round(recipe.nutritionalAnalysis.micronutrients.minerals.potassium)}mg</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Nutrient Gaps */}
              {recipe.nutritionalAnalysis.nutrientGaps.length > 0 && (
                <View className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <Text className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">Nutrient Gaps</Text>
                  <Text className="text-xs text-yellow-700 dark:text-yellow-400">
                    Consider adding: {recipe.nutritionalAnalysis.nutrientGaps.join(', ')}
                  </Text>
                </View>
              )}
            </FrostedCard>
          )}

          {/* Cost Information */}
          {(recipe.estimatedCost || recipe.estimatedCostPerServing || recipe.pricePerServing) && (
            <View className="mb-6 p-4 bg-emerald-50 rounded-lg">
              <Text className="text-lg font-semibold text-gray-900 mb-2">Cost</Text>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-gray-500 text-sm">Total Cost</Text>
                  <Text className="text-2xl font-bold text-emerald-700">
                    ${recipe.estimatedCost ? Math.round(recipe.estimatedCost * 100) / 100 : (recipe.pricePerServing && recipe.servings ? Math.round(recipe.pricePerServing * recipe.servings * 100) / 100 : 'N/A')}
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


          {/* Storage Instructions - Enhanced Display */}
          {(recipe.freezable || recipe.weeklyPrepFriendly || recipe.storageInstructions || recipe.fridgeStorageDays || recipe.freezerStorageMonths || recipe.shelfStable) && (
            <View className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Ionicons name="snow-outline" size={20} color="#3B82F6" />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">📦 Storage Instructions</Text>
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
                <Text className="text-gray-700 dark:text-gray-300 text-sm leading-5 mb-2">
                  {recipe.storageInstructions}
                </Text>
              ) : (
                <View className="space-y-3">
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
                </View>
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

          {/* Ingredients — Visual list with emoji, bold amounts, serving adjuster */}
          <View className="mb-6">
            {/* 10E: Make It Healthier toggle */}
            <HapticTouchableOpacity
              onPress={handleLighterVersion}
              hapticStyle="light"
              pressedScale={0.97}
              disabled={healthifying}
              accessibilityLabel={lighterVersionActive ? 'Disable lighter version' : 'Make it healthier'}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 100,
                marginBottom: 14,
                backgroundColor: lighterVersionActive
                  ? (isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.12)')
                  : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
              }}
            >
              <Text style={{ fontSize: 14, marginRight: 6 }}>
                {healthifying ? '⏳' : lighterVersionActive ? '✅' : '🥗'}
              </Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: lighterVersionActive
                  ? '#16A34A'
                  : (isDark ? '#D1D5DB' : '#374151'),
              }}>
                {healthifying ? 'Building lighter version…' : lighterVersionActive ? 'Lighter Version On' : 'Make It Healthier'}
              </Text>
            </HapticTouchableOpacity>

            {recipe.ingredients && Array.isArray(recipe.ingredients) && (
              <VisualIngredientList
                ingredients={lighterVersionActive && healthifiedRecipe?.ingredients
                  ? healthifiedRecipe.ingredients
                  : recipe.ingredients}
                baseServings={recipe.servings || 4}
                isDark={isDark}
                onSwapIngredient={handleSwapIngredient}
              />
            )}
          </View>

          {/* Instructions — Vertical Timeline */}
          <View className="mb-6">
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Instructions</Text>
            {recipe.instructions && Array.isArray(recipe.instructions) && (
              <CookingStepsTimeline
                steps={recipe.instructions.map((i: any) => getTextContent(i))}
                testID="recipe-instructions-timeline"
              />
            )}
          </View>

          {/* 10E: Make It Exciting — Flavor Boosters */}
          <View className="mb-6">
            <HapticTouchableOpacity
              onPress={handleToggleFlavorBoosts}
              hapticStyle="light"
              pressedScale={0.97}
              accessibilityLabel={flavorBoostsExpanded ? 'Collapse flavor boosters' : 'Make it exciting'}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 16,
                backgroundColor: isDark ? 'rgba(251,146,60,0.12)' : 'rgba(251,146,60,0.08)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>🌶️</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#FED7AA' : '#C2410C' }}>
                  Make It Exciting
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: isDark ? '#FED7AA' : '#C2410C' }}>
                {flavorBoostsExpanded ? '▲' : '▼'}
              </Text>
            </HapticTouchableOpacity>

            {flavorBoostsExpanded && (
              <View style={{ marginTop: 10 }}>
                {loadingFlavorBoosts && (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 13 }}>
                      Asking Sazon for ideas…
                    </Text>
                  </View>
                )}
                {!loadingFlavorBoosts && flavorBoosts.length === 0 && (
                  <Text style={{ fontSize: 13, color: isDark ? '#6B7280' : '#9CA3AF', paddingVertical: 8 }}>
                    No flavor boosts available right now.
                  </Text>
                )}
                {!loadingFlavorBoosts && flavorBoosts.map((boost, idx) => (
                  <MotiView
                    key={idx}
                    from={{ opacity: 0, translateY: 6 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', delay: idx * 60, damping: 20, stiffness: 200 }}
                  >
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 4,
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    }}>
                      <Text style={{ fontSize: 16, marginRight: 10 }}>✨</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: isDark ? '#FED7AA' : '#C2410C',
                        }}>
                          {boost.addition}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          color: isDark ? '#9CA3AF' : '#6B7280',
                          marginTop: 2,
                        }}>
                          {boost.description}
                        </Text>
                      </View>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: isDark ? '#86EFAC' : '#16A34A',
                        marginLeft: 8,
                      }}>
                        +{boost.macroCost.calories} cal
                      </Text>
                    </View>
                  </MotiView>
                ))}
              </View>
            )}
          </View>

          {/* My Notes — only for cookbook recipes */}
          {source === 'cookbook' && (
            <HapticTouchableOpacity
              onPress={() => setNotesModalVisible(true)}
              hapticStyle="light"
              accessibilityLabel="Edit notes"
              className="mb-6 p-4 rounded-2xl"
              style={{
                backgroundColor: isDark ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.06)',
                ...Shadows.SM,
              }}
            >
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text-outline" size={18} color={isDark ? '#FBBF24' : '#D97706'} />
                <Text className="text-base font-semibold ml-2" style={{ color: isDark ? '#FBBF24' : '#D97706' }}>My Notes</Text>
              </View>
              <Text
                className="text-sm"
                style={{ color: savedNotes ? (isDark ? '#D1D5DB' : '#4B5563') : (isDark ? '#6B7280' : '#9CA3AF') }}
                numberOfLines={3}
              >
                {savedNotes || 'Add a note…'}
              </Text>
            </HapticTouchableOpacity>
          )}

          {/* You Might Like Section */}
          {similarRecipes.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
                  <Text className="text-lg">💡</Text>
                </View>
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  You might also like
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {similarRecipes.map((similarRecipe) => (
                  <View key={similarRecipe.id} className="mr-4" style={{ width: 280, height: 260 }}>
                      <HapticTouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.push(`/modal?id=${similarRecipe.id}`);
                        }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 border-orange-500 dark:border-orange-600 h-full"
                      >
                      {similarRecipe.imageUrl && (
                        <Image
                          source={{ uri: optimizedImageUrl(similarRecipe.imageUrl) }}
                          className="w-full h-32"
                          resizeMode="cover"
                        />
                      )}
                      <View className="p-3 flex-1">
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1" numberOfLines={2}>
                          {similarRecipe.title}
                        </Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-300 mb-2" numberOfLines={2}>
                          {similarRecipe.description}
                        </Text>
                        <View className="flex-row items-center justify-between mt-auto">
                          <View className="flex-row items-center">
                            <Ionicons 
                              name="time-outline" 
                              size={14} 
                              color={isDark ? "#9CA3AF" : "#6B7280"} 
                            />
                            <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                              {similarRecipe.cookTime} min
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Ionicons 
                              name="restaurant-outline" 
                              size={14} 
                              color={isDark ? "#9CA3AF" : "#6B7280"} 
                            />
                            <Text className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                              {similarRecipe.cuisine}
                            </Text>
                          </View>
                        </View>
                      </View>
                      </HapticTouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          {loadingSimilar && (
            <View className="mb-6">
              <Text className="text-sm text-gray-500 dark:text-gray-400">Loading similar recipes...</Text>
            </View>
          )}
        </View>
      </ReAnimated.ScrollView>

      {/* Floating close + edit buttons over hero (always visible) */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 12,
          right: 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          zIndex: 20,
        }}
      >
        <HapticTouchableOpacity
          accessibilityLabel="Close recipe"
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.40)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={20} color="#FFF" />
        </HapticTouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Heart burst — visible after save */}
          {savedSuccess && (
            <HeartBurstAnimation saved={true} size={22} />
          )}
          <HapticTouchableOpacity
            accessibilityLabel="Share recipe"
            onPress={() => {
              if (!recipe) return;
              Share.share({
                message: `Check out this recipe: ${recipe.title}`,
                title: recipe.title,
              });
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.40)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="share-outline" size={18} color="#FFF" />
          </HapticTouchableOpacity>
          {isUserRecipe ? (
            <HapticTouchableOpacity
              accessibilityLabel="Edit recipe"
              onPress={handleEditRecipe}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.40)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="create-outline" size={20} color="#FFF" />
            </HapticTouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>
      </View>

      {/* Saved success banner */}
      {savedSuccess && (
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          style={{
            position: 'absolute',
            top: insets.top + 52,
            left: 0,
            right: 0,
            zIndex: 30,
            alignItems: 'center',
          }}
        >
          <View style={{
            backgroundColor: 'rgba(16, 185, 129, 0.9)',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 100,
          }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
              Saved to cookbook!
            </Text>
          </View>
        </MotiView>
      )}

      {/* Collapsing frosted header — fades in as hero scrolls out of view */}
      <ReAnimated.View
        testID="frosted-header"
        style={[{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 19,
        }, floatingHeaderAnimStyle]}
        pointerEvents="box-none"
      >
        {Platform.OS === 'android' ? (
          <View
            style={{
              paddingTop: insets.top,
              paddingBottom: 12,
              paddingHorizontal: 16,
              backgroundColor: isDark ? 'rgba(15,15,15,0.95)' : 'rgba(250,247,244,0.95)',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <HapticTouchableOpacity onPress={() => router.back()} style={{ width: 32 }}>
              <Ionicons name="chevron-back" size={22} color={isDark ? '#fff' : '#111'} />
            </HapticTouchableOpacity>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '600',
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
              }}
            >
              {recipe.title}
            </Text>
            <View style={{ width: 32 }} />
          </View>
        ) : (
          <BlurView
            intensity={isDark ? 60 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={{
              paddingTop: insets.top,
              paddingBottom: 12,
              paddingHorizontal: 16,
            }}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark
                    ? 'rgba(17,24,39,0.45)'
                    : 'rgba(255,255,255,0.55)',
                },
              ]}
              pointerEvents="none"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <HapticTouchableOpacity onPress={() => router.back()} style={{ width: 32 }}>
                <Ionicons name="chevron-back" size={22} color={isDark ? '#fff' : '#111'} />
              </HapticTouchableOpacity>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: '600',
                  color: isDark ? DarkColors.text.primary : Colors.text.primary,
                }}
              >
                {recipe.title}
              </Text>
              <View style={{ width: 32 }} />
            </View>
          </BlurView>
        )}
      </ReAnimated.View>

      {/* Action Buttons */}
      <View className="p-4" style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
        {/* Start Cooking — top of action buttons */}
        <GradientButton
          label={recipe?.cookTime ? `Start Cooking · ${recipe.cookTime} min` : 'Start Cooking'}
          onPress={() => {
            if (!recipe) return;
            router.push({ pathname: '/cooking', params: { id: recipe.id } } as any);
          }}
          disabled={!recipe}
          colors={GradientPresets.fire}
          icon="flame-outline"
          style={{ marginBottom: 8 }}
        />

        {/* Meal Prep Scaling Button - Available for all recipes */}
        <GradientButton
          label="Meal Prep This Recipe"
          onPress={() => setShowMealPrepModal(true)}
          disabled={!recipe}
          colors={GradientPresets.premium}
          icon="restaurant"
          style={{ marginBottom: 8 }}
        />

        {/* Add to Shopping List Button - Available for all recipes */}
        <GradientButton
          label={addingToShoppingList ? 'Adding...' : 'Add to Shopping List'}
          onPress={handleAddToShoppingList}
          disabled={addingToShoppingList || !recipe}
          loading={addingToShoppingList}
          colors={GradientPresets.info}
          icon="cart"
          style={{ marginBottom: 8 }}
        />

        {/* Sync to Shopping Apps */}
        {integrations.length > 0 && (
          <View className="mb-2">
            <Text className="text-sm font-medium text-gray-700 mb-2 px-2">Sync Recipe to Shopping App:</Text>
            {integrations.map((integration) => (
              <HapticTouchableOpacity
                key={integration.id}
                onPress={() => handleSyncRecipeToApp(integration.appName)}
                hapticStyle="medium"
                className="bg-red-100 dark:bg-red-900/30 py-3 px-4 rounded-lg items-center mb-2 flex-row justify-center border border-red-200 dark:border-red-800"
              >
                <Ionicons name="link-outline" size={18} color={Colors.secondaryRed} style={{ marginRight: 8 }} />
                <Text className="text-red-600 dark:text-red-400 font-semibold">
                  Sync to {integration.appName.charAt(0).toUpperCase() + integration.appName.slice(1)}
                </Text>
              </HapticTouchableOpacity>
            ))}
          </View>
        )}

        {/* Healthify Button - Only available for recipes with D or F grades */}
        {recipe.healthGrade && (recipe.healthGrade.toUpperCase() === 'A' || recipe.healthGrade.toUpperCase() === 'B' || recipe.healthGrade.toUpperCase() === 'C') ? (
          <GradientButton
            label={`Recipe already healthy (Grade ${recipe.healthGrade})`}
            onPress={() => {}}
            disabled
            colors={['#9CA3AF', '#6B7280']}
            icon="leaf"
            style={{ marginBottom: 8 }}
          />
        ) : (
          <GradientButton
            label={healthifying ? 'Healthifying...' : 'Healthify Recipe'}
            onPress={handleHealthify}
            disabled={healthifying}
            loading={healthifying}
            colors={GradientPresets.fresh}
            icon="leaf"
            style={{ marginBottom: 8 }}
          />
        )}

        {isUserRecipe ? (
          // User-created recipe actions
          <>
            <GradientButton
              label="Edit Recipe"
              onPress={handleEditRecipe}
              colors={GradientPresets.brand}
              icon="create-outline"
              style={{ marginBottom: 8 }}
            />
            <GradientButton
              label="Delete Recipe"
              onPress={handleDeleteRecipe}
              colors={GradientPresets.danger}
              icon="trash-outline"
            />
          </>
        ) : source === 'cookbook' ? (
          // System recipe actions (in cookbook context)
          <>
            <GradientButton
              label={isForking ? 'Saving...' : 'Save My Version'}
              onPress={handleSaveMyVersion}
              disabled={isForking}
              loading={isForking}
              colors={GradientPresets.brand}
              icon="create-outline"
              style={{ marginBottom: 8 }}
            />
            <GradientButton
              label="Remove from Cookbook"
              onPress={handleRemoveFromCookbook}
              colors={GradientPresets.danger}
              icon="bookmark-outline"
              style={{ marginBottom: 8 }}
            />
            <GradientButton
              label="Share Recipe"
              onPress={handleShareRecipe}
              colors={GradientPresets.info}
              icon="share-outline"
              style={{ marginBottom: 8 }}
            />
            <GradientButton
              label="Add to Meal Plan"
              onPress={handleAddToMealPlan}
              colors={GradientPresets.fresh}
              icon="calendar-outline"
            />
          </>
        ) : source === 'random' ? (
          // System recipe actions (from random button)
          <>
            <GradientButton
              label={isSaving ? 'Saving...' : 'Save to Cookbook'}
              onPress={handleSaveRecipe}
              disabled={isSaving}
              loading={isSaving}
              colors={GradientPresets.brand}
              icon="bookmark"
              style={{ marginBottom: 8 }}
            />
            <GradientButton
              label="Not Interested"
              onPress={handleNotInterested}
              colors={GradientPresets.danger}
              icon="close-circle-outline"
              style={{ marginBottom: 8 }}
            />
            <GradientButton
              label="Share Recipe"
              onPress={handleShareRecipe}
              colors={GradientPresets.info}
              icon="share-outline"
              style={{ marginBottom: 8 }}
            />
            <GradientButton
              label="Add to Meal Plan"
              onPress={handleAddToMealPlan}
              colors={GradientPresets.fresh}
              icon="calendar-outline"
            />
          </>
        ) : (
          // System recipe actions (from home screen)
          <>
            <GradientButton
              label={isSaving ? 'Saving...' : 'Save to Cookbook'}
              onPress={handleSaveRecipe}
              disabled={isSaving}
              loading={isSaving}
              colors={GradientPresets.brand}
              icon="bookmark"
              style={{ marginBottom: 8 }}
            />
            <GradientButton
              label="Not Interested"
              onPress={handleNotInterested}
              colors={GradientPresets.danger}
              icon="close-circle-outline"
            />
          </>
        )}
      </View>
    </SafeAreaView>
    
    {/* Collection Picker Modal */}
    <BottomSheet
      visible={pickerVisible}
      onClose={() => setPickerVisible(false)}
      title="Save to Collection"
      snapPoints={['50%', '70%']}
      scrollable
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
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
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
          >
            <View style={{
              width: 22, height: 22, marginRight: 12, borderRadius: 6,
              borderWidth: 1.5,
              borderColor: selectedCollectionIds.includes(c.id) ? (isDark ? DarkColors.primary : Colors.primary) : (isDark ? '#4B5563' : '#D1D5DB'),
              backgroundColor: selectedCollectionIds.includes(c.id) ? (isDark ? DarkColors.primary : Colors.primary) : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {selectedCollectionIds.includes(c.id) && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
            <Text style={{ flex: 1, fontSize: 16, color: isDark ? DarkColors.text.primary : Colors.text.primary }}>{c.name}</Text>
          </HapticTouchableOpacity>
        ))}
        {creatingCollection ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <TextInput
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              placeholder="New collection name"
              style={{
                flex: 1, borderWidth: 1, borderColor: isDark ? '#4B5563' : '#D1D5DB',
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8,
                color: isDark ? DarkColors.text.primary : Colors.text.primary,
                backgroundColor: isDark ? '#1C1C1E' : '#F9FAFB',
              }}
              placeholderTextColor="#9CA3AF"
            />
            <GradientButton
              label="Create"
              onPress={handleCreateCollection}
              colors={GradientPresets.brand}
              style={{ paddingVertical: 0, minWidth: 70 }}
            />
          </View>
        ) : (
          <HapticTouchableOpacity onPress={() => setCreatingCollection(true)} style={{ paddingVertical: 14 }}>
            <Text style={{ color: isDark ? DarkColors.primary : Colors.primary, fontWeight: '600', fontSize: 15 }}>+ Create new collection</Text>
          </HapticTouchableOpacity>
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <HapticTouchableOpacity onPress={() => setPickerVisible(false)} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>Cancel</Text>
          </HapticTouchableOpacity>
          <GradientButton
            label="Save"
            onPress={handleConfirmPicker}
            style={{ paddingVertical: 10, paddingHorizontal: 16 }}
          />
        </View>
      </View>
    </BottomSheet>

      {/* Healthify Results Modal */}
      <Modal
        visible={showHealthifyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHealthifyModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top']}>
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <HapticTouchableOpacity 
              onPress={() => setShowHealthifyModal(false)}
              className="p-2"
            >
              <Ionicons name="close" size={24} color={isDark ? "#E5E7EB" : "#374151"} />
            </HapticTouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Healthified Recipe</Text>
            <View className="w-8" />
          </View>

          {healthifiedRecipe && (
            <ScrollView className="flex-1">
              <View className="p-4">
                {/* Title */}
                <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {healthifiedRecipe.title}
                </Text>
                
                {/* Description */}
                <Text className="text-gray-600 dark:text-gray-300 mb-6">
                  {healthifiedRecipe.description}
                </Text>

                {/* Nutrition Comparison */}
                <View className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Nutrition Comparison</Text>
                  
                  {healthifiedRecipe.nutritionComparison && (
                    <View>
                      {/* Calories */}
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-gray-700 dark:text-gray-300 font-medium">Calories</Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 dark:text-gray-400 mr-2">{healthifiedRecipe.nutritionComparison.before.calories}</Text>
                          <Ionicons name="arrow-forward" size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                          <Text className="text-green-600 dark:text-green-400 font-semibold ml-2">{healthifiedRecipe.nutritionComparison.after.calories}</Text>
                        </View>
                      </View>
                      
                      {/* Protein */}
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-gray-700 dark:text-gray-300 font-medium">Protein</Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 dark:text-gray-400 mr-2">{healthifiedRecipe.nutritionComparison.before.protein}g</Text>
                          <Ionicons name="arrow-forward" size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                          <Text className="text-green-600 dark:text-green-400 font-semibold ml-2">{healthifiedRecipe.nutritionComparison.after.protein}g</Text>
                        </View>
                      </View>
                      
                      {/* Carbs */}
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-gray-700 dark:text-gray-300 font-medium">Carbs</Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 dark:text-gray-400 mr-2">{healthifiedRecipe.nutritionComparison.before.carbs}g</Text>
                          <Ionicons name="arrow-forward" size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                          <Text className="text-green-600 dark:text-green-400 font-semibold ml-2">{healthifiedRecipe.nutritionComparison.after.carbs}g</Text>
                        </View>
                      </View>
                      
                      {/* Fat */}
                      <View className="flex-row justify-between items-center">
                        <Text className="text-gray-700 dark:text-gray-300 font-medium">Fat</Text>
                        <View className="flex-row items-center">
                          <Text className="text-gray-500 dark:text-gray-400 mr-2">{healthifiedRecipe.nutritionComparison.before.fat}g</Text>
                          <Ionicons name="arrow-forward" size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                          <Text className="text-green-600 dark:text-green-400 font-semibold ml-2">{healthifiedRecipe.nutritionComparison.after.fat}g</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Substitutions */}
                {healthifiedRecipe.substitutions && healthifiedRecipe.substitutions.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Smart Substitutions</Text>
                    {healthifiedRecipe.substitutions.map((sub: any, index: number) => (
                      <View key={index} className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
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
                    {healthifiedRecipe.improvements.map((improvement: any, index: number) => (
                      <View key={index} className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
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
                  {healthifiedRecipe.ingredients && healthifiedRecipe.ingredients.map((ingredient: any, index: number) => (
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
                  {healthifiedRecipe.instructions && healthifiedRecipe.instructions.map((instruction: any, index: number) => (
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
            <GradientButton
              label="Save Healthified Recipe"
              onPress={async () => {
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
                  Alert.alert('Oops!', error.message || 'Couldn\'t save the recipe — try again?');
                }
              }}
              colors={GradientPresets.fresh}
              icon="leaf"
              style={{ marginBottom: 8 }}
            />
            
            <HapticTouchableOpacity 
              onPress={() => setShowHealthifyModal(false)}
          className="border border-gray-300 py-3 px-6 rounded-lg items-center"
        >
              <Text className="text-gray-700 dark:text-gray-300 font-semibold text-lg">Close</Text>
            </HapticTouchableOpacity>
      </View>
    </SafeAreaView>
      </Modal>

      {/* Meal Prep Scaling Modal */}
      <MealPrepScalingModal
        visible={showMealPrepModal}
        recipe={recipe}
        onClose={() => setShowMealPrepModal(false)}
        onConfirm={handleMealPrepScaling}
      />

      {/* 10E: Ingredient Swap Sheet */}
      <IngredientSwapSheet
        visible={swapSheetVisible}
        ingredient={swapIngredient}
        isDark={isDark}
        onClose={() => setSwapSheetVisible(false)}
        onSelectSwap={handleSelectSwap}
      />

      {/* Recipe Notes Modal */}
      {source === 'cookbook' && recipe && (
        <RecipeNotesModal
          visible={notesModalVisible}
          onClose={() => setNotesModalVisible(false)}
          recipeTitle={recipe.title}
          initialNotes={savedNotes}
          onSave={async (notes) => {
            setSavedNotes(notes);
            setNotesModalVisible(false);
            recipeApi.updateSavedMeta(recipe.id, { notes }).catch(() => {});
          }}
        />
      )}
    </Animated.View>
    </>
  );
}