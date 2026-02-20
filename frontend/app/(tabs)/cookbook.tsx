import { View, Text, ScrollView, Alert } from 'react-native';
import AnimatedRefreshControl from '../../components/ui/AnimatedRefreshControl';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import LoadingState from '../../components/ui/LoadingState';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'nativewind';
import { recipeApi, collectionsApi } from '../../lib/api';
import { useCookbookCache } from '../../hooks/useCookbookCache';
import OfflineBanner from '../../components/shopping/OfflineBanner';
import type { SavedRecipe, Collection } from '../../types';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import { CookbookEmptyStates } from '../../constants/EmptyStates';
import { CookbookLoadingStates } from '../../constants/LoadingStates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecipeActionMenu from '../../components/recipe/RecipeActionMenu';

// Extracted cookbook components
import {
  CookbookFilterModal,
  CookbookHeader,
  CookbookInsights,
  CookbookPagination,
  CookbookSortPicker,
  CookbookRecipeList,
  CollectionPicker,
  CollectionEditModal,
  MergeCollectionsModal,
  SimilarRecipesCarousel,
  CollectionSavePicker,
  StarRating,
  RecipeNotesModal,
  MarkCookedModal,
  type CookbookFilters,
  type CollectionSortMode,
} from '../../components/cookbook';

