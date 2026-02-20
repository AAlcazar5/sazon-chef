// frontend/components/cookbook/CollectionSavePicker.tsx
// Modal for selecting collections to save a recipe to

import { View, Text, ScrollView, Modal, TextInput, Dimensions } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
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
}: CollectionSavePickerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

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
            {collections.map((collection) => (
              <HapticTouchableOpacity
                key={collection.id}
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
            ))}

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
                <HapticTouchableOpacity
                  onPress={handleCreateCollection}
                  className="bg-orange-500 dark:bg-orange-600 px-3 py-2 rounded-lg"
                >
                  <Text className="text-white font-semibold">Create</Text>
                </HapticTouchableOpacity>
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
