import { View, Text, ScrollView, Alert, Modal, Linking, TextInput, Animated } from 'react-native';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
import AnimatedRefreshControl from '../../components/ui/AnimatedRefreshControl';
import RecipeCardSkeleton from '../../components/recipe/RecipeCardSkeleton';
import AnimatedRecipeCard from '../../components/recipe/AnimatedRecipeCard';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import CardStack from '../../components/ui/CardStack';
import { Image } from 'expo-image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useApi } from '../../hooks/useApi';
import { recipeApi, aiRecipeApi, collectionsApi } from '../../lib/api';
import { filterStorage, type FilterState } from '../../lib/filterStorage';
import type { SuggestedRecipe } from '../../types';
import * as Haptics from 'expo-haptics';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { AnimatedSazon } from '../../components/mascot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../contexts/ToastContext';
import HelpTooltip from '../../components/ui/HelpTooltip';

// Track user feedback state
interface UserFeedback {
  liked: boolean;
  disliked: boolean;
}

// Filter types are now imported from filterStorage

const CUISINE_OPTIONS = [
  'Mediterranean', 'Asian', 'Mexican', 'Italian', 'American', 
  'Indian', 'Thai', 'French', 'Japanese', 'Chinese'
];

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
  'Keto', 'Paleo', 'Low-Carb', 'High-Protein'
];

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

