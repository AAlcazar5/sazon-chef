import { View, Text, ScrollView, Alert, Modal, Linking, TextInput, Animated, Switch, TouchableOpacity } from 'react-native';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
import AnimatedRefreshControl from '../../components/ui/AnimatedRefreshControl';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import RecipeCardSkeleton from '../../components/recipe/RecipeCardSkeleton';
import AnimatedRecipeCard from '../../components/recipe/AnimatedRecipeCard';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import CardStack from '../../components/ui/CardStack';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { useApi } from '../../hooks/useApi';
import { recipeApi, aiRecipeApi, collectionsApi, mealPlanApi } from '../../lib/api';
import { filterStorage, type FilterState } from '../../lib/filterStorage';
import type { SuggestedRecipe } from '../../types';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { AnimatedLogoMascot, LogoMascot } from '../../components/mascot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../contexts/ToastContext';
import HelpTooltip from '../../components/ui/HelpTooltip';
import { Colors, DarkColors, Gradients } from '../../constants/Colors';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';
import { Duration, Spring } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { HomeEmptyStates } from '../../constants/EmptyStates';
import { HomeLoadingStates } from '../../constants/LoadingStates';
import LoadingState from '../../components/ui/LoadingState';
import { buttonAccessibility, iconButtonAccessibility, inputAccessibility, switchAccessibility } from '../../utils/accessibility';
import { analytics } from '../../utils/analytics';
import { useAuth } from '../../contexts/AuthContext';
import SmartBadges from '../../components/recipe/SmartBadges';
import RecipeActionMenu from '../../components/recipe/RecipeActionMenu';
import RippleEffect from '../../components/ui/RippleEffect';
import { RecipeCard } from '../../components/recipe/RecipeCard';

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
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(-300);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: Spring.default.friction,
          tension: Spring.default.tension,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -300,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: Duration.normal,
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
          <SafeAreaView className="flex-1" edges={['bottom']}>
            {/* Modal Header */}
            <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between" style={{ minHeight: 60, paddingTop: insets.top }}>
              <HapticTouchableOpacity 
                onPress={onClose}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text className="font-medium" style={{ color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed }}>Cancel</Text>
              </HapticTouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter Recipes</Text>
              <HapticTouchableOpacity 
                onPress={onApply}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text className="font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>Apply</Text>
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
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={filters.cuisines.includes(cuisine) ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
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
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={filters.dietaryRestrictions.includes(dietary) ? {
                        backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                        borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen
                      } : undefined}
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
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={filters.maxCookTime === time ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
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
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={filters.difficulty.includes(difficulty) ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
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
                    <View className={`mt-4 mb-4 p-4 rounded-lg border ${isDark ? 'border-orange-800' : 'border-orange-200'}`} style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
                      <View className="flex-row items-start">
                        <View className="mr-3">
                          <AnimatedLogoMascot 
                            expression="thinking" 
                            size="small" 
                            animationType="idle"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold mb-1" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                            Many filters selected
                          </Text>
                          <Text className="text-sm" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
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
  const isDark = colorScheme === 'dark';
  const { showToast } = useToast();
  const { user } = useAuth();
  const { search: searchParam } = useLocalSearchParams<{ search?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Animation for random recipe button
  const randomButtonScale = useRef(new Animated.Value(1)).current;
  const randomButtonOpacity = useRef(new Animated.Value(1)).current;
  const [showRandomModal, setShowRandomModal] = useState(false);
  
  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  const [animatedRecipeIds, setAnimatedRecipeIds] = useState<Set<string>>(new Set());
  
  // Scroll position for parallax effect
  const scrollY = useRef(new Animated.Value(0)).current;
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<Record<string, UserFeedback>>({});

  // View mode state (grid/list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const VIEW_MODE_STORAGE_KEY = '@sazon_view_mode';

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [allRecipes, setAllRecipes] = useState<SuggestedRecipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0); // Total recipes in database for pagination
  // Add +1 to account for the featured recipe at the top
  const RECIPES_PER_PAGE = viewMode === 'grid' ? 21 : 11; // Grid: 1 featured + 20, List: 1 featured + 10
  
  
  // Featured recipe swipe state (cycle through top 3)
  const [featuredRecipeIndex, setFeaturedRecipeIndex] = useState(0);
  
  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  
  // Personalized sections state
  const [likedRecipes, setLikedRecipes] = useState<SuggestedRecipe[]>([]);
  const [recentlyViewedRecipes, setRecentlyViewedRecipes] = useState<string[]>([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>(filterStorage.getDefaultFilters());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  
  // Long-press menu state
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedRecipeForMenu, setSelectedRecipeForMenu] = useState<SuggestedRecipe | null>(null);
  
  // Collections state for save to collection
  const [collections, setCollections] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [savePickerVisible, setSavePickerVisible] = useState(false);
  const [savePickerRecipeId, setSavePickerRecipeId] = useState<string | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // First-time user guidance
  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(false);

  // Meal prep mode state
  const [mealPrepMode, setMealPrepMode] = useState(false);
  const MEAL_PREP_STORAGE_KEY = '@sazon_meal_prep_mode';

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
            try {
              // Use stored view mode (if available) so grid mode loads 20 cards immediately
              const storedViewMode = await AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY);
              const effectiveViewMode = storedViewMode === 'grid' || storedViewMode === 'list' ? storedViewMode : viewMode;
              const limit = effectiveViewMode === 'grid' ? 21 : 11;

              const response = await recipeApi.getAllRecipes({
                page: 0,
                limit,
              cuisines: savedFilters.cuisines.length > 0 ? savedFilters.cuisines : undefined,
              dietaryRestrictions: savedFilters.dietaryRestrictions.length > 0 ? savedFilters.dietaryRestrictions : undefined,
              maxCookTime: savedFilters.maxCookTime || undefined,
                difficulty: savedFilters.difficulty.length > 0 ? savedFilters.difficulty[0] : undefined,
              mealPrepMode: mealPrepMode,
                search: searchQuery || undefined, // Preserve search query
              });

              const responseData = response.data;
              let recipes: SuggestedRecipe[];
              let total: number;

              if (responseData && responseData.recipes && responseData.pagination) {
                recipes = responseData.recipes;
                total = responseData.pagination.total;
                console.log(`📱 HomeScreen: Loaded filtered recipes (paginated): ${recipes.length}, total: ${total}`);
              } else if (Array.isArray(responseData)) {
                recipes = responseData;
                total = recipes.length;
                console.log(`📱 HomeScreen: Loaded filtered recipes (array fallback): ${recipes.length}`);
              } else {
                console.error('❌ Unexpected API response format:', responseData);
                setLoadingFromFilters(false);
                return;
              }

              setTotalRecipes(total);
              setSuggestedRecipes(recipes);
              setAllRecipes(recipes);
              setCurrentPage(0);
            setInitialRecipesLoaded(true); // Mark as loaded
            
            const initialFeedback: Record<string, UserFeedback> = {};
              recipes.forEach((recipe: SuggestedRecipe) => {
              initialFeedback[recipe.id] = { liked: false, disliked: false };
            });
            setUserFeedback(initialFeedback);
            } finally {
            setLoadingFromFilters(false);
            }
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

  // Load meal prep mode preference on mount
  useEffect(() => {
    const loadMealPrepMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(MEAL_PREP_STORAGE_KEY);
        if (saved !== null) {
          setMealPrepMode(saved === 'true');
        }
      } catch (error) {
        console.error('❌ Error loading meal prep mode:', error);
      }
    };
    loadMealPrepMode();
  }, []);

  // Load view mode preference on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedViewMode = await AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY);
        if (savedViewMode === 'grid' || savedViewMode === 'list') {
          setViewMode(savedViewMode);
        }
        
      } catch (error) {
        console.error('❌ Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Reset pagination when view mode changes (grid/list)
  useEffect(() => {
    setCurrentPage(0); // Reset to first page when view mode changes
  }, [viewMode]);

  // Load personalized data (liked recipes, recently viewed)
  useEffect(() => {
    const loadPersonalizedData = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingPersonalized(true);
        
        // Load liked recipes
        const likedResponse = await recipeApi.getLikedRecipes();
        if (likedResponse.data && likedResponse.data.length > 0) {
          setLikedRecipes(likedResponse.data.slice(0, 5)); // Top 5 liked recipes
        }
        
        // Load recently viewed recipes from storage
        const recentViewed = await AsyncStorage.getItem('@sazon_recently_viewed');
        if (recentViewed) {
          const recentIds = JSON.parse(recentViewed) as string[];
          setRecentlyViewedRecipes(recentIds.slice(0, 5)); // Last 5 viewed
        }
      } catch (error) {
        console.error('❌ Error loading personalized data:', error);
      } finally {
        setLoadingPersonalized(false);
      }
    };
    
    loadPersonalizedData();
  }, [user?.id]);


  // Toggle view mode
  const handleToggleViewMode = async (mode: 'grid' | 'list') => {
    try {
      setViewMode(mode);
      await AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      HapticPatterns.buttonPress();
    } catch (error) {
      console.error('❌ Error saving view mode:', error);
    }
  };


  // Load recipes when meal prep mode is enabled and no other filters are active
  useEffect(() => {
    const loadMealPrepRecipes = async () => {
      if (mealPrepMode && filtersLoaded && activeFilters.length === 0 && !initialRecipesLoaded && !loadingFromFilters && !recipesData) {
        try {
          setLoadingFromFilters(true);
          const response = await recipeApi.getAllRecipes({
            page: 0,
            limit: RECIPES_PER_PAGE,
            mealPrepMode: true,
            cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
            dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
            maxCookTime: filters.maxCookTime || undefined,
            difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
            search: searchQuery || undefined,
          });

          const responseData = response.data;
          let recipes: SuggestedRecipe[];
          let total: number;

          if (responseData && responseData.recipes && responseData.pagination) {
            recipes = responseData.recipes;
            total = responseData.pagination.total;
          } else if (Array.isArray(responseData)) {
            recipes = responseData;
            total = recipes.length;
          } else {
            console.error('❌ Unexpected API response format:', responseData);
            setLoadingFromFilters(false);
            return;
          }

          const deduplicated = deduplicateRecipes(recipes);
          setTotalRecipes(total);
          setAllRecipes(deduplicated);
          setSuggestedRecipes(deduplicated);
          setCurrentPage(0);
          setInitialRecipesLoaded(true);
          
          const initialFeedback: Record<string, UserFeedback> = {};
          deduplicated.forEach((recipe: SuggestedRecipe) => {
            initialFeedback[recipe.id] = { liked: false, disliked: false };
          });
          setUserFeedback(initialFeedback);
        } catch (error) {
          console.error('❌ Error loading meal prep recipes:', error);
        }
          setLoadingFromFilters(false);
      }
    };
    loadMealPrepRecipes();
  }, [mealPrepMode, filtersLoaded, activeFilters.length, initialRecipesLoaded, loadingFromFilters, recipesData, RECIPES_PER_PAGE, filters, searchQuery]);

  // Handle search from URL params
  useEffect(() => {
    const handleSearch = async () => {
      if (searchParam && typeof searchParam === 'string' && searchParam.trim().length > 0) {
        const query = searchParam.trim();
        setSearchQuery(query);
        console.log('🔍 Searching for:', query);
        
        try {
          setLoadingFromFilters(true);
          const response = await recipeApi.getAllRecipes({
            page: 0,
            limit: RECIPES_PER_PAGE,
            search: query,
            cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
            dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
            maxCookTime: filters.maxCookTime || undefined,
            difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
            mealPrepMode: mealPrepMode,
          });

          const responseData = response.data;
          let recipes: SuggestedRecipe[];
          let total: number;

          if (responseData && responseData.recipes && responseData.pagination) {
            recipes = responseData.recipes;
            total = responseData.pagination.total;
          } else if (Array.isArray(responseData)) {
            recipes = responseData;
            total = recipes.length;
          } else {
            console.error('❌ Unexpected API response format:', responseData);
            setLoadingFromFilters(false);
            return;
          }

          const deduplicated = deduplicateRecipes(recipes);
          console.log('📱 HomeScreen: Search results', deduplicated.length);
          setTotalRecipes(total);
          setAllRecipes(deduplicated);
          setSuggestedRecipes(deduplicated);
          setCurrentPage(0);
          
          const initialFeedback: Record<string, UserFeedback> = {};
          deduplicated.forEach((recipe: SuggestedRecipe) => {
            initialFeedback[recipe.id] = { liked: false, disliked: false };
          });
          setUserFeedback(initialFeedback);
          setInitialRecipesLoaded(true);
          
          // Show toast
          showToast(
            deduplicated.length > 0 
              ? `🔍 Found ${deduplicated.length} recipes matching "${query}"`
              : `😔 No recipes found for "${query}"`,
            deduplicated.length > 0 ? 'success' : 'error',
            2000
          );
        } catch (error) {
          console.error('❌ Error searching recipes:', error);
          showToast('❌ Failed to search recipes', 'error');
        }
        setLoadingFromFilters(false);
      } else if (searchQuery && !searchParam) {
        // Clear search if param was removed
        setSearchQuery('');
      }
    };
    
    if (filtersLoaded) {
      handleSearch();
    }
  }, [searchParam, filtersLoaded, RECIPES_PER_PAGE, filters, mealPrepMode]);

  // Toggle meal prep mode
  const handleToggleMealPrepMode = async (value: boolean) => {
    try {
      setMealPrepMode(value);
      await AsyncStorage.setItem(MEAL_PREP_STORAGE_KEY, value.toString());
      HapticPatterns.buttonPress();
      
      // Show toast notification
      showToast(
        value 
          ? '🍱 Meal prep mode enabled - showing meal prep friendly recipes!' 
          : '🍽️ Meal prep mode disabled - showing regular recipes',
        'info',
        2000
      );
      
      // Refetch recipes with meal prep filter
      try {
        setLoadingFromFilters(true);
        const response = await recipeApi.getAllRecipes({
          page: 0,
          limit: RECIPES_PER_PAGE,
          cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
          dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
          maxCookTime: filters.maxCookTime || undefined,
          difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
          mealPrepMode: value,
          search: searchQuery || undefined, // Preserve search query
        });

        const responseData = response.data;
        let recipes: SuggestedRecipe[];
        let total: number;

        if (responseData && responseData.recipes && responseData.pagination) {
          recipes = responseData.recipes;
          total = responseData.pagination.total;
        } else if (Array.isArray(responseData)) {
          recipes = responseData;
          total = recipes.length;
        } else {
          console.error('❌ Unexpected API response format:', responseData);
          setLoadingFromFilters(false);
          return;
        }

        const deduplicated = deduplicateRecipes(recipes);
        setTotalRecipes(total);
        setAllRecipes(deduplicated);
        setSuggestedRecipes(deduplicated);
        setCurrentPage(0);
        
        // Initialize feedback state
        const initialFeedback: Record<string, UserFeedback> = {};
        deduplicated.forEach((recipe: SuggestedRecipe) => {
          initialFeedback[recipe.id] = { liked: false, disliked: false };
        });
        setUserFeedback(initialFeedback);
        setInitialRecipesLoaded(true);
        setLoadingFromFilters(false);
      } catch (error: any) {
        console.error('❌ Error fetching meal prep recipes:', error);
        setLoadingFromFilters(false);
      }
    } catch (error) {
      console.error('❌ Error saving meal prep mode:', error);
      HapticPatterns.error();
    }
  };

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

  // IMPORTANT:
  // We intentionally do NOT overwrite filtered/paginated results with `/recipes/suggested`.
  // Historically this caused grid mode to "randomly" drop back to ~10 recipes after applying filters.

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('📱 HomeScreen: API Error', error);
      HapticPatterns.error();
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    }
  }, [error]);

  // Welcome back notification - check if user has been away for more than 24 hours
  useFocusEffect(
    useCallback(() => {
      // Track screen view
      if (user?.id) {
        analytics.initialize(user.id).then(() => {
          analytics.trackScreenView('home', {});
        });
      }
      
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
              HapticPatterns.success();
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
    setCurrentPage(0);
    setAllRecipes([]);
    await refetch();
    setRefreshing(false);
  };

  // Fetch initial page of all recipes on mount (server-side pagination)
  useEffect(() => {
    const fetchInitialRecipes = async () => {
      if (!filtersLoaded) return; // Wait for filters to load first
      
      // Only fetch from paginated API if no filters are active and not in meal prep mode
      if (activeFilters.length === 0 && !mealPrepMode && !loadingFromFilters) {
        try {
          console.log('📄 Fetching initial page of all recipes');
          const response = await recipeApi.getAllRecipes({
            page: 0,
            limit: RECIPES_PER_PAGE,
            search: searchQuery || undefined
          });
          
          // Handle both new paginated format { recipes, pagination } and old array format
          const responseData = response.data;
          let recipes: SuggestedRecipe[];
          let total: number;
          
          if (responseData && responseData.recipes && responseData.pagination) {
            // New paginated format
            recipes = responseData.recipes;
            total = responseData.pagination.total;
            console.log(`📄 Initial load (paginated): ${recipes.length} recipes, total in database: ${total}`);
          } else if (Array.isArray(responseData)) {
            // Old array format (fallback)
            recipes = responseData;
            total = recipes.length;
            console.log(`📄 Initial load (array fallback): ${recipes.length} recipes`);
          } else {
            console.error('❌ Unexpected API response format:', responseData);
            return;
          }
          
          // Set total count from server
          setTotalRecipes(total);
          
          // Set initial recipes
          setSuggestedRecipes(recipes);
          setAllRecipes(recipes); // Keep for backward compatibility
          setCurrentPage(0);
          setInitialRecipesLoaded(true);
          
          // Initialize feedback state
          const initialFeedback: Record<string, UserFeedback> = {};
          recipes.forEach((recipe: SuggestedRecipe) => {
            initialFeedback[recipe.id] = { liked: false, disliked: false };
          });
          setUserFeedback(initialFeedback);
        } catch (error: any) {
          console.error('❌ Error fetching initial recipes:', error?.message || error);
        }
      }
    };
    
    fetchInitialRecipes();
  }, [filtersLoaded, activeFilters, mealPrepMode, loadingFromFilters, searchQuery]); // Removed RECIPES_PER_PAGE - viewMode change effect handles refetching

  // When view mode changes, refetch with new page size
  useEffect(() => {
    if (initialRecipesLoaded && totalRecipes > 0) {
      // Reset to first page and refetch with new limit
      const newLimit = viewMode === 'grid' ? 21 : 11;
      console.log(`📄 View mode changed to ${viewMode}, refetching with limit ${newLimit}`);
      
      // Directly call API with new limit to avoid stale closure issues
      const refetchWithNewLimit = async () => {
        setPaginationLoading(true);
        try {
          const response = await recipeApi.getAllRecipes({
            page: 0,
            limit: newLimit,
            cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
            dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
            maxCookTime: filters.maxCookTime || undefined,
            difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
            mealPrepMode: mealPrepMode,
            search: searchQuery || undefined
          });
          
          const responseData = response.data;
          let recipes: SuggestedRecipe[];
          let total: number;
          
          if (responseData && responseData.recipes && responseData.pagination) {
            recipes = responseData.recipes;
            total = responseData.pagination.total;
            console.log(`📄 View mode refetch: ${recipes.length} recipes, total: ${total}`);
          } else if (Array.isArray(responseData)) {
            recipes = responseData;
            total = recipes.length;
          } else {
            console.error('❌ Unexpected API response format:', responseData);
            setPaginationLoading(false);
            return;
          }
          
          setTotalRecipes(total);
          setSuggestedRecipes(recipes);
          setCurrentPage(0);
          setAnimatedRecipeIds(new Set());
          
          const newFeedback: Record<string, UserFeedback> = {};
          recipes.forEach((recipe: SuggestedRecipe) => {
            newFeedback[recipe.id] = { liked: false, disliked: false };
          });
          setUserFeedback(prev => ({ ...prev, ...newFeedback }));
        } catch (error: any) {
          console.error('❌ Error refetching recipes:', error?.message || error);
          // Don't show error to user, just log it - the search will handle its own fetching
        } finally {
          setPaginationLoading(false);
        }
      };
      
      refetchWithNewLimit();
    }
  }, [viewMode]); // Only trigger on viewMode change, not searchQuery

  // Pagination calculations - use totalRecipes from server for accurate page count
  const paginationInfo = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(totalRecipes / RECIPES_PER_PAGE));
    const hasMultiplePages = totalRecipes > RECIPES_PER_PAGE;
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage >= totalPages - 1;
    return { totalPages, hasMultiplePages, isFirstPage, isLastPage, totalRecipes };
  }, [totalRecipes, RECIPES_PER_PAGE, currentPage]);

  // Fetch recipes for a specific page from the server
  const fetchRecipesForPage = useCallback(async (page: number) => {
    setPaginationLoading(true);
    try {
      console.log(`📄 Fetching page ${page + 1} with ${RECIPES_PER_PAGE} recipes per page`);
      const response = await recipeApi.getAllRecipes({
        page,
        limit: RECIPES_PER_PAGE,
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
        mealPrepMode: mealPrepMode,
        search: searchQuery || undefined
      });
      
      // Handle both new paginated format and old array format
      const responseData = response.data;
      let recipes: SuggestedRecipe[];
      let total: number;
      
      if (responseData && responseData.recipes && responseData.pagination) {
        recipes = responseData.recipes;
        total = responseData.pagination.total;
        console.log(`📄 Received ${recipes.length} recipes, total: ${total}`);
      } else if (Array.isArray(responseData)) {
        recipes = responseData;
        total = recipes.length;
        console.log(`📄 Received ${recipes.length} recipes (array fallback)`);
      } else {
        console.error('❌ Unexpected API response format:', responseData);
        setPaginationLoading(false);
        return;
      }
      
      // Update total count from server
      setTotalRecipes(total);
      
      // Set recipes for this page
      setSuggestedRecipes(recipes);
      setCurrentPage(page);
      
      // Reset animated IDs for new page
      setAnimatedRecipeIds(new Set());
      
      // Initialize feedback state for new recipes
      const newFeedback: Record<string, UserFeedback> = { ...userFeedback };
      recipes.forEach((recipe: SuggestedRecipe) => {
        if (!newFeedback[recipe.id]) {
          newFeedback[recipe.id] = { liked: false, disliked: false };
        }
      });
      setUserFeedback(newFeedback);
      
      // Scroll to top
      HapticPatterns.buttonPress();
    } catch (error: any) {
      console.error('❌ Error fetching recipes for page:', error?.message || error);
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    } finally {
      setPaginationLoading(false);
    }
  }, [RECIPES_PER_PAGE, searchQuery, userFeedback, filters, mealPrepMode]);

  // Pagination handlers - fetch from server
  const handlePrevPage = useCallback(() => {
    console.log('🔙 Previous button pressed', { ...paginationInfo, currentPage });
    if (!paginationInfo.isFirstPage && !paginationLoading) {
      const newPage = currentPage - 1;
      console.log(`📄 Changing page from ${currentPage + 1} to ${newPage + 1}`);
      fetchRecipesForPage(newPage);
    }
  }, [paginationInfo, currentPage, paginationLoading, fetchRecipesForPage]);

  const handleNextPage = useCallback(() => {
    console.log('➡️ Next button pressed', { ...paginationInfo, currentPage });
    if (!paginationInfo.isLastPage && !paginationLoading) {
      const newPage = currentPage + 1;
      console.log(`📄 Changing page from ${currentPage + 1} to ${newPage + 1}`);
      fetchRecipesForPage(newPage);
    }
  }, [paginationInfo, currentPage, paginationLoading, fetchRecipesForPage]);


  // Track recipe views for "Continue Cooking" section
  const trackRecipeView = async (recipeId: string) => {
    try {
      const recent = await AsyncStorage.getItem('@sazon_recently_viewed');
      const recentIds = recent ? JSON.parse(recent) as string[] : [];
      
      // Remove if already exists and add to front
      const updated = [recipeId, ...recentIds.filter(id => id !== recipeId)].slice(0, 10);
      await AsyncStorage.setItem('@sazon_recently_viewed', JSON.stringify(updated));
      setRecentlyViewedRecipes(updated.slice(0, 5));
    } catch (error) {
      console.error('❌ Error tracking recipe view:', error);
    }
  };

  const handleRecipePress = (recipeId: string) => {
    console.log('📱 HomeScreen: Recipe pressed', recipeId);
    
    // Track recipe view for "Continue Cooking" section
    trackRecipeView(recipeId);
    
    // Navigate to modal
    router.push(`../modal?id=${recipeId}`);
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
      
      // Track save action
      if (user?.id && savePickerRecipeId) {
        analytics.trackRecipeInteraction('save', savePickerRecipeId, {
          source: 'home_screen',
          collectionCount: selectedCollectionIds.length,
        });
      }
      
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
        HapticPatterns.error();
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
      HapticPatterns.error();
      Alert.alert('Error', e?.message || 'Failed to create collection');
    }
  };

  // Long-press menu handlers
  const handleLongPress = (recipe: SuggestedRecipe) => {
    setSelectedRecipeForMenu(recipe);
    setActionMenuVisible(true);
    HapticPatterns.buttonPressPrimary();
  };

  const handleAddToMealPlan = async () => {
    if (!selectedRecipeForMenu) return;
    
    try {
      // Show meal type picker
      Alert.alert(
        'Add to Meal Plan',
        'Which meal would you like to add this to?',
        [
          { text: 'Breakfast', onPress: () => addRecipeToMealPlan('breakfast') },
          { text: 'Lunch', onPress: () => addRecipeToMealPlan('lunch') },
          { text: 'Dinner', onPress: () => addRecipeToMealPlan('dinner') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('Error adding to meal plan:', error);
      Alert.alert('Error', 'Failed to add recipe to meal plan');
    }
  };

  const addRecipeToMealPlan = async (mealType: string) => {
    if (!selectedRecipeForMenu) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      await mealPlanApi.addRecipeToMeal({
        recipeId: selectedRecipeForMenu.id,
        date: today,
        mealType,
      });
      
      HapticPatterns.success();
      showToast(`Added to ${mealType}!`, 'success');
      router.push('/(tabs)/meal-plan');
    } catch (error: any) {
      console.error('Error adding to meal plan:', error);
      HapticPatterns.error();
      Alert.alert('Error', error?.message || 'Failed to add recipe to meal plan');
    }
  };

  const handleViewSimilar = async () => {
    if (!selectedRecipeForMenu) return;
    
    try {
      const response = await recipeApi.getSimilarRecipes(selectedRecipeForMenu.id, 10);
      if (response.data && response.data.length > 0) {
        setSuggestedRecipes(response.data);
        showToast(`Found ${response.data.length} similar recipes`, 'success');
        setActionMenuVisible(false);
      } else {
        Alert.alert('No Similar Recipes', 'We couldn\'t find any similar recipes at the moment.');
      }
    } catch (error) {
      console.error('Error fetching similar recipes:', error);
      Alert.alert('Error', 'Failed to load similar recipes');
    }
  };

  const handleHealthify = async () => {
    if (!selectedRecipeForMenu) return;
    
    try {
      showToast('Healthifying recipe...', 'info');
      const response = await recipeApi.healthifyRecipe(selectedRecipeForMenu.id);
      
      if (response.data) {
        HapticPatterns.success();
        showToast('Recipe healthified!', 'success');
        router.push(`/modal?id=${response.data.id || selectedRecipeForMenu.id}`);
        setActionMenuVisible(false);
      }
    } catch (error: any) {
      console.error('Error healthifying recipe:', error);
      HapticPatterns.error();
      Alert.alert('Error', error?.message || 'Failed to healthify recipe');
    }
  };

  const handleReportIssue = () => {
    if (!selectedRecipeForMenu) return;
    
    Alert.alert(
      'Report Issue',
      'What issue would you like to report?',
      [
        { text: 'Incorrect Information', onPress: () => reportIssue('incorrect_info') },
        { text: 'Missing Ingredients', onPress: () => reportIssue('missing_ingredients') },
        { text: 'Wrong Instructions', onPress: () => reportIssue('wrong_instructions') },
        { text: 'Other', onPress: () => reportIssue('other') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const reportIssue = (issueType: string) => {
    HapticPatterns.success();
    showToast('Thank you for reporting! We\'ll look into it.', 'success');
    setActionMenuVisible(false);
  };

  const handleRandomRecipe = async () => {
    try {
      console.log('🤖 HomeScreen: Generating AI recipe with filters:', filters);
      
      // Animate button press - scale down then expand with fade
      Animated.sequence([
        Animated.parallel([
          Animated.timing(randomButtonScale, {
            toValue: 0.95,
            duration: Duration.instant,
            useNativeDriver: true,
          }),
          Animated.timing(randomButtonOpacity, {
            toValue: 0.8,
            duration: Duration.instant,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(randomButtonScale, {
            toValue: 1.1,
            ...Spring.bouncy,
          }),
          Animated.timing(randomButtonOpacity, {
            toValue: 1,
            duration: Duration.normal,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(randomButtonScale, {
          toValue: 1,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Show loading modal (no title, just subtext)
      setShowRandomModal(true);
      
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
      
      // Track AI recipe generation
      if (user?.id) {
        analytics.trackFeatureUsage('ai_recipe_generation', {
          source: 'home_screen',
          cuisine: params.cuisine,
          maxCookTime: params.maxCookTime,
        });
      }
      
      // Success haptic feedback to let user know it's ready
      HapticPatterns.success();
      
      // Dismiss modal immediately when recipe is ready
      setShowRandomModal(false);
      
      // Auto-navigate after a brief delay
      setTimeout(() => {
        router.push(`../modal?id=${aiRecipe.id}`);
      }, 500);
      
    } catch (error: any) {
      console.error('❌ HomeScreen: Error generating AI recipe', error);
      
      // Dismiss the loading modal
      setShowRandomModal(false);
      
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
          
          HapticPatterns.success();
          
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

  const handleFilterChange = (type: keyof FilterState, value: string | number | null | string[]) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      if (type === 'maxCookTime') {
        newFilters.maxCookTime = value as number | null;
      } else {
        const arrayType = type as 'cuisines' | 'dietaryRestrictions' | 'difficulty';
        // If value is already an array, use it directly (for quick filter chips)
        if (Array.isArray(value)) {
          newFilters[arrayType] = value;
        } else {
        const currentArray = newFilters[arrayType];
        const valueStr = value as string;
        
        if (currentArray.includes(valueStr)) {
          newFilters[arrayType] = currentArray.filter(item => item !== valueStr);
        } else {
          newFilters[arrayType] = [...currentArray, valueStr];
          }
        }
      }
      
      return newFilters;
    });
  };

  // Quick filter handler that applies filters immediately
  const handleQuickFilter = async (type: keyof FilterState, value: string | number | null | string[]) => {
    // Update filters first
    const newFilters = { ...filters };
    
    if (type === 'maxCookTime') {
      newFilters.maxCookTime = value as number | null;
    } else {
      const arrayType = type as 'cuisines' | 'dietaryRestrictions' | 'difficulty';
      if (Array.isArray(value)) {
        newFilters[arrayType] = value;
      } else {
        const currentArray = newFilters[arrayType];
        const valueStr = value as string;
        if (currentArray.includes(valueStr)) {
          newFilters[arrayType] = currentArray.filter(item => item !== valueStr);
        } else {
          newFilters[arrayType] = [...currentArray, valueStr];
        }
      }
    }
    
    // Update state
    setFilters(newFilters);
    
    // Apply filters immediately
    const active: string[] = [];
    if (newFilters.cuisines.length > 0) active.push(`${newFilters.cuisines.length} cuisines`);
    if (newFilters.dietaryRestrictions.length > 0) active.push(`${newFilters.dietaryRestrictions.length} dietary`);
    if (newFilters.maxCookTime) active.push(`≤${newFilters.maxCookTime}min`);
    if (newFilters.difficulty.length > 0) active.push(`${newFilters.difficulty.length} difficulty`);
    
    setActiveFilters(active);
    
    // Save filters to storage
    try {
      await filterStorage.saveFilters(newFilters);
    } catch (error) {
      console.error('❌ Error saving filters:', error);
    }
    
    // Apply filters to API call using paginated endpoint
    try {
      setPaginationLoading(true);
      // Use RECIPES_PER_PAGE which is already calculated based on viewMode
      console.log(`🔍 Applying filter with viewMode: ${viewMode}, RECIPES_PER_PAGE: ${RECIPES_PER_PAGE}`);
      
      const response = await recipeApi.getAllRecipes({
        page: 0,
        limit: RECIPES_PER_PAGE,
        cuisines: newFilters.cuisines.length > 0 ? newFilters.cuisines : undefined,
        dietaryRestrictions: newFilters.dietaryRestrictions.length > 0 ? newFilters.dietaryRestrictions : undefined,
        maxCookTime: newFilters.maxCookTime || undefined,
        difficulty: newFilters.difficulty.length > 0 ? newFilters.difficulty[0] : undefined,
        mealPrepMode: mealPrepMode,
        search: searchQuery || undefined
      });
      
      // Handle paginated response format
      const responseData = response.data;
      let recipes: SuggestedRecipe[];
      let total: number;
      
      if (responseData && responseData.recipes && responseData.pagination) {
        recipes = responseData.recipes;
        total = responseData.pagination.total;
        console.log(`✅ Filter applied: Received ${recipes.length} recipes (expected ${RECIPES_PER_PAGE}), total: ${total}`);
      } else if (Array.isArray(responseData)) {
        recipes = responseData;
        total = recipes.length;
        console.log(`✅ Filter applied: Received ${recipes.length} recipes (array format), total: ${total}`);
      } else {
        console.error('❌ Unexpected API response format:', responseData);
        setPaginationLoading(false);
        return;
      }
      
      setTotalRecipes(total);
      setSuggestedRecipes(recipes);
      setAllRecipes(recipes);
      setCurrentPage(0);
      
      // Initialize feedback state for new recipes
      const initialFeedback: Record<string, UserFeedback> = {};
      recipes.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
    } catch (error: any) {
      console.error('❌ Error applying quick filter:', error);
      HapticPatterns.error();
    } finally {
      setPaginationLoading(false);
    }
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
    
    // Apply filters to API call using paginated endpoint
    console.log('🔍 Filters applied:', filters);
    
    try {
      setPaginationLoading(true);
      // Use RECIPES_PER_PAGE which is already calculated based on viewMode
      console.log(`🔍 Applying filters with viewMode: ${viewMode}, RECIPES_PER_PAGE: ${RECIPES_PER_PAGE}`);
      
      const response = await recipeApi.getAllRecipes({
        page: 0,
        limit: RECIPES_PER_PAGE,
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
        mealPrepMode: mealPrepMode,
        search: searchQuery || undefined
      });
      
      // Handle paginated response format
      const responseData = response.data;
      let recipes: SuggestedRecipe[];
      let total: number;
      
      if (responseData && responseData.recipes && responseData.pagination) {
        recipes = responseData.recipes;
        total = responseData.pagination.total;
      } else if (Array.isArray(responseData)) {
        recipes = responseData;
        total = recipes.length;
      } else {
        console.error('❌ Unexpected API response format:', responseData);
        setPaginationLoading(false);
        return;
      }
      
      setTotalRecipes(total);
      setSuggestedRecipes(recipes);
      setAllRecipes(recipes);
      setCurrentPage(0);
      
      // Initialize feedback state for new recipes
      const initialFeedback: Record<string, UserFeedback> = {};
      recipes.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
      
      console.log('✅ Filtered recipes loaded:', recipes.length, 'total:', total);
    } catch (error: any) {
      console.error('❌ Error applying filters:', error);
      HapticPatterns.error();
      Alert.alert('Error', 'Failed to apply filters. Please try again.');
    } finally {
      setPaginationLoading(false);
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
    
    // Reload original recipes without filters using paginated endpoint
    try {
      setPaginationLoading(true);
      // Use RECIPES_PER_PAGE which is already calculated based on viewMode
      console.log(`🔍 Clearing filters with viewMode: ${viewMode}, RECIPES_PER_PAGE: ${RECIPES_PER_PAGE}`);
      
      const response = await recipeApi.getAllRecipes({
        page: 0,
        limit: RECIPES_PER_PAGE,
        mealPrepMode: mealPrepMode,
        search: searchQuery || undefined
      });
      
      // Handle paginated response format
      const responseData = response.data;
      let recipes: SuggestedRecipe[];
      let total: number;
      
      if (responseData && responseData.recipes && responseData.pagination) {
        recipes = responseData.recipes;
        total = responseData.pagination.total;
      } else if (Array.isArray(responseData)) {
        recipes = responseData;
        total = recipes.length;
      } else {
        console.error('❌ Unexpected API response format:', responseData);
        setPaginationLoading(false);
        return;
      }
      
      setTotalRecipes(total);
      setSuggestedRecipes(recipes);
      setAllRecipes(recipes);
      setCurrentPage(0);
      
      // Initialize feedback state for new recipes
      const initialFeedback: Record<string, UserFeedback> = {};
      recipes.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
      
      console.log('✅ Filters cleared, original recipes loaded:', recipes.length, 'total:', total);
    } catch (error: any) {
      console.error('❌ Error clearing filters:', error);
      HapticPatterns.error();
      Alert.alert('Error', 'Failed to clear filters. Please try again.');
    } finally {
      setPaginationLoading(false);
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
      
      // Track like action
      if (user?.id) {
        analytics.trackRecipeInteraction('like', recipeId, { source: 'home_screen' });
      }
      
      // Update local state to reflect the like
      setSuggestedRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, score: { ...recipe.score, total: recipe.score.total + 5 } }
          : recipe
      ));
      
      // Success haptic
      HapticPatterns.success();
      
      Alert.alert('Liked!', 'We\'ll show you more recipes like this');
    } catch (error: any) {
      console.error('📱 HomeScreen: Like error', error);
      
      // Error haptic
      HapticPatterns.error();
      
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
      
      // Track dislike action
      if (user?.id) {
        analytics.trackRecipeInteraction('dislike', recipeId, { source: 'home_screen' });
      }
      
      // Update local state to reflect the dislike
      setSuggestedRecipes(prev => prev.map(recipe => 
        recipe.id === recipeId 
          ? { ...recipe, score: { ...recipe.score, total: Math.max(0, recipe.score.total - 5) } }
          : recipe
      ));
      
      // Success haptic
      HapticPatterns.success();
      
      Alert.alert('Noted', 'We\'ll show fewer recipes like this');
    } catch (error: any) {
      console.error('📱 HomeScreen: Dislike error', error);
      
      // Error haptic
      HapticPatterns.error();
      
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
    // Return style object instead of className for dynamic colors
    if (score >= 80) return { color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen };
    if (score >= 60) return { color: isDark ? DarkColors.primary : Colors.primary };
    return { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed };
  };


  // Get current time and day for time-based recommendations
  const getTimeBasedSection = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Determine meal time based on hour
    let mealTime: 'breakfast' | 'lunch' | 'dinner' | 'weekend' | null = null;
    let sectionTitle = '';
    let emoji = '';
    
    if (isWeekend) {
      // Weekend projects (longer cook time recipes)
      mealTime = 'weekend';
      sectionTitle = 'Weekend Projects';
      emoji = '🏗️';
    } else if (hour >= 5 && hour < 11) {
      // Morning: 5 AM - 11 AM
      mealTime = 'breakfast';
      sectionTitle = 'Good Morning! Breakfast Ideas';
      emoji = '🌅';
    } else if (hour >= 11 && hour < 15) {
      // Midday: 11 AM - 3 PM
      mealTime = 'lunch';
      sectionTitle = 'Lunch Time';
      emoji = '☀️';
    } else if (hour >= 17 && hour < 21) {
      // Evening: 5 PM - 9 PM
      mealTime = 'dinner';
      sectionTitle = 'Dinner Time';
      emoji = '🌙';
    }
    
    return { mealTime, sectionTitle, emoji, isWeekend };
  }, []);

  // Group recipes into contextual sections
  const groupRecipesIntoSections = useMemo(() => {
    if (suggestedRecipes.length <= 1) return [];
    
    const remainingRecipes = suggestedRecipes.slice(1);
    const sections: Array<{ title: string; emoji: string; recipes: SuggestedRecipe[]; key: string; priority?: number }> = [];
    const usedHighlightIds = new Set<string>();

    const takeUnique = (
      candidates: SuggestedRecipe[],
      predicate: (r: SuggestedRecipe) => boolean,
      maxCount: number
    ) => {
      const picked: SuggestedRecipe[] = [];
      for (const r of candidates) {
        if (picked.length >= maxCount) break;
        if (usedHighlightIds.has(r.id)) continue;
        if (!predicate(r)) continue;
        usedHighlightIds.add(r.id);
        picked.push(r);
      }
      return picked;
    };
    
    // Time-based section (highest priority)
    if (getTimeBasedSection.mealTime) {
      const mealTime = getTimeBasedSection.mealTime;
      let timeBasedRecipes: SuggestedRecipe[] = [];

      if (mealTime === 'weekend') {
        timeBasedRecipes = takeUnique(
          remainingRecipes,
          (r) =>
            (!!r.cookTime && r.cookTime > 60) ||
            r.difficulty === 'hard' ||
            (r as any).mealType === 'dinner',
          5
        );
      } else {
        // First try: exact mealType match
        timeBasedRecipes = takeUnique(
          remainingRecipes,
          (r) => (r as any).mealType === mealTime,
          5
        );

        // Fallbacks if not enough
        if (timeBasedRecipes.length === 0) {
          if (mealTime === 'breakfast' || mealTime === 'lunch') {
            timeBasedRecipes = takeUnique(
              remainingRecipes,
              (r) => !!r.cookTime && r.cookTime <= 45,
              5
            );
          } else {
            // Dinner fallback: just take top unique
            timeBasedRecipes = takeUnique(remainingRecipes, () => true, 5);
          }
        }
      }
      
      if (timeBasedRecipes.length > 0) {
        sections.push({
          title: getTimeBasedSection.sectionTitle,
          emoji: getTimeBasedSection.emoji,
          recipes: timeBasedRecipes,
          key: `time-based-${getTimeBasedSection.mealTime}`,
          priority: 1 // Highest priority
        });
      }
    }
    
    // Perfect Match for You (high match percentage)
    const perfectMatches = takeUnique(
      remainingRecipes,
      (r) => !!r.score?.matchPercentage && r.score.matchPercentage >= 85,
      10
    );
    if (perfectMatches.length > 0) {
      sections.push({
        title: 'Perfect Match for You',
        emoji: '⭐',
        recipes: perfectMatches,
        key: 'perfect-match'
      });
    }
    
    // Great for Meal Prep
    const mealPrepRecipes = takeUnique(
      remainingRecipes,
      (r) => (r as any).mealPrepSuitable || (r as any).freezable || (r as any).batchFriendly,
      10
    );
    if (mealPrepRecipes.length > 0 && !mealPrepMode) {
      sections.push({
        title: 'Great for Meal Prep',
        emoji: '🍱',
        recipes: mealPrepRecipes,
        key: 'meal-prep'
      });
    }
    
    // High in Superfoods (health grade A or B)
    const superfoodRecipes = takeUnique(
      remainingRecipes,
      (r) => r.healthGrade === 'A' || r.healthGrade === 'B',
      10
    );
    if (superfoodRecipes.length > 0) {
      sections.push({
        title: 'High in Superfoods',
        emoji: '🥗',
        recipes: superfoodRecipes,
        key: 'superfoods'
      });
    }

    // Recipes for You - keep the full pool, but push highlight picks to the end
    // so you don't see the same recipe as the first card in every section.
    const recipesForYou = [
      ...remainingRecipes.filter((r) => !usedHighlightIds.has(r.id)),
      ...remainingRecipes.filter((r) => usedHighlightIds.has(r.id)),
    ];
    if (recipesForYou.length > 0) {
      sections.push({
        title: 'Recipes for You',
        emoji: '🍳',
        recipes: recipesForYou,
        key: 'quick-easy'
      });
    }
    
    // Sort sections by priority (time-based first, then others)
    sections.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    return sections;
  }, [suggestedRecipes, mealPrepMode, isDark, getTimeBasedSection, viewMode]);

  // Toggle section collapse
  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
    HapticPatterns.buttonPress();
  };

  // Truncate description to approximately 2-3 lines (100-120 characters)
  const truncateDescription = (text: string, maxLength: number = 120): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Get border color based on match score
  const getBorderColorFromScore = (recipe: SuggestedRecipe) => {
    const matchScore = recipe.score?.matchPercentage || 0;
    const totalScore = recipe.score?.total || 0;
    
    // Use match percentage if available, otherwise use total score
    const score = matchScore || totalScore;
    
    if (score >= 85) {
      return isDark ? Colors.tertiaryGreen : Colors.tertiaryGreen;
    } else if (score >= 70) {
      return isDark ? Colors.primary : Colors.primary;
    } else if (score >= 50) {
      return isDark ? '#F59E0B' : '#F59E0B';
    } else {
      return isDark ? DarkColors.secondaryRed : Colors.secondaryRed;
    }
  };

  // Get consistent shadow style for all cards
  const getShadowStyle = (_recipe: SuggestedRecipe) => {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    };
  };

  const getRecipePlaceholder = (cuisine: string) => {
    const placeholders: Record<string, { icon: string; color: string; bg: string }> = {
      'Mediterranean': { icon: 'fish-outline', color: '#3B82F6', bg: '#DBEAFE' },
      'Asian': { icon: 'restaurant-outline', color: Colors.secondaryRed, bg: '#FEE2E2' },
      'Mexican': { icon: 'flame-outline', color: '#F59E0B', bg: '#FEF3C7' },
      'Italian': { icon: 'pizza-outline', color: '#10B981', bg: '#D1FAE5' },
      'American': { icon: 'fast-food-outline', color: '#6366F1', bg: '#E0E7FF' },
      'Indian': { icon: 'restaurant-outline', color: '#F97316', bg: '#FFEDD5' },
      'Thai': { icon: 'leaf-outline', color: '#14B8A6', bg: '#CCFBF1' },
      'French': { icon: 'wine-outline', color: '#8B5CF6', bg: '#EDE9FE' },
      'Japanese': { icon: 'fish-outline', color: '#EC4899', bg: '#FCE7F3' },
      'Chinese': { icon: 'restaurant-outline', color: Colors.secondaryRed, bg: '#FEE2E2' },
    };

    return placeholders[cuisine] || { icon: 'restaurant-outline', color: '#9CA3AF', bg: '#F3F4F6' };
  };

  // Loading state with skeleton loaders
  if (loading && suggestedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
            <AnimatedLogoMascot 
              expression="happy" 
              size="xsmall" 
              animationType="pulse"
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ marginLeft: -2 }} accessibilityRole="header">Sazon Chef</Text>
        </View>
            {/* View Mode Toggle Skeleton */}
            <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <View className="w-10 h-8 rounded bg-gray-200 dark:bg-gray-600" />
              <View className="w-10 h-8 rounded bg-gray-200 dark:bg-gray-600 ml-1" />
        </View>
          </View>
        </View>
        {/* Quick Filter Chips Skeleton */}
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row" style={{ gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} className="h-9 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            ))}
          </View>
        </View>
        
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}>
          {/* Featured Recipe Skeleton */}
          <View className="px-4 mb-4" style={{ marginTop: Spacing.xl }}>
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <View className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                <View className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              </View>
              <View className="h-9 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
            </View>
            <RecipeCardSkeleton variant="featured" />
          </View>

          {/* More Suggestions Skeleton */}
          <View className="px-4">
            <View className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
            {viewMode === 'grid' ? (
              <View className="flex-row flex-wrap" style={{ marginHorizontal: -Spacing.sm }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.md }}>
                    <RecipeCardSkeleton variant="grid" />
                  </View>
                ))}
              </View>
            ) : (
              <>
          {[1, 2, 3].map((i) => (
                  <RecipeCardSkeleton key={i} variant="list" />
          ))}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && suggestedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center">
            <AnimatedLogoMascot 
              expression="supportive" 
              size="xsmall" 
              animationType="idle"
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ marginLeft: -2 }} accessibilityRole="header">Sazon Chef</Text>
        </View>
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 items-center justify-center p-8">
            <LogoMascot 
              expression="supportive" 
              size="large"
            />
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 text-center">
              {error.includes('network') || error.includes('Network') || error.includes('fetch') 
                ? "Connection Problem" 
                : error.includes('timeout') || error.includes('Timeout')
                ? "Request Timed Out"
                : error.includes('500') || error.includes('server')
                ? "Server Error"
                : "Oops! Something went wrong"}
            </Text>
            <Text className="text-gray-600 dark:text-gray-300 text-center mt-3 text-base leading-6 max-w-sm">
              {error.includes('network') || error.includes('Network') || error.includes('fetch')
                ? "We couldn't connect to our servers. Please check your internet connection."
                : error.includes('timeout') || error.includes('Timeout')
                ? "The request took too long to complete."
                : error.includes('500') || error.includes('server')
                ? "Our servers are experiencing some issues."
                : "We couldn't load recipes right now."}
            </Text>
            
            <View className="mt-6 w-full max-w-sm">
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
                💡 What you can try:
              </Text>
              <View className="space-y-2">
                {(error.includes('network') || error.includes('Network') || error.includes('fetch') 
                  ? ["Check your Wi-Fi or mobile data connection", "Make sure you're connected to the internet", "Try again in a moment"]
                  : error.includes('timeout') || error.includes('Timeout')
                  ? ["Check your internet connection speed", "Try again in a moment", "Restart the app if the problem persists"]
                  : error.includes('500') || error.includes('server')
                  ? ["This is usually temporary", "Try again in a few moments", "We're working on fixing this"]
                  : ["Pull down to refresh", "Check your internet connection", "Try again in a moment"]
                ).map((suggestion, index) => (
                  <View key={index} className="flex-row items-start bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                    <Text className="text-gray-500 dark:text-gray-400 mr-2">•</Text>
                    <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {suggestion}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            
            <View className="mt-8 w-full max-w-sm">
              <HapticTouchableOpacity
                onPress={() => {
                  refetch();
                  HapticPatterns.buttonPressPrimary();
                }}
                className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold text-center">Try Again</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Empty state
  if (suggestedRecipes.length === 0 && !loading && !loadingFromFilters) {
    const hasActiveFilters = activeFilters.length > 0 || mealPrepMode;
    const hasCuisineFilters = filters.cuisines.length > 0;
    const hasDietaryFilters = filters.dietaryRestrictions.length > 0;
    const hasCookTimeFilter = filters.maxCookTime !== null && filters.maxCookTime !== undefined;
    const hasDifficultyFilter = filters.difficulty.length > 0;
    const hasSearchQuery = searchQuery && searchQuery.trim().length > 0;
    
    // Generate contextual title
    let emptyStateTitle = "No recipes found";
    if (hasSearchQuery) {
      emptyStateTitle = `No recipes found for "${searchQuery}"`;
    } else if (mealPrepMode) {
      emptyStateTitle = "No meal prep recipes found";
    } else if (hasActiveFilters) {
      emptyStateTitle = "No recipes match your filters";
    } else {
      emptyStateTitle = "No recipes available";
    }
    
    // Generate contextual description with suggestions
    let emptyStateDescription = "";
    const suggestions: string[] = [];
    
    if (hasSearchQuery) {
      emptyStateDescription = `We couldn't find any recipes matching "${searchQuery}".`;
      suggestions.push("Try a different search term");
      suggestions.push("Check your spelling");
      if (hasActiveFilters) {
        suggestions.push("Remove some filters to broaden your search");
      }
    } else if (mealPrepMode) {
      emptyStateDescription = "We couldn't find any recipes suitable for meal prep right now.";
      suggestions.push("Disable meal prep mode to see all recipes");
      suggestions.push("Try removing other filters");
      suggestions.push("Check back later as we add more meal prep-friendly recipes");
    } else if (hasActiveFilters) {
      emptyStateDescription = "Your current filters are too restrictive.";
      
      if (hasCuisineFilters && filters.cuisines.length === 1) {
        suggestions.push(`Try a different cuisine (currently: ${filters.cuisines[0]})`);
      } else if (hasCuisineFilters) {
        suggestions.push(`Try removing some cuisines (${filters.cuisines.length} selected)`);
      }
      
      if (hasDietaryFilters && filters.dietaryRestrictions.length > 2) {
        suggestions.push(`Try removing some dietary restrictions (${filters.dietaryRestrictions.length} selected)`);
      }
      
      if (hasCookTimeFilter && filters.maxCookTime && filters.maxCookTime < 30) {
        suggestions.push(`Try increasing cook time limit (currently: ${filters.maxCookTime} min)`);
      }
      
      if (hasDifficultyFilter && filters.difficulty.length === 1) {
        suggestions.push(`Try including other difficulty levels`);
      }
      
      if (suggestions.length === 0) {
        suggestions.push("Clear all filters to see more recipes");
        suggestions.push("Try adjusting your preferences");
      }
    } else {
      emptyStateDescription = "We couldn't find any recipes to suggest at the moment.";
      suggestions.push("Pull down to refresh");
      suggestions.push("Check your internet connection");
      suggestions.push("Try again in a moment");
    }
    
    const emptyStateExpression = mealPrepMode ? 'thinking' : (hasActiveFilters ? 'thinking' : 'curious');
    
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center">
            <AnimatedLogoMascot 
              expression={emptyStateExpression} 
              size="xsmall" 
              animationType="idle"
            />
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ marginLeft: -2 }} accessibilityRole="header">Sazon Chef</Text>
        </View>
        </View>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 items-center justify-center p-8">
            <LogoMascot 
              expression={emptyStateExpression} 
              size="large"
            />
            <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 text-center">
              {emptyStateTitle}
            </Text>
            <Text className="text-gray-600 dark:text-gray-300 text-center mt-3 text-base leading-6 max-w-sm">
              {emptyStateDescription}
            </Text>
            
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <View className="mt-6 w-full max-w-sm">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 text-center">
                  💡 Suggestions:
                </Text>
                <View className="space-y-2">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <View key={index} className="flex-row items-start bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <Text className="text-gray-500 dark:text-gray-400 mr-2">•</Text>
                      <Text className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {suggestion}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Action Buttons */}
            <View className="mt-8 w-full max-w-sm space-y-3">
              {hasActiveFilters && (
                <HapticTouchableOpacity
                  onPress={() => {
                    clearFilters();
                    setMealPrepMode(false);
                    HapticPatterns.buttonPressPrimary();
                  }}
                  className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
                >
                  <Text className="text-white font-semibold text-center">Clear All Filters</Text>
                </HapticTouchableOpacity>
              )}
              
              {mealPrepMode && (
                <HapticTouchableOpacity
                  onPress={() => {
                    handleToggleMealPrepMode(false);
                    HapticPatterns.buttonPressPrimary();
                  }}
                  className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
                >
                  <Text className="text-white font-semibold text-center">Disable Meal Prep Mode</Text>
                </HapticTouchableOpacity>
              )}
              
              {hasSearchQuery && (
                <HapticTouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    refetch();
                    HapticPatterns.buttonPressPrimary();
                  }}
                  className="bg-gray-200 dark:bg-gray-700 px-6 py-3 rounded-lg"
                >
                  <Text className="text-gray-900 dark:text-gray-100 font-semibold text-center">Clear Search</Text>
                </HapticTouchableOpacity>
              )}
              
              {!hasActiveFilters && !hasSearchQuery && (
                <HapticTouchableOpacity
                  onPress={() => {
                    refetch();
                    HapticPatterns.buttonPressPrimary();
                  }}
                  className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
                >
                  <Text className="text-white font-semibold text-center">Refresh Recipes</Text>
                </HapticTouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: 56 }}>
        <View className="flex-row items-center justify-between" style={{ height: 28 }}>
          <View className="flex-row items-center flex-1">
          <HapticTouchableOpacity
            onPress={() => router.push('/mascot-examples')}
            activeOpacity={0.7}
          >
            <LogoMascot size="xsmall" />
          </HapticTouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" style={{ marginLeft: -2, lineHeight: 28 }} accessibilityRole="header">Sazon Chef</Text>
        </View>
          {/* View Mode Toggle */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <HapticTouchableOpacity
                onPress={() => handleToggleViewMode('list')}
                className={`px-3 py-1.5 rounded ${viewMode === 'list' ? '' : ''}`}
                style={viewMode === 'list' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
              >
                <Ionicons 
                  name="list" 
                  size={18} 
                  color={viewMode === 'list' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')} 
                />
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={() => handleToggleViewMode('grid')}
                className={`px-3 py-1.5 rounded ${viewMode === 'grid' ? '' : ''}`}
                style={viewMode === 'grid' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
              >
                <Ionicons 
                  name="grid" 
                  size={18} 
                  color={viewMode === 'grid' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')} 
                />
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Unified Filters & Meal Prep Section */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Header with Filter Button */}
        <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Filters & Preferences</Text>
          <HapticTouchableOpacity 
            onPress={handleFilterPress}
            className="px-3 py-1.5 rounded-lg flex-row items-center"
            style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryDark }}
          >
            <Icon name={Icons.RECIPE_FILTER} size={IconSizes.SM} color={isDark ? DarkColors.primary : '#FFFFFF'} accessibilityLabel="Advanced filters" />
            <Text className="text-sm font-semibold ml-1.5" style={{ color: isDark ? DarkColors.primary : '#FFFFFF' }}>
              Advanced
            </Text>
          </HapticTouchableOpacity>
        </View>
        
        {/* Quick Filter Chips */}
        <View className="px-4 pb-3">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            <View className="flex-row items-center" style={{ gap: 8 }}>
              {/* Quick (<30min) */}
              <HapticTouchableOpacity
                onPress={() => {
                  const isActive = filters.maxCookTime === 30;
                  handleQuickFilter('maxCookTime', isActive ? null : 30);
                  HapticPatterns.buttonPress();
                }}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  filters.maxCookTime === 30 ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={filters.maxCookTime === 30 ? {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                } : undefined}
              >
                <Icon name={Icons.COOK_TIME} size={14} color={filters.maxCookTime === 30 ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')} accessibilityLabel="Quick" />
                <Text className={`text-sm font-semibold ml-1.5 ${
                  filters.maxCookTime === 30 ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Quick
                </Text>
              </HapticTouchableOpacity>

              {/* Easy Difficulty */}
              <HapticTouchableOpacity
                onPress={() => {
                  const isActive = filters.difficulty.includes('Easy');
                  handleQuickFilter('difficulty',
                    isActive
                      ? filters.difficulty.filter(d => d !== 'Easy')
                      : [...filters.difficulty, 'Easy']
                  );
                  HapticPatterns.buttonPress();
                }}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  filters.difficulty.includes('Easy') ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={filters.difficulty.includes('Easy') ? {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                } : undefined}
              >
                <Text className="text-base">✨</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  filters.difficulty.includes('Easy') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Easy
                </Text>
              </HapticTouchableOpacity>

              {/* High Protein */}
              <HapticTouchableOpacity
                onPress={() => {
                  const isActive = filters.dietaryRestrictions.includes('High-Protein');
                  handleQuickFilter('dietaryRestrictions', 
                    isActive 
                      ? filters.dietaryRestrictions.filter(d => d !== 'High-Protein')
                      : [...filters.dietaryRestrictions, 'High-Protein']
                  );
                  HapticPatterns.buttonPress();
                }}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  filters.dietaryRestrictions.includes('High-Protein') ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={filters.dietaryRestrictions.includes('High-Protein') ? {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                } : undefined}
              >
                <Text className="text-base">💪</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  filters.dietaryRestrictions.includes('High-Protein') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  High Protein
                </Text>
              </HapticTouchableOpacity>

              {/* Low Cal */}
              <HapticTouchableOpacity
                onPress={() => {
                  const isActive = filters.dietaryRestrictions.includes('Low-Calorie');
                  handleQuickFilter('dietaryRestrictions',
                    isActive
                      ? filters.dietaryRestrictions.filter(d => d !== 'Low-Calorie')
                      : [...filters.dietaryRestrictions, 'Low-Calorie']
                  );
                  HapticPatterns.buttonPress();
                }}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  filters.dietaryRestrictions.includes('Low-Calorie') ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={filters.dietaryRestrictions.includes('Low-Calorie') ? {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                } : undefined}
              >
                <Text className="text-base">🥗</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  filters.dietaryRestrictions.includes('Low-Calorie') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Low Cal
                </Text>
              </HapticTouchableOpacity>

              {/* Meal Prep */}
              <HapticTouchableOpacity
                onPress={() => {
                  handleToggleMealPrepMode(!mealPrepMode);
                  HapticPatterns.buttonPress();
                }}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  mealPrepMode ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={mealPrepMode ? {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                } : undefined}
              >
                <Text className="text-base">🍱</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  mealPrepMode ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Meal Prep
                </Text>
              </HapticTouchableOpacity>

              {/* Budget Friendly */}
              <HapticTouchableOpacity
                onPress={() => {
                  const isActive = filters.dietaryRestrictions.includes('Budget-Friendly');
                  handleQuickFilter('dietaryRestrictions',
                    isActive
                      ? filters.dietaryRestrictions.filter(d => d !== 'Budget-Friendly')
                      : [...filters.dietaryRestrictions, 'Budget-Friendly']
                  );
                  HapticPatterns.buttonPress();
                }}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  filters.dietaryRestrictions.includes('Budget-Friendly') ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={filters.dietaryRestrictions.includes('Budget-Friendly') ? {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                } : undefined}
              >
                <Text className="text-base">💰</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  filters.dietaryRestrictions.includes('Budget-Friendly') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Budget
                </Text>
              </HapticTouchableOpacity>

              {/* One Pot */}
              <HapticTouchableOpacity
                onPress={() => {
                  const isActive = filters.dietaryRestrictions.includes('One-Pot');
                  handleQuickFilter('dietaryRestrictions',
                    isActive
                      ? filters.dietaryRestrictions.filter(d => d !== 'One-Pot')
                      : [...filters.dietaryRestrictions, 'One-Pot']
                  );
                  HapticPatterns.buttonPress();
                }}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  filters.dietaryRestrictions.includes('One-Pot') ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={filters.dietaryRestrictions.includes('One-Pot') ? {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                } : undefined}
              >
                <Text className="text-base">🍲</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  filters.dietaryRestrictions.includes('One-Pot') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  One Pot
                </Text>
              </HapticTouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Search Bar */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2.5">
          <Icon name={Icons.SEARCH} size={IconSizes.MD} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Search" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search recipes, ingredients, tags..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Reset to first page when search changes
              setCurrentPage(0);
            }}
            className="flex-1 text-gray-900 dark:text-gray-100 text-base"
            style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <HapticTouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setCurrentPage(0);
                HapticPatterns.buttonPress();
              }}
              className="ml-2"
            >
              <Icon name={Icons.CLOSE_CIRCLE} size={IconSizes.SM} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Clear search" />
            </HapticTouchableOpacity>
          )}
        </View>
        {searchQuery.length > 0 && (
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mt-2 ml-1">
            Results for "{searchQuery}"
          </Text>
        )}
      </View>

      {/* Main content area - FIXED SCROLLING ISSUE */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Spacing['3xl'] }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <AnimatedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Meal Prep Mode Header */}
        {mealPrepMode && (
          <View className="px-4 pt-4 pb-2">
            <View className={`rounded-xl p-4 border ${isDark ? 'border-orange-800' : 'border-orange-200'}`} style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}>
              <View className="flex-row items-center mb-2">
                <Text className="text-2xl mr-2">🍱</Text>
                <Text className="text-lg font-semibold" style={{ color: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
                  Meal Prep Mode Active
          </Text>
              </View>
              <Text className="text-sm" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
                Showing recipes suitable for batch cooking, freezing, and weekly meal prep
              </Text>
            </View>
          </View>
        )}

        {/* Spacer to replace pt-6 */}
        <View style={{ height: Spacing.xl }} />

        {/* Today's Recommendation / Featured Recipe - First section after filters */}
        {(!searchQuery || searchQuery.trim().length === 0) && (
        <View className="px-4">
          <View className="flex-row items-center justify-between" style={{ marginBottom: Spacing.xl }}>
            <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {mealPrepMode ? '🍱 Meal Prep Recipes' : "Today's Recommendation"}
            </Text>
              {suggestedRecipes.length > 1 && !mealPrepMode && (
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Swipe to see more top matches
                </Text>
              )}
            </View>
            <Animated.View
              style={{
                transform: [{ scale: randomButtonScale }],
                opacity: randomButtonOpacity,
              }}
            >
              <HapticTouchableOpacity
                onPress={handleRandomRecipe}
                hapticStyle="medium"
                className="px-3 py-1.5 rounded-lg flex-row items-center"
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Icon name={Icons.RANDOM_RECIPE} size={IconSizes.XS} color="#FFFFFF" accessibilityLabel="Random recipe" />
                <Text className="text-white text-sm font-semibold" style={{ marginLeft: 6 }}>
                  Random Recipe
                </Text>
              </HapticTouchableOpacity>
            </Animated.View>
          </View>
          {suggestedRecipes.length > 0 && (() => {
            // Get top 3 recipes for featured rotation
            const topRecipes = suggestedRecipes.slice(0, Math.min(3, suggestedRecipes.length));
            const recipe = topRecipes[featuredRecipeIndex] || topRecipes[0];
            const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
            const isFeedbackLoading = feedbackLoading === recipe.id;
            
            // Generate recommendation reasoning
            const getRecommendationReason = () => {
              const reasons: string[] = [];
              if (recipe.score?.matchPercentage && recipe.score.matchPercentage >= 85) {
                reasons.push('Perfect Match');
              }
              if (recipe.score?.macroScore && recipe.score.macroScore >= 80) {
                reasons.push('Matches Your Macros');
              }
              if (recipe.score?.tasteScore && recipe.score.tasteScore >= 80) {
                reasons.push('Your Preferred Cuisine');
              }
              if ((recipe as any).mealPrepSuitable || (recipe as any).freezable) {
                reasons.push('Great for Meal Prep');
              }
              if (recipe.cookTime && recipe.cookTime <= 30) {
                reasons.push('Quick Recipe');
              }
              if (recipe.healthGrade === 'A' || recipe.healthGrade === 'B') {
                reasons.push('Highly Nutritious');
              }
              return reasons.length > 0 ? reasons[0] : 'Recommended for You';
            };
            
            const recommendationReason = getRecommendationReason();
            const isTopMatch = recipe.score?.matchPercentage && recipe.score.matchPercentage >= 85;
            
            // Handle swipe to next featured recipe
            const handleSwipeNext = () => {
              if (topRecipes.length > 1) {
                const nextIndex = (featuredRecipeIndex + 1) % topRecipes.length;
                setFeaturedRecipeIndex(nextIndex);
                HapticPatterns.buttonPress();
              }
            };
            
            const handleSwipePrev = () => {
              if (topRecipes.length > 1) {
                const prevIndex = featuredRecipeIndex === 0 ? topRecipes.length - 1 : featuredRecipeIndex - 1;
                setFeaturedRecipeIndex(prevIndex);
                HapticPatterns.buttonPress();
              }
            };
            
            return (
              <View>
                <CardStack
                  onSwipeRight={() => {
                    handleLike(recipe.id);
                    handleSwipeNext();
                  }}
                  onSwipeLeft={() => {
                    handleDislike(recipe.id);
                    handleSwipeNext();
                  }}
                  onSwipeUp={handleSwipeNext}
                  onSwipeDown={handleSwipePrev}
                >
                  <RecipeCard
                    recipe={recipe}
                    variant="list"
                    onPress={handleRecipePress}
                    onLongPress={handleLongPress}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    onSave={openSavePicker}
                    feedback={feedback}
                    isFeedbackLoading={isFeedbackLoading}
                    isDark={isDark}
                    showDescription={true}
                    showTopMatchBadge={isTopMatch}
                    recommendationReason={recommendationReason}
                    showSwipeIndicators={topRecipes.length > 1}
                    swipeIndicatorCount={topRecipes.length}
                    swipeIndicatorIndex={featuredRecipeIndex}
                    className="mb-4"
                  />
                </CardStack>
              </View>
            );
          })()}
        </View>
        )}

        {/* Contextual Recipe Sections */}
        {groupRecipesIntoSections.filter(s => s.key !== 'perfect-match' && s.key !== 'meal-prep').length > 0 && (
          <View className="px-4">
            {groupRecipesIntoSections.filter(s => s.key !== 'perfect-match' && s.key !== 'meal-prep').map((section) => {
              const isCollapsed = collapsedSections[section.key];
              const isTimeBased = section.key.startsWith('time-based-');
              const isMealPrep = section.key === 'meal-prep';
              const isRecipesForYou = section.key === 'quick-easy';
              
              return (
                <View key={section.key} className="mb-6">
                  {/* Section Header */}
                  <HapticTouchableOpacity
                    onPress={() => toggleSection(section.key)}
                    className="flex-row items-center justify-between mb-4"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <Text className="text-2xl mr-2">{section.emoji}</Text>
                      <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {section.title}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {section.recipes.length} recipe{section.recipes.length !== 1 ? 's' : ''}
            </Text>
            </View>
                    </View>
                    <Icon
                      name={isCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
                      size={IconSizes.SM}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                      accessibilityLabel={isCollapsed ? 'Expand section' : 'Collapse section'}
                    />
                  </HapticTouchableOpacity>
                  
                  {/* Section Content */}
                  {!isCollapsed && (
                    <Animated.View>
                      {/* Time-based sections and meal prep render as carousel */}
                      {isTimeBased || isMealPrep ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 16 }}
                      decelerationRate="fast"
                      snapToInterval={280}
                      snapToAlignment="start"
                    >
                          {section.recipes.map((recipe) => {
              const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
              const isFeedbackLoading = feedbackLoading === recipe.id;
              
              return (
                          <View key={recipe.id} style={{ width: 280, marginRight: 12 }}>
                            <RecipeCard
                              recipe={recipe}
                              variant="carousel"
                              onPress={handleRecipePress}
                              onLongPress={handleLongPress}
                              onLike={handleLike}
                              onDislike={handleDislike}
                              onSave={openSavePicker}
                              feedback={feedback}
                              isFeedbackLoading={isFeedbackLoading}
                              isDark={isDark}
                                  showDescription={true}
                            />
                    </View>
            );
                      })}
                    </ScrollView>
                      ) : viewMode === 'grid' ? (
                        // Grid View - 2 Column Layout
                        <View className="flex-row flex-wrap" style={{ marginHorizontal: -Spacing.sm }}>
                          {section.recipes.map((recipe, index) => {
                            const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                            const isFeedbackLoading = feedbackLoading === recipe.id;

                            return (
                              <View key={recipe.id} style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.lg }}>
                                <RecipeCard
                                  recipe={recipe}
                                  variant="grid"
                                  onPress={handleRecipePress}
                                  onLongPress={handleLongPress}
                                  onLike={handleLike}
                                  onDislike={handleDislike}
                                  onSave={openSavePicker}
                                  feedback={feedback}
                                  isFeedbackLoading={isFeedbackLoading}
                                  isDark={isDark}
                                />
                  </View>
            );
                          })}
                    </View>
                      ) : (
                        // List View - standard RecipeCard
                        section.recipes.map((recipe, index) => {
                          const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                          const isFeedbackLoading = feedbackLoading === recipe.id;

                          return (
                            <View key={recipe.id}>
                              <CardStack
                                onSwipeRight={() => handleLike(recipe.id)}
                                onSwipeLeft={() => handleDislike(recipe.id)}
                                onSwipeUp={() => openSavePicker(recipe.id)}
                                onSwipeDown={() => handleRecipePress(recipe.id)}
                              >
                                <AnimatedRecipeCard
                                  index={index}
                                  recipeId={recipe.id}
                                  animatedIds={animatedRecipeIds}
                                  onAnimated={(id) => setAnimatedRecipeIds(prev => new Set(prev).add(id))}
                                  scrollY={scrollY}
                                >
                                  <RecipeCard
                                    recipe={recipe}
                                    variant="list"
                                    onPress={handleRecipePress}
                                    onLongPress={handleLongPress}
                                    onLike={handleLike}
                                    onDislike={handleDislike}
                                    onSave={openSavePicker}
                                    feedback={feedback}
                                    isFeedbackLoading={isFeedbackLoading}
                                    showDescription={true}
                                    isDark={isDark}
                                    className="mb-4"
                                  />
                  </AnimatedRecipeCard>
                              </CardStack>
                            </View>
                          );
                        })
                      )}
                      
                      {/* Inline Pagination for Recipes for You section */}
                      {isRecipesForYou && totalRecipes > 0 && paginationInfo.hasMultiplePages && (
                        <View className="mt-6">
                          {/* Recipe count summary */}
                          <Text className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                            Showing {currentPage * suggestedRecipes.length + 1}-{Math.min(currentPage * suggestedRecipes.length + suggestedRecipes.length, totalRecipes)} of {totalRecipes} recipes
                          </Text>
                          
                          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
                            <TouchableOpacity
                              onPress={handlePrevPage}
                              disabled={paginationInfo.isFirstPage || paginationLoading}
                              activeOpacity={0.7}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: (paginationInfo.isFirstPage || paginationLoading) ? 0.5 : 1,
                                backgroundColor: (paginationInfo.isFirstPage || paginationLoading)
                                  ? (isDark ? '#374151' : '#F3F4F6')
                                  : (isDark ? DarkColors.primary : Colors.primary),
                                minWidth: 100,
                              }}
                            >
                              <Icon 
                                name={Icons.CHEVRON_BACK} 
                                size={IconSizes.SM} 
                                color={(paginationInfo.isFirstPage || paginationLoading) ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF'} 
                                accessibilityLabel="Previous page"
                              />
                              <Text 
                                style={{ 
                                  fontSize: FontSize.base,
                                  fontWeight: '600',
                                  marginLeft: 4,
                                  color: (paginationInfo.isFirstPage || paginationLoading) ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF' 
                                }}
                              >
                                Previous
                              </Text>
                            </TouchableOpacity>

                            {/* Page Indicator */}
                            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                              {paginationLoading ? (
                                <AnimatedActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                              ) : (
                                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Page {currentPage + 1} of {paginationInfo.totalPages}
                                </Text>
                              )}
                            </View>

                            <TouchableOpacity
                              onPress={handleNextPage}
                              disabled={paginationInfo.isLastPage || paginationLoading}
                              activeOpacity={0.7}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: (paginationInfo.isLastPage || paginationLoading) ? 0.5 : 1,
                                backgroundColor: (paginationInfo.isLastPage || paginationLoading)
                                  ? (isDark ? '#374151' : '#F3F4F6')
                                  : (isDark ? DarkColors.primary : Colors.primary),
                                minWidth: 100,
                              }}
                            >
                              <Text 
                                style={{ 
                                  fontSize: FontSize.base,
                                  fontWeight: '600',
                                  marginRight: 4,
                                  color: (paginationInfo.isLastPage || paginationLoading) ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF' 
                                }}
                              >
                                Next
                              </Text>
                              <Icon 
                                name={Icons.CHEVRON_FORWARD} 
                                size={IconSizes.SM} 
                                color={(paginationInfo.isLastPage || paginationLoading) ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF'} 
                                accessibilityLabel="Next page"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </Animated.View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Personalized Sections - Moved to bottom after Recipes for You */}
        {user?.id && (
          <>
            {/* Your Favorites Section */}
            {likedRecipes.length > 0 && (() => {
              const isCollapsed = collapsedSections['your-favorites'];
              
              return (
                <View className="px-4 mb-6">
                  <HapticTouchableOpacity
                    onPress={() => toggleSection('your-favorites')}
                    className="flex-row items-center justify-between mb-4"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <Text className="text-2xl mr-2">❤️</Text>
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Your Favorites
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {likedRecipes.length} recipe{likedRecipes.length !== 1 ? 's' : ''} you've liked
                        </Text>
                      </View>
                    </View>
                        <Icon 
                      name={isCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
                          size={IconSizes.SM} 
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                      accessibilityLabel={isCollapsed ? 'Expand section' : 'Collapse section'}
                        />
                      </HapticTouchableOpacity>
                      
                  {!isCollapsed && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 16 }}
                      decelerationRate="fast"
                      snapToInterval={280}
                      snapToAlignment="start"
                    >
                      {likedRecipes.map((recipe, index) => {
                        const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                        const isFeedbackLoading = feedbackLoading === recipe.id;
                        
                        return (
                          <View key={recipe.id} style={{ width: 280, marginRight: 12 }}>
                            <RecipeCard
                              recipe={recipe}
                              variant="carousel"
                              onPress={handleRecipePress}
                              onLongPress={handleLongPress}
                              onLike={handleLike}
                              onDislike={handleDislike}
                              onSave={openSavePicker}
                              feedback={feedback}
                              isFeedbackLoading={isFeedbackLoading}
                              isDark={isDark}
                              showDescription={true}
                            />
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              );
            })()}

            {/* Perfect Match for You Section */}
            {(() => {
              const perfectMatchSection = groupRecipesIntoSections.find(s => s.key === 'perfect-match');
              if (!perfectMatchSection) return null;
              
              const isCollapsed = collapsedSections['perfect-match'];
              
              return (
                <View className="px-4 mb-6">
                      <HapticTouchableOpacity
                    onPress={() => toggleSection('perfect-match')}
                    className="flex-row items-center justify-between mb-4"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <Text className="text-2xl mr-2">{perfectMatchSection.emoji}</Text>
                      <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {perfectMatchSection.title}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {perfectMatchSection.recipes.length} recipe{perfectMatchSection.recipes.length !== 1 ? 's' : ''}
            </Text>
            </View>
                    </View>
                        <Icon 
                      name={isCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
                      size={IconSizes.SM}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                      accessibilityLabel={isCollapsed ? 'Expand section' : 'Collapse section'}
                        />
                      </HapticTouchableOpacity>
                  
                  {!isCollapsed && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ paddingRight: 16 }}
                          decelerationRate="fast"
                          snapToInterval={280}
                          snapToAlignment="start"
                        >
                      {perfectMatchSection.recipes.map((recipe) => {
              const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
              const isFeedbackLoading = feedbackLoading === recipe.id;
              
                            return (
                              <View key={recipe.id} style={{ width: 280, marginRight: 12 }}>
                                <RecipeCard
                                  recipe={recipe}
                                  variant="carousel"
                                  onPress={handleRecipePress}
                                  onLongPress={handleLongPress}
                                  onLike={handleLike}
                                  onDislike={handleDislike}
                                  onSave={openSavePicker}
                                  feedback={feedback}
                                  isFeedbackLoading={isFeedbackLoading}
                                  isDark={isDark}
                              showDescription={true}
                                />
                    </View>
                            );
                          })}
                        </ScrollView>
                  )}
                  </View>
              );
            })()}

            {/* Great for Meal Prep Section */}
            {(() => {
              const mealPrepSection = groupRecipesIntoSections.find(s => s.key === 'meal-prep');
              if (!mealPrepSection) return null;
              
              const isCollapsed = collapsedSections['meal-prep'];
              
              return (
                <View className="px-4 mb-6">
                  <HapticTouchableOpacity
                    onPress={() => toggleSection('meal-prep')}
                    className="flex-row items-center justify-between mb-4"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center flex-1">
                      <Text className="text-2xl mr-2">{mealPrepSection.emoji}</Text>
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {mealPrepSection.title}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {mealPrepSection.recipes.length} recipe{mealPrepSection.recipes.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <Icon 
                      name={isCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
                      size={IconSizes.SM} 
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                      accessibilityLabel={isCollapsed ? 'Expand section' : 'Collapse section'}
                    />
                  </HapticTouchableOpacity>
                  
                  {!isCollapsed && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 16 }}
                      decelerationRate="fast"
                      snapToInterval={280}
                      snapToAlignment="start"
                    >
                      {mealPrepSection.recipes.map((recipe) => {
                        const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                        const isFeedbackLoading = feedbackLoading === recipe.id;
                        
                        return (
                          <View key={recipe.id} style={{ width: 280, marginRight: 12 }}>
                            <RecipeCard
                              recipe={recipe}
                              variant="carousel"
                              onPress={handleRecipePress}
                              onLongPress={handleLongPress}
                              onLike={handleLike}
                              onDislike={handleDislike}
                              onSave={openSavePicker}
                              feedback={feedback}
                              isFeedbackLoading={isFeedbackLoading}
                              isDark={isDark}
                              showDescription={true}
                            />
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              );
            })()}

          </>
        )}

        {/* Pagination Component - Only show when there are multiple pages and no search query (inline pagination handles search) */}
        {totalRecipes > 0 && paginationInfo.hasMultiplePages && !searchQuery && (
        <View className="px-4 py-6">
            {/* Recipe count summary - use actual recipes count */}
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
              Showing {currentPage * suggestedRecipes.length + 1}-{Math.min(currentPage * suggestedRecipes.length + suggestedRecipes.length, totalRecipes)} of {totalRecipes} recipes
            </Text>
            
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={handlePrevPage}
                disabled={paginationInfo.isFirstPage || paginationLoading}
                activeOpacity={0.7}
              style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (paginationInfo.isFirstPage || paginationLoading) ? 0.5 : 1,
                  backgroundColor: (paginationInfo.isFirstPage || paginationLoading)
                    ? (isDark ? '#374151' : '#F3F4F6')
                    : (isDark ? DarkColors.primary : Colors.primary),
                minWidth: 100,
              }}
            >
              <Icon 
                name={Icons.CHEVRON_BACK} 
                size={IconSizes.SM} 
                  color={(paginationInfo.isFirstPage || paginationLoading) ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF'} 
                accessibilityLabel="Previous page"
              />
              <Text 
                  style={{ 
                    fontSize: FontSize.base,
                    fontWeight: '600',
                    marginLeft: 4,
                    color: (paginationInfo.isFirstPage || paginationLoading) ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF' 
                  }}
              >
                Previous
              </Text>
              </TouchableOpacity>

              {/* Page Indicator */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {paginationLoading ? (
                <AnimatedActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
              ) : (
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Page {currentPage + 1} of {paginationInfo.totalPages}
                </Text>
              )}
            </View>

              <TouchableOpacity
                onPress={handleNextPage}
                disabled={paginationInfo.isLastPage || paginationLoading}
                activeOpacity={0.7}
              style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (paginationInfo.isLastPage || paginationLoading) ? 0.5 : 1,
                  backgroundColor: (paginationInfo.isLastPage || paginationLoading)
                    ? (isDark ? '#374151' : '#F3F4F6')
                    : (isDark ? DarkColors.primary : Colors.primary),
                minWidth: 100,
              }}
            >
              <Text 
                  style={{ 
                    fontSize: FontSize.base,
                    fontWeight: '600',
                    marginRight: 4,
                    color: (paginationInfo.isLastPage || paginationLoading) ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF' 
                  }}
              >
                Next
              </Text>
              <Icon 
                name={Icons.CHEVRON_FORWARD} 
                size={IconSizes.SM} 
                  color={(paginationInfo.isLastPage || paginationLoading) ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF'} 
                accessibilityLabel="Next page"
              />
              </TouchableOpacity>
          </View>
        </View>
        )}
        
        {/* Show recipe count when there's only one page */}
        {totalRecipes > 0 && !paginationInfo.hasMultiplePages && (
          <View className="px-4 py-4">
            <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
              Showing all {totalRecipes} recipes
            </Text>
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
                  <View className={`w-5 h-5 mr-3 rounded border ${selectedCollectionIds.includes(c.id) ? '' : 'border-gray-300 dark:border-gray-600'}`} style={selectedCollectionIds.includes(c.id) ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                    borderColor: isDark ? DarkColors.primary : Colors.primary
                  } : undefined}>
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
                  <Text className="font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>+ Create new collection</Text>
                </HapticTouchableOpacity>
              )}
            </ScrollView>
            <View className="flex-row justify-end space-x-3">
              <HapticTouchableOpacity onPress={() => setSavePickerVisible(false)} className="px-4 py-3">
                <Text className="text-gray-700 dark:text-gray-100">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity onPress={handleSaveToCollections} className="px-4 py-3 rounded-lg" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
                <Text className="text-white font-semibold">Save</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Random Recipe Generation Modal */}
      <Modal
        visible={showRandomModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRandomModal(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <View style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: BorderRadius.lg,
            padding: Spacing.xl,
            margin: Spacing.xl,
            maxWidth: 300,
            alignItems: 'center'
          }}>
            <LoadingState config={HomeLoadingStates.generatingRecipe} />
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
      
      {/* Recipe Action Menu */}
      {selectedRecipeForMenu && (
        <RecipeActionMenu
          visible={actionMenuVisible}
          recipe={selectedRecipeForMenu}
          onClose={() => {
            setActionMenuVisible(false);
            setSelectedRecipeForMenu(null);
          }}
          onAddToMealPlan={handleAddToMealPlan}
          onViewSimilar={handleViewSimilar}
          onHealthify={handleHealthify}
          onReportIssue={handleReportIssue}
        />
      )}
    </SafeAreaView>
  );
}