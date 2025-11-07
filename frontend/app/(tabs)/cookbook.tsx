import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import { recipeApi, collectionsApi } from '../../lib/api';
import type { SavedRecipe } from '../../types';
import FeedbackButtons from '../../components/recipe/FeedbackButtons';
import * as Haptics from 'expo-haptics';

export default function CookbookScreen() {
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
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
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
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
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
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">My Cookbook</Text>
          <Text className="text-gray-500 mt-1">Loading saved recipes...</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="book-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-500 mt-4">Loading recipes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (apiError && savedRecipes.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">My Cookbook</Text>
          <Text className="text-gray-500 mt-1">Failed to load recipes</Text>
        </View>
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Failed to load saved recipes
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            {apiError}
          </Text>
          <TouchableOpacity 
            onPress={refetch}
            className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">My Cookbook</Text>
            <Text className="text-gray-500 mt-1">
              {viewMode === 'saved' && `${savedRecipes.length} saved recipes`}
              {viewMode === 'liked' && `${savedRecipes.length} liked recipes`}
              {viewMode === 'disliked' && `${savedRecipes.length} disliked recipes`}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleRefresh}
            className="p-2"
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={24} 
              color={refreshing ? "#9CA3AF" : "#6B7280"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* View Mode Tabs: Saved, Liked, Disliked */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="h-10 mb-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                setViewMode('saved');
                setNeedsRefresh(true);
              }}
              className={`px-4 py-2 rounded-full mr-2 ${viewMode === 'saved' ? 'bg-orange-500' : 'bg-gray-200'}`}
            >
              <Text className={`${viewMode === 'saved' ? 'text-white' : 'text-gray-800'} font-medium`}>Saved</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setViewMode('liked');
                setNeedsRefresh(true);
              }}
              className={`px-4 py-2 rounded-full mr-2 ${viewMode === 'liked' ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <View className="flex-row items-center">
                <Ionicons name="thumbs-up" size={16} color={viewMode === 'liked' ? 'white' : '#6B7280'} />
                <Text className={`${viewMode === 'liked' ? 'text-white' : 'text-gray-800'} font-medium ml-1`}>Liked</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setViewMode('disliked');
                setNeedsRefresh(true);
              }}
              className={`px-4 py-2 rounded-full mr-2 ${viewMode === 'disliked' ? 'bg-red-500' : 'bg-gray-200'}`}
            >
              <View className="flex-row items-center">
                <Ionicons name="thumbs-down" size={16} color={viewMode === 'disliked' ? 'white' : '#6B7280'} />
                <Text className={`${viewMode === 'disliked' ? 'text-white' : 'text-gray-800'} font-medium ml-1`}>Disliked</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* List Dropdown Picker - visible in all views */}
        <View className="mb-3">
          <TouchableOpacity
            onPress={() => setShowListPicker(true)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="list" size={20} color="#6B7280" style={{ marginRight: 8 }} />
              <Text className="text-gray-900 font-medium text-base">
                {getCurrentListName()}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List Picker Modal */}
      <Modal
        visible={showListPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowListPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowListPicker(false)}
          className="flex-1 bg-black/50 justify-center items-center px-4"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-lg w-full max-w-sm shadow-lg"
          >
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">Select List</Text>
            </View>
            
            <ScrollView className="max-h-80">
              {/* "All" (default) option */}
              <TouchableOpacity
                onPress={() => handleSelectList(null)}
                className={`px-4 py-3 flex-row items-center border-b border-gray-100 ${
                  selectedListId === null ? 'bg-orange-50' : 'bg-white'
                }`}
              >
                <Ionicons 
                  name={selectedListId === null ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={selectedListId === null ? "#F97316" : "#9CA3AF"} 
                  style={{ marginRight: 12 }}
                />
                <Text className={`flex-1 text-base ${selectedListId === null ? 'text-orange-600 font-semibold' : 'text-gray-900'}`}>
                  All
                </Text>
              </TouchableOpacity>
              
              {/* User-created collections */}
              {collections.map((collection) => (
                <TouchableOpacity
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
                  className={`px-4 py-3 flex-row items-center border-b border-gray-100 ${
                    selectedListId === collection.id ? 'bg-orange-50' : 'bg-white'
                  }`}
                >
                  <Ionicons 
                    name={selectedListId === collection.id ? "checkmark-circle" : "ellipse-outline"} 
                    size={20} 
                    color={selectedListId === collection.id ? "#F97316" : "#9CA3AF"} 
                    style={{ marginRight: 12 }}
                  />
                  <Text className={`flex-1 text-base ${selectedListId === collection.id ? 'text-orange-600 font-semibold' : 'text-gray-900'}`}>
                    {collection.name}
                  </Text>
                  <TouchableOpacity
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
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Create New List Button */}
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                onPress={() => {
                  setShowListPicker(false);
                  setShowCreateCollection(true);
                }}
                className="bg-orange-500 px-4 py-3 rounded-lg flex-row items-center justify-center"
              >
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white font-semibold ml-2">Create New List</Text>
              </TouchableOpacity>
            </View>
            
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowListPicker(false)}
              className="px-4 py-3 border-t border-gray-200"
            >
              <Text className="text-gray-600 font-medium text-center">Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Inline create collection input */}
      {showCreateCollection && (
        <View className="bg-white px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center">
            <TextInput
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              placeholder="List name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 mr-2"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity onPress={handleCreateCollection} className="bg-orange-500 px-4 py-2 rounded-lg">
              <Text className="text-white font-semibold">Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {savedRecipes.length === 0 ? (
        // Empty state
        <View className="flex-1 items-center justify-center p-8">
          {viewMode === 'saved' && (
            <>
              <Ionicons name="book-outline" size={64} color="#9CA3AF" />
              <Text className="text-xl font-semibold text-gray-500 mt-4 text-center">
                No saved recipes yet
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Save recipes you like to see them here
              </Text>
              <TouchableOpacity 
                onPress={() => router.push('/')}
                className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
              >
                <Text className="text-white font-semibold">Browse Recipes</Text>
              </TouchableOpacity>
            </>
          )}
          {viewMode === 'liked' && (
            <>
              <Ionicons name="thumbs-up-outline" size={64} color="#9CA3AF" />
              <Text className="text-xl font-semibold text-gray-500 mt-4 text-center">
                No liked recipes yet
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Like recipes to see them here
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setViewMode('saved');
                  router.push('/');
                }}
                className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
              >
                <Text className="text-white font-semibold">Browse Recipes</Text>
              </TouchableOpacity>
            </>
          )}
          {viewMode === 'disliked' && (
            <>
              <Ionicons name="thumbs-down-outline" size={64} color="#9CA3AF" />
              <Text className="text-xl font-semibold text-gray-500 mt-4 text-center">
                No disliked recipes yet
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Dislike recipes to see them here
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setViewMode('saved');
                  router.push('/');
                }}
                className="bg-orange-500 px-6 py-3 rounded-lg mt-4"
              >
                <Text className="text-white font-semibold">Browse Recipes</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        // Recipes list
        <ScrollView 
          className="flex-1 p-4"
          contentContainerStyle={{ paddingTop: 0 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor="#F97316"
              colors={['#F97316']}
              progressViewOffset={0}
              style={{ backgroundColor: 'transparent' }}
            />
          }
        >
          {savedRecipes.map((recipe) => (
            <TouchableOpacity
              key={recipe.id}
              onPress={() => handleRecipePress(recipe.id)}
              className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
              style={{ opacity: 1 }}
              activeOpacity={0.7}
            >
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">
                      {recipe.title}
                    </Text>
                    {/* Source Attribution */}
                    {(recipe as any).source === 'ai-generated' && (
                      <View className="flex-row items-center mt-1">
                        <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                          <Text className="text-purple-700 text-xs font-medium">
                            🤖 AI Generated
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  {(recipe as any).isUserCreated && (
                    <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                      <Text className="text-green-800 text-xs font-medium">My Recipe</Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-600 text-sm mb-2" numberOfLines={2}>
                  {truncateDescription(recipe.description)}
                </Text>
                
                {/* Date label - Moved here to match spacing */}
                {(recipe.savedDate || (recipe as any).likedDate || (recipe as any).dislikedDate) && (
                  <Text className="text-gray-400 text-xs mb-2">
                    {viewMode === 'liked' && (recipe as any).likedDate && `Liked on ${(recipe as any).likedDate}`}
                    {viewMode === 'disliked' && (recipe as any).dislikedDate && `Disliked on ${(recipe as any).dislikedDate}`}
                    {viewMode === 'saved' && recipe.savedDate && ((recipe as any).isUserCreated ? 'Created on' : 'Saved on') + ' ' + recipe.savedDate}
                  </Text>
                )}

                {/* Macro Pills */}
                <View className="flex-row space-x-2 mb-2">
                  <View className="bg-blue-100 px-2 py-1 rounded-full">
                    <Text className="text-blue-800 text-xs">
                      {recipe.calories} cal
                    </Text>
                  </View>
                  <View className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-green-800 text-xs">
                      P: {recipe.protein}g
                    </Text>
                  </View>
                  <View className="bg-yellow-100 px-2 py-1 rounded-full">
                    <Text className="text-yellow-800 text-xs">
                      C: {recipe.carbs}g
                    </Text>
                  </View>
                  <View className="bg-purple-100 px-2 py-1 rounded-full">
                    <Text className="text-purple-800 text-xs">
                      F: {recipe.fat}g
                    </Text>
                  </View>
                </View>

                {/* Actions: Like/Dislike and Delete/Remove - Bottom-right like home screen */}
                <View className="flex-row justify-between items-center">
                  {/* Cook time and cuisine - Bottom left like home screen */}
                  <View className="flex-row items-center space-x-4">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text className="text-gray-500 text-sm ml-1">
                        {recipe.cookTime} min
                      </Text>
                    </View>
                    <View className="bg-orange-100 px-2 py-1 rounded-full">
                      <Text className="text-orange-800 text-xs font-medium">
                        {recipe.cuisine}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Buttons on the right */}
                  <View className="flex-row">
                    {/* Delete/Remove button */}
                    <TouchableOpacity
                      onPress={() => {
                        if ((recipe as any).isUserCreated) {
                          handleDeleteRecipe(recipe.id, recipe.title);
                        } else {
                          handleRemoveRecipe(recipe.id);
                        }
                      }}
                      className="p-2 rounded-full bg-gray-100 border border-gray-200 mr-2"
                      disabled={feedbackLoading === recipe.id}
                    >
                      <Ionicons 
                        name="trash-outline" 
                        size={18} 
                        color={feedbackLoading === recipe.id ? "#9CA3AF" : "#EF4444"} 
                      />
                    </TouchableOpacity>
                    
                    {/* Like/Dislike buttons */}
                    <TouchableOpacity
                      onPress={() => handleDislike(recipe.id)}
                      disabled={feedbackLoading === recipe.id}
                      className={`p-2 rounded-full mr-2 ${
                        userFeedback[recipe.id]?.disliked 
                          ? 'bg-red-100 border border-red-200' 
                          : 'bg-gray-100 border border-gray-200'
                      } ${feedbackLoading === recipe.id ? 'opacity-50' : ''}`}
                    >
                      <Ionicons 
                        name={userFeedback[recipe.id]?.disliked ? "thumbs-down" : "thumbs-down-outline"} 
                        size={18} 
                        color={userFeedback[recipe.id]?.disliked ? "#EF4444" : "#6B7280"} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleLike(recipe.id)}
                      disabled={feedbackLoading === recipe.id}
                      className={`p-2 rounded-full ${
                        userFeedback[recipe.id]?.liked 
                          ? 'bg-green-100 border border-green-200' 
                          : 'bg-gray-100 border border-gray-200'
                      } ${feedbackLoading === recipe.id ? 'opacity-50' : ''}`}
                    >
                      <Ionicons 
                        name={userFeedback[recipe.id]?.liked ? "thumbs-up" : "thumbs-up-outline"} 
                        size={18} 
                        color={userFeedback[recipe.id]?.liked ? "#10B981" : "#6B7280"} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}