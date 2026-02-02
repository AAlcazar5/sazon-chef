// frontend/hooks/useCollectionSave.ts
// Custom hook for managing collection save functionality

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { recipeApi, collectionsApi } from '../lib/api';
import { HapticPatterns } from '../constants/Haptics';
import { analytics } from '../utils/analytics';

interface Collection {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface UseCollectionSaveOptions {
  userId?: string;
  source?: string;
}

interface UseCollectionSaveReturn {
  // State
  collections: Collection[];
  savePickerVisible: boolean;
  savePickerRecipeId: string | null;
  selectedCollectionIds: string[];
  creatingCollection: boolean;
  newCollectionName: string;
  // Setters
  setSelectedCollectionIds: React.Dispatch<React.SetStateAction<string[]>>;
  setCreatingCollection: React.Dispatch<React.SetStateAction<boolean>>;
  setNewCollectionName: React.Dispatch<React.SetStateAction<string>>;
  // Actions
  openSavePicker: (recipeId: string) => Promise<void>;
  closeSavePicker: () => void;
  handleSaveToCollections: () => Promise<void>;
  handleCreateCollection: () => Promise<void>;
  toggleCollectionSelection: (collectionId: string) => void;
}

export function useCollectionSave(options: UseCollectionSaveOptions = {}): UseCollectionSaveReturn {
  const { userId, source = 'home_screen' } = options;

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savePickerVisible, setSavePickerVisible] = useState(false);
  const [savePickerRecipeId, setSavePickerRecipeId] = useState<string | null>(null);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Open the save picker for a recipe
  const openSavePicker = useCallback(async (recipeId: string) => {
    try {
      const res = await collectionsApi.list();
      const cols = (Array.isArray(res.data) ? res.data : (res.data?.data || [])) as Collection[];
      setCollections(cols);
      setSavePickerRecipeId(recipeId);
      setSelectedCollectionIds([]);
      setSavePickerVisible(true);
    } catch (e) {
      console.log('[useCollectionSave] Failed to load collections:', e);
    }
  }, []);

  // Close the save picker
  const closeSavePicker = useCallback(() => {
    setSavePickerVisible(false);
    setSavePickerRecipeId(null);
    setSelectedCollectionIds([]);
    setCreatingCollection(false);
    setNewCollectionName('');
  }, []);

  // Toggle collection selection
  const toggleCollectionSelection = useCallback((collectionId: string) => {
    setSelectedCollectionIds(prev =>
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  }, []);

  // Save recipe to selected collections
  const handleSaveToCollections = useCallback(async () => {
    if (!savePickerRecipeId) return;

    try {
      // Save to cookbook with selected collections (multi-collection support)
      await recipeApi.saveRecipe(
        savePickerRecipeId,
        selectedCollectionIds.length > 0 ? { collectionIds: selectedCollectionIds } : undefined
      );

      // Track save action
      if (userId && savePickerRecipeId) {
        analytics.trackRecipeInteraction('save', savePickerRecipeId, {
          source,
          collectionCount: selectedCollectionIds.length,
        });
      }

      closeSavePicker();
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
      closeSavePicker();
    }
  }, [savePickerRecipeId, selectedCollectionIds, userId, source, closeSavePicker]);

  // Create a new collection
  const handleCreateCollection = useCallback(async () => {
    const name = newCollectionName.trim();
    if (!name) return;

    try {
      const res = await collectionsApi.create(name);
      const created = (Array.isArray(res.data) ? null : (res.data?.data || res.data)) as Collection | null;
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
  }, [newCollectionName]);

  return {
    // State
    collections,
    savePickerVisible,
    savePickerRecipeId,
    selectedCollectionIds,
    creatingCollection,
    newCollectionName,
    // Setters
    setSelectedCollectionIds,
    setCreatingCollection,
    setNewCollectionName,
    // Actions
    openSavePicker,
    closeSavePicker,
    handleSaveToCollections,
    handleCreateCollection,
    toggleCollectionSelection,
  };
}

export default useCollectionSave;