// Filter Modal Component with Animation
function FilterModal({
  visible,
  onClose,
  onApply,
  filters,
  onFilterChange,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  filters: FilterState;
  onFilterChange: (type: keyof FilterState, value: any) => void;
}) {
  const translateY = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(-300);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
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
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -300,
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
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        className="flex-1 bg-black/50"
        style={{ opacity }}
      >
        <Animated.View
          className="flex-1 bg-gray-50 dark:bg-gray-900"
          style={{
            transform: [{ translateY }],
          }}
        >
          <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            {/* Modal Header */}
            <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between" style={{ minHeight: 60 }}>
              <HapticTouchableOpacity 
                onPress={onClose}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text className="text-blue-500 dark:text-blue-400 font-medium">Cancel</Text>
              </HapticTouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter Recipes</Text>
              <HapticTouchableOpacity 
                onPress={onApply}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text className="text-blue-500 dark:text-blue-400 font-medium">Apply</Text>
              </HapticTouchableOpacity>
            </View>

            <ScrollView 
              className="flex-1 px-4 py-4"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Cuisine Filter */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Cuisine</Text>
                <View className="flex-row flex-wrap">
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <HapticTouchableOpacity
                      key={cuisine}
                      onPress={() => onFilterChange('cuisines', cuisine)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        filters.cuisines.includes(cuisine)
                          ? 'bg-orange-500 dark:bg-orange-600 border-orange-500 dark:border-orange-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        filters.cuisines.includes(cuisine) ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {cuisine}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dietary Restrictions Filter */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Dietary</Text>
                <View className="flex-row flex-wrap">
                  {DIETARY_OPTIONS.map((dietary) => (
                    <HapticTouchableOpacity
                      key={dietary}
                      onPress={() => onFilterChange('dietaryRestrictions', dietary)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        filters.dietaryRestrictions.includes(dietary)
                          ? 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        filters.dietaryRestrictions.includes(dietary) ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {dietary}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Cook Time Filter */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Max Cook Time</Text>
                <View className="flex-row flex-wrap">
                  {[15, 30, 45, 60, 90].map((time) => (
                    <HapticTouchableOpacity
                      key={time}
                      onPress={() => onFilterChange('maxCookTime', time)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        filters.maxCookTime === time
                          ? 'bg-blue-500 dark:bg-blue-600 border-blue-500 dark:border-blue-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        filters.maxCookTime === time ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        ≤{time} min
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Difficulty Filter */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Difficulty</Text>
                <View className="flex-row flex-wrap">
                  {DIFFICULTY_OPTIONS.map((difficulty) => (
                    <HapticTouchableOpacity
                      key={difficulty}
                      onPress={() => onFilterChange('difficulty', difficulty)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        filters.difficulty.includes(difficulty)
                          ? 'bg-purple-500 dark:bg-purple-600 border-purple-500 dark:border-purple-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${
                        filters.difficulty.includes(difficulty) ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {difficulty}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filter Guidance - Show when many filters are selected */}
              {(() => {
                const totalFilters = filters.cuisines.length + filters.dietaryRestrictions.length + 
                                   (filters.maxCookTime ? 1 : 0) + filters.difficulty.length;
                const isRestrictive = totalFilters >= 5;
                
                if (isRestrictive) {
                  return (
                    <View className="mt-4 mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <View className="flex-row items-start">
                        <View className="mr-3">
                          <AnimatedSazon 
                            expression="thinking" 
                            size="small" 
                            variant="orange"
                            animationType="idle"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-orange-900 dark:text-orange-200 font-semibold mb-1">
                            Many filters selected
                          </Text>
                          <Text className="text-orange-700 dark:text-orange-300 text-sm">
                            You've selected {totalFilters} filter{totalFilters !== 1 ? 's' : ''}. This might limit your recipe options. Consider removing some filters to see more suggestions!
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }
                return null;
              })()}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [reloadLoading, setReloadLoading] = useState(false);
  
  // Animation for random recipe button
  const randomButtonScale = useRef(new Animated.Value(1)).current;
  const randomButtonOpacity = useRef(new Animated.Value(1)).current;
  
  // Animation for recipe cards
  const cardAnimations = useRef<Record<string, { scale: Animated.Value; opacity: Animated.Value }>>({}).current;
  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  const [animatedRecipeIds, setAnimatedRecipeIds] = useState<Set<string>>(new Set());
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<Record<string, UserFeedback>>({});
  const [reloadOffset, setReloadOffset] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>(filterStorage.getDefaultFilters());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  
  // Collections state for save to collection
  const [collections, setCollections] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [savePickerVisible, setSavePickerVisible] = useState(false);
  const [savePickerRecipeId, setSavePickerRecipeId] = useState<string | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // First-time user guidance
  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(false);

  // Track if we're loading from filters to prevent useApi from interfering
  const [loadingFromFilters, setLoadingFromFilters] = useState(false);

  // Use the useApi hook for fetching suggested recipes (only when no filters)
  const { data: recipesData, loading, error, refetch } = useApi('/recipes/suggested');

  // Load saved filters on component mount
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const savedFilters = await filterStorage.loadFilters();
        if (savedFilters) {
          setFilters(savedFilters);
          
          // Update active filters display
          const active: string[] = [];
          if (savedFilters.cuisines.length > 0) active.push(`${savedFilters.cuisines.length} cuisines`);
          if (savedFilters.dietaryRestrictions.length > 0) active.push(`${savedFilters.dietaryRestrictions.length} dietary`);
          if (savedFilters.maxCookTime) active.push(`≤${savedFilters.maxCookTime}min`);
          if (savedFilters.difficulty.length > 0) active.push(`${savedFilters.difficulty.length} difficulty`);
          
          setActiveFilters(active);
          
          // Apply saved filters to get filtered recipes
          if (active.length > 0) {
            setLoadingFromFilters(true); // Prevent useApi from loading
            const response = await recipeApi.getSuggestedRecipes({
              cuisines: savedFilters.cuisines.length > 0 ? savedFilters.cuisines : undefined,
              dietaryRestrictions: savedFilters.dietaryRestrictions.length > 0 ? savedFilters.dietaryRestrictions : undefined,
              maxCookTime: savedFilters.maxCookTime || undefined,
              difficulty: savedFilters.difficulty.length > 0 ? savedFilters.difficulty : undefined
            });
            
            const deduplicated = deduplicateRecipes(response.data);
            console.log('📱 HomeScreen: Loaded filtered recipes', deduplicated.length);
            setSuggestedRecipes(deduplicated);
            setInitialRecipesLoaded(true); // Mark as loaded
            
            // Initialize feedback state
            const initialFeedback: Record<string, UserFeedback> = {};
            deduplicated.forEach((recipe: SuggestedRecipe) => {
              initialFeedback[recipe.id] = { liked: false, disliked: false };
            });
            setUserFeedback(initialFeedback);
            setLoadingFromFilters(false);
          }
        }
        setFiltersLoaded(true);
      } catch (error) {
        console.error('❌ Error loading saved filters:', error);
        setFiltersLoaded(true);
        setLoadingFromFilters(false);
      }
    };

    loadSavedFilters();
  }, []);

  // Helper function to deduplicate recipes by ID
  const deduplicateRecipes = (recipes: SuggestedRecipe[]): SuggestedRecipe[] => {
    const seen = new Set<string>();
    return recipes.filter(recipe => {
      if (!recipe || !recipe.id) {
        console.warn('⚠️ Found recipe without ID:', recipe);
        return false;
      }
      if (seen.has(recipe.id)) {
        console.warn('⚠️ Duplicate recipe found:', recipe.id, recipe.title);
        return false;
      }
      seen.add(recipe.id);
      return true;
    });
  };

  // Track if we've loaded initial recipes to prevent duplicate loading
  const [initialRecipesLoaded, setInitialRecipesLoaded] = useState(false);

  // Update local state when API data loads (only if no saved filters)
  useEffect(() => {
    // Only load from useApi hook if:
    // 1. We have recipe data
    // 2. Filters are loaded
    // 3. No active filters (filters would load recipes separately)
    // 4. We haven't already loaded initial recipes (prevents duplicates on refresh)
    // 5. We're not currently loading from filters (prevents race condition)
    if (recipesData && filtersLoaded && activeFilters.length === 0 && !initialRecipesLoaded && !loadingFromFilters) {
      console.log('📱 HomeScreen: Received recipes data', recipesData.length);
      const deduplicated = deduplicateRecipes(recipesData);
      console.log('📱 HomeScreen: After deduplication', deduplicated.length);
      
      if (deduplicated.length > 0) {
        setSuggestedRecipes(deduplicated);
        setInitialRecipesLoaded(true);
        // Reset animated IDs when new recipes load
        setAnimatedRecipeIds(new Set());
      
      // Initialize feedback state
      const initialFeedback: Record<string, UserFeedback> = {};
        deduplicated.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
        
        // Preload images for the next few recipes (improves perceived performance)
        deduplicated.slice(0, 5).forEach((recipe: SuggestedRecipe) => {
          if (recipe.imageUrl) {
            Image.prefetch(recipe.imageUrl).catch(() => {
              // Silently fail - prefetch is just an optimization
            });
          }
        });
      }
    }
  }, [recipesData, filtersLoaded, activeFilters, loadingFromFilters, initialRecipesLoaded]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('📱 HomeScreen: API Error', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    }
  }, [error]);

  // Welcome back notification - check if user has been away for more than 24 hours
  useFocusEffect(
    useCallback(() => {
      const checkWelcomeBack = async () => {
        try {
          const LAST_VISIT_KEY = '@sazon_last_visit';
          const lastVisitStr = await AsyncStorage.getItem(LAST_VISIT_KEY);
          const now = Date.now();
          
          if (lastVisitStr) {
            const lastVisit = parseInt(lastVisitStr, 10);
            const hoursSinceLastVisit = (now - lastVisit) / (1000 * 60 * 60);
            
            // Show welcome back if user has been away for more than 24 hours
            if (hoursSinceLastVisit >= 24) {
              const daysSinceLastVisit = Math.floor(hoursSinceLastVisit / 24);
              let message = "Welcome back! Ready to cook something amazing?";
              
              if (daysSinceLastVisit === 1) {
                message = "Welcome back! It's been a day - let's find you some great recipes!";
              } else if (daysSinceLastVisit > 1) {
                message = `Welcome back! It's been ${daysSinceLastVisit} days - we've missed you!`;
              }
              
              showToast(message, 'info', 4000);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
          
          // Update last visit time
          await AsyncStorage.setItem(LAST_VISIT_KEY, now.toString());
        } catch (error) {
          console.error('Error checking welcome back:', error);
        }
      };
      
      checkWelcomeBack();
    }, [showToast])
  );

  // Check if first-time user and show guidance tooltip
  useFocusEffect(
    useCallback(() => {
      const checkFirstTime = async () => {
        try {
          const HAS_SEEN_HOME_GUIDANCE_KEY = '@sazon_has_seen_home_guidance';
          const hasSeen = await AsyncStorage.getItem(HAS_SEEN_HOME_GUIDANCE_KEY);
          
          // Only show if user hasn't seen it before and we have recipes loaded
          if (!hasSeen && suggestedRecipes.length > 0 && !loading) {
            // Small delay to ensure UI is ready
            setTimeout(() => {
              setShowFirstTimeTooltip(true);
            }, 1000);
          }
        } catch (error) {
          console.error('Error checking first-time guidance:', error);
        }
      };
      
      checkFirstTime();
    }, [suggestedRecipes.length, loading])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setInitialRecipesLoaded(false); // Reset flag to allow reloading
    await refetch();
    setRefreshing(false);
  };

  const handleReload = async () => {
    setReloadLoading(true);
    try {
      // Increment offset to get different recipes (rotate through batches)
      const newOffset = (reloadOffset + 1) % 10; // Cycle through 10 batches
      setReloadOffset(newOffset);
      
      // Fetch fresh recipe suggestions with offset for variety
      const response = await recipeApi.getSuggestedRecipes({
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty : undefined,
        offset: newOffset
      });
      
      const deduplicated = deduplicateRecipes(response.data);
      setSuggestedRecipes(deduplicated);
      
      // Initialize feedback state
      const initialFeedback: Record<string, UserFeedback> = {};
      deduplicated.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
      
      // Preload images for the next few recipes (improves perceived performance)
      deduplicated.slice(0, 5).forEach((recipe: SuggestedRecipe) => {
        if (recipe.imageUrl) {
          Image.prefetch(recipe.imageUrl).catch(() => {
            // Silently fail - prefetch is just an optimization
          });
        }
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Error reloading recipes:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setReloadLoading(false);
    }
  };

  const handleRecipePress = (recipeId: string) => {
    console.log('📱 HomeScreen: Recipe pressed', recipeId);
    
    // Initialize animation for this card if not exists
    if (!cardAnimations[recipeId]) {
      cardAnimations[recipeId] = {
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
      };
    }
    
    const anim = cardAnimations[recipeId];
    
    // Animate card press - scale down slightly
    Animated.parallel([
      Animated.timing(anim.scale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim.opacity, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to modal
    router.push(`../modal?id=${recipeId}`);
      
      // Reset animation after navigation
      setTimeout(() => {
        anim.scale.setValue(1);
        anim.opacity.setValue(1);
      }, 300);
    });
  };

  const openSavePicker = async (recipeId: string) => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Array<{ id: string; name: string; isDefault?: boolean }>;
      setCollections(cols);
      setSavePickerRecipeId(recipeId);
      setSelectedCollectionIds([]);
      setSavePickerVisible(true);
    } catch (e) {
      console.log('⚠️  Failed to load collections');
    }
  };

  const handleSaveToCollections = async () => {
    if (!savePickerRecipeId) return;
    
    try {
      // Save to cookbook with selected collections (multi-collection support)
      await recipeApi.saveRecipe(savePickerRecipeId, selectedCollectionIds.length > 0 ? { collectionIds: selectedCollectionIds } : undefined);
      
      setSavePickerVisible(false);
      setSavePickerRecipeId(null);
      setSelectedCollectionIds([]);
      Alert.alert('Saved', 'Recipe saved to cookbook!');
    } catch (error: any) {
      if (error.code === 'HTTP_409' || /already\s*saved/i.test(error.message)) {
        // Already saved, try to move to collections
        if (selectedCollectionIds.length > 0) {
          try {
            await collectionsApi.moveSavedRecipe(savePickerRecipeId, selectedCollectionIds);
            Alert.alert('Moved', 'Recipe moved to collections!');
          } catch (e) {
            Alert.alert('Already Saved', 'This recipe is already in your cookbook!');
          }
        } else {
          Alert.alert('Already Saved', 'This recipe is already in your cookbook!');
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', error.message || 'Failed to save recipe');
      }
      setSavePickerVisible(false);
      setSavePickerRecipeId(null);
      setSelectedCollectionIds([]);
    }
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', e?.message || 'Failed to create collection');
    }
  };

  const handleRandomRecipe = async () => {
    try {
      console.log('🤖 HomeScreen: Generating AI recipe with filters:', filters);
      
      // Animate button press - scale down then expand with fade
      Animated.sequence([
        Animated.parallel([
          Animated.timing(randomButtonScale, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(randomButtonOpacity, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(randomButtonScale, {
            toValue: 1.1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(randomButtonOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(randomButtonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Show loading indicator with estimated time
      Alert.alert(
        '🤖 Generating Recipe...',
        'Creating a personalized recipe for you (10-15 seconds)',
        [],
        { cancelable: false }
      );
      
      // Pass active filters to AI generation for more targeted recipes
      const params: any = {};
      
      // If user has filtered to specific cuisines, pick one randomly from the filtered list
      if (filters.cuisines.length > 0) {
        const randomCuisine = filters.cuisines[Math.floor(Math.random() * filters.cuisines.length)];
        params.cuisine = randomCuisine;
        console.log('🎲 Using filtered cuisine:', randomCuisine);
      }
      
      // If user has filtered by max cook time, respect that
      if (filters.maxCookTime) {
        params.maxCookTime = filters.maxCookTime;
        console.log('⏱️ Respecting max cook time:', filters.maxCookTime);
      }
      
      // Note: Dietary restrictions are handled by the backend via saved user preferences
      // The AI will automatically respect the user's dietary restrictions from onboarding
      
      const response = await aiRecipeApi.generateRecipe(params);
      const aiRecipe = response.data.recipe;
      
      console.log('✅ HomeScreen: AI recipe generated', aiRecipe.title);
      
      // Success haptic feedback to let user know it's ready
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-navigate after 2 seconds (no need to click OK)
      setTimeout(() => {
        router.push(`../modal?id=${aiRecipe.id}`);
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ HomeScreen: Error generating AI recipe', error);
      
      // Check if it's a quota/billing error
      const isQuotaError = error.code === 'insufficient_quota' || 
                          error.message?.includes('quota') || 
                          error.message?.includes('429');
      
      // Fallback to existing random recipe from database if AI fails
      if (isQuotaError) {
        try {
          console.log('🔄 Falling back to random recipe from database...');
          const fallbackResponse = await recipeApi.getRandomRecipe();
          const fallbackRecipe = fallbackResponse.data;
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Show info alert and navigate to the recipe
          Alert.alert(
            'Using Existing Recipe',
            'AI generation is temporarily unavailable. Here\'s a great recipe from our collection!',
            [],
            { cancelable: false }
          );
          
          setTimeout(() => {
            router.push(`../modal?id=${fallbackRecipe.id}`);
          }, 1500);
          
          return; // Exit early, we got a fallback recipe
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError);
          // Continue to show error below
        }
      }
      
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR';
      const message = isQuotaError
        ? 'AI recipe generation is temporarily unavailable due to quota limits. Try again later or browse our existing recipes!'
        : isTimeout 
        ? 'The recipe took too long to generate. This is usually temporary - try again!' 
        : 'Unable to generate a recipe right now. Please check your connection and try again.';
      
      Alert.alert(
        'Generation Failed',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleRandomRecipe() },
          // Add option to browse existing recipes
          { text: 'Browse Recipes', onPress: () => {
            // Refresh suggestions to show existing recipes
            onRefresh();
          }}
        ]
      );
    }
  };

  // Filter functions
  const handleFilterPress = () => {
    setShowFilterModal(true);
  };

  const handleFilterChange = (type: keyof FilterState, value: string | number) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (type === 'maxCookTime') {
        newFilters.maxCookTime = value as number;
      } else {
        const arrayType = type as 'cuisines' | 'dietaryRestrictions' | 'difficulty';
        const currentArray = newFilters[arrayType];
        const valueStr = value as string;
        
        if (currentArray.includes(valueStr)) {
          newFilters[arrayType] = currentArray.filter(item => item !== valueStr);
        } else {
          newFilters[arrayType] = [...currentArray, valueStr];
        }
      }
      
      return newFilters;
    });
  };

  const applyFilters = async () => {
    // Update active filters display
    const active: string[] = [];
    if (filters.cuisines.length > 0) active.push(`${filters.cuisines.length} cuisines`);
    if (filters.dietaryRestrictions.length > 0) active.push(`${filters.dietaryRestrictions.length} dietary`);
    if (filters.maxCookTime) active.push(`≤${filters.maxCookTime}min`);
    if (filters.difficulty.length > 0) active.push(`${filters.difficulty.length} difficulty`);
    
    setActiveFilters(active);
    setShowFilterModal(false);
    
    // Save filters to storage
    try {
      await filterStorage.saveFilters(filters);
      console.log('💾 Filters saved to storage');
    } catch (error) {
      console.error('❌ Error saving filters:', error);
    }
    
    // Apply filters to API call
    console.log('🔍 Filters applied:', filters);
    
    try {
      // Convert filters to API format
      const apiFilters = {
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty : undefined
      };
      
      const response = await recipeApi.getSuggestedRecipes(apiFilters);
      const deduplicated = deduplicateRecipes(response.data);
      setSuggestedRecipes(deduplicated);
      
      // Initialize feedback state for new recipes
      const initialFeedback: Record<string, UserFeedback> = {};
      deduplicated.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
      
      console.log('✅ Filtered recipes loaded:', deduplicated.length);
    } catch (error: any) {
      console.error('❌ Error applying filters:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to apply filters. Please try again.');
    }
  };

  const clearFilters = async () => {
    const defaultFilters = filterStorage.getDefaultFilters();
    setFilters(defaultFilters);
    setActiveFilters([]);
    
    // Clear filters from storage
    try {
      await filterStorage.clearFilters();
      console.log('🗑️ Filters cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing filters from storage:', error);
    }
    
    // Reload original recipes without filters
    try {
      const response = await recipeApi.getSuggestedRecipes();
      const deduplicated = deduplicateRecipes(response.data);
      setSuggestedRecipes(deduplicated);
      
      // Initialize feedback state for new recipes
      const initialFeedback: Record<string, UserFeedback> = {};
      deduplicated.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
      
      console.log('✅ Filters cleared, original recipes loaded:', deduplicated.length);
    } catch (error: any) {
      console.error('❌ Error clearing filters:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to clear filters. Please try again.');
    }
  };

  const handleLike = async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);
      console.log('📱 HomeScreen: Liking recipe', recipeId);
      
      // Update UI immediately
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: true, disliked: false }
      }));
      
      await recipeApi.likeRecipe(recipeId);
      
      // Update local state to reflect the like
      setSuggestedRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, score: { ...recipe.score, total: recipe.score.total + 5 } }
          : recipe
      ));
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Liked!', 'We\'ll show you more recipes like this');
    } catch (error: any) {
      console.error('📱 HomeScreen: Like error', error);
      
      // Error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Revert UI state on error
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: false }
      }));
      
      Alert.alert('Error', 'Failed to like recipe');
    } finally {
      setFeedbackLoading(null);
    }
  };

  const handleDislike = async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);
      console.log('📱 HomeScreen: Disliking recipe', recipeId);
      
      // Update UI immediately
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: true }
      }));
      
      await recipeApi.dislikeRecipe(recipeId);
      
      // Update local state to reflect the dislike
      setSuggestedRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, score: { ...recipe.score, total: Math.max(0, recipe.score.total - 5) } }
          : recipe
      ));
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Noted', 'We\'ll show fewer recipes like this');
    } catch (error: any) {
      console.error('📱 HomeScreen: Dislike error', error);
      
      // Error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Revert UI state on error
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: false }
      }));
      
      Alert.alert('Error', 'Failed to dislike recipe');
    } finally {
      setFeedbackLoading(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Truncate description to approximately 2-3 lines (100-120 characters)
  const truncateDescription = (text: string, maxLength: number = 120): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const getRecipePlaceholder = (cuisine: string) => {
    const placeholders: Record<string, { icon: string; color: string; bg: string }> = {
      'Mediterranean': { icon: 'fish-outline', color: '#3B82F6', bg: '#DBEAFE' },
      'Asian': { icon: 'restaurant-outline', color: '#EF4444', bg: '#FEE2E2' },
      'Mexican': { icon: 'flame-outline', color: '#F59E0B', bg: '#FEF3C7' },
      'Italian': { icon: 'pizza-outline', color: '#10B981', bg: '#D1FAE5' },
      'American': { icon: 'fast-food-outline', color: '#6366F1', bg: '#E0E7FF' },
      'Indian': { icon: 'restaurant-outline', color: '#F97316', bg: '#FFEDD5' },
      'Thai': { icon: 'leaf-outline', color: '#14B8A6', bg: '#CCFBF1' },
      'French': { icon: 'wine-outline', color: '#8B5CF6', bg: '#EDE9FE' },
      'Japanese': { icon: 'fish-outline', color: '#EC4899', bg: '#FCE7F3' },
      'Chinese': { icon: 'restaurant-outline', color: '#DC2626', bg: '#FEE2E2' },
    };

    return placeholders[cuisine] || { icon: 'restaurant-outline', color: '#9CA3AF', bg: '#F3F4F6' };
  };

  // Loading state with skeleton loaders
  if (loading && suggestedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-center">
            <AnimatedSazon 
              expression="happy" 
              size="small" 
              variant="orange"
              animationType="pulse"
              style={{ marginRight: 8 }}
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sazon Chef</Text>
          </View>
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Show 3 skeleton cards */}
          {[1, 2, 3].map((i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && suggestedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-center">
            <AnimatedSazon 
              expression="supportive" 
              size="small" 
              variant="orange"
              animationType="idle"
              style={{ marginRight: 8 }}
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sazon Chef</Text>
          </View>
        </View>
        <AnimatedEmptyState
          useMascot
          mascotExpression="supportive"
          mascotSize="large"
          title="Failed to load recipes"
          description={error}
          actionLabel="Try Again"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  // Empty state
  if (suggestedRecipes.length === 0 && !loading) {
    const hasActiveFilters = activeFilters.length > 0;
    const emptyStateTitle = hasActiveFilters 
      ? "No recipes match your filters" 
      : "No recipes found";
    const emptyStateDescription = hasActiveFilters
      ? "Try adjusting your filters or preferences to see more recipes"
      : "We couldn't find any recipes to suggest at the moment";
    const emptyStateExpression = hasActiveFilters ? 'thinking' : 'curious';
    
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-center">
            <AnimatedSazon 
              expression={emptyStateExpression} 
              size="small" 
              variant="orange"
              animationType="idle"
              style={{ marginRight: 8 }}
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sazon Chef</Text>
          </View>
        </View>
        <AnimatedEmptyState
          useMascot
          mascotExpression={emptyStateExpression}
          mascotSize="large"
          title={emptyStateTitle}
          description={emptyStateDescription}
          actionLabel={hasActiveFilters ? "Clear Filters" : "Refresh"}
          onAction={hasActiveFilters ? () => {
            setFilters(filterStorage.getDefaultFilters());
            setActiveFilters([]);
            filterStorage.saveFilters(filterStorage.getDefaultFilters());
          } : refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header - Fixed height */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <AnimatedSazon 
              expression="happy" 
              size="small" 
              variant="orange"
              animationType="idle"
              style={{ marginRight: 8 }}
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sazon Chef</Text>
          </View>
          <View className="flex-row items-center">
            <HapticTouchableOpacity
              onPress={handleReload}
              activeOpacity={1}
              className="bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded-lg flex-row items-center border border-gray-300 dark:border-gray-600 mr-2"
              style={{ opacity: 1 }}
            >
              {reloadLoading ? (
                <AnimatedActivityIndicator size="small" color={colorScheme === 'dark' ? '#D1D5DB' : '#6B7280'} style={{ marginRight: 4 }} />
              ) : (
                <Icon name={Icons.RELOAD} size={IconSizes.XS} color={colorScheme === 'dark' ? '#D1D5DB' : '#6B7280'} accessibilityLabel="Reload recipes" style={{ marginRight: 3 }} />
              )}
              <Text className="text-gray-700 dark:text-gray-100 text-sm font-semibold">
                {reloadLoading ? 'Loading...' : 'Reload'}
              </Text>
            </HapticTouchableOpacity>
            <Animated.View
              style={{
                transform: [{ scale: randomButtonScale }],
                opacity: randomButtonOpacity,
              }}
            >
              <HapticTouchableOpacity
                onPress={handleRandomRecipe}
                hapticStyle="medium"
                className="bg-orange-500 dark:bg-orange-600 px-3 py-1.5 rounded-lg flex-row items-center"
              >
                <Icon name={Icons.RANDOM_RECIPE} size={IconSizes.XS} color="white" accessibilityLabel="Random recipe" />
                <Text className="text-white text-sm font-semibold ml-1.5">Random</Text>
              </HapticTouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Filter Chips */}
      <View className="bg-white dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</Text>
          <HapticTouchableOpacity 
            onPress={handleFilterPress}
            className="flex-row items-center"
          >
            <Icon name={Icons.RECIPE_FILTER} size={IconSizes.SM} color="#6B7280" accessibilityLabel="Filter recipes" />
            <Text className="text-sm text-gray-600 dark:text-gray-200 ml-1">Filter</Text>
          </HapticTouchableOpacity>
        </View>
        
        {activeFilters.length > 0 ? (
          <View className="flex-row items-center">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="flex-1 mr-2"
              contentContainerStyle={{ paddingRight: 8 }}
            >
              <View className="flex-row items-center">
                {activeFilters.map((filter, index) => (
                  <View key={index} className="bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full mr-2">
                    <Text className="text-orange-800 dark:text-orange-300 text-xs font-medium">{filter}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <HapticTouchableOpacity 
              onPress={clearFilters}
              className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex-shrink-0"
            >
              <Text className="text-gray-600 dark:text-gray-100 text-xs font-medium">Clear All</Text>
            </HapticTouchableOpacity>
          </View>
        ) : (
          <Text className="text-gray-400 dark:text-gray-200 text-sm">No filters applied</Text>
        )}
      </View>

      {/* Main content area - FIXED SCROLLING ISSUE */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <AnimatedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Today's Recommendation */}
        <View className="px-4 mb-6 mt-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Today's Recommendation
          </Text>
          {suggestedRecipes.length > 0 && (() => {
            const recipe = suggestedRecipes[0];
            const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
            const isFeedbackLoading = feedbackLoading === recipe.id;
            
            // Initialize animation for this card if not exists
            if (!cardAnimations[recipe.id]) {
              cardAnimations[recipe.id] = {
                scale: new Animated.Value(1),
                opacity: new Animated.Value(1),
              };
            }
            const cardAnim = cardAnimations[recipe.id];
            
            return (
              <CardStack
                onSwipeRight={() => handleLike(recipe.id)}
                onSwipeLeft={() => handleDislike(recipe.id)}
              >
                <HapticTouchableOpacity
                onPress={() => handleRecipePress(recipe.id)}
                  className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                {/* Recipe Image with Unsplash Attribution */}
                {recipe.imageUrl && (
                  <View>
                    <Image 
                      source={{ uri: recipe.imageUrl }}
                      style={{ width: '100%', height: 160 }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                    />
                    {/* Unsplash Attribution Overlay - Link to photographer profile per Unsplash guidelines */}
                    {(recipe as any).unsplashPhotographerName && (
                      <HapticTouchableOpacity
                        onPress={() => {
                          const username = (recipe as any).unsplashPhotographerUsername;
                          if (username) {
                            const profileUrl = `https://unsplash.com/@${username}?utm_source=Sazon%20Chef&utm_medium=referral`;
                            Linking.openURL(profileUrl);
                          }
                        }}
                        className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded"
                      >
                        <Text className="text-white text-xs">
                          Photo by {(recipe as any).unsplashPhotographerName} on Unsplash
                        </Text>
                      </HapticTouchableOpacity>
                    )}
                  </View>
                )}
                
                <View className="p-4">
                <View className="flex-row justify-between items-start mb-2">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                    {recipe.title}
                  </Text>
                    <Text className={`text-base font-semibold ${getScoreColor(recipe.score?.total || 0)} ml-2`}>
                      {Math.round(recipe.score?.total || 0)}
                    </Text>
                </View>
                
                  <Text className="text-gray-600 dark:text-gray-100 text-sm mb-2" numberOfLines={2}>
                    {truncateDescription(recipe.description, 100)}
                </Text>

                <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center space-x-3">
                    <View className="flex-row items-center">
                        <Icon name={Icons.COOK_TIME} size={IconSizes.XS} color="#6B7280" accessibilityLabel="Cook time" />
                        <Text className="text-gray-500 dark:text-gray-200 text-xs ml-1">
                        {recipe.cookTime} min
                      </Text>
                    </View>
                      <View className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                        <Text className="text-orange-800 dark:text-orange-300 text-xs">
                        {recipe.cuisine}
                      </Text>
                    </View>
                  </View>

                    {/* Feedback Buttons and Save */}
                    <View className="flex-row">
                      {/* Save to Collection Button */}
                      <HapticTouchableOpacity
                        onPress={() => openSavePicker(recipe.id)}
                        className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mr-2"
                      >
                        <Icon 
                          name={Icons.SAVE_RECIPE} 
                          size={IconSizes.SM} 
                          color="#F97316" 
                          accessibilityLabel="Save recipe to collection"
                        />
                      </HapticTouchableOpacity>
                      
                    {/* Dislike Button */}
                      <HapticTouchableOpacity
                      onPress={() => handleDislike(recipe.id)}
                      disabled={isFeedbackLoading}
                        hapticDisabled={true}
                        className={`p-2 rounded-full mr-2 ${
                        feedback.disliked 
                            ? 'bg-red-500 dark:bg-red-600 border border-red-600 dark:border-red-700' 
                            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      } ${isFeedbackLoading ? 'opacity-50' : ''}`}
                    >
                        <Icon 
                          name={feedback.disliked ? Icons.DISLIKE : Icons.DISLIKE_OUTLINE} 
                          size={IconSizes.MD} 
                          color={feedback.disliked ? "#FFFFFF" : (colorScheme === 'dark' ? "#D1D5DB" : "#4B5563")} 
                          accessibilityLabel={feedback.disliked ? "Disliked" : "Dislike"}
                        />
                      </HapticTouchableOpacity>
                    
                    {/* Like Button */}
                      <HapticTouchableOpacity
                      onPress={() => handleLike(recipe.id)}
                      disabled={isFeedbackLoading}
                        hapticDisabled={true}
                      className={`p-2 rounded-full ${
                        feedback.liked 
                            ? 'bg-green-500 dark:bg-green-600 border border-green-600 dark:border-green-700' 
                            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      } ${isFeedbackLoading ? 'opacity-50' : ''}`}
                    >
                        <Icon 
                          name={feedback.liked ? Icons.LIKE : Icons.LIKE_OUTLINE} 
                          size={IconSizes.MD} 
                          color={feedback.liked ? "#FFFFFF" : (colorScheme === 'dark' ? "#D1D5DB" : "#4B5563")} 
                          accessibilityLabel={feedback.liked ? "Liked" : "Like"}
                        />
                      </HapticTouchableOpacity>
                  </View>
                </View>
                </View>
                </HapticTouchableOpacity>
              </CardStack>
            );
          })()}
        </View>

        {/* More Suggestions */}
        {suggestedRecipes.length > 1 && (
          <View className="px-4 pb-8">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              More Suggestions
            </Text>
            {suggestedRecipes.slice(1).map((recipe, index) => {
              const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
              const isFeedbackLoading = feedbackLoading === recipe.id;
              
              // Initialize animation for this card if not exists
              if (!cardAnimations[recipe.id]) {
                cardAnimations[recipe.id] = {
                  scale: new Animated.Value(1),
                  opacity: new Animated.Value(1),
                };
              }
              const cardAnim = cardAnimations[recipe.id];
              
              return (
                <AnimatedRecipeCard
                  key={recipe.id}
                  index={index}
                  recipeId={recipe.id}
                  animatedIds={animatedRecipeIds}
                  onAnimated={(id) => setAnimatedRecipeIds(prev => new Set(prev).add(id))}
                >
                <Animated.View
                  style={{
                    transform: [{ scale: cardAnim.scale }],
                  }}
                >
                  <HapticTouchableOpacity
                  onPress={() => handleRecipePress(recipe.id)}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                  {/* Recipe Image with Unsplash Attribution */}
                  {recipe.imageUrl && (
                    <View>
                      <Image 
                        source={{ uri: recipe.imageUrl }}
                        style={{ width: '100%', height: 160 }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                      />
                      {/* Unsplash Attribution Overlay - Link to photographer profile per Unsplash guidelines */}
                      {(recipe as any).unsplashPhotographerName && (
                        <HapticTouchableOpacity
                          onPress={() => {
                            const username = (recipe as any).unsplashPhotographerUsername;
                            if (username) {
                              const profileUrl = `https://unsplash.com/@${username}?utm_source=Sazon%20Chef&utm_medium=referral`;
                              Linking.openURL(profileUrl);
                            }
                          }}
                          className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded"
                        >
                          <Text className="text-white text-xs">
                            Photo by {(recipe as any).unsplashPhotographerName} on Unsplash
                          </Text>
                        </HapticTouchableOpacity>
                      )}
                    </View>
                  )}
                  
                  <View className="p-4">
                  <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                      {recipe.title}
                    </Text>
                    <Text className={`text-base font-semibold ${getScoreColor(recipe.score?.total || 0)} ml-2`}>
                        {Math.round(recipe.score?.total || 0)}
                    </Text>
                  </View>
                  
                    <Text className="text-gray-600 dark:text-gray-100 text-sm mb-2" numberOfLines={2}>
                      {truncateDescription(recipe.description, 100)}
                  </Text>

                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center space-x-3">
                      <View className="flex-row items-center">
                        <Icon name={Icons.COOK_TIME} size={IconSizes.XS} color="#6B7280" accessibilityLabel="Cook time" />
                        <Text className="text-gray-500 dark:text-gray-200 text-xs ml-1">
                          {recipe.cookTime} min
                        </Text>
                      </View>
                      <View className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                        <Text className="text-orange-800 dark:text-orange-300 text-xs">
                          {recipe.cuisine}
                        </Text>
                      </View>
                    </View>

                    {/* Feedback Buttons and Save */}
                    <View className="flex-row">
                      {/* Save to Collection Button */}
                      <HapticTouchableOpacity
                        onPress={() => openSavePicker(recipe.id)}
                        className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 mr-2"
                      >
                        <Icon 
                          name={Icons.SAVE_RECIPE} 
                          size={IconSizes.SM} 
                          color="#F97316" 
                          accessibilityLabel="Save recipe to collection"
                        />
                      </HapticTouchableOpacity>
                      
                      <HapticTouchableOpacity
                        onPress={() => handleDislike(recipe.id)}
                        disabled={isFeedbackLoading}
                        hapticDisabled={true}
                        className={`p-2 rounded-full mr-2 ${
                          feedback.disliked 
                            ? 'bg-red-500 dark:bg-red-600 border border-red-600 dark:border-red-700' 
                            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        } ${isFeedbackLoading ? 'opacity-50' : ''}`}
                      >
                        <Icon 
                          name={feedback.disliked ? Icons.DISLIKE : Icons.DISLIKE_OUTLINE} 
                          size={IconSizes.MD} 
                          color={feedback.disliked ? "#FFFFFF" : (colorScheme === 'dark' ? "#D1D5DB" : "#4B5563")} 
                          accessibilityLabel={feedback.disliked ? "Disliked" : "Dislike"}
                        />
                      </HapticTouchableOpacity>
                      <HapticTouchableOpacity
                        onPress={() => handleLike(recipe.id)}
                        disabled={isFeedbackLoading}
                        hapticDisabled={true}
                        className={`p-2 rounded-full ${
                          feedback.liked 
                            ? 'bg-green-500 dark:bg-green-600 border border-green-600 dark:border-green-700' 
                            : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        } ${isFeedbackLoading ? 'opacity-50' : ''}`}
                      >
                        <Icon 
                          name={feedback.liked ? Icons.LIKE : Icons.LIKE_OUTLINE} 
                          size={IconSizes.MD} 
                          color={feedback.liked ? "#FFFFFF" : (colorScheme === 'dark' ? "#D1D5DB" : "#4B5563")} 
                          accessibilityLabel={feedback.liked ? "Liked" : "Like"}
                        />
                      </HapticTouchableOpacity>
                    </View>
                  </View>
                    </View>
                </HapticTouchableOpacity>
                </Animated.View>
                </AnimatedRecipeCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={applyFilters}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Collection Save Picker Modal */}
      <Modal
        visible={savePickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSavePickerVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-2xl p-4 max-h-[70%]">
            <Text className="text-lg font-semibold mb-3 dark:text-gray-100">Save to Collection</Text>
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
                  className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700"
                >
                  <View className={`w-5 h-5 mr-3 rounded border ${selectedCollectionIds.includes(c.id) ? 'bg-orange-500 dark:bg-orange-600 border-orange-500 dark:border-orange-600' : 'border-gray-300 dark:border-gray-600'}`}>
                    {selectedCollectionIds.includes(c.id) && (
                      <Icon name={Icons.CHECKMARK} size={IconSizes.XS} color="white" accessibilityLabel="Selected" style={{ position: 'absolute', top: 1, left: 1 }} />
                    )}
                  </View>
                  <Text className="text-gray-900 dark:text-gray-100 flex-1">{c.name}</Text>
                </HapticTouchableOpacity>
              ))}
              {creatingCollection ? (
                <View className="flex-row items-center py-3">
                  <TextInput
                    value={newCollectionName}
                    onChangeText={setNewCollectionName}
                    placeholder="New collection name"
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mr-2 dark:bg-gray-700 dark:text-gray-100"
                    placeholderTextColor="#9CA3AF"
                  />
                  <HapticTouchableOpacity onPress={handleCreateCollection} className="bg-orange-500 dark:bg-orange-600 px-3 py-2 rounded-lg">
                    <Text className="text-white font-semibold">Create</Text>
                  </HapticTouchableOpacity>
                </View>
              ) : (
                <HapticTouchableOpacity onPress={() => setCreatingCollection(true)} className="py-3">
                  <Text className="text-orange-600 dark:text-orange-400 font-medium">+ Create new collection</Text>
                </HapticTouchableOpacity>
              )}
            </ScrollView>
            <View className="flex-row justify-end space-x-3">
              <HapticTouchableOpacity onPress={() => setSavePickerVisible(false)} className="px-4 py-3">
                <Text className="text-gray-700 dark:text-gray-100">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity onPress={handleSaveToCollections} className="bg-orange-500 dark:bg-orange-600 px-4 py-3 rounded-lg">
                <Text className="text-white font-semibold">Save</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* First-time user guidance tooltip */}
      <HelpTooltip
        visible={showFirstTimeTooltip}
        title="Welcome to Sazon Chef!"
        message={`Here's how to get started:

• Tap the filter button to customize your recipe preferences
• Swipe right or tap 👍 on recipes you like
• Swipe left or tap 👎 on recipes you don't like
• Tap any recipe card to see full details and save it to your cookbook
• Use the random recipe button to discover new favorites!

Your feedback helps us learn your tastes and suggest better recipes!`}
        type="guide"
        onDismiss={async () => {
          setShowFirstTimeTooltip(false);
          // Mark as seen
          await AsyncStorage.setItem('@sazon_has_seen_home_guidance', 'true');
        }}
      />
    </SafeAreaView>
  );
}