export default function CookbookScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  // Multi-select: empty array => All
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'saved' | 'liked' | 'disliked'>('saved');
  
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('list');
  const DISPLAY_MODE_STORAGE_KEY = '@sazon_cookbook_view_mode';
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'cuisine' | 'matchScore' | 'cookTime' | 'rating' | 'mostCooked'>('recent');
  const SORT_PREFERENCE_KEY = '@sazon_cookbook_sort_preference';
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(true);
  const [userFeedback, setUserFeedback] = useState<Record<string, { liked: boolean; disliked: boolean }>>({});
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null); // null = "Saved" (All)
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Collection save picker state
  const [savePickerVisible, setSavePickerVisible] = useState(false);
  const [savePickerRecipeId, setSavePickerRecipeId] = useState<string | null>(null);
  const [savePickerCollectionIds, setSavePickerCollectionIds] = useState<string[]>([]);

  // Filters & Preferences (client-side filters for cookbook lists)
  const COOKBOOK_FILTERS_STORAGE_KEY = '@sazon_cookbook_filters';
  const [cookbookFilters, setCookbookFilters] = useState<CookbookFilters>({
    maxCookTime: null,
    difficulty: [],
    mealPrepOnly: false,
    highProtein: false,
    lowCal: false,
    budget: false,
    onePot: false,
  });
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Similar recipes carousel state
  const [similarRecipes, setSimilarRecipes] = useState<SavedRecipe[]>([]);
  const [similarRecipesCollapsed, setSimilarRecipesCollapsed] = useState(false);

  // Animation state for recipe cards (matches home page behavior)
  const [animatedRecipeIds, setAnimatedRecipeIds] = useState<Set<string>>(new Set());

  // Action menu state for long press
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuRecipe, setActionMenuRecipe] = useState<SavedRecipe | null>(null);

  // Recipe notes modal state
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notesRecipe, setNotesRecipe] = useState<SavedRecipe | null>(null);

  // Mark cooked modal state
  const [cookModalVisible, setCookModalVisible] = useState(false);
  const [cookRecipe, setCookRecipe] = useState<SavedRecipe | null>(null);

  // Collection enhancement state
  const [collectionSortMode, setCollectionSortMode] = useState<CollectionSortMode>('name');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const RECIPES_PER_PAGE = displayMode === 'grid' ? 20 : 10; // More items in grid view (20) vs list view (10)
  const [allRecipes, setAllRecipes] = useState<SavedRecipe[]>([]); // Store all recipes for pagination
  

  // Load display mode and sort preference on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedDisplayMode = await AsyncStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
        if (savedDisplayMode === 'grid' || savedDisplayMode === 'list') {
          setDisplayMode(savedDisplayMode);
        }
        
        const savedSort = await AsyncStorage.getItem(SORT_PREFERENCE_KEY);
        if (savedSort && ['recent', 'alphabetical', 'cuisine', 'matchScore', 'cookTime', 'rating', 'mostCooked'].includes(savedSort)) {
          setSortBy(savedSort as typeof sortBy);
        }
      } catch (error) {
        console.error('❌ Error loading preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Load cookbook filters on mount
  useEffect(() => {
    const loadCookbookFilters = async () => {
      try {
        const raw = await AsyncStorage.getItem(COOKBOOK_FILTERS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<typeof cookbookFilters>;
        setCookbookFilters(prev => ({
          ...prev,
          ...parsed,
          // Ensure arrays are arrays
          difficulty: Array.isArray((parsed as any).difficulty) ? ((parsed as any).difficulty as any) : prev.difficulty,
        }));
      } catch (e) {
        console.error('❌ Error loading cookbook filters:', e);
      }
    };
    loadCookbookFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist cookbook filters
  useEffect(() => {
    const persist = async () => {
      try {
        await AsyncStorage.setItem(COOKBOOK_FILTERS_STORAGE_KEY, JSON.stringify(cookbookFilters));
      } catch (e) {
        console.error('❌ Error saving cookbook filters:', e);
      }
    };
    persist();
  }, [cookbookFilters]);

  // Toggle display mode
  const handleToggleDisplayMode = async (mode: 'grid' | 'list') => {
    try {
      setDisplayMode(mode);
      await AsyncStorage.setItem(DISPLAY_MODE_STORAGE_KEY, mode);
      HapticPatterns.buttonPress();
    } catch (error) {
      console.error('❌ Error saving display mode:', error);
    }
  };

  // Handle sort change
  const handleSortChange = async (newSort: typeof sortBy) => {
    try {
      setSortBy(newSort);
      await AsyncStorage.setItem(SORT_PREFERENCE_KEY, newSort);
      setCurrentPage(0); // Reset to first page when sorting changes
      HapticPatterns.buttonPress();
      setShowSortPicker(false);
    } catch (error) {
      console.error('❌ Error saving sort preference:', error);
    }
  };

  // Cookbook cache (offline-first loading + sync queue)
  const {
    recipes: cachedRecipes,
    loading: cacheLoading,
    cacheAge,
    isOffline,
    hasPendingSync,
    totalRecipes: serverTotal,
    hasMore: serverHasMore,
    loadingMore,
    loadRecipes,
    loadMore,
    updateNotes: cachedUpdateNotes,
    updateRating: cachedUpdateRating,
    recordCook: cachedRecordCook,
    unsaveRecipe: cachedUnsaveRecipe,
  } = useCookbookCache();

  // Refresh data when screen comes into focus (cache-first)
  useFocusEffect(
    useCallback(() => {
      loadCollections();
      loadRecipes(viewMode, selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined);
    }, [viewMode, selectedCollectionIds])
  );

  // Also refresh when needsRefresh is triggered
  useEffect(() => {
    if (needsRefresh) {
      loadRecipes(viewMode, selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined);
      setNeedsRefresh(false);
    }
  }, [needsRefresh]);

  // Update local state when cached recipes change
  useEffect(() => {
    setAllRecipes(cachedRecipes);
    setCurrentPage(0);

    // Initialize feedback state based on view mode
    const initialFeedback: Record<string, { liked: boolean; disliked: boolean }> = {};
    cachedRecipes.forEach((recipe: SavedRecipe) => {
      if (viewMode === 'liked') {
        initialFeedback[recipe.id] = { liked: true, disliked: false };
      } else if (viewMode === 'disliked') {
        initialFeedback[recipe.id] = { liked: false, disliked: true };
      } else {
        initialFeedback[recipe.id] = { liked: false, disliked: false };
      }
    });
    setUserFeedback(prev => ({ ...prev, ...initialFeedback }));
  }, [cachedRecipes, viewMode]);

  // Apply cookbook filters (client-side) BEFORE sorting/searching
  const filteredByCookbookFilters = useMemo(() => {
    if (!allRecipes || !Array.isArray(allRecipes) || allRecipes.length === 0) {
      return [];
    }

    const {
      maxCookTime,
      difficulty,
      mealPrepOnly,
      highProtein,
      lowCal,
      budget,
      onePot,
    } = cookbookFilters;

    const normalizeDifficulty = (d: unknown) => String(d || '').trim().toLowerCase();

    return allRecipes.filter((r) => {
      const anyR = r as any;

      // Max cook time
      if (maxCookTime && (r.cookTime || 0) > maxCookTime) return false;

      // Difficulty
      if (difficulty.length > 0) {
        const d = normalizeDifficulty(anyR.difficulty);
        const allowed = new Set(difficulty.map((x) => x.toLowerCase()));
        if (!allowed.has(d)) return false;
      }

      // Meal prep only
      if (mealPrepOnly) {
        const ok = !!anyR.mealPrepSuitable || !!anyR.freezable || !!anyR.batchFriendly;
        if (!ok) return false;
      }

      // High protein (simple heuristic)
      if (highProtein && (Number(r.protein) || 0) < 25) return false;

      // Low calorie (simple heuristic)
      if (lowCal && (Number(r.calories) || 0) > 400) return false;

      // Budget (uses same field as SmartBadges)
      if (budget) {
        const cost = Number(anyR.estimatedCostPerServing);
        if (!Number.isFinite(cost) || cost > 3) return false;
      }

      // One pot (best-effort: tags or explicit flags)
      if (onePot) {
        const tags = Array.isArray(anyR.tags) ? anyR.tags.map((t: any) => String(t).toLowerCase()) : [];
        const ok = !!anyR.onePot || !!anyR.isOnePot || tags.includes('one-pot') || tags.includes('one pot');
        if (!ok) return false;
      }

      return true;
    });
  }, [allRecipes, cookbookFilters]);

  // Sort recipes based on selected sort option
  const sortedRecipes = useMemo(() => {
    if (!filteredByCookbookFilters.length) return [];
    
    const sorted = [...filteredByCookbookFilters];
    
    switch (sortBy) {
      case 'recent':
        // Sort by createdAt or updatedAt (most recent first)
        sorted.sort((a, b) => {
          const dateA = (a as any).createdAt || (a as any).updatedAt || '';
          const dateB = (b as any).createdAt || (b as any).updatedAt || '';
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        break;
      case 'alphabetical':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'cuisine':
        sorted.sort((a, b) => {
          const cuisineA = a.cuisine || '';
          const cuisineB = b.cuisine || '';
          if (cuisineA !== cuisineB) {
            return cuisineA.localeCompare(cuisineB);
          }
          // If same cuisine, sort alphabetically by title
          return a.title.localeCompare(b.title);
        });
        break;
      case 'matchScore':
        sorted.sort((a, b) => {
          const scoreA = (a as any).score?.matchPercentage || (a as any).score?.total || 0;
          const scoreB = (b as any).score?.matchPercentage || (b as any).score?.total || 0;
          return scoreB - scoreA; // Highest score first
        });
        break;
      case 'cookTime':
        sorted.sort((a, b) => {
          const timeA = a.cookTime || 0;
          const timeB = b.cookTime || 0;
          return timeA - timeB; // Shortest time first
        });
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'mostCooked':
        sorted.sort((a, b) => (b.cookCount || 0) - (a.cookCount || 0));
        break;
    }
    
    return sorted;
  }, [filteredByCookbookFilters, sortBy]);

  // Apply search filter on top of sorting
  const filteredAndSortedRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedRecipes;

    const contains = (value: unknown) =>
      typeof value === 'string' && value.toLowerCase().includes(q);

    const containsAny = (arr: unknown) =>
      Array.isArray(arr) && arr.some((v) => contains(v));

    return sortedRecipes.filter((r) => {
      const anyR = r as any;
      return (
        contains(r.title) ||
        contains(r.description) ||
        contains(r.cuisine) ||
        contains(r.notes) ||
        containsAny(anyR.tags) ||
        containsAny(anyR.ingredients) ||
        containsAny(anyR.keywords)
      );
    });
  }, [sortedRecipes, searchQuery]);

  // Current page slice
  const pagedRecipes = useMemo(() => {
    const start = currentPage * RECIPES_PER_PAGE;
    return filteredAndSortedRecipes.slice(start, start + RECIPES_PER_PAGE);
  }, [filteredAndSortedRecipes, currentPage, RECIPES_PER_PAGE]);

  // Pagination info (single source of truth)
  const paginationInfo = useMemo(() => {
    const totalItems = filteredAndSortedRecipes.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / RECIPES_PER_PAGE));
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage >= totalPages - 1;
    const hasMultiplePages = totalItems > RECIPES_PER_PAGE;

    const from = totalItems === 0 ? 0 : currentPage * RECIPES_PER_PAGE + 1;
    const to = totalItems === 0 ? 0 : Math.min((currentPage + 1) * RECIPES_PER_PAGE, totalItems);

    return { totalItems, totalPages, isFirstPage, isLastPage, hasMultiplePages, from, to };
  }, [filteredAndSortedRecipes.length, RECIPES_PER_PAGE, currentPage]);

  // Clamp current page when filters/search/sort changes shrink results
  useEffect(() => {
    if (paginationInfo.totalPages <= 1) {
      if (currentPage !== 0) setCurrentPage(0);
      return;
    }
    if (currentPage > paginationInfo.totalPages - 1) {
      setCurrentPage(paginationInfo.totalPages - 1);
    }
  }, [paginationInfo.totalPages, currentPage]);

  // Keep `savedRecipes` as the current page list (used by rendering + stats widgets)
  useEffect(() => {
    setSavedRecipes(pagedRecipes);
  }, [pagedRecipes]);

  // Auto-load more from server when approaching the end of loaded data
  useEffect(() => {
    if (serverHasMore && !loadingMore && paginationInfo.isLastPage && filteredAndSortedRecipes.length > 0) {
      loadMore();
    }
  }, [serverHasMore, loadingMore, paginationInfo.isLastPage, filteredAndSortedRecipes.length, loadMore]);


  // Fetch similar recipes based on the first recipe in the current page
  useEffect(() => {
    const fetchSimilarRecipes = async () => {
      if (pagedRecipes.length === 0) {
        setSimilarRecipes([]);
        return;
      }

      // Use the first recipe as the base for similar recipes
      const baseRecipe = pagedRecipes[0];
      if (!baseRecipe?.id) {
        setSimilarRecipes([]);
        return;
      }

      try {
        const response = await recipeApi.getSimilarRecipes(baseRecipe.id, 10);
        if (response.data && Array.isArray(response.data)) {
          // Filter out recipes that are already in the cookbook
          const cookbookRecipeIds = new Set(allRecipes.map(r => r.id));
          const filtered = response.data.filter((recipe: SavedRecipe) => !cookbookRecipeIds.has(recipe.id));
          setSimilarRecipes(filtered.slice(0, 10)); // Limit to 10
        } else {
          setSimilarRecipes([]);
        }
      } catch (error) {
        console.error('Error fetching similar recipes:', error);
        setSimilarRecipes([]);
      }
    };

    fetchSimilarRecipes();
  }, [pagedRecipes, allRecipes]);
  
  // Reset pagination when display mode changes (grid/list)
  useEffect(() => {
    setCurrentPage(0); // Reset to first page when switching between grid and list view
  }, [displayMode]);
  
  // Refetch when view mode or collection selection changes
  useEffect(() => {
    setNeedsRefresh(true);
    setCurrentPage(0); // Reset pagination when view mode or collection changes
  }, [viewMode, selectedCollectionIds]);

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  // Reset pagination when cookbook filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [cookbookFilters]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadCollections(),
      loadRecipes(viewMode, selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined),
    ]);
    setRefreshing(false);
  };

  // Load collections (server returns recipeCount via _count)
  const loadCollections = async () => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Collection[];
      setCollections(cols);
    } catch (e) {
      console.error('❌ Error loading collections:', e);
    }
  };

  // Handle list selection from dropdown
  const handleSelectList = (listId: string | null) => {
    setSelectedListId(listId);
    if (listId === null) {
      // "All" selected (default - shows all recipes in current view)
      setSelectedCollectionIds([]);
    } else {
      // User-created collection selected
      setSelectedCollectionIds([listId]);
    }
    // Don't switch views - keep the current view (Saved, Liked, or Disliked)
    // and filter by the selected collection
    setShowListPicker(false);
    setNeedsRefresh(true);
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter a collection name.');
      return;
    }
    try {
      const res = await collectionsApi.create(name);
      const created = (Array.isArray(res.data) ? null : (res.data?.data || res.data)) as { id: string; name: string; isDefault: boolean } | null;
      setNewCollectionName('');
      await loadCollections();
      
      // If in save picker context, auto-select the new collection
      if (savePickerVisible && created?.id) {
        setSavePickerCollectionIds(prev => [...prev, created.id]);
      } else if (created?.id) {
        // Otherwise, use the list picker behavior
        handleSelectList(created.id);
      }
      
      Alert.alert('Created', 'Collection created successfully');
    } catch (e: any) {
      const msg = e?.message || '';
      if (/already\s*exists/i.test(msg)) {
        Alert.alert('Duplicate', 'A collection with this name already exists.');
      } else {
        Alert.alert('Error', msg || 'Failed to create collection');
      }
    }
  };

  // Collection edit modal save handler
  const handleCollectionEditSave = async (data: { name: string; description?: string; coverImageUrl?: string | null }) => {
    try {
      if (editingCollection) {
        // Edit mode
        await collectionsApi.update(editingCollection.id, {
          name: data.name,
          description: data.description || null,
          coverImageUrl: data.coverImageUrl,
        });
      } else {
        // Create mode
        await collectionsApi.create({
          name: data.name,
          description: data.description,
          coverImageUrl: data.coverImageUrl || undefined,
        });
      }
      setEditModalVisible(false);
      setEditingCollection(null);
      await loadCollections();
    } catch (e: any) {
      const msg = e?.message || '';
      if (/already\s*exists/i.test(msg)) {
        Alert.alert('Duplicate', 'A collection with this name already exists.');
      } else {
        Alert.alert('Error', msg || 'Failed to save collection');
      }
    }
  };

  // Toggle pin collection
  const handleTogglePin = async (collectionId: string) => {
    try {
      await collectionsApi.togglePin(collectionId);
      await loadCollections();
      HapticPatterns.buttonPress();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to toggle pin');
    }
  };

  // Duplicate collection
  const handleDuplicateCollection = async (collectionId: string) => {
    try {
      await collectionsApi.duplicate(collectionId);
      await loadCollections();
      HapticPatterns.success();
      Alert.alert('Duplicated', 'Collection duplicated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to duplicate collection');
    }
  };

  // Merge collections
  const handleMergeCollections = async (sourceIds: string[], targetId: string) => {
    try {
      await collectionsApi.merge(sourceIds, targetId);
      setMergeModalVisible(false);
      // If viewing a deleted source, switch to All
      if (selectedListId && sourceIds.includes(selectedListId)) {
        handleSelectList(null);
      }
      await loadCollections();
      HapticPatterns.success();
      Alert.alert('Merged', 'Collections merged successfully.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to merge collections');
    }
  };

  // Get recipe images for cover picker (from current saved recipes)
  const collectionRecipeImages = useMemo(() => {
    if (!editingCollection) return [];
    return allRecipes
      .filter((r: any) => r.collectionIds?.includes(editingCollection.id) || r.collections?.some((c: any) => c.id === editingCollection.id))
      .map((r: any) => r.imageUrl)
      .filter(Boolean)
      .slice(0, 12);
  }, [editingCollection, allRecipes]);

  const handleRecipePress = useCallback((recipeId: string) => {
    router.push(`../modal?id=${recipeId}&source=cookbook`);
  }, []);

  // Long press handler to show action menu (matches home page behavior)
  const handleLongPress = useCallback((recipe: SavedRecipe) => {
    HapticPatterns.buttonPress();
    setActionMenuRecipe(recipe);
    setActionMenuVisible(true);
  }, []);

  const handleRemoveRecipe = useCallback(async (recipeId: string) => {
    await cachedUnsaveRecipe(recipeId);
    setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
    HapticPatterns.success();
  }, [cachedUnsaveRecipe]);

  const openSavePicker = useCallback(async (recipeId: string) => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Array<{ id: string; name: string; isDefault?: boolean }>;
      setCollections(cols);
      setSavePickerRecipeId(recipeId);
      setSavePickerCollectionIds([]);
      setSavePickerVisible(true);
    } catch (e) {
      console.log('⚠️  Failed to load collections');
    }
  }, []);

  const handleSaveToCollections = useCallback(async () => {
    if (!savePickerRecipeId) return;

    try {
      // Save to cookbook with selected collections (multi-collection support)
      await recipeApi.saveRecipe(savePickerRecipeId, savePickerCollectionIds.length > 0 ? { collectionIds: savePickerCollectionIds } : undefined);

      setSavePickerVisible(false);
      setSavePickerRecipeId(null);
      setSavePickerCollectionIds([]);
      HapticPatterns.success();
      Alert.alert('Saved', 'Recipe saved to cookbook!');

      // Refresh recipes if in saved view
      if (viewMode === 'saved') {
        loadRecipes(viewMode);
      }
    } catch (error: any) {
      if (error.code === 'HTTP_409' || /already\s*saved/i.test(error.message)) {
        // Already saved, try to move to collections
        if (savePickerCollectionIds.length > 0) {
          try {
            await collectionsApi.moveSavedRecipe(savePickerRecipeId, savePickerCollectionIds);
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
      setSavePickerCollectionIds([]);
    }
  }, [savePickerRecipeId, savePickerCollectionIds, viewMode, loadRecipes]);

  const handleSaveFromCookbook = useCallback(async (recipeId: string) => {
    // In Saved view, the "bookmark" action means remove from cookbook.
    if (viewMode === 'saved') {
      return handleRemoveRecipe(recipeId);
    }

    // In Liked/Disliked views, the "bookmark" action opens collection picker (like home screen).
    return openSavePicker(recipeId);
  }, [viewMode, handleRemoveRecipe, openSavePicker]);

  const handleLike = useCallback(async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);

      // Update UI immediately (optimistic)
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: true, disliked: false }
      }));

      await recipeApi.likeRecipe(recipeId);

      HapticPatterns.success();
      Alert.alert('Liked!', 'We\'ll show you more recipes like this');
    } catch (error: any) {
      console.error('Error liking recipe:', error);
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
  }, []);

  const handleDislike = useCallback(async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);

      // Update UI immediately (optimistic)
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: true }
      }));

      await recipeApi.dislikeRecipe(recipeId);

      HapticPatterns.success();
      Alert.alert('Noted', 'We\'ll show fewer recipes like this');
    } catch (error: any) {
      console.error('Error disliking recipe:', error);
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
  }, []);

  // Cookbook Quick Wins handlers (offline-first via cache hook)
  const handleUpdateNotes = useCallback(async (recipeId: string, notes: string | null) => {
    await cachedUpdateNotes(recipeId, notes);
    HapticPatterns.success();
    setNotesModalVisible(false);
    setNotesRecipe(null);
  }, [cachedUpdateNotes]);

  const handleUpdateRating = useCallback(async (recipeId: string, rating: number | null) => {
    await cachedUpdateRating(recipeId, rating);
    HapticPatterns.success();
  }, [cachedUpdateRating]);

  const handleMarkCooked = useCallback(async (recipeId: string, notes?: string) => {
    await cachedRecordCook(recipeId, notes);
    HapticPatterns.success();
    setCookModalVisible(false);
    setCookRecipe(null);
  }, [cachedRecordCook]);

  // Loading state (only on first load with no cached data)
  if (cacheLoading && savedRecipes.length === 0 && allRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top', 'bottom']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <View className="mb-3 flex-row items-center">
            <Text className="text-2xl mr-2">📚</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" accessibilityRole="header">My Cookbook</Text>
        </View>
          <Text className="text-gray-500 dark:text-gray-200">Loading saved recipes...</Text>
        </View>
        <LoadingState config={CookbookLoadingStates.savedRecipes} fullScreen />
      </SafeAreaView>
    );
  }

  // Offline with no cached data
  if (isOffline && allRecipes.length === 0 && !cacheLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top', 'bottom']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <View className="mb-3 flex-row items-center">
            <Text className="text-2xl mr-2">📚</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" accessibilityRole="header">My Cookbook</Text>
        </View>
          <Text className="text-gray-500 dark:text-gray-200">No cached recipes available</Text>
        </View>
        <AnimatedEmptyState
          useMascot
          mascotExpression="supportive"
          mascotSize="large"
          title="You're offline"
          description="Open your cookbook while connected to cache your recipes for offline viewing."
          actionLabel="Try Again"
          onAction={() => loadRecipes(viewMode)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header with title, display toggle, quick filters, and search */}
      <CookbookHeader
        displayMode={displayMode}
        onDisplayModeChange={handleToggleDisplayMode}
        filters={cookbookFilters}
        onFilterChange={(newFilters) => {
          setCookbookFilters(newFilters);
          setCurrentPage(0);
        }}
        onAdvancedFilterPress={() => setShowFilterModal(true)}
        searchQuery={searchQuery}
        onSearchChange={(text) => {
          setSearchQuery(text);
          setCurrentPage(0);
        }}
      />

      {/* Offline / sync status banner */}
      <OfflineBanner
        isOffline={isOffline}
        hasPendingSync={hasPendingSync}
        cacheAge={cacheAge}
      />

      {/* Cookbook Filter Modal */}
      <CookbookFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={cookbookFilters}
        onFilterChange={(newFilters) => {
          setCookbookFilters(newFilters);
          // Save filters to storage
          AsyncStorage.setItem(COOKBOOK_FILTERS_STORAGE_KEY, JSON.stringify(newFilters)).catch(console.error);
        }}
        searchQuery={searchQuery}
        onSearchChange={(text) => {
          setSearchQuery(text);
          setCurrentPage(0);
        }}
        collections={collections}
        selectedListId={selectedListId}
        onSelectList={(id) => {
          handleSelectList(id);
          // Don't close modal - let user continue filtering
        }}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setNeedsRefresh(true);
          // Don't close modal - let user continue filtering
        }}
        sortBy={sortBy}
        onSortChange={(sort) => {
          handleSortChange(sort);
          // Don't close modal - let user continue filtering
        }}
      />

      {/* Cookbook Insights Modal */}
      <CookbookInsights
        visible={showInsightsModal}
        onClose={() => setShowInsightsModal(false)}
        recipes={filteredAndSortedRecipes}
        filters={cookbookFilters}
        onFilterChange={(newFilters) => {
          setCookbookFilters(newFilters);
          setCurrentPage(0);
        }}
      />

      {/* Sort Picker Modal */}
      <CookbookSortPicker
        visible={showSortPicker}
        onClose={() => setShowSortPicker(false)}
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />

      {/* Collection Picker Modal */}
      <CollectionPicker
        visible={showListPicker}
        onClose={() => setShowListPicker(false)}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setNeedsRefresh(true);
        }}
        collections={collections}
        selectedListId={selectedListId}
        onSelectList={handleSelectList}
        onCreateCollection={() => {
          setEditingCollection(null);
          setEditModalVisible(true);
        }}
        onEditCollection={(collectionId) => {
          const col = collections.find((c) => c.id === collectionId);
          if (col) {
            setEditingCollection(col);
            setEditModalVisible(true);
          }
        }}
        onDeleteCollection={(collectionId, collectionName) => {
          Alert.alert(
            'Delete Collection',
            `Are you sure you want to delete "${collectionName}"? Recipes will remain in your cookbook.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                  await collectionsApi.remove(collectionId);
                  if (selectedListId === collectionId) {
                    handleSelectList(null);
                  }
                  await loadCollections();
                  Alert.alert('Deleted', 'Collection deleted successfully.');
                } catch (e: any) {
                  Alert.alert('Error', e?.message || 'Failed to delete collection');
                }
              }}
            ]
          );
        }}
        onTogglePin={handleTogglePin}
        onDuplicate={handleDuplicateCollection}
        onMerge={() => setMergeModalVisible(true)}
        sortMode={collectionSortMode}
        onSortModeChange={setCollectionSortMode}
      />

      {/* Collection Edit Modal (create/edit) */}
      <CollectionEditModal
        visible={editModalVisible}
        onClose={() => { setEditModalVisible(false); setEditingCollection(null); }}
        onSave={handleCollectionEditSave}
        collection={editingCollection}
        recipeImages={collectionRecipeImages}
      />

      {/* Merge Collections Modal */}
      <MergeCollectionsModal
        visible={mergeModalVisible}
        onClose={() => setMergeModalVisible(false)}
        collections={collections}
        onMerge={handleMergeCollections}
      />

      {!cacheLoading && allRecipes.length === 0 ? (
        // No recipes found (but API call succeeded with null/empty response)
        <>
          {viewMode === 'saved' && (
            <AnimatedEmptyState
              config={CookbookEmptyStates.noSavedRecipes}
              title=""
              onAction={() => router.push('/')}
            />
          )}
          {viewMode === 'liked' && (
            <AnimatedEmptyState
              config={CookbookEmptyStates.noLikedRecipes}
              title=""
              onAction={() => {
                setViewMode('saved');
                router.push('/');
              }}
            />
          )}
          {viewMode === 'disliked' && (
            <AnimatedEmptyState
              config={CookbookEmptyStates.noDislikedRecipes}
              title=""
              onAction={() => {
                setViewMode('saved');
                router.push('/');
              }}
            />
          )}
        </>
      ) : filteredAndSortedRecipes.length === 0 && allRecipes.length > 0 ? (
        // Filters/search returned no results, but we have recipes
        <AnimatedEmptyState
          config={CookbookEmptyStates.noSearchResults}
          title=""
          onAction={() => {
            setSearchQuery('');
            setCookbookFilters({
              maxCookTime: null,
              difficulty: [],
              mealPrepOnly: false,
              highProtein: false,
              lowCal: false,
              budget: false,
              onePot: false,
            });
            setCurrentPage(0);
            HapticPatterns.buttonPress();
          }}
        />
      ) : searchQuery.trim().length > 0 && filteredAndSortedRecipes.length === 0 ? (
        // Empty state - search returned no results
        <AnimatedEmptyState
          config={CookbookEmptyStates.noSearchResults}
          title=""
          onAction={() => {
            setSearchQuery('');
            setCurrentPage(0);
            HapticPatterns.buttonPress();
          }}
        />
      ) : (allRecipes.length > 0 && !cacheLoading) ? (
        // Recipes list (show if we have recipes and not loading)
        <ScrollView
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 300 }}
            refreshControl={
              <AnimatedRefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor={isDark ? DarkColors.primary : Colors.primary}
                colors={[isDark ? DarkColors.primary : Colors.primary]}
                progressViewOffset={0}
              />
            }
            showsVerticalScrollIndicator={true}
          >
          <View className="px-4">

            {/* Pagination summary */}
            {filteredAndSortedRecipes.length > 0 && (
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                Showing {paginationInfo.from}-{paginationInfo.to} of {paginationInfo.totalItems} recipes{serverHasMore ? ` (${serverTotal} total)` : ''}
              </Text>
            )}
            <CookbookRecipeList
              recipes={savedRecipes.length > 0 ? savedRecipes : allRecipes.slice(0, RECIPES_PER_PAGE)}
              displayMode={displayMode}
              isDark={isDark}
              userFeedback={userFeedback}
              feedbackLoading={feedbackLoading}
              animatedRecipeIds={animatedRecipeIds}
              onAnimated={(id) => setAnimatedRecipeIds(prev => new Set(prev).add(id))}
              onRecipePress={handleRecipePress}
              onRecipeLongPress={handleLongPress}
              onLike={handleLike}
              onDislike={handleDislike}
              onSave={handleSaveFromCookbook}
              onRate={handleUpdateRating}
            />
          </View>

          {/* Loading more indicator */}
          {loadingMore && (
            <View className="py-3 items-center">
              <Text className="text-sm text-gray-500 dark:text-gray-400">Loading more recipes...</Text>
            </View>
          )}

          {/* Pagination Controls */}
          <CookbookPagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            paginationInfo={paginationInfo}
          />
          
          {/* Similar Recipes Carousel */}
          <SimilarRecipesCarousel
            recipes={similarRecipes}
            isCollapsed={similarRecipesCollapsed}
            onToggleCollapse={() => setSimilarRecipesCollapsed(!similarRecipesCollapsed)}
            userFeedback={userFeedback}
            feedbackLoading={feedbackLoading}
            onRecipePress={handleRecipePress}
            onRecipeLongPress={handleLongPress}
            onLike={handleLike}
            onDislike={handleDislike}
            onDelete={viewMode === 'saved' ? handleRemoveRecipe : undefined}
            onSave={viewMode !== 'saved' ? handleSaveFromCookbook : undefined}
            viewMode={viewMode}
          />
        </ScrollView>
      ) : null}

      {/* Collection Save Picker Modal */}
      <CollectionSavePicker
        visible={savePickerVisible}
        onClose={() => {
          setSavePickerVisible(false);
          setSavePickerRecipeId(null);
          setSavePickerCollectionIds([]);
        }}
        collections={collections}
        selectedCollectionIds={savePickerCollectionIds}
        onSelectionChange={setSavePickerCollectionIds}
        onSave={handleSaveToCollections}
        onCreateCollection={async (name) => {
          setNewCollectionName(name);
          await handleCreateCollection();
        }}
      />

      {/* Recipe Action Menu (long press menu - matches home page) */}
      {actionMenuRecipe && (
        <RecipeActionMenu
          visible={actionMenuVisible}
          recipe={actionMenuRecipe as any}
          onClose={() => {
            setActionMenuVisible(false);
            setActionMenuRecipe(null);
          }}
          onAddToMealPlan={() => {
            // Navigate to meal plan with recipe
            router.push(`/meal-plan?addRecipe=${actionMenuRecipe.id}`);
          }}
          onViewSimilar={() => {
            // Load similar recipes
            setSimilarRecipesCollapsed(false);
          }}
          onAddNotes={() => {
            setNotesRecipe(actionMenuRecipe);
            setNotesModalVisible(true);
          }}
          onRate={() => {
            // Rating is handled inline via StarRating component
            // This opens the notes modal as a quick action fallback
            setNotesRecipe(actionMenuRecipe);
            setNotesModalVisible(true);
          }}
          onMarkCooked={() => {
            setCookRecipe(actionMenuRecipe);
            setCookModalVisible(true);
          }}
          onAddToCollection={() => {
            setSavePickerRecipeId(actionMenuRecipe.id);
            const currentCollectionIds = (actionMenuRecipe as any).collections?.map((c: any) => c.id) || [];
            setSavePickerCollectionIds(currentCollectionIds);
            setSavePickerVisible(true);
          }}
        />
      )}

      {/* Recipe Notes Modal */}
      {notesRecipe && (
        <RecipeNotesModal
          visible={notesModalVisible}
          onClose={() => { setNotesModalVisible(false); setNotesRecipe(null); }}
          recipeTitle={notesRecipe.title}
          initialNotes={notesRecipe.notes || null}
          onSave={(notes) => handleUpdateNotes(notesRecipe.id, notes)}
        />
      )}

      {/* Mark Cooked Modal */}
      {cookRecipe && (
        <MarkCookedModal
          visible={cookModalVisible}
          onClose={() => { setCookModalVisible(false); setCookRecipe(null); }}
          recipeTitle={cookRecipe.title}
          onConfirm={(notes) => handleMarkCooked(cookRecipe.id, notes)}
          cookCount={cookRecipe.cookCount}
          lastCooked={cookRecipe.lastCooked}
        />
      )}
    </SafeAreaView>
  );
}