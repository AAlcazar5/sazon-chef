import { View, Text, ScrollView, Alert, TextInput, Modal, Animated } from 'react-native';
import AnimatedRefreshControl from '../../components/ui/AnimatedRefreshControl';
import AnimatedEmptyState from '../../components/ui/AnimatedEmptyState';
import HapticTouchableOpacity from '../../components/ui/HapticTouchableOpacity';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useColorScheme } from 'nativewind';
import { useApi } from '../../hooks/useApi';
import { recipeApi, collectionsApi } from '../../lib/api';
import type { SavedRecipe } from '../../types';
import FeedbackButtons from '../../components/recipe/FeedbackButtons';
import * as Haptics from 'expo-haptics';
import Icon from '../../components/ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';

export default function CookbookScreen() {
  const { colorScheme } = useColorScheme();
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [collections, setCollections] = useState<Array<{ id: string; name: string; isDefault?: boolean }>>([]);
  // Multi-select: empty array => All
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'saved' | 'liked' | 'disliked'>('saved');
  const [savedUrl, setSavedUrl] = useState<string>('/recipes/saved');
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(true);
  const [userFeedback, setUserFeedback] = useState<Record<string, { liked: boolean; disliked: boolean }>>({});
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null); // null = "Saved" (All)
  
  // Animation values for list picker modal
  const listPickerScale = useRef(new Animated.Value(0)).current;
  const listPickerOpacity = useRef(new Animated.Value(0)).current;

  // Animate list picker modal
  useEffect(() => {
    if (showListPicker) {
      listPickerScale.setValue(0);
      listPickerOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(listPickerScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(listPickerOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(listPickerScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(listPickerOpacity, {
          toValue: 0,
          duration: 200,
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
      setSavedRecipes(recipesData);
      
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
  
  // Refetch when view mode or collection selection changes
  useEffect(() => {
    setNeedsRefresh(true);
  }, [viewMode, selectedCollectionIds]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCollections(), refetch()]);
    setRefreshing(false);
  };

  // Load collections
  const loadCollections = async () => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Array<{ id: string; name: string; isDefault?: boolean }>;
      setCollections(cols);
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
    if (selectedListId === null) return 'All';
    const collection = collections.find(c => c.id === selectedListId);
    return collection ? collection.name : 'All';
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter a list name.');
      return;
    }
    try {
      const res = await collectionsApi.create(name);
      const created = (Array.isArray(res.data) ? null : (res.data?.data || res.data)) as { id: string; name: string; isDefault: boolean } | null;
      setNewCollectionName('');
      setShowCreateCollection(false);
      await loadCollections();
      if (created?.id) {
        handleSelectList(created.id);
      }
      Alert.alert('Created', 'List created successfully');
    } catch (e: any) {
      const msg = e?.message || '';
      if (/already\s*exists/i.test(msg)) {
        Alert.alert('Duplicate', 'A list with this name already exists.');
      } else {
        Alert.alert('Error', msg || 'Failed to create list');
      }
    }
  };

  const handleRecipePress = (recipeId: string) => {
    console.log('📱 Cookbook: Recipe pressed', recipeId);
    router.push(`../modal?id=${recipeId}&source=cookbook`);
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    try {
      console.log('📱 Cookbook: Removing recipe', recipeId);
      await recipeApi.unsaveRecipe(recipeId);
      
      // Update local state immediately for better UX
      setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      
      Alert.alert('Success', 'Recipe removed from cookbook!');
    } catch (error: any) {
      console.error('📱 Cookbook: Remove error', error);
      Alert.alert('Error', error.message || 'Failed to remove recipe');
    }
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Liked!', 'We\'ll show you more recipes like this');
    } catch (error: any) {
      console.error('📱 Cookbook: Like error', error);
      
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
      console.log('📱 Cookbook: Disliking recipe', recipeId);
      
      // Update UI immediately
      setUserFeedback(prev => ({
        ...prev,
        [recipeId]: { liked: false, disliked: true }
      }));
      
      await recipeApi.dislikeRecipe(recipeId);
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Noted', 'We\'ll show fewer recipes like this');
    } catch (error: any) {
      console.error('📱 Cookbook: Dislike error', error);
      
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

  // Loading state
  if (apiLoading && savedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Cookbook</Text>
          <Text className="text-gray-500 dark:text-gray-200 mt-1">Loading saved recipes...</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Icon name={Icons.EMPTY_RECIPES} size={64} color="#9CA3AF" accessibilityLabel="Loading recipes" />
          <Text className="text-xl font-semibold text-gray-500 dark:text-gray-200 mt-4">Loading recipes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (apiError && savedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
        <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Cookbook</Text>
          <Text className="text-gray-500 dark:text-gray-200 mt-1">Failed to load recipes</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Icon name={Icons.RECIPE_ERROR} size={64} color="#EF4444" accessibilityLabel="Error loading recipes" />
          <Text className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4 text-center">
            Failed to load saved recipes
          </Text>
          <Text className="text-gray-500 dark:text-gray-200 text-center mt-2">
            {apiError}
          </Text>
          <HapticTouchableOpacity 
            onPress={refetch}
            className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </HapticTouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top']}>
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Cookbook</Text>
            <Text className="text-gray-500 dark:text-gray-200 mt-1">
              {viewMode === 'saved' && `${savedRecipes.length} saved recipes`}
              {viewMode === 'liked' && `${savedRecipes.length} liked recipes`}
              {viewMode === 'disliked' && `${savedRecipes.length} disliked recipes`}
            </Text>
          </View>
          <HapticTouchableOpacity 
            onPress={handleRefresh}
            className="p-2"
            disabled={refreshing}
          >
            <Icon 
              name={Icons.RELOAD} 
              size={IconSizes.LG} 
              color={refreshing ? "#9CA3AF" : "#6B7280"} 
              accessibilityLabel="Refresh recipes"
            />
          </HapticTouchableOpacity>
        </View>
        
        {/* View Mode Tabs: Saved, Liked, Disliked */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="h-10 mb-3">
          <View className="flex-row items-center">
            <HapticTouchableOpacity
              onPress={() => {
                setViewMode('saved');
                setNeedsRefresh(true);
              }}
              className={`px-4 py-2 rounded-full mr-2 ${viewMode === 'saved' ? 'bg-orange-500 dark:bg-orange-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <Text className={`${viewMode === 'saved' ? 'text-white' : 'text-gray-800 dark:text-gray-200'} font-medium`}>Saved</Text>
            </HapticTouchableOpacity>
            
            <HapticTouchableOpacity
              onPress={() => {
                setViewMode('liked');
                setNeedsRefresh(true);
              }}
              className={`px-4 py-2 rounded-full mr-2 ${viewMode === 'liked' ? 'bg-green-500 dark:bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.LIKE} size={IconSizes.SM} color={viewMode === 'liked' ? 'white' : '#6B7280'} accessibilityLabel="Liked recipes" />
                <Text className={`${viewMode === 'liked' ? 'text-white' : 'text-gray-800 dark:text-gray-200'} font-medium ml-1`}>Liked</Text>
              </View>
            </HapticTouchableOpacity>
            
            <HapticTouchableOpacity
              onPress={() => {
                setViewMode('disliked');
                setNeedsRefresh(true);
              }}
              className={`px-4 py-2 rounded-full mr-2 ${viewMode === 'disliked' ? 'bg-red-500 dark:bg-red-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <View className="flex-row items-center">
                <Icon name={Icons.DISLIKE} size={IconSizes.SM} color={viewMode === 'disliked' ? 'white' : '#6B7280'} accessibilityLabel="Disliked recipes" />
                <Text className={`${viewMode === 'disliked' ? 'text-white' : 'text-gray-800 dark:text-gray-200'} font-medium ml-1`}>Disliked</Text>
              </View>
            </HapticTouchableOpacity>
          </View>
        </ScrollView>

        {/* List Dropdown Picker - visible in all views */}
        <View className="mb-3">
          <HapticTouchableOpacity
            onPress={() => {
              setShowListPicker(true);
            }}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Icon name={Icons.SHOPPING_LIST_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Collection list" style={{ marginRight: 8 }} />
              <Text className="text-gray-900 dark:text-gray-100 font-medium text-base">
                {getCurrentListName()}
              </Text>
            </View>
            <Icon name={Icons.CHEVRON_DOWN} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Open dropdown" />
          </HapticTouchableOpacity>
        </View>
      </View>

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
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select List</Text>
                </View>
            
            <ScrollView className="max-h-80">
              {/* "All" (default) option */}
              <HapticTouchableOpacity
                onPress={() => handleSelectList(null)}
                className={`px-4 py-3 flex-row items-center border-b border-gray-100 ${
                  selectedListId === null ? 'bg-orange-50' : 'bg-white'
                }`}
              >
                <Icon 
                  name={selectedListId === null ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE} 
                  size={IconSizes.MD} 
                  color={selectedListId === null ? "#F97316" : "#9CA3AF"} 
                  accessibilityLabel={selectedListId === null ? "Selected" : "Not selected"}
                  style={{ marginRight: 12 }}
                />
                <Text className={`flex-1 text-base ${selectedListId === null ? 'text-orange-600 font-semibold' : 'text-gray-900'}`}>
                  All
                </Text>
              </HapticTouchableOpacity>
              
              {/* User-created collections */}
              {collections.map((collection) => (
                <HapticTouchableOpacity
                  key={collection.id}
                  onPress={() => handleSelectList(collection.id)}
                  onLongPress={() => {
                    Alert.alert(
                      'Delete List',
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
                            Alert.alert('Deleted', 'List deleted successfully.');
                          } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Failed to delete list');
                          }
                        }}
                      ]
                    );
                  }}
                  className={`px-4 py-3 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                    selectedListId === collection.id ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-white dark:bg-gray-800'
                  }`}
                >
                  <Ionicons 
                    name={selectedListId === collection.id ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={selectedListId === collection.id ? "#F97316" : "#9CA3AF"} 
                    style={{ marginRight: 12 }}
                  />
                  <Text className={`flex-1 text-base ${selectedListId === collection.id ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-gray-900 dark:text-gray-100'}`}>
                    {collection.name}
                  </Text>
                  <HapticTouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        'Delete List',
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
                              Alert.alert('Deleted', 'List deleted successfully.');
                            } catch (e: any) {
                              Alert.alert('Error', e?.message || 'Failed to delete list');
                            }
                          }}
                        ]
                      );
                    }}
                    className="p-2 ml-2"
                  >
                    <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.SM} color="#EF4444" accessibilityLabel="Delete list" />
                  </HapticTouchableOpacity>
                </HapticTouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Create New List Button */}
            <View className="p-4 border-t border-gray-200 dark:border-gray-700">
              <HapticTouchableOpacity
                onPress={() => {
                  setShowListPicker(false);
                  setShowCreateCollection(true);
                }}
                className="bg-orange-500 dark:bg-orange-600 px-4 py-3 rounded-lg flex-row items-center justify-center"
              >
                <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Create new list" />
                <Text className="text-white font-semibold ml-2">Create New List</Text>
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
              placeholder="List name"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mr-2 dark:bg-gray-700 dark:text-gray-100"
              placeholderTextColor="#9CA3AF"
            />
            <HapticTouchableOpacity onPress={handleCreateCollection} className="bg-orange-500 dark:bg-orange-600 px-4 py-2 rounded-lg">
              <Text className="text-white font-semibold">Create</Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      )}

      {savedRecipes.length === 0 ? (
        // Empty state
        <>
          {viewMode === 'saved' && (
            <AnimatedEmptyState
              icon={Icons.EMPTY_RECIPES}
              title="No saved recipes yet"
              description="Save recipes you like to see them here"
              actionLabel="Browse Recipes"
              onAction={() => router.push('/')}
            />
          )}
          {viewMode === 'liked' && (
            <AnimatedEmptyState
              icon={Icons.LIKE_OUTLINE}
              title="No liked recipes yet"
              description="Like recipes to see them here"
              actionLabel="Browse Recipes"
              onAction={() => {
                setViewMode('saved');
                router.push('/');
              }}
            />
          )}
          {viewMode === 'disliked' && (
            <AnimatedEmptyState
              icon={Icons.DISLIKE_OUTLINE}
              title="No disliked recipes yet"
              description="Dislike recipes to see them here"
              actionLabel="Browse Recipes"
              onAction={() => {
                setViewMode('saved');
                router.push('/');
              }}
            />
          )}
        </>
      ) : (
        // Recipes list
        <ScrollView 
          className="flex-1 p-4"
          contentContainerStyle={{ paddingTop: 0 }}
          refreshControl={
            <AnimatedRefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#F97316"
              colors={['#F97316']}
              progressViewOffset={0}
            />
          }
        >
          {savedRecipes.map((recipe) => (
            <HapticTouchableOpacity
              key={recipe.id}
              onPress={() => handleRecipePress(recipe.id)}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
              style={{ opacity: 1 }}
              activeOpacity={0.7}
            >
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {recipe.title}
                </Text>
                {/* Source Attribution */}
                {(recipe as any).source === 'ai-generated' && (
                  <View className="flex-row items-center mt-1">
                    <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                      <Text className="text-purple-700 dark:text-purple-300 text-xs font-medium">
                        🤖 AI Generated
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <Text className="text-gray-600 dark:text-gray-200 text-sm mt-2" numberOfLines={2}>
                {truncateDescription(recipe.description)}
              </Text>
              
              {/* Date label - Moved here to match spacing */}
              {(recipe.savedDate || (recipe as any).likedDate || (recipe as any).dislikedDate) && (
                <Text className="text-gray-400 dark:text-gray-200 text-xs mb-2">
                  {viewMode === 'liked' && (recipe as any).likedDate && `Liked on ${(recipe as any).likedDate}`}
                  {viewMode === 'disliked' && (recipe as any).dislikedDate && `Disliked on ${(recipe as any).dislikedDate}`}
                  {viewMode === 'saved' && recipe.savedDate && `Saved on ${recipe.savedDate}`}
                </Text>
              )}
              
              <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row items-center space-x-3">
                  <View className="flex-row items-center">
                    <Icon name={Icons.TIME_OUTLINE} size={IconSizes.SM} color="#6B7280" accessibilityLabel="Cook time" />
                    <Text className="text-gray-500 dark:text-gray-200 text-sm ml-1">
                      {recipe.cookTime} min
                    </Text>
                  </View>
                  <View className="bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                    <Text className="text-orange-800 dark:text-orange-300 text-xs font-medium">
                      {recipe.cuisine}
                    </Text>
                  </View>
                </View>
                <FeedbackButtons
                  recipeId={recipe.id}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  initialLiked={userFeedback[recipe.id]?.liked || false}
                  initialDisliked={userFeedback[recipe.id]?.disliked || false}
                  size="sm"
                />
              </View>
            </HapticTouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}