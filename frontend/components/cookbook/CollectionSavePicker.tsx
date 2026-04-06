// frontend/components/cookbook/CollectionSavePicker.tsx
// Modal for selecting collections to save a recipe to

import React from 'react';
import { View, Text, ScrollView, Modal, TextInput, Dimensions } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../ui/GradientButton';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

interface Collection {
  id: string;
  name: string;
  isDefault?: boolean;
  recipeCount?: number;
}

interface CollectionSavePickerProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** List of available collections */
  collections: Collection[];
  /** Currently selected collection IDs */
  selectedCollectionIds: string[];
  /** Called when collection selection changes */
  onSelectionChange: (ids: string[]) => void;
  /** Called when save button is pressed */
  onSave: () => void;
  /** Called when a new collection should be created */
  onCreateCollection: (name: string) => void;
  /** MRU-ordered list of recently-used collection IDs — floated to the top */
  recentCollectionIds?: string[];
}

/**
 * Modal for selecting collections to save a recipe to
 * Supports multi-select and inline collection creation
 */
export default function CollectionSavePicker({
  visible,
  onClose,
  collections,
  selectedCollectionIds,
  onSelectionChange,
  onSave,
  onCreateCollection,
  recentCollectionIds = [],
}: CollectionSavePickerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const recentSet = new Set(recentCollectionIds);
  const hasRecent = recentCollectionIds.some(id => collections.some(c => c.id === id));
  const sortedCollections = hasRecent
    ? [
        ...recentCollectionIds.flatMap(id => {
          const c = collections.find(c => c.id === id);
          return c ? [c] : [];
        }),
        ...collections.filter(c => !recentSet.has(c.id)),
      ]
    : collections;

  const handleToggleCollection = (collectionId: string) => {
    const newSelection = selectedCollectionIds.includes(collectionId)
      ? selectedCollectionIds.filter(id => id !== collectionId)
      : [...selectedCollectionIds, collectionId];
    onSelectionChange(newSelection);
  };

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      onCreateCollection(newCollectionName.trim());
      setNewCollectionName('');
      setCreatingCollection(false);
    }
  };

  const handleClose = () => {
    setCreatingCollection(false);
    setNewCollectionName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/40 justify-end">
        <View
          style={{ maxHeight: Dimensions.get('window').height * 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-t-2xl p-4"
        >
          <Text className="text-lg font-semibold mb-3 dark:text-gray-100">
            Save to Collection
          </Text>

          <ScrollView scrollEventThrottle={16} className="mb-3">
            {hasRecent && (
              <Text
                testID="recent-section-header"
                className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 mt-1"
              >
                Recent
              </Text>
            )}
            {sortedCollections.map((collection, index) => {
              const isLastRecent =
                hasRecent && index === recentCollectionIds.filter(id => collections.some(c => c.id === id)).length - 1;
              const isFirstNonRecent = hasRecent && !recentSet.has(collection.id) &&
                (index === 0 || recentSet.has(sortedCollections[index - 1]?.id ?? ''));
              return (
              <React.Fragment key={collection.id}>
                {isFirstNonRecent && (
                  <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 mt-3">
                    All Collections
                  </Text>
                )}
              <HapticTouchableOpacity
                testID={`collection-row-${collection.id}`}
                onPress={() => handleToggleCollection(collection.id)}
                className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700"
              >
                <View
                  className={`w-5 h-5 mr-3 rounded border ${
                    selectedCollectionIds.includes(collection.id)
                      ? ''
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={
                    selectedCollectionIds.includes(collection.id)
                      ? {
                          backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                          borderColor: isDark ? DarkColors.primary : Colors.primary,
                        }
                      : undefined
                  }
                >
                  {selectedCollectionIds.includes(collection.id) && (
                    <Icon
                      name={Icons.CHECKMARK}
                      size={IconSizes.XS}
                      color="white"
                      accessibilityLabel="Selected"
                      style={{ position: 'absolute', top: 1, left: 1 }}
                    />
                  )}
                </View>
                <Text className="text-gray-900 dark:text-gray-100 flex-1">
                  {collection.name}
                </Text>
                {collection.recipeCount !== undefined && (
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">
                    {collection.recipeCount} recipes
                  </Text>
                )}
              </HapticTouchableOpacity>
              </React.Fragment>
              );
            })}

            {creatingCollection ? (
              <View className="flex-row items-center py-3">
                <TextInput
                  value={newCollectionName}
                  onChangeText={setNewCollectionName}
                  placeholder="New collection name"
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mr-2 dark:bg-gray-700 dark:text-gray-100"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                  onSubmitEditing={handleCreateCollection}
                />
                <GradientButton
                  label="Create"
                  onPress={handleCreateCollection}
                  colors={GradientPresets.brand}
                  style={{ paddingVertical: 0, minWidth: 70 }}
                />
              </View>
            ) : (
              <HapticTouchableOpacity
                onPress={() => setCreatingCollection(true)}
                className="py-3"
              >
                <Text
                  className="font-medium"
                  style={{ color: isDark ? DarkColors.primary : Colors.primary }}
                >
                  + Create new collection
                </Text>
              </HapticTouchableOpacity>
            )}
          </ScrollView>

          <View className="flex-row justify-end space-x-3">
            <HapticTouchableOpacity onPress={handleClose} className="px-4 py-3">
              <Text className="text-gray-700 dark:text-gray-100">Cancel</Text>
            </HapticTouchableOpacity>
            <HapticTouchableOpacity
              onPress={onSave}
              className="px-4 py-3 rounded-lg"
              style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
            >
              <Text className="text-white font-semibold">Save</Text>
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
