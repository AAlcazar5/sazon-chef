import { View, Text, ScrollView, Alert, TextInput, Modal, Animated } from 'react-native';
import AnimatedRefreshControl from '../../components/ui/AnimatedRefreshControl';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import LoadingState from '../../components/ui/LoadingState';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import AnimatedActivityIndicator from '../../components/ui/AnimatedActivityIndicator';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useColorScheme } from 'nativewind';
import { useApi } from '../../hooks/useApi';
import { recipeApi, collectionsApi } from '../../lib/api';
import type { SavedRecipe } from '../../types';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { FontSize } from '../../constants/Typography';
import { Duration, Spring } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';
import { CookbookEmptyStates } from '../../constants/EmptyStates';
import { CookbookLoadingStates } from '../../constants/LoadingStates';
import { buttonAccessibility, iconButtonAccessibility, inputAccessibility } from '../../utils/accessibility';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CollectionCard from '../../components/collection/CollectionCard';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import AnimatedRecipeCard from '../../components/recipe/AnimatedRecipeCard';
import RecipeActionMenu from '../../components/recipe/RecipeActionMenu';

interface Collection {
  id: string;
  name: string;
  isDefault?: boolean;
  recipeCount?: number;
  updatedAt?: string;
  coverImageUrl?: string;
}

type CookbookFilters = {
  maxCookTime: number | null;
  difficulty: Array<'Easy' | 'Medium' | 'Hard'>;
  mealPrepOnly: boolean;
  highProtein: boolean;
  lowCal: boolean;
  budget: boolean;
  onePot: boolean;
};

