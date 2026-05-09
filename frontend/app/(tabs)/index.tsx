import { View, Text, ScrollView, Alert, Animated, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
// ScreenGradient removed — editorial v2 uses flat #FAF7F4 bg
import SazonRefreshControl from '../../components/ui/SazonRefreshControl';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

import type { FilterState } from '../../lib/filterStorage';
import type { SuggestedRecipe } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import HelpTooltip from '../../components/ui/HelpTooltip';
import { Spacing } from '../../constants/Spacing';
import { HapticPatterns } from '../../constants/Haptics';
import { Colors, DarkColors } from '../../constants/Colors';
import { Canvas, Brand, Surface } from '../../constants/tokens';
import { useAuth } from '../../contexts/AuthContext';
import RecipeActionMenu from '../../components/recipe/RecipeActionMenu';
import MoodSelector from '../../components/ui/MoodSelector';

// Extracted components and utilities
import { FilterModal, HomeHeader, ParallaxHeroSection, MealPrepModeHeader, RecipeSectionsGrid, DislikeReasonSheet, EditorialHomeLayout, StretchHomeCard, PlateOfWeekCard } from '../../components/home';
import type { DislikeReason } from '../../components/home';
import { type SearchScope } from '../../components/home/SearchScopeSelector';
import HomeLoadingState from '../../components/home/HomeLoadingState';
import HomeErrorState from '../../components/home/HomeErrorState';
import HomeEmptyState from '../../components/home/HomeEmptyState';
import NoResultsState from '../../components/home/NoResultsState';
import SoftFilterPill from '../../components/home/SoftFilterPill';
import AlmostMadeItSheet from '../../components/home/AlmostMadeItSheet';
import CollectionPickerModal from '../../components/home/CollectionPickerModal';
// IA2.6 — AskSazonHomeCard removed; the global SazonFAB (in the
// Search + Quick-Actions row above the tab bar) replaces this card.
// Two competing "ask Sazon" affordances on the same screen was redundant.
import NutritionStrip from '../../components/today/NutritionStrip';
import FriendsFeedSection from '../../components/today/FriendsFeedSection';
import QuickActionRow from '../../components/today/QuickActionRow';
import TodayDiscoveryCard from '../../components/today/TodayDiscoveryCard';
import FirstOfDayNote from '../../components/home/FirstOfDayNote';
import SundayPolaroidCard from '../../components/today/SundayPolaroidCard';
import CohortSocialProofPill from '../../components/today/CohortSocialProofPill';
import FilterRow, { DEFAULT_FILTER_CHIPS } from '../../components/ui/FilterRow';
import { useHomeFilterRowChips } from '../../hooks/useFilterRowChips';
import { useFilterChipRanking } from '../../hooks/useFilterChipRanking';
import { countAllActiveFilters } from '../../utils/filterUtils';
import { FOOD_INTEL_TIPS } from '../../lib/foodIntelTips';
import { useSurfaceTracking } from '../../hooks/useSurfaceTracking';
import RandomRecipeModal from '../../components/home/RandomRecipeModal';
// PantryMatchCard removed — editorial v2 absorbs pantry info into subtitle
import RecipeRoulette from '../../components/recipe/RecipeRoulette';
import SurpriseRouletteOverlay from '../../components/home/SurpriseRouletteOverlay';
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
import { searchApi, nutritionApi, cookingHistoryStatsApi, weeklyRecapApi, recipeApi, type DailyNutritionSnapshot, type WeeklyRecapPayload } from '../../lib/api';

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

  // ROADMAP 4.0 D14 — daily nutrient snapshot for the discovery strip.
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutritionSnapshot | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await nutritionApi.fetchDaily();
        if (!cancelled) setDailyNutrition(res?.data?.snapshot ?? null);
      } catch {
        if (!cancelled) setDailyNutrition(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ROADMAP 4.0 J11 — most-recent-cook cuisine for the first-of-day greeting.
  const [lastCookCuisine, setLastCookCuisine] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await cookingHistoryStatsApi.mostRecent();
        const payload = (res?.data ?? res) as { mostRecent?: { recipe?: { cuisine?: string | null } | null } | null } | undefined;
        if (!cancelled) setLastCookCuisine(payload?.mostRecent?.recipe?.cuisine ?? '');
      } catch {
        if (!cancelled) setLastCookCuisine('');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ROADMAP 4.0 J4 — Sunday Polaroid drop. Fetch C9 weekly recap; map onto the
  // SundayRecap shape (topCuisine, topMineral, discovery). The card itself
  // gates on local Sunday + dismissed-this-week, so we always fetch.
  const [weeklyRecap, setWeeklyRecap] = useState<WeeklyRecapPayload | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await weeklyRecapApi.fetchThisWeek();
        if (!cancelled) setWeeklyRecap((res?.data ?? null) as WeeklyRecapPayload | null);
      } catch {
        if (!cancelled) setWeeklyRecap(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const sundayRecap = useMemo(() => {
    if (!weeklyRecap) return null;
    const topCuisine = weeklyRecap.topCuisine?.cuisine ?? '';
    const topMineral = weeklyRecap.topNutrient?.name ?? '';
    const discovery = weeklyRecap.discovery ?? '';
    if (!topCuisine && !topMineral && !discovery) return null;
    return { topCuisine, topMineral, discovery };
  }, [weeklyRecap]);

  // Recipe Roulette state
  const [showRouletteModal, setShowRouletteModal] = useState(false);
  const [rouletteRecipes, setRouletteRecipes] = useState<SuggestedRecipe[]>([]);
  const [rouletteLoading, setRouletteLoading] = useState(false);
  // ROADMAP 4.0 J8 — 2-second roulette spin reveal before settling on a recipe
  const [rouletteSpinSettled, setRouletteSpinSettled] = useState(false);
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);
  const lastSurpriseFiltersRef = useRef<SurpriseFilters>({});

  // Main content scroll ref (used for scroll-to-top on mascot press)
  const mainScrollRef = useRef<ScrollView>(null);

  // ── ROADMAP 4.0 A1-c — Today rotating discovery tip (deterministic daily pick) ──
  const dailyDiscoveryTip = useMemo(() => {
    if (!FOOD_INTEL_TIPS || FOOD_INTEL_TIPS.length === 0) return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const idx = dayOfYear % FOOD_INTEL_TIPS.length;
    const t = FOOD_INTEL_TIPS[idx];
    return { id: t.id, category: t.category, title: t.title, body: t.body };
  }, []);

  const handleDiscoveryTipPress = useCallback((tipId: string) => {
    // ROADMAP 4.0 A1-c — engagement record will land with C10 cultural primer wiring
    void tipId;
  }, []);

  // ── ROADMAP 4.0 A1-d — Today quick-action chip handlers ──
  const handleQuickActionVoice = useCallback(() => {
    router.push('/(tabs)/?voice=open' as never);
  }, []);
  const handleQuickActionSnap = useCallback(() => {
    router.push('/scanner' as never);
  }, []);
  const handleQuickActionBuildAPlate = useCallback(() => {
    router.push('/build-a-plate' as never);
  }, []);
  const handleQuickActionFindMeAMeal = useCallback(() => {
    router.push('/(tabs)/meal-plan?action=find-me-a-meal' as never);
  }, []);

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
  const { filters, filtersRef, activeFilters, filtersLoaded, showFilterModal } = filterHook;
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

  // ROADMAP 4.0 FX3.1 — last-fetched soft-filter state. Auto-cleared whenever
  // the user changes filters (so the pill doesn't linger after the user has
  // already adjusted their filters in response).
  const [softFilterMode, setSoftFilterMode] = useState(false);
  const [softFilterNarrowedBy, setSoftFilterNarrowedBy] = useState<string[]>([]);

  // ROADMAP 4.0 FX3.2 — per-filter yield rows (populated only when the empty
  // body state renders + filters are active).
  const [filterYields, setFilterYields] = useState<Array<{
    filterId: string;
    label: string;
    remainingIfRemoved: number;
  }>>([]);

  // Helper to apply fetch results to state
  const applyFetchResult = useCallback((result: RecipeFetchResult, options?: { resetPage?: boolean }) => {
    const { resetPage = true } = options || {};
    setTotalRecipes(result.total);
    setSuggestedRecipes(result.recipes);
    if (resetPage) {
      setCurrentPage(0);
    }
    setUserFeedback({ ...userFeedback, ...result.feedback });
    setInitialRecipesLoaded(true);
    setSoftFilterMode(!!result.softFilterMode);
    setSoftFilterNarrowedBy(result.narrowedBy ?? []);
  }, []);

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
  const { searchQuery, cravingQuery, isCravingSearch, handleSearchChange, clearSearch, rerunCravingSearch } = useRecipeSearch({
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
    enabled: filtersLoaded && !searchQuery && !cravingQuery,
    initialData: homeFeed.quickMeals,
  });
  const {
    recipes: quickMealsRecipes,
    currentIndex: quickMealsCurrentIndex,
    refreshing: refreshingQuickMeals,
    scrollViewRef: quickMealsScrollViewRef,
    fetch: fetchQuickMeals,
    setCurrentIndex: setQuickMealsCurrentIndex,
    onTouchStart: onQuickMealsTouchStart,
    onTouchEnd: onQuickMealsTouchEnd,
    onScrollBeginDrag: onQuickMealsScrollBeginDrag,
    onScrollEndDrag: onQuickMealsScrollEndDrag,
  } = quickMeals;

  // Time-aware suggestions toggle (Home Page 2.0) - using extracted hook
  const { timeAwareMode, setTimeAwareMode, toggleTimeAwareMode, currentMealPeriod, isLoaded: timeAwareLoaded } = useTimeAwareMode();

  // Recipe of the Day — pulled directly from home feed so it always reflects current filters.
  // Bypasses the useRecipeOfTheDay intermediate state to prevent stale values after refetch.
  // When a craving search is active, promote the top craving result as the hero recipe.
  const recipeOfTheDay = isCravingSearch && suggestedRecipes.length > 0
    ? suggestedRecipes[0]
    : homeFeed.recipeOfTheDay;
  const loadingRecipeOfTheDay = homeFeed.loading && !homeFeed.recipeOfTheDay;

  // Use consolidated home feed data instead of separate useApi('/recipes/suggested')
  const recipesData = homeFeed.suggestedRecipes.length > 0 ? homeFeed.suggestedRecipes : null;
  const loading = homeFeed.loading;
  const error = homeFeed.error;
  const errorCode = homeFeed.errorCode;
  const errorFailureClass = homeFeed.failureClass;
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
    filtersRef,
    setFilters,
    saveFilters,
    updateActiveFilters,
    closeFilterModal,
    resetFilters,
    mealPrepMode,
    searchQuery,
    isCravingSearch,
    onRerunCravingSearch: rerunCravingSearch,
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

  // ROADMAP 4.0 R11 — FilterRow chip wiring lives in a shared hook.
  const homeFilterChipState = useHomeFilterRowChips({
    filters,
    quickMacroFilters,
    mealPrepMode,
    handleQuickFilter,
    handleQuickMacroFilter,
    handleToggleMealPrepMode,
  });

  // ROADMAP 4.0 FX3.4 — chip ranking by user toggle frequency.
  const { rankedChips, recordChipToggle } = useFilterChipRanking(DEFAULT_FILTER_CHIPS);
  const onRankedChipToggle = useCallback((chipId: string) => {
    homeFilterChipState.onChipToggle(chipId);
    void recordChipToggle(chipId);
    // FX3.1 — clear the soft-filter pill once the user has reacted by
    // toggling a chip; the next fetch will re-set it if still applicable.
    setSoftFilterMode(false);
  }, [homeFilterChipState, recordChipToggle]);

  // FX3.1 — pill tap scrolls to the FilterRow (which is anchored just below
  // the header). Scroll-to-top reveals it in all states.
  const onSoftFilterPillPress = useCallback(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

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

  // ROADMAP 4.0 B3 — surface event tracking
  const surfaceTracker = useSurfaceTracking();

  // Record impression for the Today hero whenever the displayed recipe changes.
  useEffect(() => {
    if (recipeOfTheDay?.id) {
      surfaceTracker.track({
        surface: 'today_hero',
        action: 'impression',
        recipeId: recipeOfTheDay.id,
      });
    }
  }, [recipeOfTheDay?.id, surfaceTracker]);

  const handleRecipePress = useCallback((recipeId: string) => {
    // Track recipe view for "Continue Cooking" section (using extracted hook)
    addRecentlyViewed(recipeId);

    // ROADMAP 4.0 B3 — record tap on Today hero surface
    surfaceTracker.track({
      surface: 'today_hero',
      action: 'tap',
      recipeId,
    });

    // 10D-ii: Log craving search event (fire-and-forget)
    if (isCravingSearch && cravingQuery) {
      searchApi.cravingSearchEvent(cravingQuery, recipeId, 'tap').catch(() => undefined);
    }

    // Navigate to modal
    router.push(`../modal?id=${recipeId}`);
  }, [addRecentlyViewed, isCravingSearch, cravingQuery]);

  // 10D-ii: Wrap openSavePicker to log 'save' event when craving search is active
  const handleSave = useCallback(async (recipeId: string) => {
    if (isCravingSearch && cravingQuery) {
      searchApi.cravingSearchEvent(cravingQuery, recipeId, 'save').catch(() => undefined);
    }
    await openSavePicker(recipeId);
  }, [openSavePicker, isCravingSearch, cravingQuery]);

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
    setRouletteSpinSettled(false); // ROADMAP 4.0 J8 — start spinning
    setShowRouletteModal(true);
    const startedAt = Date.now();

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
      // ROADMAP 4.0 J8 — guarantee minimum 2s of anticipation before settling
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => setRouletteSpinSettled(true), remaining);
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
  // When craving search is active, skip the top result (it's shown in the hero)
  const recipeSections = useMemo(() => {
    const recipesForGrid = isCravingSearch && suggestedRecipes.length > 1
      ? suggestedRecipes.slice(1)
      : suggestedRecipes;
    return groupRecipesIntoSections(recipesForGrid, {
      quickMealsRecipes,
      mealPrepMode,
      searchQuery,
    });
  }, [suggestedRecipes, quickMealsRecipes, mealPrepMode, searchQuery, isCravingSearch]);

  // Derive saved recipe IDs from feedback for editorial components
  const savedRecipeIds = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(userFeedback).forEach(([id, fb]) => {
      if (fb.liked) ids.add(id);
    });
    return ids;
  }, [userFeedback]);

  // ROADMAP 4.0 FX3.2 — fetch yields when the empty body would render with
  // active filters. Cancellable; auto-clears when the empty state goes away.
  useEffect(() => {
    const isEmptyWithFilters =
      suggestedRecipes.length === 0 &&
      !loading && !loadingFromFilters && !initialLoading &&
      !error &&
      (activeFilters.length > 0 || mealPrepMode ||
        quickMacroFilters.highProtein || quickMacroFilters.lowCarb || quickMacroFilters.lowCalorie) &&
      !searchQuery.trim() && !cravingQuery.trim();

    if (!isEmptyWithFilters) {
      if (filterYields.length > 0) setFilterYields([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await recipeApi.getFilterYields({
          cuisines: filters.cuisines.length > 0 ? filters.cuisines : undefined,
          dietaryRestrictions: filters.dietaryRestrictions.length > 0 ? filters.dietaryRestrictions : undefined,
          maxCookTime: filters.maxCookTime,
          difficulty: filters.difficulty.length > 0 ? filters.difficulty : undefined,
          highProtein: quickMacroFilters.highProtein,
          lowCarb: quickMacroFilters.lowCarb,
          lowCalorie: quickMacroFilters.lowCalorie,
          mealPrepMode,
        });
        if (!cancelled) {
          const payload = (res?.data ?? res) as { yields?: Array<{ filterId: string; label: string; remainingIfRemoved: number }> };
          setFilterYields(payload?.yields ?? []);
        }
      } catch {
        if (!cancelled) setFilterYields([]);
      }
    })();
    return () => { cancelled = true; };
  }, [suggestedRecipes.length, loading, loadingFromFilters, initialLoading, error,
      activeFilters.length, mealPrepMode, quickMacroFilters, searchQuery, cravingQuery,
      filters.cuisines, filters.dietaryRestrictions, filters.maxCookTime, filters.difficulty]);

  // FX3.2 — single-clear handler. Each filterId maps to its source state.
  const handleClearFilterById = useCallback((filterId: string) => {
    if (filterId === 'cuisines') {
      handleQuickFilter('cuisines', []);
    } else if (filterId === 'dietary') {
      handleQuickFilter('dietaryRestrictions', []);
    } else if (filterId === 'quick') {
      handleQuickFilter('maxCookTime', null);
    } else if (filterId === 'difficulty') {
      handleQuickFilter('difficulty', []);
    } else if (filterId === 'highProtein' && quickMacroFilters.highProtein) {
      handleQuickMacroFilter('highProtein');
    } else if (filterId === 'lowCarb' && quickMacroFilters.lowCarb) {
      handleQuickMacroFilter('lowCarb');
    } else if (filterId === 'lowCalorie' && quickMacroFilters.lowCalorie) {
      handleQuickMacroFilter('lowCalorie');
    } else if (filterId === 'mealPrep') {
      handleToggleMealPrepMode(false);
    }
  }, [handleQuickFilter, handleQuickMacroFilter, handleToggleMealPrepMode, quickMacroFilters]);

  // ROADMAP 4.0 FX1.1 — single body-state discriminator.
  // The persistent header + filter row render unconditionally below; this
  // chooses which body to slot under the chrome. Loading/error/empty/no-results
  // render below the chrome (not as full-screen replacements) so the user can
  // always reach a chip to deselect a filter that produced zero results.
  type BodyState = 'loading' | 'error' | 'no-results' | 'empty' | 'content';
  let bodyState: BodyState = 'content';
  if ((loading || initialLoading) && suggestedRecipes.length === 0) {
    bodyState = 'loading';
  } else if (error && suggestedRecipes.length === 0) {
    bodyState = 'error';
  } else if (suggestedRecipes.length === 0 && !loading && !loadingFromFilters && !initialLoading) {
    bodyState = (searchQuery.trim() || cravingQuery.trim()) ? 'no-results' : 'empty';
  }

  // DS2.2 — Today is the editorial / hero / "personal magazine cover" tab,
  // so it uses canvas-warm by default. Other tabs (cookbook / meal-plan /
  // coach) use plain Canvas.light. See docs/design-decisions/DS2.2-canvas-warm.md.
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? Canvas.warmDark : Canvas.warmLight }}>
    <View style={{ flex: 1 }}>
      <HomeHeader
        onMascotPress={() => mainScrollRef.current?.scrollTo({ y: 0, animated: true })}
        onFilterPress={handleFilterPress}
        activeFilterCount={countAllActiveFilters({ filters, quickMacroFilters, mealPrepMode, mood: selectedMood?.id })}
      />

      {/* ROADMAP 4.0 — Filter row attached below the header (not scrollable) */}
      {/* FX4.2 — badge counts all toggles (cuisines + dietary + cookTime + difficulty + macros + mealPrep + mood). */}
      <FilterRow
        chips={rankedChips}
        activeChipIds={homeFilterChipState.activeChipIds}
        activeAdvancedCount={countAllActiveFilters({ filters, quickMacroFilters, mealPrepMode, mood: selectedMood?.id })}
        onAdvancedFilterPress={handleFilterPress}
        onChipToggle={onRankedChipToggle}
      />

      {/* Quick-action chip row sits directly under the filters (mirrors
          KitchenModeBar's placement in the Kitchen tab). Surprise Me joins
          Voice / Snap / Build a plate / Find me a meal here. */}
      <QuickActionRow
        onVoice={handleQuickActionVoice}
        onSnap={handleQuickActionSnap}
        onBuildAPlate={handleQuickActionBuildAPlate}
        onSurpriseMe={() => setShowSurpriseModal(true)}
        onFindMeAMeal={handleQuickActionFindMeAMeal}
      />

      {/* ROADMAP 4.0 FX1.1 — body-only state branches; chrome above stays visible */}
      {bodyState === 'loading' && <HomeLoadingState viewMode={viewMode} />}

      {bodyState === 'error' && (
        <HomeErrorState
          error={error as string}
          errorCode={errorCode}
          failureClass={errorFailureClass}
          onRetry={refetch}
        />
      )}

      {bodyState === 'no-results' && (
        <NoResultsState
          searchQuery={isCravingSearch ? `craving: ${cravingQuery}` : searchQuery}
          suggestions={isCravingSearch ? [] : homeFeed.searchSuggestions}
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
      )}

      {bodyState === 'empty' && (
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
          yields={filterYields}
          onClearFilter={handleClearFilterById}
        />
      )}

      {bodyState === 'content' && (
      /* Main content area */
      <ScrollView
        ref={mainScrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
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

        {/* ROADMAP 4.0 FX3.1 — soft-filter fallback pill. Renders above the
            content when the backend fell back to the unfiltered top-K
            because the post-filter set was sparse. */}
        <SoftFilterPill
          softFilterMode={softFilterMode}
          narrowedBy={softFilterNarrowedBy}
          onPress={onSoftFilterPillPress}
        />

        {/* IA2.6 — AskSazonHomeCard removed. The global SazonFAB next to
            the search bar replaces this card. */}

        {/* Featured recipe (Today's hero) — sits directly under the Coach card
            so the user lands on a cookable plate, not on supplementary widgets. */}
        {/* HX1.4 — macro widgets hidden until real D14 data + macro goals
            are wired. Fake placeholder values were misleading users. */}
        <EditorialHomeLayout
          heroRecipe={recipeOfTheDay}
          recipePool={recipesData ?? undefined}
          savedIds={savedRecipeIds}
          onRecipePress={handleRecipePress}
          onToggleSave={handleSave}
        />

        {/* FirstCuisineBadge ("🌍 first time?") removed from under the hero.
            The cultural primer modal still fires from the cooking-complete
            flow (J2), which earns the moment more than a small badge under
            today's recipe. */}

        {/* HeroRationaleRibbon (the "• 50g protein per serving" rationale)
            and HeroRerollPill ("↻ Try another") were removed from the hero
            stack. The Surprise me chip in the QuickActionRow above covers
            the re-roll affordance, and the rationale text was crowding the
            hero without earning the space. */}

        {/* ROADMAP 4.0 J4 — Sunday Polaroid drop (renders only on local Sunday) */}
        {sundayRecap && <SundayPolaroidCard recap={sundayRecap} />}

        {/* ROADMAP 4.0 J11 — first-of-day greeting note (renders once per local date)
            HX1.3 — sole greeting moment per visit (EditorialGreeting deferred). */}
        <FirstOfDayNote lastCookCuisine={lastCookCuisine} />

        {/* ROADMAP 4.0 D14 — today's nutrient roll-up (top-6 with DV%).
            HX1.2 — collapsed two nutrition strips into one; the placeholder
            NutritionDiscoveryStrip with hardcoded zeros is gone. The
            yesterday-summary header line lands when D-tier wires it. */}
        <NutritionStrip snapshot={dailyNutrition} />

        {/* ROADMAP 4.0 F1 — Friends feed (hidden when no follows / no shares) */}
        <FriendsFeedSection
          onSelect={(item) => {
            if (item.shareSlug) {
              router.push(`/shared-plate/${item.shareSlug}` as never);
            }
          }}
        />

        {/* ROADMAP 4.0 F9 — Cohort social proof (hides on cold start) */}
        <CohortSocialProofPill />

        {/* ROADMAP 4.0 — Daily check-in moved to Kitchen (above Recently Saved). */}

        {/* QuickActionRow now sits above the body switch (under FilterRow) —
            mirrors KitchenModeBar's placement in the Kitchen tab. */}

        {/* MoreForYouSection wrapper removed — the "More for you (N) / Show
            less" toggle was redundant once SeasonalProduce + DidYouKnow
            moved off Today. Render the remaining three cards inline. */}
        <TodayDiscoveryCard tip={dailyDiscoveryTip} onPress={handleDiscoveryTipPress} />
        <StretchHomeCard />
        <PlateOfWeekCard />

        {/* Contextual Recipe Sections (below editorial fold) */}
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
          onSave={handleSave}
          animatedRecipeIds={animatedRecipeIds}
          onAnimatedRecipeId={(id) => setAnimatedRecipeIds(prev => new Set(prev).add(id))}
          quickMealsScrollViewRef={quickMealsScrollViewRef}
          quickMealsCurrentIndex={quickMealsCurrentIndex}
          onQuickMealsIndexChange={setQuickMealsCurrentIndex}
          refreshingQuickMeals={refreshingQuickMeals}
          onRefreshQuickMeals={() => fetchQuickMeals(true)}
          onQuickMealsTouchStart={onQuickMealsTouchStart}
          onQuickMealsTouchEnd={onQuickMealsTouchEnd}
          onQuickMealsScrollBeginDrag={onQuickMealsScrollBeginDrag}
          onQuickMealsScrollEndDrag={onQuickMealsScrollEndDrag}
          currentPage={currentPage}
          totalRecipes={totalRecipes}
          suggestedRecipesCount={suggestedRecipes.length}
          paginationInfo={paginationInfo}
          paginationLoading={paginationLoading}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          darkFeed={darkFeed}
        />

        {/* ROADMAP 4.0 A1-f — NewToYou + BrowseByFamily relocated to Kitchen → Discover.
            Premium upsell card stays on Today as a contextual nudge.
            HX1.1 — duplicate "Great for Meal Prep" carousel removed; the
            section already renders inside RecipeSectionsGrid above when
            mealPrepMode is active. */}
        {user?.id && (
          <>
            {/* Premium upsell card — only for free-tier users */}
            {!subscription.isPremium && <PremiumUpsellCard testID="home-upsell-card" />}
          </>
        )}

        {/* ROADMAP 4.0 HX5.1 — almost-made-it sheet replaces the utilitarian
            recipe-count footer with ranker provenance + invitation. */}
        {totalRecipes > 0 && !paginationInfo.hasMultiplePages && (
          <AlmostMadeItSheet
            cutCount={totalRecipes}
            cutoff={Math.max(totalRecipes, RECIPES_PER_PAGE)}
            onSelect={(id) => router.push(`../modal?id=${id}` as never)}
          />
        )}
      </ScrollView>
      )}

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
        onCravingSearch={(query) => {
          if (query) {
            router.setParams({ craving: query, search: '' });
          } else {
            clearSearch();
            router.setParams({ craving: '', search: '' });
          }
        }}
        activeCravingQuery={isCravingSearch ? cravingQuery : undefined}
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
        {(rouletteLoading || !rouletteSpinSettled) ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isDark ? Canvas.dark : Canvas.light,
            }}
          >
            {/* ROADMAP 4.0 J8 — 2s roulette spin overlay; settles on the first picked recipe */}
            <SurpriseRouletteOverlay
              visible
              chosenRecipe={{
                id: rouletteRecipes[0]?.id ?? '',
                title: rouletteRecipes[0]?.title ?? '',
                imageUrl: rouletteRecipes[0]?.imageUrl ?? null,
              }}
              onSettle={() => undefined}
            />
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
              backgroundColor: isDark ? Canvas.dark : Canvas.light,
              padding: 24,
            }}
          >
            <Text className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
              No Recipes Available
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
              We couldn't load any recipes for roulette right now.
            </Text>
            {/* design.md §7.1 — primary CTA pill, single coral accent */}
            <HapticTouchableOpacity
              onPress={handleCloseRoulette}
              style={{
                backgroundColor: isDark ? Brand.dark.base : Brand.light.base,
                paddingHorizontal: 24,
                paddingVertical: 14,
                borderRadius: 9999,
              }}
            >
              <Text style={{ color: isDark ? Brand.dark.ink : Brand.light.ink, fontWeight: '600', fontSize: 16, letterSpacing: 0.1 }}>Close</Text>
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

    </View>
    </View>
  );
}