// frontend/hooks/useQuickMeals.ts
// Custom hook for managing quick meals (≤30 min) data and fetching

import { useState, useEffect, useRef, useCallback } from 'react';
import { FlatList } from 'react-native';
import { recipeApi } from '../lib/api';
import type { SuggestedRecipe } from '../types';

interface QuickMealsFilters {
  cuisines: string[];
  dietaryRestrictions: string[];
  mealPrepMode: boolean;
}

interface UseQuickMealsOptions {
  filters: QuickMealsFilters;
  enabled?: boolean;
  /** Pre-fetched data from consolidated home feed — skips initial fetch if provided */
  initialData?: SuggestedRecipe[];
}

interface UseQuickMealsReturn {
  // State
  recipes: SuggestedRecipe[];
  currentIndex: number;
  refreshing: boolean;
  // Refs
  scrollViewRef: React.RefObject<FlatList<SuggestedRecipe> | null>;
  // Actions
  fetch: (refresh?: boolean) => Promise<void>;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  // Auto-scroll interaction handlers
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onScrollBeginDrag: () => void;
  onScrollEndDrag: (event: any) => void;
}

export function useQuickMeals(options: UseQuickMealsOptions): UseQuickMealsReturn {
  const { filters, enabled = true, initialData } = options;

  // State — seed with initialData if provided
  const [recipes, setRecipes] = useState<SuggestedRecipe[]>(initialData || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs for tracking current recipes and scroll position
  const recipesRef = useRef<SuggestedRecipe[]>([]);
  const scrollViewRef = useRef<FlatList<SuggestedRecipe>>(null);

  // Auto-scroll refs
  const autoScrollIndexRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    recipesRef.current = recipes;
  }, [recipes]);

  // Update state when initialData changes (from home feed)
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setRecipes(initialData);
    }
  }, [initialData]);

  // Fetch quick meals (≤30 minutes)
  const fetch = useCallback(async (refresh: boolean = false) => {
    if (!enabled) return;

    try {
      if (refresh) {
        setRefreshing(true);
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
        mealPrepMode: filters.mealPrepMode,
      });

      const responseData = response.data;
      let fetchedRecipes: SuggestedRecipe[] = [];

      if (responseData && responseData.recipes && responseData.pagination) {
        fetchedRecipes = responseData.recipes;
      } else if (Array.isArray(responseData)) {
        fetchedRecipes = responseData;
      }

      // Filter to ensure all are actually ≤ 30 minutes
      const quickMeals = fetchedRecipes.filter(r => r.cookTime && r.cookTime <= 30).slice(0, 5);

      // Avoid duplicates with existing recipes
      if (refresh && recipesRef.current.length > 0) {
        const existingIds = new Set(recipesRef.current.map(r => r.id));
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
            mealPrepMode: filters.mealPrepMode,
          });
          const retryData = retryResponse.data;
          const retryRecipes = Array.isArray(retryData) ? retryData : (retryData?.recipes || []);
          const retryMeals = retryRecipes
            .filter((r: SuggestedRecipe) => r.cookTime && r.cookTime <= 30 && !existingIds.has(r.id))
            .slice(0, 5);
          setRecipes(retryMeals.length > 0 ? retryMeals : quickMeals);
        } else {
          setRecipes(uniqueMeals.length > 0 ? uniqueMeals : quickMeals);
        }
      } else {
        setRecipes(quickMeals);
      }

      // Reset scroll position
      setCurrentIndex(0);
      autoScrollIndexRef.current = 0;
      // Scroll to first card after a brief delay to ensure state is updated
      setTimeout(() => {
        scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
      console.log(`⚡ Found ${quickMeals.length} quick meals`);
    } catch (error) {
      console.error('❌ Error fetching quick meals:', error);
      if (!refresh) {
        setRecipes([]);
      }
    } finally {
      if (refresh) {
        setRefreshing(false);
      }
    }
  }, [filters.cuisines, filters.dietaryRestrictions, filters.mealPrepMode, enabled]);

  // Advance one card every 4s — single scrollTo call, no rapid-fire ticks
  useEffect(() => {
    const CARD_STEP = 292; // 280 card + 12 gap
    const DWELL_MS = 5000;

    const interval = setInterval(() => {
      if (isUserScrollingRef.current || recipesRef.current.length === 0) return;

      const totalCards = recipesRef.current.length;
      const next = autoScrollIndexRef.current + 1;

      if (next >= totalCards) {
        autoScrollIndexRef.current = 0;
        scrollViewRef.current?.scrollToOffset({ offset: 0, animated: false });
      } else {
        autoScrollIndexRef.current = next;
        scrollViewRef.current?.scrollToOffset({ offset: next * CARD_STEP, animated: true });
      }
    }, DWELL_MS);

    return () => clearInterval(interval);
  }, []);

  const pauseAutoScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  }, []);

  const scheduleResume = useCallback((delay = 2000) => {
    resumeTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, delay);
  }, []);

  // Pause immediately on any touch so button taps aren't swallowed by the scroll loop
  const onTouchStart = useCallback(() => { pauseAutoScroll(); }, [pauseAutoScroll]);
  const onTouchEnd = useCallback(() => { scheduleResume(1500); }, [scheduleResume]);

  const onScrollBeginDrag = useCallback(() => { pauseAutoScroll(); }, [pauseAutoScroll]);
  const onScrollEndDrag = useCallback((event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    autoScrollIndexRef.current = Math.round(x / 292);
    scheduleResume(2000);
  }, [scheduleResume]);

  return {
    // State
    recipes,
    currentIndex,
    refreshing,
    // Refs
    scrollViewRef,
    // Actions
    fetch,
    setCurrentIndex,
    // Auto-scroll interaction handlers
    onTouchStart,
    onTouchEnd,
    onScrollBeginDrag,
    onScrollEndDrag,
  };
}

export default useQuickMeals;
