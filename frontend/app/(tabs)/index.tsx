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
import MoodSelector, { MoodChip, MOODS, type Mood } from '../../components/ui/MoodSelector';

// Extracted components and utilities
import { FilterModal, RecipeSearchBar, FeaturedRecipeCarousel } from '../../components/home';
import {
  type UserFeedback,
  deduplicateRecipes,
  initializeFeedbackState,
  parseRecipeResponse,
  getScoreColor,
  getBorderColorFromScore,
  getShadowStyle,
  getRecipePlaceholder,
  truncateDescription,
} from '../../utils/recipeUtils';
import {
  CUISINE_OPTIONS,
  DIETARY_OPTIONS,
  DIFFICULTY_OPTIONS,
} from '../../utils/filterUtils';

// Extracted hooks
import { useViewMode } from '../../hooks/useViewMode';
import { useMealPrepMode } from '../../hooks/useMealPrepMode';
import { useTimeAwareMode } from '../../hooks/useTimeAwareMode';
import { useRecipePagination } from '../../hooks/useRecipePagination';
import { useRecipeInteractions } from '../../hooks/useRecipeInteractions';
import { useRecipeFilters } from '../../hooks/useRecipeFilters';

export default function HomeScreen() {
  console.log('[HomeScreen] Component rendering');
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
  const [quickMealsRecipes, setQuickMealsRecipes] = useState<SuggestedRecipe[]>([]); // Separate state for quick meals
  const [perfectMatchRecipes, setPerfectMatchRecipes] = useState<SuggestedRecipe[]>([]); // Separate state for perfect match recipes
  const [quickMealsCurrentIndex, setQuickMealsCurrentIndex] = useState(0); // Track which recipe user is viewing
  const [perfectMatchCurrentIndex, setPerfectMatchCurrentIndex] = useState(0); // Track which recipe user is viewing
  const [refreshingQuickMeals, setRefreshingQuickMeals] = useState(false);
  const [refreshingPerfectMatches, setRefreshingPerfectMatches] = useState(false);
  const [animatedRecipeIds, setAnimatedRecipeIds] = useState<Set<string>>(new Set());
  const [initialRecipesLoaded, setInitialRecipesLoaded] = useState(false); // Track if we've loaded initial recipes

  // Scroll position for parallax effect
  const scrollY = useRef(new Animated.Value(0)).current;

  // Recipe interactions (feedback, action menu) - using extracted hook
  const interactions = useRecipeInteractions();
  const { userFeedback, feedbackLoading, actionMenuVisible, selectedRecipeForMenu } = interactions;
  const { setUserFeedback, setFeedbackLoading, openActionMenu, closeActionMenu, updateRecipeFeedback, initializeFeedback } = interactions;

  // View mode state (grid/list) - using extracted hook
  const { viewMode, setViewMode, recipesPerPage: RECIPES_PER_PAGE, isLoaded: viewModeLoaded } = useViewMode('list');

  // Pagination state - using extracted hook
  const pagination = useRecipePagination({
    recipesPerPage: RECIPES_PER_PAGE,
  });
  const { currentPage, totalRecipes, paginationLoading, paginationInfo } = pagination;
  const { setCurrentPage, setTotalRecipes, setPaginationLoading } = pagination;

  const [allRecipes, setAllRecipes] = useState<SuggestedRecipe[]>([]); // Keep for backward compatibility
  
  
  // Featured recipe swipe state (cycle through top 3)
  const [featuredRecipeIndex, setFeaturedRecipeIndex] = useState(0);
  
  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  
  // Personalized sections state
  const [likedRecipes, setLikedRecipes] = useState<SuggestedRecipe[]>([]);
  const [recentlyViewedRecipes, setRecentlyViewedRecipes] = useState<string[]>([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  
  // Filter state - using extracted hook
  const filterHook = useRecipeFilters();
  const { filters, activeFilters, filtersLoaded, showFilterModal } = filterHook;
  const { setFilters, openFilterModal, closeFilterModal, handleFilterChange, updateActiveFilters, saveFilters, resetFilters } = filterHook;
  
  // Collections state for save to collection
  const [collections, setCollections] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  const [savePickerVisible, setSavePickerVisible] = useState(false);
  const [savePickerRecipeId, setSavePickerRecipeId] = useState<string | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // First-time user guidance
  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(false);

  // Meal prep mode state - using extracted hook
  const { mealPrepMode, setMealPrepMode, toggleMealPrepMode, isLoaded: mealPrepLoaded } = useMealPrepMode();

  // Quick macro filters (Home Page 2.0)
  const [quickMacroFilters, setQuickMacroFilters] = useState<{
    highProtein: boolean;
    lowCarb: boolean;
    lowCalorie: boolean;
  }>({
    highProtein: false,
    lowCarb: false,
    lowCalorie: false,
  });

  // Time-aware suggestions toggle (Home Page 2.0) - using extracted hook
  const { timeAwareMode, setTimeAwareMode, toggleTimeAwareMode, currentMealPeriod, isLoaded: timeAwareLoaded } = useTimeAwareMode();

  // Recipe of the Day (Home Page 2.0)
  const [recipeOfTheDay, setRecipeOfTheDay] = useState<SuggestedRecipe | null>(null);
  const [loadingRecipeOfTheDay, setLoadingRecipeOfTheDay] = useState(false);

  // Mood-based recommendations (Home Page 2.0)
  const [selectedMood, setSelectedMood] = useState<{ id: string; label: string; emoji: string; color: string } | null>(null);
  const [showMoodSelector, setShowMoodSelector] = useState(false);

  // Track if we're loading from filters to prevent useApi from interfering
  const [loadingFromFilters, setLoadingFromFilters] = useState(false);

  // Track initial loading state for paginated fetch
  const [initialLoading, setInitialLoading] = useState(true);

  // Use the useApi hook for fetching suggested recipes (only when no filters)
  const { data: recipesData, loading, error, refetch } = useApi('/recipes/suggested');

  // Debug logging for loading states
  useEffect(() => {
    console.log('[HomeScreen] State:', {
      suggestedRecipesLength: suggestedRecipes.length,
      loading,
      initialLoading,
      loadingFromFilters,
      filtersLoaded,
      error: error ? String(error) : null,
    });
  }, [suggestedRecipes.length, loading, initialLoading, loadingFromFilters, filtersLoaded, error]);

  // Apply saved filters when they're loaded (hook handles loading from storage)
  useEffect(() => {
    const applySavedFilters = async () => {
      // Only run once when filters are first loaded and have active values
      if (filtersLoaded && activeFilters.length > 0 && !initialRecipesLoaded && !loadingFromFilters) {
        setLoadingFromFilters(true);
        try {
          const response = await recipeApi.getAllRecipes({
            page: 0,
            limit: RECIPES_PER_PAGE,
            cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
            dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
            maxCookTime: filters.maxCookTime || undefined,
            difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
            mealPrepMode: mealPrepMode,
            search: searchQuery || undefined,
          });

          const { recipes, total } = parseRecipeResponse(response.data);
          console.log(`📱 HomeScreen: Loaded filtered recipes: ${recipes.length}, total: ${total}`);

          setTotalRecipes(total);
          setSuggestedRecipes(recipes);
          setAllRecipes(recipes);
          setCurrentPage(0);
          setInitialRecipesLoaded(true);

          // Initialize feedback state
          setUserFeedback(initializeFeedbackState(recipes));
        } catch (error) {
          console.error('❌ Error applying saved filters:', error);
        } finally {
          setLoadingFromFilters(false);
          setInitialLoading(false);
        }
      }
    };

    applySavedFilters();
  }, [filtersLoaded, activeFilters.length]);



  // Reset pagination when view mode changes (grid/list)
  useEffect(() => {
    setCurrentPage(0); // Reset to first page when view mode changes
  }, [viewMode]);


  // Fetch Recipe of the Day on mount (Home Page 2.0)
  useEffect(() => {
    const fetchRecipeOfTheDay = async () => {
      try {
        setLoadingRecipeOfTheDay(true);
        const response = await recipeApi.getRecipeOfTheDay();
        if (response.data?.recipe) {
          setRecipeOfTheDay(response.data.recipe);
          console.log('🌟 Recipe of the Day loaded:', response.data.recipe.title);
        }
      } catch (error: any) {
        console.error('❌ Error fetching Recipe of the Day:', error);
      } finally {
        setLoadingRecipeOfTheDay(false);
      }
    };
    fetchRecipeOfTheDay();
  }, []);

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
  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode); // Hook handles persistence automatically
    HapticPatterns.buttonPress();
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
    setMealPrepMode(value); // Hook handles persistence automatically
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
      HapticPatterns.error();
    }
  };


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

    // Use shuffle mode for pull-to-discover (Home Page 2.0)
    try {
      const response = await recipeApi.getAllRecipes({
        page: 0,
        limit: RECIPES_PER_PAGE,
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
        mealPrepMode: mealPrepMode,
        search: searchQuery || undefined,
        ...getMacroFilterParams(),
        useTimeAwareDefaults: timeAwareMode,
        shuffle: true, // Enable shuffle for fresh discovery on pull
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
        setRefreshing(false);
        return;
      }

      setTotalRecipes(total);
      setSuggestedRecipes(recipes);
      setAllRecipes(recipes);
      setInitialRecipesLoaded(true);

      const initialFeedback: Record<string, UserFeedback> = {};
      recipes.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
    } catch (error: any) {
      console.error('❌ Error refreshing recipes:', error);
    }

    setRefreshing(false);
  };

  // Fetch initial page of all recipes on mount (server-side pagination)
  useEffect(() => {
    const fetchInitialRecipes = async () => {
      if (!filtersLoaded) return; // Wait for filters to load first

      // Only fetch from paginated API if no filters are active and not in meal prep mode
      if (activeFilters.length === 0 && !mealPrepMode && !loadingFromFilters) {
        setInitialLoading(true);
        try {
          console.log('📄 Fetching initial page of all recipes');
          const response = await recipeApi.getAllRecipes({
            page: 0,
            limit: RECIPES_PER_PAGE,
            search: searchQuery || undefined,
            ...getMacroFilterParams(),
            useTimeAwareDefaults: timeAwareMode,
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
            setInitialLoading(false);
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
        } finally {
          setInitialLoading(false);
        }
      } else {
        // If filters are active or in meal prep mode, we're not doing initial load
        setInitialLoading(false);
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
          
          // Initialize feedback for new recipes
          setUserFeedback({ ...userFeedback, ...initializeFeedbackState(recipes) });
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

  // Refs to track current recipes for loadMore functionality
  const quickMealsRecipesRef = useRef<SuggestedRecipe[]>([]);
  const perfectMatchRecipesRef = useRef<SuggestedRecipe[]>([]);
  
  // Refs for ScrollView components to control scroll position
  const quickMealsScrollViewRef = useRef<ScrollView>(null);
  const perfectMatchScrollViewRef = useRef<ScrollView>(null);
  
  // Update refs when recipes change
  useEffect(() => {
    quickMealsRecipesRef.current = quickMealsRecipes;
  }, [quickMealsRecipes]);
  
  useEffect(() => {
    perfectMatchRecipesRef.current = perfectMatchRecipes;
  }, [perfectMatchRecipes]);

  // Fetch quick meals separately (independent of pagination)
  const fetchQuickMeals = useCallback(async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshingQuickMeals(true);
      }
      
      // Use a random page to get variety when refreshing
      const page = refresh ? Math.floor(Math.random() * 10) : 0;
      console.log(`⚡ Fetching quick meals (≤30 min)... ${refresh ? 'refreshing' : 'initial'}`);
      
      const response = await recipeApi.getAllRecipes({
        page,
        limit: 5, // Only get 5 recipes
        maxCookTime: 30, // Only recipes ≤ 30 minutes
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        mealPrepMode: mealPrepMode,
      });
      
      const responseData = response.data;
      let recipes: SuggestedRecipe[] = [];
      
      if (responseData && responseData.recipes && responseData.pagination) {
        recipes = responseData.recipes;
      } else if (Array.isArray(responseData)) {
        recipes = responseData;
      }
      
      // Filter to ensure all are actually ≤ 30 minutes
      const quickMeals = recipes.filter(r => r.cookTime && r.cookTime <= 30).slice(0, 5);
      
      // Avoid duplicates with existing recipes
      if (refresh && quickMealsRecipesRef.current.length > 0) {
        const existingIds = new Set(quickMealsRecipesRef.current.map(r => r.id));
        const uniqueMeals = quickMeals.filter(r => !existingIds.has(r.id));
        
        // If we got duplicates, try fetching from a different page
        if (uniqueMeals.length < 3 && quickMeals.length === 5) {
          // Retry with different page
          const retryPage = (page + 1) % 10;
          const retryResponse = await recipeApi.getAllRecipes({
            page: retryPage,
            limit: 5,
            maxCookTime: 30,
            cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
            dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
            mealPrepMode: mealPrepMode,
          });
          const retryData = retryResponse.data;
          const retryRecipes = Array.isArray(retryData) ? retryData : (retryData?.recipes || []);
          const retryMeals = retryRecipes.filter((r: SuggestedRecipe) => r.cookTime && r.cookTime <= 30 && !existingIds.has(r.id)).slice(0, 5);
          setQuickMealsRecipes(retryMeals.length > 0 ? retryMeals : quickMeals);
        } else {
          setQuickMealsRecipes(uniqueMeals.length > 0 ? uniqueMeals : quickMeals);
        }
      } else {
        setQuickMealsRecipes(quickMeals);
      }
      
      // Reset scroll position
      setQuickMealsCurrentIndex(0);
      // Scroll to first card after a brief delay to ensure state is updated
      setTimeout(() => {
        quickMealsScrollViewRef.current?.scrollTo({ x: 0, animated: true });
      }, 100);
      console.log(`⚡ Found ${quickMeals.length} quick meals`);
    } catch (error) {
      console.error('❌ Error fetching quick meals:', error);
      if (!refresh) {
        setQuickMealsRecipes([]);
      }
    } finally {
      if (refresh) {
        setRefreshingQuickMeals(false);
      }
    }
  }, [filters.cuisines, filters.dietaryRestrictions, mealPrepMode]);

  // Fetch perfect match recipes separately (independent of pagination)
  const fetchPerfectMatches = useCallback(async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshingPerfectMatches(true);
      }
      
      console.log(`⭐ Fetching perfect match recipes (≥85% match)... ${refresh ? 'refreshing' : 'initial'}`);
      // Use suggested recipes endpoint which includes scoring
      const response = await recipeApi.getSuggestedRecipes({
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        mealPrepMode: mealPrepMode,
        offset: refresh ? Math.floor(Math.random() * 50) : 0, // Random offset when refreshing for variety
      });
      
      const recipes: SuggestedRecipe[] = Array.isArray(response.data) ? response.data : [];
      
      // Filter for recipes with matchPercentage >= 85
      const perfectMatches = recipes.filter(r => 
        r.score?.matchPercentage && r.score.matchPercentage >= 85
      );
      
      // Sort by match percentage and take top 5
      const sortedMatches = perfectMatches
        .sort((a, b) => (b.score?.matchPercentage || 0) - (a.score?.matchPercentage || 0))
        .slice(0, 5);
      
      // Avoid duplicates with existing recipes
      if (refresh && perfectMatchRecipesRef.current.length > 0) {
        const existingIds = new Set(perfectMatchRecipesRef.current.map(r => r.id));
        const uniqueMatches = sortedMatches.filter(r => !existingIds.has(r.id));
        setPerfectMatchRecipes(uniqueMatches.length > 0 ? uniqueMatches : sortedMatches);
      } else {
        setPerfectMatchRecipes(sortedMatches);
      }
      
      // Reset scroll position
      setPerfectMatchCurrentIndex(0);
      // Scroll to first card after a brief delay to ensure state is updated
      setTimeout(() => {
        perfectMatchScrollViewRef.current?.scrollTo({ x: 0, animated: true });
      }, 100);
      console.log(`⭐ Found ${sortedMatches.length} perfect match recipes`);
    } catch (error) {
      console.error('❌ Error fetching perfect match recipes:', error);
      if (!refresh) {
        setPerfectMatchRecipes([]);
      }
    } finally {
      if (refresh) {
        setRefreshingPerfectMatches(false);
      }
    }
  }, [filters.cuisines, filters.dietaryRestrictions, filters.maxCookTime, mealPrepMode]);

  // Fetch quick meals and perfect matches when filters are loaded and when filters/meal prep mode changes
  useEffect(() => {
    if (filtersLoaded && !searchQuery) { // Only fetch when not searching
      fetchQuickMeals();
      fetchPerfectMatches();
    }
  }, [filtersLoaded, filters.cuisines, filters.dietaryRestrictions, filters.maxCookTime, mealPrepMode, searchQuery, fetchQuickMeals, fetchPerfectMatches]);

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
    openActionMenu(recipe); // Hook handles setting recipe and showing menu
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
        closeActionMenu();
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
        closeActionMenu();
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
    closeActionMenu();
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
    openFilterModal();
  };


  // Toggle time-aware mode (Home Page 2.0)
  const handleToggleTimeAwareMode = () => {
    toggleTimeAwareMode(); // Hook handles state and persistence automatically
    HapticPatterns.buttonPress();

    // Refresh recipes with new setting
    onRefresh();
  };

  // Handle mood selection (Home Page 2.0)
  const handleMoodSelect = async (mood: Mood | null) => {
    setSelectedMood(mood);
    setShowMoodSelector(false);

    // Fetch recipes with mood filter
    try {
      setPaginationLoading(true);
      const response = await recipeApi.getAllRecipes({
        page: 0,
        limit: RECIPES_PER_PAGE,
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
        mealPrepMode: mealPrepMode,
        search: searchQuery || undefined,
        ...getMacroFilterParams(),
        useTimeAwareDefaults: timeAwareMode,
        mood: mood?.id,
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
        setPaginationLoading(false);
        return;
      }

      setTotalRecipes(total);
      setSuggestedRecipes(recipes);
      setAllRecipes(recipes);
      setCurrentPage(0);

      const initialFeedback: Record<string, UserFeedback> = {};
      recipes.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);

      if (mood) {
        console.log(`🎭 Mood filter applied: ${mood.label}, got ${recipes.length} recipes`);
      } else {
        console.log('🎭 Mood filter cleared');
      }
    } catch (error: any) {
      console.error('❌ Error applying mood filter:', error);
      HapticPatterns.error();
    } finally {
      setPaginationLoading(false);
    }
  };

  // Get macro filter params for API calls (Home Page 2.0)
  const getMacroFilterParams = () => {
    const params: { minProtein?: number; maxCarbs?: number; maxCalories?: number } = {};
    if (quickMacroFilters.highProtein) params.minProtein = 30;
    if (quickMacroFilters.lowCarb) params.maxCarbs = 30;
    if (quickMacroFilters.lowCalorie) params.maxCalories = 400;
    return params;
  };

  // Handler for quick macro filters (Home Page 2.0)
  const handleQuickMacroFilter = async (filterType: 'highProtein' | 'lowCarb' | 'lowCalorie') => {
    const newMacroFilters = {
      ...quickMacroFilters,
      [filterType]: !quickMacroFilters[filterType],
    };
    setQuickMacroFilters(newMacroFilters);
    HapticPatterns.buttonPress();

    // Apply filter immediately
    try {
      setPaginationLoading(true);
      const macroParams: { minProtein?: number; maxCarbs?: number; maxCalories?: number } = {};
      if (newMacroFilters.highProtein) macroParams.minProtein = 30;
      if (newMacroFilters.lowCarb) macroParams.maxCarbs = 30;
      if (newMacroFilters.lowCalorie) macroParams.maxCalories = 400;

      const response = await recipeApi.getAllRecipes({
        page: 0,
        limit: RECIPES_PER_PAGE,
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
        mealPrepMode: mealPrepMode,
        search: searchQuery || undefined,
        ...macroParams,
        useTimeAwareDefaults: timeAwareMode,
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
        setPaginationLoading(false);
        return;
      }

      setTotalRecipes(total);
      setSuggestedRecipes(recipes);
      setAllRecipes(recipes);
      setCurrentPage(0);

      const initialFeedback: Record<string, UserFeedback> = {};
      recipes.forEach((recipe: SuggestedRecipe) => {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      });
      setUserFeedback(initialFeedback);
    } catch (error: any) {
      console.error('❌ Error applying quick macro filter:', error);
      HapticPatterns.error();
    } finally {
      setPaginationLoading(false);
    }
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
    
    // Update state and save (using hook functions)
    setFilters(newFilters);
    await saveFilters(); // Hook will save the updated filters
    updateActiveFilters(); // Hook will recompute active filter labels
    
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
        search: searchQuery || undefined,
        ...getMacroFilterParams(),
        useTimeAwareDefaults: timeAwareMode,
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
    // Update active filters display and save to storage (using hook functions)
    updateActiveFilters();
    await saveFilters();
    closeFilterModal();
    
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
    // Reset filters using hook function (handles storage and state)
    await resetFilters();
    
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
      
      // Update UI immediately (using hook function)
      updateRecipeFeedback(recipeId, { liked: true, disliked: false });
      
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
      
      // Revert UI state on error (using hook function)
      updateRecipeFeedback(recipeId, { liked: false, disliked: false });
      
      Alert.alert('Error', 'Failed to like recipe');
    } finally {
      setFeedbackLoading(null);
    }
  };

  const handleDislike = async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);
      console.log('📱 HomeScreen: Disliking recipe', recipeId);
      
      // Update UI immediately (using hook function)
      updateRecipeFeedback(recipeId, { liked: false, disliked: true });
      
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
      
      // Revert UI state on error (using hook function)
      updateRecipeFeedback(recipeId, { liked: false, disliked: false });
      
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


  // Quick Meals section - always shows easy-to-make meals
  const getQuickMealsSection = useMemo(() => {
    return {
      sectionTitle: 'Quick Meals',
      emoji: '⚡',
    };
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
    
    // Quick Meals section - uses separately fetched quick meals (not from paginated results)
    // Only show if not searching (search results should be focused)
    if (!searchQuery && quickMealsRecipes.length > 0) {
      // Filter out any recipes that are already in other sections
      const availableQuickMeals = quickMealsRecipes.filter(r => !usedHighlightIds.has(r.id));
      if (availableQuickMeals.length > 0) {
        // Always show max 5 recipes
        const quickMeals = availableQuickMeals.slice(0, 5);
        quickMeals.forEach(r => usedHighlightIds.add(r.id));
        
        sections.push({
          title: getQuickMealsSection.sectionTitle,
          emoji: getQuickMealsSection.emoji,
          recipes: quickMeals,
          key: 'quick-meals',
          priority: 10 // Lower priority - shows after Recipes for You
        });
      }
    }
    
    // Perfect Match for You - uses separately fetched perfect match recipes (not from paginated results)
    // Only show if not searching (search results should be focused)
    if (!searchQuery && perfectMatchRecipes.length > 0) {
      // Filter out any recipes that are already in other sections
      const availablePerfectMatches = perfectMatchRecipes.filter(r => !usedHighlightIds.has(r.id));
      if (availablePerfectMatches.length > 0) {
        // Always show max 5 recipes, sorted by match percentage
        const perfectMatches = availablePerfectMatches
          .sort((a, b) => (b.score?.matchPercentage || 0) - (a.score?.matchPercentage || 0))
          .slice(0, 5);
        perfectMatches.forEach(r => usedHighlightIds.add(r.id));
        
        sections.push({
          title: 'Perfect Match for You',
          emoji: '⭐',
          recipes: perfectMatches,
          key: 'perfect-match'
        });
      }
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
        title: 'For You',
        emoji: '🍳',
        recipes: recipesForYou,
        key: 'quick-easy',
        priority: 5 // Shows before Quick Meals section
      });
    }
    
    // Sort sections by priority (Quick Meals first, then others)
    sections.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    
    return sections;
  }, [suggestedRecipes, quickMealsRecipes, perfectMatchRecipes, mealPrepMode, isDark, getQuickMealsSection, viewMode, searchQuery]);

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
  if ((loading || initialLoading) && suggestedRecipes.length === 0) {
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
  if (suggestedRecipes.length === 0 && !loading && !loadingFromFilters && !initialLoading) {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }} edges={['top']}>
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
          {/* Time-Aware Mode Indicator (Home Page 2.0) */}
          <HapticTouchableOpacity
            onPress={handleToggleTimeAwareMode}
            className={`flex-row items-center px-2 py-1 rounded-lg mr-2 ${
              timeAwareMode ? '' : 'bg-gray-100 dark:bg-gray-700'
            }`}
            style={timeAwareMode ? {
              backgroundColor: isDark ? `${Colors.primary}33` : `${Colors.primary}22`,
            } : undefined}
            accessibilityLabel={`${currentMealPeriod.label} time suggestions ${timeAwareMode ? 'enabled' : 'disabled'}`}
          >
            <Text className="text-sm">{currentMealPeriod.emoji}</Text>
            <Text className={`text-xs font-medium ml-1 ${
              timeAwareMode ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {currentMealPeriod.label}
            </Text>
          </HapticTouchableOpacity>

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
              {/* Mood Filter (Home Page 2.0) */}
              <HapticTouchableOpacity
                onPress={() => setShowMoodSelector(true)}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  selectedMood ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={selectedMood ? {
                  backgroundColor: `${selectedMood.color}22`,
                  borderWidth: 1,
                  borderColor: selectedMood.color,
                } : undefined}
              >
                <Text className="text-base">{selectedMood?.emoji || '🎭'}</Text>
                <Text className={`text-sm font-semibold ml-1.5`} style={selectedMood ? { color: selectedMood.color } : undefined}>
                  {selectedMood?.label || 'Mood'}
                </Text>
                {selectedMood && (
                  <HapticTouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleMoodSelect(null);
                    }}
                    className="ml-1.5"
                    hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
                  >
                    <Text style={{ color: selectedMood.color, fontSize: 12 }}>✕</Text>
                  </HapticTouchableOpacity>
                )}
              </HapticTouchableOpacity>

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

              {/* High Protein (30g+) - Home Page 2.0 Macro Filter */}
              <HapticTouchableOpacity
                onPress={() => handleQuickMacroFilter('highProtein')}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  quickMacroFilters.highProtein ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={quickMacroFilters.highProtein ? {
                  backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                } : undefined}
              >
                <Text className="text-base">💪</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  quickMacroFilters.highProtein ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  High Protein
                </Text>
              </HapticTouchableOpacity>

              {/* Low Carb (<30g) - Home Page 2.0 Macro Filter */}
              <HapticTouchableOpacity
                onPress={() => handleQuickMacroFilter('lowCarb')}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  quickMacroFilters.lowCarb ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={quickMacroFilters.lowCarb ? {
                  backgroundColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
                } : undefined}
              >
                <Text className="text-base">🥩</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  quickMacroFilters.lowCarb ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  Low Carb
                </Text>
              </HapticTouchableOpacity>

              {/* Low Calorie (<400) - Home Page 2.0 Macro Filter */}
              <HapticTouchableOpacity
                onPress={() => handleQuickMacroFilter('lowCalorie')}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  quickMacroFilters.lowCalorie ? '' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                style={quickMacroFilters.lowCalorie ? {
                  backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                } : undefined}
              >
                <Text className="text-base">🥗</Text>
                <Text className={`text-sm font-semibold ml-1.5 ${
                  quickMacroFilters.lowCalorie ? 'text-white' : 'text-gray-700 dark:text-gray-300'
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

      {/* Main content area - FIXED: Removed AnimatedRefreshControl */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={true}
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

        {/* Recipe of the Day (Home Page 2.0) */}
        {recipeOfTheDay && !searchQuery && !mealPrepMode && (
          <View className="px-4 mb-6">
            <View className="flex-row items-center mb-3">
              <Text className="text-xl">🌟</Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 ml-2">
                Recipe of the Day
              </Text>
              <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? `${Colors.primary}33` : `${Colors.primary}22` }}>
                <Text className="text-xs font-medium" style={{ color: isDark ? Colors.primaryLight : Colors.primaryDark }}>
                  Featured
                </Text>
              </View>
            </View>
            <RecipeCard
              recipe={recipeOfTheDay}
              variant="list"
              onPress={handleRecipePress}
              onLongPress={handleLongPress}
              onLike={handleLike}
              onDislike={handleDislike}
              onSave={openSavePicker}
              feedback={userFeedback[recipeOfTheDay.id] || { liked: false, disliked: false }}
              isFeedbackLoading={feedbackLoading === recipeOfTheDay.id}
              isDark={isDark}
              showDescription={true}
              showTopMatchBadge={true}
              recommendationReason="Today's Pick"
            />
          </View>
        )}

        {/* Today's Recommendation / Featured Recipe - First section after filters */}
        {(!searchQuery || searchQuery.trim().length === 0) && (
          <FeaturedRecipeCarousel
            recipes={suggestedRecipes}
            currentIndex={featuredRecipeIndex}
            onIndexChange={setFeaturedRecipeIndex}
            mealPrepMode={mealPrepMode}
            randomButtonScale={randomButtonScale}
            randomButtonOpacity={randomButtonOpacity}
            onRandomRecipe={handleRandomRecipe}
            userFeedback={userFeedback}
            feedbackLoading={feedbackLoading}
            onLike={handleLike}
            onDislike={handleDislike}
            onRecipePress={handleRecipePress}
            onLongPress={handleLongPress}
            onSave={openSavePicker}
          />
        )}

        {/* Contextual Recipe Sections */}
        {groupRecipesIntoSections.filter(s => s.key !== 'perfect-match' && s.key !== 'meal-prep').length > 0 && (
          <View className="px-4">
            {groupRecipesIntoSections.filter(s => s.key !== 'perfect-match' && s.key !== 'meal-prep').map((section) => {
              const isCollapsed = collapsedSections[section.key];
              const isQuickMeals = section.key === 'quick-meals';
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
                      {/* Quick Meals section and meal prep render as carousel */}
                      {isQuickMeals || isMealPrep ? (
                    <ScrollView
                      ref={isQuickMeals ? quickMealsScrollViewRef : undefined}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 16 }}
                      decelerationRate="fast"
                      snapToInterval={280}
                      snapToAlignment="start"
                      onScroll={(event) => {
                        if (!isQuickMeals) return; // Only handle for quick meals
                        const { contentOffset } = event.nativeEvent;
                        const scrollPosition = contentOffset.x;
                        const cardWidth = 280 + 12; // card width + margin
                        const currentIndex = Math.round(scrollPosition / cardWidth);
                        setQuickMealsCurrentIndex(currentIndex);
                      }}
                      scrollEventThrottle={100}
                      onMomentumScrollEnd={(event) => {
                        if (!isQuickMeals) return;
                        const { contentOffset } = event.nativeEvent;
                        const scrollPosition = contentOffset.x;
                        const cardWidth = 280 + 12;
                        const currentIndex = Math.round(scrollPosition / cardWidth);
                        setQuickMealsCurrentIndex(currentIndex);
                      }}
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
                      {/* Refresh prompt when on last recipe */}
                      {isQuickMeals && quickMealsCurrentIndex >= section.recipes.length - 1 && section.recipes.length >= 5 && (
                        <View style={{ width: 280, marginRight: 12, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                          <View style={{ 
                            backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)',
                            borderRadius: 12,
                            padding: 16,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)',
                          }}>
                            <Ionicons name="refresh-outline" size={32} color={isDark ? DarkColors.primary : Colors.primary} style={{ marginBottom: 8 }} />
                            <Text style={{ 
                              fontSize: 14, 
                              fontWeight: '600',
                              color: isDark ? DarkColors.text : Colors.text,
                              marginBottom: 4,
                              textAlign: 'center',
                            }}>
                              Want more recipes?
                            </Text>
                            <Text style={{ 
                              fontSize: 12, 
                              color: isDark ? '#9CA3AF' : '#6B7280',
                              marginBottom: 12,
                              textAlign: 'center',
                            }}>
                              Swipe to refresh and get new quick meals
                            </Text>
                            <HapticTouchableOpacity
                              onPress={() => {
                                HapticPatterns.buttonPress();
                                fetchQuickMeals(true);
                              }}
                              disabled={refreshingQuickMeals}
                              style={{
                                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 8,
                                opacity: refreshingQuickMeals ? 0.7 : 1,
                              }}
                            >
                              {refreshingQuickMeals ? (
                                <AnimatedActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                                  Refresh Recipes
                                </Text>
                              )}
                            </HapticTouchableOpacity>
                          </View>
                        </View>
                      )}
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
                      {/* Refresh prompt when on last recipe */}
                      {perfectMatchCurrentIndex >= perfectMatchSection.recipes.length - 1 && perfectMatchSection.recipes.length >= 5 && (
                        <View style={{ width: 280, marginRight: 12, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                          <View style={{ 
                            backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)',
                            borderRadius: 12,
                            padding: 16,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)',
                          }}>
                            <Ionicons name="refresh-outline" size={32} color={isDark ? DarkColors.primary : Colors.primary} style={{ marginBottom: 8 }} />
                            <Text style={{ 
                              fontSize: 14, 
                              fontWeight: '600',
                              color: isDark ? DarkColors.text : Colors.text,
                              marginBottom: 4,
                              textAlign: 'center',
                            }}>
                              Want more recipes?
                            </Text>
                            <Text style={{ 
                              fontSize: 12, 
                              color: isDark ? '#9CA3AF' : '#6B7280',
                              marginBottom: 12,
                              textAlign: 'center',
                            }}>
                              Swipe to refresh and get new perfect matches
                            </Text>
                            <HapticTouchableOpacity
                              onPress={() => {
                                HapticPatterns.buttonPress();
                                fetchPerfectMatches(true);
                              }}
                              disabled={refreshingPerfectMatches}
                              style={{
                                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 8,
                                opacity: refreshingPerfectMatches ? 0.7 : 1,
                              }}
                            >
                              {refreshingPerfectMatches ? (
                                <AnimatedActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                                  Refresh Recipes
                                </Text>
                              )}
                            </HapticTouchableOpacity>
                          </View>
                        </View>
                      )}
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
                          ref={perfectMatchScrollViewRef}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ paddingRight: 16 }}
                          decelerationRate="fast"
                          snapToInterval={280}
                          snapToAlignment="start"
                          onScroll={(event) => {
                            const { contentOffset } = event.nativeEvent;
                            const scrollPosition = contentOffset.x;
                            const cardWidth = 280 + 12; // card width + margin
                            const currentIndex = Math.round(scrollPosition / cardWidth);
                            setPerfectMatchCurrentIndex(currentIndex);
                          }}
                          scrollEventThrottle={100}
                          onMomentumScrollEnd={(event) => {
                            const { contentOffset } = event.nativeEvent;
                            const scrollPosition = contentOffset.x;
                            const cardWidth = 280 + 12;
                            const currentIndex = Math.round(scrollPosition / cardWidth);
                            setPerfectMatchCurrentIndex(currentIndex);
                          }}
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
                          {/* Refresh prompt when on last recipe */}
                          {perfectMatchCurrentIndex >= perfectMatchSection.recipes.length - 1 && perfectMatchSection.recipes.length >= 5 && (
                            <View style={{ width: 280, marginRight: 12, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                              <View style={{ 
                                backgroundColor: isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)',
                                borderRadius: 12,
                                padding: 16,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)',
                              }}>
                                <Ionicons name="refresh-outline" size={32} color={isDark ? DarkColors.primary : Colors.primary} style={{ marginBottom: 8 }} />
                                <Text style={{ 
                                  fontSize: 14, 
                                  fontWeight: '600',
                                  color: isDark ? DarkColors.text : Colors.text,
                                  marginBottom: 4,
                                  textAlign: 'center',
                                }}>
                                  Want more recipes?
                                </Text>
                                <Text style={{ 
                                  fontSize: 12, 
                                  color: isDark ? '#9CA3AF' : '#6B7280',
                                  marginBottom: 12,
                                  textAlign: 'center',
                                }}>
                                  Swipe to refresh and get new perfect matches
                                </Text>
                                <HapticTouchableOpacity
                                  onPress={() => {
                                    HapticPatterns.buttonPress();
                                    fetchPerfectMatches(true);
                                  }}
                                  disabled={refreshingPerfectMatches}
                                  style={{
                                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                                    paddingHorizontal: 20,
                                    paddingVertical: 10,
                                    borderRadius: 8,
                                    opacity: refreshingPerfectMatches ? 0.7 : 1,
                                  }}
                                >
                                  {refreshingPerfectMatches ? (
                                    <AnimatedActivityIndicator size="small" color="#FFFFFF" />
                                  ) : (
                                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                                      Refresh Recipes
                                    </Text>
                                  )}
                                </HapticTouchableOpacity>
                              </View>
                            </View>
                          )}
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
        onClose={closeFilterModal}
        onApply={applyFilters}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Mood Selector Modal (Home Page 2.0) */}
      <MoodSelector
        visible={showMoodSelector}
        onClose={() => setShowMoodSelector(false)}
        onSelectMood={handleMoodSelect}
        selectedMood={selectedMood}
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
          onClose={closeActionMenu}
          onAddToMealPlan={handleAddToMealPlan}
          onViewSimilar={handleViewSimilar}
          onHealthify={handleHealthify}
          onReportIssue={handleReportIssue}
        />
      )}
    </SafeAreaView>
  );
}