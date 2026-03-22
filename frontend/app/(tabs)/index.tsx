import { View, Text, ScrollView, Alert, Animated, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import ScreenGradient from '../../components/ui/ScreenGradient';
import SazonRefreshControl from '../../components/ui/SazonRefreshControl';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

import type { FilterState } from '../../lib/filterStorage';
import type { SuggestedRecipe } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import HelpTooltip from '../../components/ui/HelpTooltip';
import { Spacing } from '../../constants/Spacing';
import { HapticPatterns } from '../../constants/Haptics';
import { Colors, DarkColors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import RecipeActionMenu from '../../components/recipe/RecipeActionMenu';
import MoodSelector from '../../components/ui/MoodSelector';

// Extracted components and utilities
import { FilterModal, HomeHeader, ParallaxHeroSection, MealPrepModeHeader, RecipeSectionsGrid, DislikeReasonSheet } from '../../components/home';
import type { DislikeReason } from '../../components/home';
import { type SearchScope } from '../../components/home/SearchScopeSelector';
import HomeLoadingState from '../../components/home/HomeLoadingState';
import HomeErrorState from '../../components/home/HomeErrorState';
import HomeEmptyState from '../../components/home/HomeEmptyState';
import NoResultsState from '../../components/home/NoResultsState';
import CollectionPickerModal from '../../components/home/CollectionPickerModal';
import RecipeCarouselSection from '../../components/home/RecipeCarouselSection';
import RandomRecipeModal from '../../components/home/RandomRecipeModal';
import RecipeRoulette from '../../components/recipe/RecipeRoulette';
import { SurpriseMeModal, type SurpriseFilters } from '../../components/home';
import { Accelerometer } from 'expo-sensors';
import {
  type UserFeedback,
  type RecipeSection,
  groupRecipesIntoSections,
} from '../../utils/recipeUtils';

// Extracted hooks
import { useViewMode } from '../../hooks/useViewMode';
import { useMealPrepMode } from '../../hooks/useMealPrepMode';
import { useTimeAwareMode } from '../../hooks/useTimeAwareMode';
import { useRecipePagination } from '../../hooks/useRecipePagination';
import { useRecipeInteractions } from '../../hooks/useRecipeInteractions';
import { useRecipeFilters } from '../../hooks/useRecipeFilters';
import { useCollectionSave } from '../../hooks/useCollectionSave';
import { useQuickMeals } from '../../hooks/useQuickMeals';
import { usePersonalizedRecipes } from '../../hooks/usePersonalizedRecipes';
import { useCollapsibleSections } from '../../hooks/useCollapsibleSections';
import { useRecipeActions } from '../../hooks/useRecipeActions';
import { useRecipeFeedback } from '../../hooks/useRecipeFeedback';
import { useRandomRecipe } from '../../hooks/useRandomRecipe';
import { useRecipeFetcher, type RecipeFetchResult } from '../../hooks/useRecipeFetcher';
import { useRecipeSearch } from '../../hooks/useRecipeSearch';
import { useInitialRecipeLoad } from '../../hooks/useInitialRecipeLoad';
import { useQuickMacroFilters } from '../../hooks/useQuickMacroFilters';
import { useWelcomeEffects } from '../../hooks/useWelcomeEffects';
import { useMoodSelector } from '../../hooks/useMoodSelector';
import { useFilterActions } from '../../hooks/useFilterActions';
import { usePaginationActions } from '../../hooks/usePaginationActions';
import { useHomeFeed } from '../../hooks/useHomeFeed';
import { useDarkFeed } from '../../hooks/useDarkFeed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '../../hooks/useSubscription';
import PremiumUpsellCard from '../../components/premium/PremiumUpsellCard';

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // First-run warm gradient fade (sessions 1-3 get progressively subtler warm tint)
  const { subscription } = useSubscription();
  const [firstRunTint, setFirstRunTint] = useState<number>(0);
  useEffect(() => {
    (async () => {
      const key = 'homeSessionCount';
      const raw = await AsyncStorage.getItem(key).catch(() => null);
      const count = raw ? parseInt(raw, 10) : 0;
      if (count < 3) {
        // Tint intensity: session 0 → 0.06, session 1 → 0.04, session 2 → 0.02
        setFirstRunTint(0.06 - count * 0.02);
        await AsyncStorage.setItem(key, String(count + 1)).catch(() => {});
      }
    })();
  }, []);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { openRoulette } = useLocalSearchParams<{ openRoulette?: string }>();
  const [refreshing, setRefreshing] = useState(false);

  // Random recipe state managed by extracted hook (defined after filters)

  const [suggestedRecipes, setSuggestedRecipes] = useState<SuggestedRecipe[]>([]);
  // Quick meals and perfect matches state managed by extracted hooks (defined after filters/mealPrepMode)
  const [animatedRecipeIds, setAnimatedRecipeIds] = useState<Set<string>>(new Set());
  const [initialRecipesLoaded, setInitialRecipesLoaded] = useState(false); // Track if we've loaded initial recipes

  // Recipe Roulette state
  const [showRouletteModal, setShowRouletteModal] = useState(false);
  const [rouletteRecipes, setRouletteRecipes] = useState<SuggestedRecipe[]>([]);
  const [rouletteLoading, setRouletteLoading] = useState(false);
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);
  const lastSurpriseFiltersRef = useRef<SurpriseFilters>({});

  // Main content scroll ref (used for scroll-to-top on mascot press)
  const mainScrollRef = useRef<ScrollView>(null);

  // Scroll position for parallax effect
  const scrollY = useRef(new Animated.Value(0)).current;

  // Recipe interactions (feedback, action menu) - using extracted hook
  const interactions = useRecipeInteractions();
  const { userFeedback, feedbackLoading, actionMenuVisible, selectedRecipeForMenu } = interactions;
  const { setUserFeedback, setFeedbackLoading, openActionMenu, closeActionMenu, updateRecipeFeedback, initializeFeedback } = interactions;

  // Recipe action handlers (meal plan, similar, healthify, report) - using extracted hook
  const recipeActions = useRecipeActions({
    selectedRecipe: selectedRecipeForMenu,
    onClose: closeActionMenu,
    showToast,
    onSimilarRecipesFound: setSuggestedRecipes,
  });
  const { handleAddToMealPlan, handleViewSimilar, handleHealthify, handleReportIssue } = recipeActions;

  // Recipe feedback handlers (like/dislike) - using extracted hook
  const recipeFeedback = useRecipeFeedback({
    userId: user?.id,
    source: 'home_screen',
    setFeedbackLoading,
    updateRecipeFeedback,
    onRecipesUpdate: setSuggestedRecipes,
  });
  const { handleLike, handleDislike } = recipeFeedback;

  // Dislike reason sheet state
  const [dislikeSheetVisible, setDislikeSheetVisible] = useState(false);
  const [pendingDislikeId, setPendingDislikeId] = useState<string | null>(null);
  const [pendingDislikeName, setPendingDislikeName] = useState<string | undefined>(undefined);

  const handleShowDislikeSheet = useCallback((recipeId: string): Promise<void> => {
    // Look up the recipe name from local state for the sheet header
    const recipe = suggestedRecipes.find(r => r.id === recipeId);
    setPendingDislikeId(recipeId);
    setPendingDislikeName(recipe?.title);
    setDislikeSheetVisible(true);
    return Promise.resolve();
  }, [suggestedRecipes]);

  const handleDislikeWithReason = useCallback((reason: DislikeReason) => {
    setDislikeSheetVisible(false);
    if (pendingDislikeId) handleDislike(pendingDislikeId, reason);
    setPendingDislikeId(null);
  }, [pendingDislikeId, handleDislike]);

  const handleDislikeSkip = useCallback(() => {
    setDislikeSheetVisible(false);
    if (pendingDislikeId) handleDislike(pendingDislikeId);
    setPendingDislikeId(null);
  }, [pendingDislikeId, handleDislike]);

  // View mode state (grid/list) - using extracted hook
  const { viewMode, setViewMode, recipesPerPage: RECIPES_PER_PAGE, isLoaded: viewModeLoaded } = useViewMode('list');

  // Pagination state - using extracted hook
  const pagination = useRecipePagination({
    recipesPerPage: RECIPES_PER_PAGE,
  });
  const { currentPage, totalRecipes, paginationLoading, paginationInfo } = pagination;
  const { setCurrentPage, setTotalRecipes, setPaginationLoading } = pagination;

  // Featured recipe swipe state (cycle through top 3)
  
  // Section collapse state - using extracted hook
  const { collapsedSections, toggleSection } = useCollapsibleSections();

  // Consolidated home feed — replaces 7 separate API calls with 1
  const homeFeed = useHomeFeed({
    page: 0,
    limit: RECIPES_PER_PAGE,
  });

  // Personalized sections state - using extracted hook
  const {
    recentlyViewedIds: recentlyViewedRecipes,
    loading: loadingPersonalized,
    addRecentlyViewed,
  } = usePersonalizedRecipes({ userId: user?.id, initialLikedRecipes: homeFeed.likedRecipes });

  // Filter state - using extracted hook
  const filterHook = useRecipeFilters();
  const { filters, activeFilters, filtersLoaded, showFilterModal } = filterHook;
  const { setFilters, openFilterModal, closeFilterModal, handleFilterChange, updateActiveFilters, saveFilters, resetFilters } = filterHook;

  // Random recipe generation - using extracted hook
  // Note: onRefresh is set up via ref later since it's defined after this hook
  const onRefreshRef = useRef<(() => void) | null>(null);
  const randomRecipe = useRandomRecipe({
    filters,
    userId: user?.id,
    onRefresh: () => onRefreshRef.current?.(),
  });
  const {
    showModal: showRandomModal,
    generateRandomRecipe: handleRandomRecipe,
    closeModal: closeRandomModal,
  } = randomRecipe;

  // Centralized recipe fetcher - using extracted hook
  const { fetchRecipes } = useRecipeFetcher();

  // Helper to apply fetch results to state
  const applyFetchResult = useCallback((result: RecipeFetchResult, options?: { resetPage?: boolean }) => {
    const { resetPage = true } = options || {};
    setTotalRecipes(result.total);
    setSuggestedRecipes(result.recipes);
    if (resetPage) {
      setCurrentPage(0);
    }
    // Merge new feedback with existing (hook expects direct object, not functional update)
    setUserFeedback({ ...userFeedback, ...result.feedback });
    setInitialRecipesLoaded(true);
  }, [userFeedback, setUserFeedback]);

  // Collections state for save to collection - using extracted hook
  const collectionSave = useCollectionSave({ userId: user?.id, source: 'home_screen' });
  const {
    collections,
    savePickerVisible,
    selectedCollectionIds,
    creatingCollection,
    newCollectionName,
    setSelectedCollectionIds,
    setCreatingCollection,
    setNewCollectionName,
    openSavePicker,
    closeSavePicker,
    handleSaveToCollections,
    handleCreateCollection,
    toggleCollectionSelection,
  } = collectionSave;

  // Meal prep mode state - using extracted hook
  const { mealPrepMode, setMealPrepMode, toggleMealPrepMode, isLoaded: mealPrepLoaded } = useMealPrepMode();
  const { darkFeed, toggleDarkFeed } = useDarkFeed();

  // Track if we're loading from filters to prevent useApi from interfering
  const [loadingFromFilters, setLoadingFromFilters] = useState(false);

  // Search scope state (All / Saved / Liked)
  const [searchScope, setSearchScope] = useState<SearchScope>('all');

  // Search state - using extracted hook
  const { searchQuery, handleSearchChange, clearSearch } = useRecipeSearch({
    filtersLoaded,
    filters,
    mealPrepMode,
    recipesPerPage: RECIPES_PER_PAGE,
    fetchRecipes,
    applyFetchResult,
    showToast,
    setLoadingFromFilters,
    resetPage: () => setCurrentPage(0),
  });

  // Search submit handler — triggers actual recipe fetch with current query + scope
  const handleSubmitSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoadingFromFilters(true);
    const result = await fetchRecipes({
      page: 0,
      limit: RECIPES_PER_PAGE,
      search: query.trim(),
      cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
      dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
      maxCookTime: filters.maxCookTime || undefined,
      difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
      mealPrepMode,
      scope: searchScope !== 'all' ? searchScope : undefined,
    });
    if (result) {
      applyFetchResult(result);
      showToast(
        result.recipes.length > 0
          ? `Found ${result.recipes.length} recipes matching "${query.trim()}"`
          : `No recipes found for "${query.trim()}"`,
        result.recipes.length > 0 ? 'success' : 'error',
        2000,
      );
    }
    setLoadingFromFilters(false);
  }, [filters, mealPrepMode, searchScope, RECIPES_PER_PAGE, fetchRecipes, applyFetchResult, showToast, setLoadingFromFilters]);

  // Scope change handler — re-fetches with new scope
  const handleScopeChange = useCallback(async (newScope: SearchScope) => {
    setSearchScope(newScope);
    if (!searchQuery.trim()) return;
    setLoadingFromFilters(true);
    const result = await fetchRecipes({
      page: 0,
      limit: RECIPES_PER_PAGE,
      search: searchQuery.trim(),
      cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
      dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
      maxCookTime: filters.maxCookTime || undefined,
      difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
      mealPrepMode,
      scope: newScope !== 'all' ? newScope : undefined,
    });
    if (result) {
      applyFetchResult(result);
    }
    setLoadingFromFilters(false);
  }, [searchQuery, filters, mealPrepMode, RECIPES_PER_PAGE, fetchRecipes, applyFetchResult, setLoadingFromFilters]);

  // Quick meals hook (≤30 min recipes) - using extracted hook
  const quickMeals = useQuickMeals({
    filters: {
      cuisines: filters.cuisines,
      dietaryRestrictions: filters.dietaryRestrictions,
      mealPrepMode,
    },
    enabled: filtersLoaded && !searchQuery,
    initialData: homeFeed.quickMeals,
  });
  const {
    recipes: quickMealsRecipes,
    currentIndex: quickMealsCurrentIndex,
    refreshing: refreshingQuickMeals,
    scrollViewRef: quickMealsScrollViewRef,
    fetch: fetchQuickMeals,
    setCurrentIndex: setQuickMealsCurrentIndex,
  } = quickMeals;

  // Time-aware suggestions toggle (Home Page 2.0) - using extracted hook
  const { timeAwareMode, setTimeAwareMode, toggleTimeAwareMode, currentMealPeriod, isLoaded: timeAwareLoaded } = useTimeAwareMode();

  // Recipe of the Day — pulled directly from home feed so it always reflects current filters.
  // Bypasses the useRecipeOfTheDay intermediate state to prevent stale values after refetch.
  const recipeOfTheDay = homeFeed.recipeOfTheDay;
  const loadingRecipeOfTheDay = homeFeed.loading && !homeFeed.recipeOfTheDay;

  // Use consolidated home feed data instead of separate useApi('/recipes/suggested')
  const recipesData = homeFeed.suggestedRecipes.length > 0 ? homeFeed.suggestedRecipes : null;
  const loading = homeFeed.loading;
  const error = homeFeed.error;
  const errorCode = homeFeed.errorCode;
  const refetch = homeFeed.refetch;

  // Quick macro filters (highProtein, lowCarb, lowCalorie) - using extracted hook
  const { quickMacroFilters, getMacroFilterParams, handleQuickMacroFilter } = useQuickMacroFilters({
    filters,
    mealPrepMode,
    searchQuery,
    recipesPerPage: RECIPES_PER_PAGE,
    timeAwareMode,
    fetchRecipes,
    applyFetchResult,
    setPaginationLoading,
  });

  // Initial recipe loading (saved filters, meal prep, initial page, view-mode refetch)
  const { initialLoading } = useInitialRecipeLoad({
    filtersLoaded,
    filters,
    activeFilters,
    mealPrepMode,
    searchQuery,
    viewMode,
    recipesPerPage: RECIPES_PER_PAGE,
    totalRecipes,
    timeAwareMode,
    getMacroFilterParams,
    fetchRecipes,
    applyFetchResult,
    recipesData,
    loadingFromFilters,
    setLoadingFromFilters,
    initialRecipesLoaded,
    setAnimatedRecipeIds,
    setPaginationLoading,
  });

  // Welcome back toast + first-time guidance tooltip
  const { showFirstTimeTooltip, dismissFirstTimeTooltip } = useWelcomeEffects({
    userId: user?.id,
    showToast,
    suggestedRecipesCount: suggestedRecipes.length,
    loading,
  });

  // Mood-based recommendations (Home Page 2.0) - using extracted hook
  const { selectedMood, showMoodSelector, handleMoodSelect, openMoodSelector, closeMoodSelector } = useMoodSelector({
    filters,
    mealPrepMode,
    searchQuery,
    recipesPerPage: RECIPES_PER_PAGE,
    getMacroFilterParams,
    timeAwareMode,
    fetchRecipes,
    applyFetchResult,
    setPaginationLoading,
  });

  // Filter actions (quick-toggle, modal-apply, clear-all) - using extracted hook
  const { handleQuickFilter, applyFilters, clearFilters } = useFilterActions({
    filters,
    setFilters,
    saveFilters,
    updateActiveFilters,
    closeFilterModal,
    resetFilters,
    mealPrepMode,
    searchQuery,
    recipesPerPage: RECIPES_PER_PAGE,
    getMacroFilterParams,
    timeAwareMode,
    fetchRecipes,
    applyFetchResult,
    setPaginationLoading,
  });

  // Pagination navigation (prev/next page fetch) - using extracted hook
  const { handlePrevPage, handleNextPage } = usePaginationActions({
    filters,
    mealPrepMode,
    searchQuery,
    recipesPerPage: RECIPES_PER_PAGE,
    fetchRecipes,
    setPaginationLoading,
    setTotalRecipes,
    setSuggestedRecipes,
    setCurrentPage,
    setAnimatedRecipeIds,
    userFeedback,
    setUserFeedback,
    currentPage,
    paginationInfo,
    paginationLoading,
  });

  // Reset pagination when view mode changes (grid/list)
  useEffect(() => {
    setCurrentPage(0); // Reset to first page when view mode changes
  }, [viewMode]);

  // Toggle view mode
  const handleToggleViewMode = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode); // Hook handles persistence automatically
    HapticPatterns.buttonPress();
  }, [setViewMode]);


  // Toggle meal prep mode
  const handleToggleMealPrepMode = useCallback(async (value: boolean) => {
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
    setLoadingFromFilters(true);
    const result = await fetchRecipes({
      page: 0,
      limit: RECIPES_PER_PAGE,
      cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
      dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
      maxCookTime: filters.maxCookTime || undefined,
      difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
      mealPrepMode: value,
      search: searchQuery || undefined,
    });

    if (result) {
      applyFetchResult(result);
    }
    setLoadingFromFilters(false);
  }, [setMealPrepMode, showToast, fetchRecipes, filters, searchQuery, applyFetchResult]);


  // Seed main recipe grid from consolidated home feed data (replaces old useApi effect)
  useEffect(() => {
    if (homeFeed.suggestedRecipes.length > 0 && !initialRecipesLoaded && !loadingFromFilters) {
      setSuggestedRecipes(homeFeed.suggestedRecipes);
      if (homeFeed.pagination) {
        setTotalRecipes(homeFeed.pagination.total);
      }
      setInitialRecipesLoaded(true);
    }
  }, [homeFeed.suggestedRecipes, homeFeed.pagination?.total]);

  // IMPORTANT:
  // We intentionally do NOT overwrite filtered/paginated results with `/recipes/suggested`.
  // Historically this caused grid mode to "randomly" drop back to ~10 recipes after applying filters.

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('📱 HomeScreen: API Error', error);
      HapticPatterns.error();
      Alert.alert('Oops!', 'Couldn\'t load recipes — pull down to try again!');
    }
  }, [error]);

  const onRefresh = async () => {
    setRefreshing(true);
    setInitialRecipesLoaded(false); // Reset flag to allow reloading
    setCurrentPage(0);

    const filterParams = {
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
      mood: selectedMood?.id || undefined,
    };

    // Refetch both main recipes (with shuffle) and home feed sections in parallel
    const [result] = await Promise.all([
      fetchRecipes({ ...filterParams, shuffle: true }),
      homeFeed.refetch(filterParams),
    ]);

    if (result) {
      applyFetchResult(result);
    }
    setRefreshing(false);
  };

  // Set up ref for random recipe hook's onRefresh callback
  onRefreshRef.current = onRefresh;

  // Re-fetch entire home feed when filters change so ALL sections (Quick Meals,
  // Liked Recipes, Recipe of the Day) reflect the active filters — not just the main grid.
  const homeFeedFilterKeyRef = useRef<string>('');
  const homeFeedDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!filtersLoaded || !initialRecipesLoaded) return;

    const macros = getMacroFilterParams();
    const currentKey = JSON.stringify({
      c: filters.cuisines,
      d: filters.dietaryRestrictions,
      t: filters.maxCookTime,
      df: filters.difficulty,
      mp: mealPrepMode,
      mood: selectedMood?.id,
      ta: timeAwareMode,
      ...macros,
    });

    // Skip if filters haven't actually changed (including initial mount)
    if (currentKey === homeFeedFilterKeyRef.current) return;
    homeFeedFilterKeyRef.current = currentKey;

    // Debounce to avoid excessive refetches during rapid toggling
    if (homeFeedDebounceRef.current) clearTimeout(homeFeedDebounceRef.current);
    homeFeedDebounceRef.current = setTimeout(() => {
      homeFeed.refetch({
        page: 0,
        limit: RECIPES_PER_PAGE,
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        maxCookTime: filters.maxCookTime || undefined,
        difficulty: filters.difficulty.length > 0 ? filters.difficulty[0] : undefined,
        mealPrepMode,
        mood: selectedMood?.id || undefined,
        useTimeAwareDefaults: timeAwareMode,
        ...macros,
      });
    }, 300);

    return () => {
      if (homeFeedDebounceRef.current) clearTimeout(homeFeedDebounceRef.current);
    };
  }, [filtersLoaded, initialRecipesLoaded, filters.cuisines, filters.dietaryRestrictions,
      filters.maxCookTime, filters.difficulty, mealPrepMode, selectedMood, timeAwareMode,
      quickMacroFilters, getMacroFilterParams, homeFeed.refetch, RECIPES_PER_PAGE]);

  const handleRecipePress = useCallback((recipeId: string) => {
    // Track recipe view for "Continue Cooking" section (using extracted hook)
    addRecentlyViewed(recipeId);

    // Navigate to modal
    router.push(`../modal?id=${recipeId}`);
  }, [addRecentlyViewed]);

  // Collection functions now provided by useCollectionSave hook

  // Long-press menu handlers
  const handleLongPress = useCallback((recipe: SuggestedRecipe) => {
    openActionMenu(recipe); // Hook handles setting recipe and showing menu
    HapticPatterns.buttonPressPrimary();
  }, [openActionMenu]);

  // Filter functions
  const handleFilterPress = useCallback(() => {
    openFilterModal();
  }, [openFilterModal]);


  // Toggle time-aware mode (Home Page 2.0)
  const handleToggleTimeAwareMode = useCallback(() => {
    toggleTimeAwareMode(); // Hook handles state and persistence automatically
    HapticPatterns.buttonPress();

    // Refresh recipes with new setting
    onRefresh();
  }, [toggleTimeAwareMode, onRefresh]);

  // Recipe Roulette handlers
  const handleOpenRoulette = useCallback(async () => {
    HapticPatterns.buttonPress();
    setRouletteLoading(true);
    setShowRouletteModal(true);

    try {
      // Fetch a diverse set of recipes for roulette (use shuffle mode)
      const result = await fetchRecipes({
        page: 0,
        limit: 20, // Get 20 recipes for roulette
        cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
        dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
        shuffle: true, // Enable shuffle for variety
      });

      if (result) {
        setRouletteRecipes(result.recipes);
      } else {
        setRouletteRecipes([]);
      }
    } catch (error) {
      console.error('Error fetching roulette recipes:', error);
      showToast('Couldn\'t load roulette recipes — try again?', 'error');
      setRouletteRecipes([]);
    } finally {
      setRouletteLoading(false);
    }
  }, [filters.cuisines, filters.dietaryRestrictions, fetchRecipes, showToast]);

  const handleCloseRoulette = useCallback(() => {
    setShowRouletteModal(false);
    setRouletteRecipes([]);
    // Optionally refresh the main recipe feed
    onRefresh();
  }, [onRefresh]);

  const handleRouletteLike = useCallback(async (recipeId: string) => {
    await handleLike(recipeId);
  }, [handleLike]);

  const handleRoulettePass = useCallback(async (recipeId: string) => {
    await handleDislike(recipeId);
  }, [handleDislike]);

  // Surprise Me with filters
  const handleSurprise = useCallback(async (surpriseFilters: SurpriseFilters) => {
    lastSurpriseFiltersRef.current = surpriseFilters;
    setShowSurpriseModal(false);
    setRouletteLoading(true);
    setShowRouletteModal(true);

    try {
      const fetchParams: any = {
        page: 0,
        limit: 20,
        shuffle: true,
      };
      if (surpriseFilters.cuisine) {
        fetchParams.cuisines = [surpriseFilters.cuisine];
      } else if (filters.cuisines.length > 0) {
        fetchParams.cuisines = filters.cuisines;
      }
      if (filters.dietaryRestrictions.length > 0) {
        fetchParams.dietaryRestrictions = filters.dietaryRestrictions;
      }
      if (surpriseFilters.maxCookTime) {
        fetchParams.maxCookTime = surpriseFilters.maxCookTime;
      }

      const result = await fetchRecipes(fetchParams);
      setRouletteRecipes(result ? result.recipes : []);
    } catch (error) {
      console.error('Error fetching surprise recipes:', error);
      showToast('Couldn\'t load recipes — try again?', 'error');
      setRouletteRecipes([]);
    } finally {
      setRouletteLoading(false);
    }
  }, [filters.cuisines, filters.dietaryRestrictions, fetchRecipes, showToast]);

  // Reshuffle with same filters
  const handleReshuffle = useCallback(() => {
    handleSurprise(lastSurpriseFiltersRef.current);
  }, [handleSurprise]);

  // FAB "Surprise Me!" param consumption
  useEffect(() => {
    if (openRoulette === 'true') {
      setShowSurpriseModal(true);
      router.setParams({ openRoulette: '' });
    }
  }, [openRoulette]);

  // Shake to discover - opens surprise modal
  useEffect(() => {
    let lastShakeTime = 0;
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (magnitude > 1.8 && now - lastShakeTime > 2000) {
        lastShakeTime = now;
        HapticPatterns.rouletteSpin();
        setShowSurpriseModal(true);
      }
    });
    Accelerometer.setUpdateInterval(200);
    return () => subscription.remove();
  }, []);

  // Group recipes into contextual sections - using extracted utility function
  const recipeSections = useMemo(() => {
    return groupRecipesIntoSections(suggestedRecipes, {
      quickMealsRecipes,
      perfectMatchRecipes: [],
      mealPrepMode,
      searchQuery,
    });
  }, [suggestedRecipes, quickMealsRecipes, mealPrepMode, searchQuery]);

  // Loading state with skeleton loaders
  if ((loading || initialLoading) && suggestedRecipes.length === 0) {
    return <HomeLoadingState viewMode={viewMode} />;
  }

  // Error state
  if (error && suggestedRecipes.length === 0) {
    return <HomeErrorState error={error as string} errorCode={errorCode} onRetry={refetch} />;
  }

  // Empty state — smart no-results when searching, generic otherwise
  if (suggestedRecipes.length === 0 && !loading && !loadingFromFilters && !initialLoading) {
    if (searchQuery.trim()) {
      return (
        <NoResultsState
          searchQuery={searchQuery}
          suggestions={homeFeed.searchSuggestions}
          hasActiveFilters={activeFilters.length > 0}
          onSelectSuggestion={(query) => {
            handleSearchChange(query);
          }}
          onClearFilters={() => {
            clearFilters();
            setMealPrepMode(false);
          }}
          onClearSearch={() => {
            clearSearch();
            refetch();
          }}
        />
      );
    }
    return (
      <HomeEmptyState
        filters={filters}
        activeFilters={activeFilters}
        mealPrepMode={mealPrepMode}
        searchQuery={searchQuery}
        onClearFilters={() => {
          clearFilters();
          setMealPrepMode(false);
        }}
        onDisableMealPrep={() => handleToggleMealPrepMode(false)}
        onClearSearch={() => {
          clearSearch();
          refetch();
        }}
        onRefresh={refetch}
      />
    );
  }

  return (
    <ScreenGradient variant={firstRunTint > 0 ? 'onboarding' : 'default'}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Header */}
      <HomeHeader
        onMascotPress={() => mainScrollRef.current?.scrollTo({ y: 0, animated: true })}
        onFilterPress={handleFilterPress}
        activeFilterCount={activeFilters.length + (mealPrepMode ? 1 : 0)}
        onSurpriseMe={handleRandomRecipe}
      />

      {/* Main content area */}
      <ScrollView
        ref={mainScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <SazonRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Meal Prep Mode Header */}
        {mealPrepMode && <MealPrepModeHeader />}

        {/* Parallax Hero — Recipe of the Day with match %, macros */}
        {recipeOfTheDay && !searchQuery && !mealPrepMode ? (
          <ParallaxHeroSection
            recipe={recipeOfTheDay}
            scrollY={scrollY}
            feedback={userFeedback[recipeOfTheDay.id] || { liked: false, disliked: false }}
            isFeedbackLoading={feedbackLoading === recipeOfTheDay.id}
            isDark={isDark}
            onPress={handleRecipePress}
            onLongPress={handleLongPress}
            onLike={handleLike}
            onSave={openSavePicker}
          />
        ) : (
          /* Spacer when hero is not shown */
          <View style={{ height: Spacing.xl }} />
        )}

        {/* Contextual Recipe Sections */}
        <RecipeSectionsGrid
          sections={recipeSections}
          collapsedSections={collapsedSections}
          onToggleSection={toggleSection}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          isDark={isDark}
          userFeedback={userFeedback}
          feedbackLoading={feedbackLoading}
          onRecipePress={handleRecipePress}
          onRecipeLongPress={handleLongPress}
          onLike={handleLike}
          onDislike={handleDislike}
          onSave={openSavePicker}
          animatedRecipeIds={animatedRecipeIds}
          onAnimatedRecipeId={(id) => setAnimatedRecipeIds(prev => new Set(prev).add(id))}
          quickMealsScrollViewRef={quickMealsScrollViewRef}
          quickMealsCurrentIndex={quickMealsCurrentIndex}
          onQuickMealsIndexChange={setQuickMealsCurrentIndex}
          refreshingQuickMeals={refreshingQuickMeals}
          onRefreshQuickMeals={() => fetchQuickMeals(true)}
          currentPage={currentPage}
          totalRecipes={totalRecipes}
          suggestedRecipesCount={suggestedRecipes.length}
          paginationInfo={paginationInfo}
          paginationLoading={paginationLoading}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          darkFeed={darkFeed}
        />

        {/* Personalized Sections - Moved to bottom after Recipes for You */}
        {user?.id && (
          <>
            {/* Premium upsell card — only for free-tier users */}
            {!subscription.isPremium && <PremiumUpsellCard testID="home-upsell-card" />}

            {/* Great for Meal Prep Section */}
            {(() => {
              const mealPrepSection = recipeSections.find(s => s.key === 'meal-prep');
              if (!mealPrepSection && !loading) return null;

              return (
                <RecipeCarouselSection
                  title={mealPrepSection?.title || 'Great for Meal Prep'}
                  emoji={mealPrepSection?.emoji || '🥗'}
                  recipes={mealPrepSection?.recipes || []}
                  isLoading={loading}
                  isCollapsed={collapsedSections['meal-prep']}
                  onToggleCollapse={() => toggleSection('meal-prep')}
                  isDark={isDark}
                  userFeedback={userFeedback}
                  feedbackLoading={feedbackLoading}
                  onRecipePress={handleRecipePress}
                  onRecipeLongPress={handleLongPress}
                  onLike={handleLike}
                  onDislike={handleShowDislikeSheet}
                  onSave={openSavePicker}
                />
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
        selectedMood={selectedMood}
        onMoodPress={openMoodSelector}
        onClearMood={() => handleMoodSelect(null)}
        quickMacroFilters={quickMacroFilters}
        mealPrepMode={mealPrepMode}
        handleQuickFilter={handleQuickFilter}
        handleQuickMacroFilter={handleQuickMacroFilter}
        handleToggleMealPrepMode={handleToggleMealPrepMode}
        darkFeed={darkFeed}
        onToggleDarkFeed={toggleDarkFeed}
      />

      {/* Mood Selector Modal (Home Page 2.0) */}
      <MoodSelector
        visible={showMoodSelector}
        onClose={closeMoodSelector}
        onSelectMood={handleMoodSelect}
        selectedMood={selectedMood}
      />

      {/* Collection Save Picker Modal */}
      <CollectionPickerModal
        visible={savePickerVisible}
        collections={collections}
        selectedCollectionIds={selectedCollectionIds}
        creatingCollection={creatingCollection}
        newCollectionName={newCollectionName}
        isDark={isDark}
        onClose={closeSavePicker}
        onToggleCollection={toggleCollectionSelection}
        onStartCreating={() => setCreatingCollection(true)}
        onChangeNewName={setNewCollectionName}
        onCreateCollection={handleCreateCollection}
        onSave={handleSaveToCollections}
      />

      {/* Random Recipe Generation Modal */}
      <RandomRecipeModal
        visible={showRandomModal}
        isDark={isDark}
        onClose={closeRandomModal}
      />

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
        onDismiss={dismissFirstTimeTooltip}
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

      {/* Recipe Roulette Modal */}
      <Modal
        visible={showRouletteModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseRoulette}
      >
        {rouletteLoading ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isDark ? '#0F0F0F' : '#F2F2F7',
            }}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Loading recipes...
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Get ready to swipe!
            </Text>
          </View>
        ) : rouletteRecipes.length > 0 ? (
          <RecipeRoulette
            recipes={rouletteRecipes}
            onLike={handleRouletteLike}
            onPass={handleRoulettePass}
            onClose={handleCloseRoulette}
            onReshuffle={handleReshuffle}
            initialIndex={0}
          />
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isDark ? '#0F0F0F' : '#F2F2F7',
              padding: 24,
            }}
          >
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
              No Recipes Available
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              We couldn't load any recipes for roulette right now.
            </Text>
            <HapticTouchableOpacity
              onPress={handleCloseRoulette}
              className="px-6 py-3 rounded-xl"
              style={{
                backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              }}
            >
              <Text className="text-white font-semibold text-base">Close</Text>
            </HapticTouchableOpacity>
          </View>
        )}
      </Modal>

      {/* Surprise Me Modal */}
      <SurpriseMeModal
        visible={showSurpriseModal}
        onClose={() => setShowSurpriseModal(false)}
        onSurprise={handleSurprise}
      />

      {/* Dislike Reason Sheet */}
      <DislikeReasonSheet
        visible={dislikeSheetVisible}
        recipeName={pendingDislikeName}
        onSelectReason={handleDislikeWithReason}
        onSkip={handleDislikeSkip}
        onDismiss={handleDislikeSkip}
      />

    </SafeAreaView>
    </ScreenGradient>
  );
}