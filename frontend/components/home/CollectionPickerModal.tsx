// frontend/components/home/CollectionPickerModal.tsx
// Bottom sheet for saving recipes to collections

import React from 'react';
import { View, Text, TextInput } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import GradientButton, { GradientPresets } from '../ui/GradientButton';
import BottomSheet from '../ui/BottomSheet';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';

interface Collection {
  id: string;
  name: string;
}

interface CollectionPickerModalProps {
  visible: boolean;
  collections: Collection[];
  selectedCollectionIds: string[];
  creatingCollection: boolean;
  newCollectionName: string;
  isDark: boolean;
  onClose: () => void;
  onToggleCollection: (collectionId: string) => void;
  onStartCreating: () => void;
  onChangeNewName: (name: string) => void;
  onCreateCollection: () => void;
  onSave: () => void;
}

function CollectionPickerModal({
  visible,
  collections,
  selectedCollectionIds,
  creatingCollection,
  newCollectionName,
  isDark,
  onClose,
  onToggleCollection,
  onStartCreating,
  onChangeNewName,
  onCreateCollection,
  onSave,
}: CollectionPickerModalProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Save to Collection"
      snapPoints={['55%']}
      scrollable
    >
      <View className="px-4 pb-4">
        {collections.map((c) => (
          <HapticTouchableOpacity
            key={c.id}
            onPress={() => onToggleCollection(c.id)}
            className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700"
          >
            <View
              className={`w-5 h-5 mr-3 rounded border ${
                selectedCollectionIds.includes(c.id)
                  ? ''
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              style={
                selectedCollectionIds.includes(c.id)
                  ? {
                      backgroundColor: isDark ? DarkColors.primary : Colors.primary,
                      borderColor: isDark ? DarkColors.primary : Colors.primary,
                    }
                  : undefined
              }
            >
              {selectedCollectionIds.includes(c.id) && (
                <Icon
                  name={Icons.CHECKMARK}
                  size={IconSizes.XS}
                  color="white"
                  accessibilityLabel="Selected"
                  style={{ position: 'absolute', top: 1, left: 1 }}
                />
              )}
            </View>
            <Text className="text-gray-900 dark:text-gray-100 flex-1">{c.name}</Text>
          </HapticTouchableOpacity>
        ))}

        {creatingCollection ? (
          <View className="flex-row items-center py-3">
            <TextInput
              value={newCollectionName}
              onChangeText={onChangeNewName}
              placeholder="New collection name"
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 mr-2 dark:bg-gray-700 dark:text-gray-100"
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <GradientButton
              label="Create"
              onPress={onCreateCollection}
              colors={GradientPresets.brand}
              style={{ paddingVertical: 0, minWidth: 70 }}
            />
          </View>
        ) : (
          <HapticTouchableOpacity onPress={onStartCreating} className="py-3">
            <Text
              className="font-medium"
              style={{ color: isDark ? DarkColors.primary : Colors.primary }}
            >
              + Create new collection
            </Text>
          </HapticTouchableOpacity>
        )}

        <View className="flex-row justify-end space-x-3 mt-2">
          <HapticTouchableOpacity onPress={onClose} className="px-4 py-3">
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
    </BottomSheet>
  );
}

export default CollectionPickerModal;