// Cookbook Filter Modal Component
function CookbookFilterModal({
  visible,
  onClose,
  filters,
  onFilterChange,
  searchQuery,
  onSearchChange,
  collections,
  selectedListId,
  onSelectList,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
}: {
  visible: boolean;
  onClose: () => void;
  filters: CookbookFilters;
  onFilterChange: (filters: CookbookFilters) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  collections: Collection[];
  selectedListId: string | null;
  onSelectList: (id: string | null) => void;
  viewMode: 'saved' | 'liked' | 'disliked';
  onViewModeChange: (mode: 'saved' | 'liked' | 'disliked') => void;
  sortBy: 'recent' | 'alphabetical' | 'cuisine' | 'matchScore' | 'cookTime';
  onSortChange: (sort: 'recent' | 'alphabetical' | 'cuisine' | 'matchScore' | 'cookTime') => void;
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

  const handleApply = () => {
    onFilterChange(filters);
    onClose();
  };

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
                onPress={handleApply}
                style={{ paddingVertical: 8, paddingHorizontal: 4, minWidth: 60 }}
              >
                <Text className="font-medium" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>Apply</Text>
              </HapticTouchableOpacity>
            </View>

            <ScrollView 
              className="flex-1 px-4 py-4"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* View Mode */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">View Mode</Text>
                <View className="flex-row flex-wrap">
                  {[
                    { value: 'saved' as const, label: 'Saved', icon: Icons.BOOKMARK },
                    { value: 'liked' as const, label: 'Liked', icon: Icons.LIKE },
                    { value: 'disliked' as const, label: 'Disliked', icon: Icons.DISLIKE },
                  ].map((option) => (
                    <HapticTouchableOpacity
                      key={option.value}
                      onPress={() => onViewModeChange(option.value)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        viewMode === option.value
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={viewMode === option.value ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        viewMode === option.value ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {option.label}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Collections */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Collection</Text>
                <View className="flex-row flex-wrap">
                  <HapticTouchableOpacity
                    onPress={() => onSelectList(null)}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                      selectedListId === null
                        ? ''
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }`}
                    style={selectedListId === null ? {
                      backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                      borderColor: isDark ? DarkColors.primary : Colors.primary
                    } : undefined}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedListId === null ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                    }`}>
                      All
                    </Text>
                  </HapticTouchableOpacity>
                  {collections.map((collection) => (
                    <HapticTouchableOpacity
                      key={collection.id}
                      onPress={() => onSelectList(collection.id)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        selectedListId === collection.id
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={selectedListId === collection.id ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        selectedListId === collection.id ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {collection.name}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Sort</Text>
                <View className="flex-row flex-wrap">
                  {[
                    { value: 'recent' as const, label: 'Recently Added' },
                    { value: 'alphabetical' as const, label: 'Alphabetical' },
                    { value: 'cuisine' as const, label: 'By Cuisine' },
                    { value: 'matchScore' as const, label: 'Match Score' },
                    { value: 'cookTime' as const, label: 'Cook Time' },
                  ].map((option) => (
                    <HapticTouchableOpacity
                      key={option.value}
                      onPress={() => onSortChange(option.value)}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        sortBy === option.value
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={sortBy === option.value ? {
                        backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                        borderColor: isDark ? DarkColors.primary : Colors.primary
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        sortBy === option.value ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {option.label}
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
                      onPress={() => onFilterChange({ ...filters, maxCookTime: filters.maxCookTime === time ? null : time })}
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
                  {(['Easy', 'Medium', 'Hard'] as const).map((difficulty) => (
                    <HapticTouchableOpacity
                      key={difficulty}
                      onPress={() => {
                        const has = filters.difficulty.includes(difficulty);
                        onFilterChange({
                          ...filters,
                          difficulty: has
                            ? filters.difficulty.filter(d => d !== difficulty)
                            : [...filters.difficulty, difficulty]
                        });
                      }}
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

              {/* Dietary Filters */}
              <View className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Dietary</Text>
                <View className="flex-row flex-wrap">
                  {[
                    { key: 'mealPrepOnly', label: 'Meal Prep', emoji: '🍱' },
                    { key: 'highProtein', label: 'High Protein', emoji: '💪' },
                    { key: 'lowCal', label: 'Low Calorie', emoji: '🥗' },
                    { key: 'budget', label: 'Budget Friendly', emoji: '💰' },
                    { key: 'onePot', label: 'One Pot', emoji: '🍲' },
                  ].map(({ key, label, emoji }) => (
                    <HapticTouchableOpacity
                      key={key}
                      onPress={() => onFilterChange({ ...filters, [key]: !filters[key as keyof CookbookFilters] as any })}
                      className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                        filters[key as keyof CookbookFilters]
                          ? ''
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                      }`}
                      style={filters[key as keyof CookbookFilters] ? {
                        backgroundColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
                        borderColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen
                      } : undefined}
                    >
                      <Text className={`text-sm font-medium ${
                        filters[key as keyof CookbookFilters] ? 'text-white' : 'text-gray-700 dark:text-gray-100'
                      }`}>
                        {emoji} {label}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default function CookbookScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showCollectionsView, setShowCollectionsView] = useState(false);
  // Multi-select: empty array => All
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'saved' | 'liked' | 'disliked'>('saved');
  const [savedUrl, setSavedUrl] = useState<string>('/recipes/saved');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('list');
  const DISPLAY_MODE_STORAGE_KEY = '@sazon_cookbook_view_mode';
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'cuisine' | 'matchScore' | 'cookTime'>('recent');
  const SORT_PREFERENCE_KEY = '@sazon_cookbook_sort_preference';
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(true);
  const [userFeedback, setUserFeedback] = useState<Record<string, { liked: boolean; disliked: boolean }>>({});
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null); // null = "Saved" (All)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Collection save picker state
  const [savePickerVisible, setSavePickerVisible] = useState(false);
  const [savePickerRecipeId, setSavePickerRecipeId] = useState<string | null>(null);
  const [savePickerCollectionIds, setSavePickerCollectionIds] = useState<string[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);

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
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Similar recipes carousel state
  const [similarRecipes, setSimilarRecipes] = useState<SavedRecipe[]>([]);
  const [similarRecipesLoading, setSimilarRecipesLoading] = useState(false);
  const [similarRecipesCollapsed, setSimilarRecipesCollapsed] = useState(false);

  // Animation state for recipe cards (matches home page behavior)
  const [animatedRecipeIds, setAnimatedRecipeIds] = useState<Set<string>>(new Set());

  // Action menu state for long press
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuRecipe, setActionMenuRecipe] = useState<SavedRecipe | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const RECIPES_PER_PAGE = displayMode === 'grid' ? 20 : 10; // More items in grid view (20) vs list view (10)
  const [allRecipes, setAllRecipes] = useState<SavedRecipe[]>([]); // Store all recipes for pagination
  
  // Animation values for list picker modal
  const listPickerScale = useRef(new Animated.Value(0)).current;
  const listPickerOpacity = useRef(new Animated.Value(0)).current;

  // Load display mode and sort preference on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedDisplayMode = await AsyncStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
        if (savedDisplayMode === 'grid' || savedDisplayMode === 'list') {
          setDisplayMode(savedDisplayMode);
        }
        
        const savedSort = await AsyncStorage.getItem(SORT_PREFERENCE_KEY);
        if (savedSort && ['recent', 'alphabetical', 'cuisine', 'matchScore', 'cookTime'].includes(savedSort)) {
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

  // Get sort label
  const getSortLabel = () => {
    switch (sortBy) {
      case 'recent': return 'Recently Added';
      case 'alphabetical': return 'Alphabetical';
      case 'cuisine': return 'By Cuisine';
      case 'matchScore': return 'Match Score';
      case 'cookTime': return 'Cook Time';
      default: return 'Recently Added';
    }
  };

  // Animate list picker modal
  useEffect(() => {
    if (showListPicker) {
      listPickerScale.setValue(0);
      listPickerOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(listPickerScale, {
          toValue: 1,
          ...Spring.stiff,
        }),
        Animated.timing(listPickerOpacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(listPickerScale, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(listPickerOpacity, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showListPicker]);
  
  // Determine API URL based on view mode and collection filter
  const getApiUrl = () => {
    const baseUrl = viewMode === 'liked' 
      ? '/recipes/liked' 
      : viewMode === 'disliked' 
      ? '/recipes/disliked' 
      : '/recipes/saved';
    
    // Add collection filter if one is selected
    if (selectedCollectionIds.length > 0) {
      const collectionParam = `collectionId=${selectedCollectionIds.join(',')}`;
      return `${baseUrl}?${collectionParam}`;
    }
    
    return baseUrl;
  };
  
  const [apiUrl, setApiUrl] = useState<string>(getApiUrl());
  
  // Update API URL when view mode or collection selection changes
  useEffect(() => {
    const newUrl = getApiUrl();
    console.log('📱 Cookbook: API URL changed:', newUrl);
    setApiUrl(newUrl);
  }, [viewMode, selectedCollectionIds]);

  const { data: recipesData, loading: apiLoading, error: apiError, refetch } = useApi(
    apiUrl,
    { immediate: false } // Don't fetch immediately, we'll control it
  );

  // Refetch when apiUrl changes (including collection filter changes)
  useEffect(() => {
    if (apiUrl) {
      console.log('📱 Cookbook: API URL changed, refetching:', apiUrl);
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]); // refetch changes when apiUrl changes, so we don't need it in deps

  // Truncate description to approximately 2 lines (80-100 characters)
  const truncateDescription = (text: string, maxLength: number = 100): string => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Cookbook: Screen focused, refreshing data');
      loadCollections();
      refetch();
    }, [refetch])
  );

  // Also refresh when needsRefresh is triggered (legacy - apiUrl change should handle it now)
  useEffect(() => {
    if (needsRefresh) {
      console.log('📱 Cookbook: Needs refresh, fetching data');
      refetch();
      setNeedsRefresh(false);
    }
  }, [needsRefresh, refetch]);

  // Update local state when API data loads
  useEffect(() => {
    if (recipesData) {
      console.log(`📱 Cookbook: Received ${viewMode} recipes data`, recipesData.length);
      setAllRecipes(recipesData); // Store all recipes
      setCurrentPage(0); // Reset pagination when data changes
      
      // Initialize feedback state based on view mode
      const initialFeedback: Record<string, { liked: boolean; disliked: boolean }> = {};
      recipesData.forEach((recipe: SavedRecipe) => {
        if (viewMode === 'liked') {
          initialFeedback[recipe.id] = { liked: true, disliked: false };
        } else if (viewMode === 'disliked') {
          initialFeedback[recipe.id] = { liked: false, disliked: true };
        } else {
          initialFeedback[recipe.id] = { liked: false, disliked: false };
        }
      });
      setUserFeedback(prev => ({ ...prev, ...initialFeedback }));
    }
  }, [recipesData, viewMode]);

  // Apply cookbook filters (client-side) BEFORE sorting/searching
  const filteredByCookbookFilters = useMemo(() => {
    if (!allRecipes.length) return [];

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
          const scoreA = a.score?.matchPercentage || a.score?.total || 0;
          const scoreB = b.score?.matchPercentage || b.score?.total || 0;
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

      setSimilarRecipesLoading(true);
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
      } finally {
        setSimilarRecipesLoading(false);
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

  // Calculate active filters for display
  useEffect(() => {
    const active: string[] = [];
    if (cookbookFilters.maxCookTime) active.push(`≤${cookbookFilters.maxCookTime}min`);
    if (cookbookFilters.difficulty.length > 0) active.push(`${cookbookFilters.difficulty.length} difficulty`);
    if (cookbookFilters.mealPrepOnly) active.push('Meal Prep');
    if (cookbookFilters.highProtein) active.push('High Protein');
    if (cookbookFilters.lowCal) active.push('Low Cal');
    if (cookbookFilters.budget) active.push('Budget');
    if (cookbookFilters.onePot) active.push('One Pot');
    setActiveFilters(active);
  }, [cookbookFilters]);

  // Clear all filters
  const clearCookbookFilters = () => {
    setCookbookFilters({
      maxCookTime: null,
      difficulty: [],
      mealPrepOnly: false,
      highProtein: false,
      lowCal: false,
      budget: false,
      onePot: false,
    });
    HapticPatterns.buttonPress();
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCollections(), refetch()]);
    setRefreshing(false);
  };

  // Load collections with enhanced data
  const loadCollections = async () => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Collection[];
      
      // Fetch recipe counts and cover images for each collection
      const enhancedCollections = await Promise.all(
        cols.map(async (collection) => {
          try {
            // Fetch recipes in this collection to get count and cover image
            const recipesRes = await recipeApi.getSavedRecipes();
            const allRecipes = Array.isArray(recipesRes.data) ? recipesRes.data : (recipesRes.data?.data || []);
            
            // Filter recipes that belong to this collection
            // Note: This assumes recipes have a collectionIds field
            const collectionRecipes = allRecipes.filter((recipe: any) => 
              recipe.collectionIds?.includes(collection.id)
            );
            
            // Get cover image from first recipe
            const coverImageUrl = collectionRecipes.length > 0 && collectionRecipes[0].imageUrl
              ? collectionRecipes[0].imageUrl
              : undefined;
            
            // Get updatedAt from most recent recipe update or collection update
            const updatedAt = collectionRecipes.length > 0 && collectionRecipes[0].updatedAt
              ? collectionRecipes[0].updatedAt
              : undefined;
            
            return {
              ...collection,
              recipeCount: collectionRecipes.length,
              coverImageUrl,
              updatedAt,
            };
          } catch (error) {
            console.error(`Error loading collection ${collection.id}:`, error);
            return {
              ...collection,
              recipeCount: 0,
            };
          }
        })
      );
      
      setCollections(enhancedCollections);
      
      // Ensure URL matches selected collection
      if (selectedCollectionIds.length > 0) {
        setSavedUrl(`/recipes/saved?collectionId=${selectedCollectionIds.join(',')}`);
      } else {
        setSavedUrl('/recipes/saved');
      }
    } catch (e) {
      console.log('📱 Cookbook: Failed to load collections');
    }
  };

  const handleSelectCollection = (collectionId: string | null) => {
    if (collectionId === null) {
      // All selected: clear others
      setSelectedCollectionIds([]);
      setSavedUrl('/recipes/saved');
      setSelectedListId(null);
    } else {
      setSelectedCollectionIds(prev => {
        const exists = prev.includes(collectionId);
        const next = exists ? prev.filter(id => id !== collectionId) : [...prev, collectionId];
        // If empty after toggle, treat as All
        setSavedUrl(next.length > 0 ? `/recipes/saved?collectionId=${next.join(',')}` : '/recipes/saved');
        setSelectedListId(next.length > 0 ? collectionId : null);
        return next;
      });
    }
    setNeedsRefresh(true);
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

  // Get current list name for display
  const getCurrentListName = () => {
    const viewModeLabel = viewMode === 'saved' ? 'Saved' : viewMode === 'liked' ? 'Liked' : 'Disliked';
    if (selectedListId === null) return viewModeLabel;
    const collection = collections.find(c => c.id === selectedListId);
    return collection ? `${viewModeLabel} - ${collection.name}` : viewModeLabel;
  };

  const getScoreColor = (score: number) => {
    // Return style object instead of className for dynamic colors
    if (score >= 80) return { color: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen };
    if (score >= 60) return { color: isDark ? DarkColors.primary : Colors.primary };
    return { color: isDark ? DarkColors.secondaryRed : Colors.secondaryRed };
  };

  // Cookbook Insights (useful, actionable summary)
  const cookbookInsights = useMemo(() => {
    const recipes = filteredAndSortedRecipes;
    const total = recipes.length;

    const normalizeDifficulty = (d: unknown) => String(d || '').trim().toLowerCase();

    let quickCount = 0;
    let easyCount = 0;
    let mealPrepCount = 0;
    let highProteinCount = 0;
    let lowCalCount = 0;
    let budgetCount = 0;

    let cookTimeSum = 0;
    let cookTimeN = 0;
    let caloriesSum = 0;
    let caloriesN = 0;
    let proteinSum = 0;
    let proteinN = 0;

    let bestMatch = 0;

    const gradeCounts: Record<string, number> = {};
    let abCount = 0;

    for (const r of recipes) {
      const anyR = r as any;
      const cookTime = Number(r.cookTime);
      const calories = Number(r.calories);
      const protein = Number(r.protein);

      if (Number.isFinite(cookTime)) {
        cookTimeSum += cookTime;
        cookTimeN += 1;
        if (cookTime <= 30) quickCount += 1;
      }

      if (Number.isFinite(calories)) {
        caloriesSum += calories;
        caloriesN += 1;
        if (calories <= 400) lowCalCount += 1;
      }

      if (Number.isFinite(protein)) {
        proteinSum += protein;
        proteinN += 1;
        if (protein >= 25) highProteinCount += 1;
      }

      const diff = normalizeDifficulty(anyR.difficulty);
      if (diff === 'easy') easyCount += 1;

      if (!!anyR.mealPrepSuitable || !!anyR.freezable || !!anyR.batchFriendly) mealPrepCount += 1;

      const cost = Number(anyR.estimatedCostPerServing);
      if (Number.isFinite(cost) && cost <= 3) budgetCount += 1;

      const match = Number((anyR.score && (anyR.score.matchPercentage ?? anyR.score.total)) ?? anyR.score?.total);
      if (Number.isFinite(match)) bestMatch = Math.max(bestMatch, Math.round(match));

      const grade = String(anyR.healthGrade || anyR.score?.healthGrade || '').toUpperCase();
      if (grade) {
        gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
        if (grade === 'A' || grade === 'B') abCount += 1;
      }
    }

    const avgCookTime = cookTimeN > 0 ? Math.round(cookTimeSum / cookTimeN) : null;
    const avgCalories = caloriesN > 0 ? Math.round(caloriesSum / caloriesN) : null;
    const avgProtein = proteinN > 0 ? Math.round(proteinSum / proteinN) : null;

    const abPct = total > 0 ? Math.round((abCount / total) * 100) : 0;
    
    return {
      total,
      quickCount,
      easyCount,
      mealPrepCount,
      highProteinCount,
      lowCalCount,
      budgetCount,
      bestMatch,
      avgCookTime,
      avgCalories,
      avgProtein,
      abCount,
      abPct,
      gradeCounts,
    };
  }, [filteredAndSortedRecipes]);

  const renderCookbookInsightsContent = () => (
    <View className="bg-white dark:bg-gray-800 rounded-2xl p-4">
      <View className="flex-row items-start justify-between mb-3">
        <View>
          <Text className="text-sm text-gray-600 dark:text-gray-200">Best match</Text>
          <Text
            className="text-2xl font-bold"
            style={{ color: isDark ? DarkColors.primary : Colors.primary }}
          >
            {cookbookInsights.bestMatch}%
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Highest match across this collection
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm text-gray-600 dark:text-gray-200">A/B health</Text>
          <Text
            className="text-2xl font-bold"
            style={{
              color:
                cookbookInsights.abPct >= 70
                  ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                  : cookbookInsights.abPct >= 40
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? DarkColors.secondaryRed : Colors.secondaryRed),
            }}
          >
            {cookbookInsights.abPct}%
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {cookbookInsights.abCount} of {cookbookInsights.total} recipes
          </Text>
        </View>
      </View>

      {/* A/B Progress Bar */}
      <View className="mb-4">
        <View className="relative w-full" style={{ height: 10, borderRadius: 5, overflow: 'hidden' }}>
          <View
            className="absolute rounded-full"
            style={{
              width: '100%',
              height: 10,
              backgroundColor: isDark ? '#374151' : '#E5E7EB',
              borderRadius: 5,
            }}
          />
          <View
            className="absolute rounded-full"
            style={{
              height: 10,
              width: `${cookbookInsights.abPct}%`,
              backgroundColor:
                cookbookInsights.abPct >= 70
                  ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen)
                  : cookbookInsights.abPct >= 40
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? DarkColors.secondaryRed : Colors.secondaryRed),
              borderRadius: 5,
            }}
          />
        </View>
      </View>

      <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Tap to filter
      </Text>

      {/* One-tap pills (toggle existing cookbookFilters + close modal) */}
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        <HapticTouchableOpacity
          onPress={() => {
            setCookbookFilters(prev => ({ ...prev, maxCookTime: prev.maxCookTime === 30 ? null : 30 }));
            setShowInsightsModal(false);
          }}
          className="px-3 py-2 rounded-full flex-row items-center border"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Icon name={Icons.COOK_TIME} size={12} color={isDark ? '#D1D5DB' : '#6B7280'} accessibilityLabel="Quick" />
          <Text className="text-xs font-semibold ml-1.5 text-gray-700 dark:text-gray-200">Quick</Text>
          <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
            <Text className="text-xs font-semibold text-white">{cookbookInsights.quickCount}</Text>
          </View>
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          onPress={() => {
            setCookbookFilters(prev => {
              const has = prev.difficulty.includes('Easy');
              return { ...prev, difficulty: has ? prev.difficulty.filter(d => d !== 'Easy') : [...prev.difficulty, 'Easy'] };
            });
            setShowInsightsModal(false);
          }}
          className="px-3 py-2 rounded-full flex-row items-center border"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">✨ Easy</Text>
          <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
            <Text className="text-xs font-semibold text-white">{cookbookInsights.easyCount}</Text>
          </View>
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          onPress={() => {
            setCookbookFilters(prev => ({ ...prev, mealPrepOnly: !prev.mealPrepOnly }));
            setShowInsightsModal(false);
          }}
          className="px-3 py-2 rounded-full flex-row items-center border"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">🍱 Meal prep</Text>
          <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
            <Text className="text-xs font-semibold text-white">{cookbookInsights.mealPrepCount}</Text>
          </View>
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          onPress={() => {
            setCookbookFilters(prev => ({ ...prev, highProtein: !prev.highProtein }));
            setShowInsightsModal(false);
          }}
          className="px-3 py-2 rounded-full flex-row items-center border"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">💪 High protein</Text>
          <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
            <Text className="text-xs font-semibold text-white">{cookbookInsights.highProteinCount}</Text>
          </View>
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          onPress={() => {
            setCookbookFilters(prev => ({ ...prev, lowCal: !prev.lowCal }));
            setShowInsightsModal(false);
          }}
          className="px-3 py-2 rounded-full flex-row items-center border"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">🥗 Low cal</Text>
          <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
            <Text className="text-xs font-semibold text-white">{cookbookInsights.lowCalCount}</Text>
          </View>
        </HapticTouchableOpacity>

        <HapticTouchableOpacity
          onPress={() => {
            setCookbookFilters(prev => ({ ...prev, budget: !prev.budget }));
            setShowInsightsModal(false);
          }}
          className="px-3 py-2 rounded-full flex-row items-center border"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">💰 Budget</Text>
          <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
            <Text className="text-xs font-semibold text-white">{cookbookInsights.budgetCount}</Text>
          </View>
        </HapticTouchableOpacity>
      </View>

      {/* Averages */}
      <View className="mt-4">
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Avg cook time: {cookbookInsights.avgCookTime ?? '—'} min  ·  Avg protein: {cookbookInsights.avgProtein ?? '—'}g  ·  Avg calories: {cookbookInsights.avgCalories ?? '—'}
        </Text>
      </View>
    </View>
  );

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
      setShowCreateCollection(false);
      setCreatingCollection(false);
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

  const handleRecipePress = (recipeId: string) => {
    console.log('📱 Cookbook: Recipe pressed', recipeId);
    router.push(`../modal?id=${recipeId}&source=cookbook`);
  };

  // Long press handler to show action menu (matches home page behavior)
  const handleLongPress = (recipe: SavedRecipe) => {
    console.log('📱 Cookbook: Long press on recipe', recipe.id);
    HapticPatterns.buttonPress();
    setActionMenuRecipe(recipe);
    setActionMenuVisible(true);
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    try {
      console.log('📱 Cookbook: Removing recipe', recipeId);
      await recipeApi.unsaveRecipe(recipeId);
      
      // Update local state immediately for better UX
      setAllRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      
      Alert.alert('Success', 'Recipe removed from cookbook!');
    } catch (error: any) {
      console.error('📱 Cookbook: Remove error', error);
      Alert.alert('Error', error.message || 'Failed to remove recipe');
    }
  };

  const openSavePicker = async (recipeId: string) => {
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
  };

  const handleSaveToCollections = async () => {
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
        refetch();
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
  };

  const handleSaveFromCookbook = async (recipeId: string) => {
    // In Saved view, the "bookmark" action means remove from cookbook.
    if (viewMode === 'saved') {
      return handleRemoveRecipe(recipeId);
    }

    // In Liked/Disliked views, the "bookmark" action opens collection picker (like home screen).
    return openSavePicker(recipeId);
  };

  const handleDeleteRecipe = async (recipeId: string, recipeTitle: string) => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipeTitle}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('📱 Cookbook: Deleting user recipe', recipeId);
              await recipeApi.deleteRecipe(recipeId);
              
              // Update local state immediately for better UX
              setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
              
              Alert.alert('Success', 'Recipe deleted successfully!');
            } catch (error: any) {
              console.error('📱 Cookbook: Delete error', error);
              Alert.alert('Error', error.message || 'Failed to delete recipe');
            }
          }
        }
      ]
    );
  };

  const handleLike = async (recipeId: string) => {
    try {
      setFeedbackLoading(recipeId);
      console.log('📱 Cookbook: Liking recipe', recipeId);
      
      // Update UI immediately
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: true, disliked: false }
      }));
      
      await recipeApi.likeRecipe(recipeId);
      
      // Success haptic
      HapticPatterns.success();
      
      Alert.alert('Liked!', 'We\'ll show you more recipes like this');
    } catch (error: any) {
      console.error('📱 Cookbook: Like error', error);
      
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
      console.log('📱 Cookbook: Disliking recipe', recipeId);
      
      // Update UI immediately
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: true }
      }));
      
      await recipeApi.dislikeRecipe(recipeId);
      
      // Success haptic
      HapticPatterns.success();
      
      Alert.alert('Noted', 'We\'ll show fewer recipes like this');
    } catch (error: any) {
      console.error('📱 Cookbook: Dislike error', error);
      
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

  // Loading state
  if (apiLoading && savedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
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

  // Error state
  if (apiError && savedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <View className="mb-3 flex-row items-center">
            <Text className="text-2xl mr-2">📚</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" accessibilityRole="header">My Cookbook</Text>
        </View>
          <Text className="text-gray-500 dark:text-gray-200">Failed to load recipes</Text>
        </View>
        <AnimatedEmptyState
          useMascot
          mascotExpression="supportive"
          mascotSize="large"
          title="Failed to load saved recipes"
          description={apiError}
          actionLabel="Try Again"
          onAction={refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700" style={{ minHeight: 56 }}>
        <View className="flex-row items-center justify-between" style={{ height: 28 }}>
          <View className="flex-row items-center flex-1">
          <Text className="text-2xl mr-2" style={{ lineHeight: 28 }}>📚</Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100" accessibilityRole="header" style={{ lineHeight: 28 }}>My Cookbook</Text>
          </View>
          {/* View Mode Toggle */}
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <HapticTouchableOpacity
              onPress={() => handleToggleDisplayMode('list')}
              className={`px-3 py-1.5 rounded ${displayMode === 'list' ? '' : ''}`}
              style={displayMode === 'list' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
            >
              <Ionicons 
                name="list" 
                size={18} 
                color={displayMode === 'list' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')} 
              />
            </HapticTouchableOpacity>
            <HapticTouchableOpacity
              onPress={() => handleToggleDisplayMode('grid')}
              className={`px-3 py-1.5 rounded ${displayMode === 'grid' ? '' : ''}`}
              style={displayMode === 'grid' ? { backgroundColor: isDark ? DarkColors.primary : Colors.primary } : undefined}
            >
              <Ionicons 
                name="grid" 
                size={18} 
                color={displayMode === 'grid' ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')} 
              />
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filters & Preferences */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {/* Header with Filter Button */}
          <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">Filters & Preferences</Text>
            <HapticTouchableOpacity 
              onPress={() => {
                setShowFilterModal(true);
                HapticPatterns.buttonPress();
              }}
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
                    const isActive = cookbookFilters.maxCookTime === 30;
                    setCookbookFilters(prev => ({ ...prev, maxCookTime: isActive ? null : 30 }));
                    HapticPatterns.buttonPress();
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    cookbookFilters.maxCookTime === 30 ? '' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  style={cookbookFilters.maxCookTime === 30 ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  } : undefined}
                >
                  <Icon name={Icons.COOK_TIME} size={14} color={cookbookFilters.maxCookTime === 30 ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')} accessibilityLabel="Quick" />
                  <Text className={`text-sm font-semibold ml-1.5 ${
                    cookbookFilters.maxCookTime === 30 ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Quick
                  </Text>
                </HapticTouchableOpacity>

                {/* Easy Difficulty */}
                <HapticTouchableOpacity
                  onPress={() => {
                    const isActive = cookbookFilters.difficulty.includes('Easy');
                    setCookbookFilters(prev => {
                      return { ...prev, difficulty: isActive ? prev.difficulty.filter(d => d !== 'Easy') : [...prev.difficulty, 'Easy'] };
                    });
                    HapticPatterns.buttonPress();
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    cookbookFilters.difficulty.includes('Easy') ? '' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  style={cookbookFilters.difficulty.includes('Easy') ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  } : undefined}
                >
                  <Text className="text-base">✨</Text>
                  <Text className={`text-sm font-semibold ml-1.5 ${
                    cookbookFilters.difficulty.includes('Easy') ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Easy
                  </Text>
                </HapticTouchableOpacity>

                {/* High Protein */}
                <HapticTouchableOpacity
                  onPress={() => {
                    const isActive = cookbookFilters.highProtein;
                    setCookbookFilters(prev => ({ ...prev, highProtein: !isActive }));
                    HapticPatterns.buttonPress();
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    cookbookFilters.highProtein ? '' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  style={cookbookFilters.highProtein ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  } : undefined}
                >
                  <Text className="text-base">💪</Text>
                  <Text className={`text-sm font-semibold ml-1.5 ${
                    cookbookFilters.highProtein ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    High Protein
                  </Text>
                </HapticTouchableOpacity>

                {/* Low Cal */}
                <HapticTouchableOpacity
                  onPress={() => {
                    const isActive = cookbookFilters.lowCal;
                    setCookbookFilters(prev => ({ ...prev, lowCal: !isActive }));
                    HapticPatterns.buttonPress();
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    cookbookFilters.lowCal ? '' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  style={cookbookFilters.lowCal ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  } : undefined}
                >
                  <Text className="text-base">🥗</Text>
                  <Text className={`text-sm font-semibold ml-1.5 ${
                    cookbookFilters.lowCal ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Low Cal
                  </Text>
                </HapticTouchableOpacity>

                {/* Meal Prep */}
                <HapticTouchableOpacity
                  onPress={() => {
                    const isActive = cookbookFilters.mealPrepOnly;
                    setCookbookFilters(prev => ({ ...prev, mealPrepOnly: !isActive }));
                    HapticPatterns.buttonPress();
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    cookbookFilters.mealPrepOnly ? '' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  style={cookbookFilters.mealPrepOnly ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  } : undefined}
                >
                  <Text className="text-base">🍱</Text>
                  <Text className={`text-sm font-semibold ml-1.5 ${
                    cookbookFilters.mealPrepOnly ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Meal Prep
                  </Text>
                </HapticTouchableOpacity>

                {/* Budget Friendly */}
                <HapticTouchableOpacity
                  onPress={() => {
                    const isActive = cookbookFilters.budget;
                    setCookbookFilters(prev => ({ ...prev, budget: !isActive }));
                    HapticPatterns.buttonPress();
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    cookbookFilters.budget ? '' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  style={cookbookFilters.budget ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  } : undefined}
                >
                  <Text className="text-base">💰</Text>
                  <Text className={`text-sm font-semibold ml-1.5 ${
                    cookbookFilters.budget ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    Budget
                  </Text>
                </HapticTouchableOpacity>

                {/* One Pot */}
                <HapticTouchableOpacity
                  onPress={() => {
                    const isActive = cookbookFilters.onePot;
                    setCookbookFilters(prev => ({ ...prev, onePot: !isActive }));
                    HapticPatterns.buttonPress();
                  }}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    cookbookFilters.onePot ? '' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  style={cookbookFilters.onePot ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                  } : undefined}
                >
                  <Text className="text-base">🍲</Text>
                  <Text className={`text-sm font-semibold ml-1.5 ${
                    cookbookFilters.onePot ? 'text-white' : 'text-gray-700 dark:text-gray-300'
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
              setCurrentPage(0);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
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

      {/* Cookbook Insights Modal (collapsed by default) */}
      <Modal
        visible={showInsightsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInsightsModal(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white dark:bg-gray-900 rounded-t-2xl p-4 max-h-[80%]">
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cookbook insights</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Quick stats + one-tap filters
                </Text>
              </View>
              <HapticTouchableOpacity
                onPress={() => setShowInsightsModal(false)}
                className="p-2 rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}
              >
                <Icon name={Icons.CLOSE} size={IconSizes.SM} color={isDark ? '#D1D5DB' : '#6B7280'} accessibilityLabel="Close insights" />
              </HapticTouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {renderCookbookInsightsContent()}
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sort Picker Modal */}
      <Modal
        visible={showSortPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortPicker(false)}
      >
        <SafeAreaView className="flex-1 bg-black/50 justify-center items-center px-4" edges={['top', 'bottom']}>
          <HapticTouchableOpacity
            activeOpacity={1}
            onPress={() => setShowSortPicker(false)}
            className="absolute inset-0"
          />
          <View className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-lg">
            <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sort recipes</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Choose how your cookbook is ordered
                </Text>
              </View>
              <HapticTouchableOpacity
                onPress={() => setShowSortPicker(false)}
                className="p-2 rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}
              >
                <Icon name={Icons.CLOSE} size={IconSizes.SM} color={isDark ? '#D1D5DB' : '#6B7280'} accessibilityLabel="Close sort modal" />
              </HapticTouchableOpacity>
            </View>
            <ScrollView className="max-h-96">
              {[
                { value: 'recent' as const, label: 'Recently Added', icon: Icons.CLOCK_OUTLINE },
                { value: 'alphabetical' as const, label: 'Alphabetical', icon: Icons.SORT_ALPHABETICAL },
                { value: 'cuisine' as const, label: 'By Cuisine', icon: Icons.GLOBE },
                { value: 'matchScore' as const, label: 'Match Score', icon: Icons.STAR },
                { value: 'cookTime' as const, label: 'Cook Time', icon: Icons.COOK_TIME },
              ].map((option) => (
                <HapticTouchableOpacity
                  key={option.value}
                  onPress={() => handleSortChange(option.value)}
                  className={`px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                    sortBy === option.value ? '' : 'bg-white dark:bg-gray-800'
                  }`}
                  style={sortBy === option.value ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
                >
                  <Icon 
                    name={sortBy === option.value ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                    size={IconSizes.MD} 
                    color={sortBy === option.value ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"} 
                    accessibilityLabel={sortBy === option.value ? "Selected" : "Not selected"}
                    style={{ marginRight: 12 }}
                  />
                  <Icon name={option.icon} size={IconSizes.SM} color={sortBy === option.value ? (isDark ? DarkColors.primary : Colors.primary) : '#6B7280'} accessibilityLabel={option.label} style={{ marginRight: 12 }} />
                  <Text className={`flex-1 text-base ${sortBy === option.value ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`} style={sortBy === option.value ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}>
                    {option.label}
                  </Text>
                </HapticTouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* List Picker Modal */}
      <Modal
        visible={showListPicker}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowListPicker(false)}
      >
        <Animated.View 
          className="flex-1 bg-black/50 justify-center items-center px-4"
          style={{ opacity: listPickerOpacity }}
        >
          <HapticTouchableOpacity
            activeOpacity={1}
            onPress={() => setShowListPicker(false)}
            className="flex-1 w-full justify-center items-center"
          >
            <HapticTouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Animated.View 
                className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm shadow-lg"
                style={{
                  transform: [{ scale: listPickerScale }],
                }}
              >
                <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select View & Collection</Text>
                </View>
            
            <ScrollView className="max-h-80">
              {/* View Mode Options: Saved, Liked, Disliked */}
              <View className="px-2 pt-2">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">View Mode</Text>
                <HapticTouchableOpacity
                  onPress={() => {
                    setViewMode('saved');
                    setNeedsRefresh(true);
                    setShowListPicker(false);
                  }}
                  className={`px-4 py-3 flex-row items-center rounded-lg mb-2 ${
                    viewMode === 'saved' ? '' : 'bg-white dark:bg-gray-800'
                  }`}
                  style={viewMode === 'saved' ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
                >
                  <Icon 
                    name={viewMode === 'saved' ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                    size={IconSizes.MD} 
                    color={viewMode === 'saved' ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"} 
                    accessibilityLabel={viewMode === 'saved' ? "Selected" : "Not selected"}
                    style={{ marginRight: 12 }}
                  />
                  <Text className={`flex-1 text-base ${viewMode === 'saved' ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`} style={viewMode === 'saved' ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}>
                    Saved
                  </Text>
                </HapticTouchableOpacity>
                
                <HapticTouchableOpacity
                  onPress={() => {
                    setViewMode('liked');
                    setNeedsRefresh(true);
                    setShowListPicker(false);
                  }}
                  className={`px-4 py-3 flex-row items-center rounded-lg mb-2 ${
                    viewMode === 'liked' ? '' : 'bg-white dark:bg-gray-800'
                  }`}
                  style={viewMode === 'liked' ? { backgroundColor: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight } : undefined}
                >
                  <Icon 
                    name={viewMode === 'liked' ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                    size={IconSizes.MD} 
                    color={viewMode === 'liked' ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen) : "#9CA3AF"} 
                    accessibilityLabel={viewMode === 'liked' ? "Selected" : "Not selected"}
                    style={{ marginRight: 12 }}
                  />
                  <Icon name={Icons.LIKE} size={IconSizes.SM} color={viewMode === 'liked' ? (isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen) : '#6B7280'} accessibilityLabel="Liked" style={{ marginRight: 8 }} />
                  <Text className={`flex-1 text-base ${viewMode === 'liked' ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`} style={viewMode === 'liked' ? { color: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark } : undefined}>
                    Liked
                  </Text>
                </HapticTouchableOpacity>
                
                <HapticTouchableOpacity
                  onPress={() => {
                    setViewMode('disliked');
                    setNeedsRefresh(true);
                    setShowListPicker(false);
                  }}
                  className={`px-4 py-3 flex-row items-center rounded-lg mb-2 ${
                    viewMode === 'disliked' ? '' : 'bg-white dark:bg-gray-800'
                  }`}
                  style={viewMode === 'disliked' ? { backgroundColor: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight } : undefined}
                >
                  <Icon 
                    name={viewMode === 'disliked' ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                    size={IconSizes.MD} 
                    color={viewMode === 'disliked' ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed) : "#9CA3AF"} 
                    accessibilityLabel={viewMode === 'disliked' ? "Selected" : "Not selected"}
                    style={{ marginRight: 12 }}
                  />
                  <Icon name={Icons.DISLIKE} size={IconSizes.SM} color={viewMode === 'disliked' ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed) : '#6B7280'} accessibilityLabel="Disliked" style={{ marginRight: 8 }} />
                  <Text className={`flex-1 text-base ${viewMode === 'disliked' ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`} style={viewMode === 'disliked' ? { color: isDark ? DarkColors.secondaryRedDark : Colors.secondaryRedDark } : undefined}>
                    Disliked
                  </Text>
                </HapticTouchableOpacity>
              </View>
              
              {/* Collections Section */}
              <View className="px-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">Collections</Text>
              {/* "All" (default) option */}
              <HapticTouchableOpacity
                onPress={() => handleSelectList(null)}
                className={`px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                  selectedListId === null ? '' : 'bg-white dark:bg-gray-800'
                }`}
                style={selectedListId === null ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
              >
                <Icon 
                  name={selectedListId === null ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                  size={IconSizes.MD} 
                  color={selectedListId === null ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"} 
                  accessibilityLabel={selectedListId === null ? "Selected" : "Not selected"}
                  style={{ marginRight: 12 }}
                />
                <Text className={`flex-1 text-base ${selectedListId === null ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`} style={selectedListId === null ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}>
                  All
                </Text>
              </HapticTouchableOpacity>
              
              {/* User-created collections - Card View */}
              <View className="px-2 py-2">
                <View className="flex-row flex-wrap" style={{ marginHorizontal: -Spacing.sm }}>
              {collections.map((collection) => (
                    <View key={collection.id} style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.md }}>
                      <CollectionCard
                        collection={collection}
                        isSelected={selectedListId === collection.id}
                  onPress={() => handleSelectList(collection.id)}
                  onLongPress={() => {
                    Alert.alert(
                            'Collection Options',
                            `What would you like to do with "${collection.name}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                              { text: 'Edit', onPress: () => {
                                Alert.prompt(
                                  'Edit Collection',
                                  'Enter a new name for this collection:',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Save', onPress: async (newName) => {
                                      if (newName && newName.trim()) {
                                        try {
                                          await collectionsApi.update(collection.id, newName.trim());
                                          await loadCollections();
                                        } catch (e: any) {
                                          Alert.alert('Error', e?.message || 'Failed to update collection');
                                        }
                                      }
                                    }}
                                  ],
                                  'plain-text',
                                  collection.name
                                );
                              }},
                        { text: 'Delete', style: 'destructive', onPress: async () => {
                          try {
                            await collectionsApi.remove(collection.id);
                            if (selectedListId === collection.id) {
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
                        onEdit={() => {
                          Alert.prompt(
                            'Edit Collection',
                            'Enter a new name for this collection:',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Save', onPress: async (newName) => {
                                if (newName && newName.trim()) {
                                  try {
                                    await collectionsApi.update(collection.id, newName.trim());
                                    await loadCollections();
                                  } catch (e: any) {
                                    Alert.alert('Error', e?.message || 'Failed to update collection');
                                  }
                                }
                              }}
                            ],
                            'plain-text',
                            collection.name
                          );
                        }}
                        onDelete={() => {
                      Alert.alert(
                            'Delete Collection',
                        `Are you sure you want to delete "${collection.name}"? Recipes will remain in your cookbook.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: async () => {
                            try {
                              await collectionsApi.remove(collection.id);
                              if (selectedListId === collection.id) {
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
                      />
                    </View>
                  ))}
                </View>
              </View>
              </View>
            </ScrollView>
            
            {/* Create New Collection Button */}
            <View className="p-4 border-t border-gray-200 dark:border-gray-700">
              <HapticTouchableOpacity
                onPress={() => {
                  setShowListPicker(false);
                  setShowCreateCollection(true);
                }}
                className="px-4 py-3 rounded-lg flex-row items-center justify-center"
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Create new collection" />
                <Text className="text-white font-semibold ml-2">Create New Collection</Text>
              </HapticTouchableOpacity>
            </View>
            
            {/* Close Button */}
            <HapticTouchableOpacity
              onPress={() => setShowListPicker(false)}
              className="px-4 py-3 border-t border-gray-200 dark:border-gray-700"
            >
              <Text className="text-gray-600 dark:text-gray-100 font-medium text-center">Close</Text>
            </HapticTouchableOpacity>
              </Animated.View>
            </HapticTouchableOpacity>
          </HapticTouchableOpacity>
        </Animated.View>
      </Modal>

      {/* Inline create collection input */}
      {showCreateCollection && (
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row items-center">
            <TextInput
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              placeholder="Collection name"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mr-2 dark:bg-gray-700 dark:text-gray-100"
              placeholderTextColor="#9CA3AF"
            />
            <HapticTouchableOpacity onPress={handleCreateCollection} className="px-4 py-2 rounded-lg" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
              <Text className="text-white font-semibold">Create</Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      )}

      {filteredAndSortedRecipes.length === 0 ? (
        // Empty state
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
      ) : (
        // Recipes list
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 0, paddingBottom: Spacing['3xl'] }}
          refreshControl={
            <AnimatedRefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={isDark ? DarkColors.primary : Colors.primary}
              colors={[isDark ? DarkColors.primary : Colors.primary]}
              progressViewOffset={0}
            />
          }
        >
          <View className="px-4">
            <View className="mb-3">
              <Text className="text-gray-700 dark:text-gray-300 text-lg font-semibold">
                {viewMode === 'saved' && `${filteredAndSortedRecipes.length} saved recipes`}
                {viewMode === 'liked' && `${filteredAndSortedRecipes.length} liked recipes`}
                {viewMode === 'disliked' && `${filteredAndSortedRecipes.length} disliked recipes`}
              </Text>
            </View>

            {/* Pagination summary */}
            {filteredAndSortedRecipes.length > 0 && (
              <Text className="text-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                Showing {paginationInfo.from}-{paginationInfo.to} of {paginationInfo.totalItems} recipes
              </Text>
            )}
            {displayMode === 'grid' ? (
              // Grid View - 2 Column Layout
              <View className="flex-row flex-wrap" style={{ marginHorizontal: -Spacing.sm }}>
                {savedRecipes.map((recipe) => {
                  const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                  const isFeedbackLoading = feedbackLoading === recipe.id;

                  return (
                  <View key={recipe.id} style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.lg }}>
                    <RecipeCard
                      recipe={recipe as any}
                      variant="grid"
                      onPress={handleRecipePress}
                      onLongPress={() => handleLongPress(recipe)}
                      onLike={handleLike}
                      onDislike={handleDislike}
                      onSave={handleSaveFromCookbook}
                      feedback={feedback}
                      isFeedbackLoading={isFeedbackLoading}
                      isDark={isDark}
                    />
                      </View>
                  );
                })}
                      </View>
            ) : (
              // List View - With animations (matches home page)
              <>
              {savedRecipes.map((recipe, index) => {
                const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                const isFeedbackLoading = feedbackLoading === recipe.id;

                return (
                  <AnimatedRecipeCard
                    key={recipe.id ?? `${index}`}
                    index={index}
                    recipeId={recipe.id}
                    animatedIds={animatedRecipeIds}
                    onAnimated={(id) => setAnimatedRecipeIds(prev => new Set(prev).add(id))}
                  >
                    <RecipeCard
                      recipe={recipe as any}
                      variant="list"
                      onPress={handleRecipePress}
                      onLongPress={() => handleLongPress(recipe)}
                      onLike={handleLike}
                      onDislike={handleDislike}
                      onSave={handleSaveFromCookbook}
                      feedback={feedback}
                      isFeedbackLoading={isFeedbackLoading}
                      isDark={isDark}
                      showDescription={true}
                      className="mb-4"
                    />
                  </AnimatedRecipeCard>
                );
              })}
              </>
            )}
          </View>

          {/* Pagination Component - Only show when there are multiple pages */}
          {paginationInfo.hasMultiplePages && (
          <View className="px-4 py-6">
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex-row items-center justify-between">
                    <HapticTouchableOpacity
                      onPress={() => {
                  if (!paginationInfo.isFirstPage) {
                          setCurrentPage(currentPage - 1);
                          HapticPatterns.buttonPress();
                        }
                      }}
                disabled={paginationInfo.isFirstPage}
                      className={`px-4 py-2 rounded-lg flex-row items-center justify-center ${
                  paginationInfo.isFirstPage ? 'opacity-50' : ''
                      }`}
                      style={{
                  backgroundColor: paginationInfo.isFirstPage
                          ? isDark ? '#374151' : '#F3F4F6'
                          : isDark ? DarkColors.primary : Colors.primary,
                        minWidth: 100,
                        width: 100
                      }}
                    >
                      <Icon 
                        name={Icons.CHEVRON_BACK} 
                        size={IconSizes.SM} 
                  color={paginationInfo.isFirstPage ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF'} 
                        accessibilityLabel="Previous page"
                      />
                      <Text 
                        className="text-sm font-semibold ml-1"
                  style={{ color: paginationInfo.isFirstPage ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF' }}
                      >
                        Previous
                      </Text>
                    </HapticTouchableOpacity>

              {/* Page Indicator */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Page {currentPage + 1} of {paginationInfo.totalPages}
                      </Text>
                    </View>

                    <HapticTouchableOpacity
                      onPress={() => {
                  if (!paginationInfo.isLastPage) {
                          setCurrentPage(currentPage + 1);
                          HapticPatterns.buttonPress();
                        }
                      }}
                disabled={paginationInfo.isLastPage}
                      className={`px-4 py-2 rounded-lg flex-row items-center justify-center ${
                  paginationInfo.isLastPage ? 'opacity-50' : ''
                      }`}
                      style={{
                  backgroundColor: paginationInfo.isLastPage
                          ? isDark ? '#374151' : '#F3F4F6'
                          : isDark ? DarkColors.primary : Colors.primary,
                        minWidth: 100,
                        width: 100
                      }}
                    >
                      <Text 
                        className="text-sm font-semibold mr-1"
                  style={{ color: paginationInfo.isLastPage ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF' }}
                      >
                        Next
                      </Text>
                      <Icon 
                        name={Icons.CHEVRON_FORWARD} 
                        size={IconSizes.SM} 
                  color={paginationInfo.isLastPage ? (isDark ? '#6B7280' : '#9CA3AF') : '#FFFFFF'} 
                        accessibilityLabel="Next page"
                      />
                    </HapticTouchableOpacity>
                  </View>
                </View>
          )}
          
          {/* Similar Recipes Carousel */}
          {similarRecipes.length > 0 && (
            <View className="px-4 mt-8 mb-6">
              <HapticTouchableOpacity
                onPress={() => {
                  setSimilarRecipesCollapsed(!similarRecipesCollapsed);
                  HapticPatterns.buttonPress();
                }}
                className="mb-3 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 items-center justify-center mr-3">
                    <Text className="text-lg">💡</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      You might also like
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {similarRecipes.length} recipe{similarRecipes.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <Icon 
                  name={similarRecipesCollapsed ? Icons.CHEVRON_DOWN : Icons.CHEVRON_UP}
                  size={IconSizes.SM} 
                  color={isDark ? '#9CA3AF' : '#6B7280'}
                  accessibilityLabel={similarRecipesCollapsed ? 'Expand section' : 'Collapse section'}
                />
              </HapticTouchableOpacity>
              
              {!similarRecipesCollapsed && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingRight: Spacing.lg }}
                  decelerationRate="fast"
                  snapToInterval={292}
                  snapToAlignment="start"
                >
                  {similarRecipes.map((recipe) => {
                    const feedback = userFeedback[recipe.id] || { liked: false, disliked: false };
                    const isFeedbackLoading = feedbackLoading === recipe.id;

                    return (
                      <View key={recipe.id} style={{ width: 280, marginRight: 12 }}>
                        <RecipeCard
                          recipe={recipe as any}
                          variant="carousel"
                          onPress={handleRecipePress}
                          onLongPress={() => handleLongPress(recipe)}
                          onLike={handleLike}
                          onDislike={handleDislike}
                          onSave={handleSaveFromCookbook}
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
          )}
          
          {/* Show recipe count when there's only one page */}
          {/* When only one page, the summary above covers it */}
        </ScrollView>
      )}

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
                    setSavePickerCollectionIds(prev => 
                      prev.includes(c.id) 
                        ? prev.filter(id => id !== c.id)
                        : [...prev, c.id]
                    );
                  }}
                  className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700"
                >
                  <View className={`w-5 h-5 mr-3 rounded border ${savePickerCollectionIds.includes(c.id) ? '' : 'border-gray-300 dark:border-gray-600'}`} style={savePickerCollectionIds.includes(c.id) ? {
                    backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                    borderColor: isDark ? DarkColors.primary : Colors.primary
                  } : undefined}>
                    {savePickerCollectionIds.includes(c.id) && (
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
              <HapticTouchableOpacity onPress={() => {
                setSavePickerVisible(false);
                setSavePickerRecipeId(null);
                setSavePickerCollectionIds([]);
                setCreatingCollection(false);
              }} className="px-4 py-3">
                <Text className="text-gray-700 dark:text-gray-100">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity onPress={handleSaveToCollections} className="px-4 py-3 rounded-lg" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
                <Text className="text-white font-semibold">Save</Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
        />
      )}
    </SafeAreaView>
  );
}