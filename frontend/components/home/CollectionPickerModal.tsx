// frontend/components/home/CollectionPickerModal.tsx
// Bottom sheet for saving recipes to one or more collections.
// Shared by app/(tabs)/index.tsx, app/modal.tsx, and app/recipe-form.tsx.

import React from 'react';
import { View, Text, TextInput } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BrandButton from '../ui/BrandButton';
import BottomSheet from '../ui/BottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { Brand, Ink, Surface, Radius } from '../../constants/tokens';

interface Collection {
  id: string;
  name: string;
}

export interface CollectionPickerModalProps {
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
  const brandColor = isDark ? Brand.dark.base : Brand.light.base;
  const inkPrimary = isDark ? Ink.dark.primary : Ink.light.primary;
  const inkSecondary = isDark ? Ink.dark.secondary : Ink.light.secondary;
  const inkTertiary = isDark ? Ink.dark.tertiary : Ink.light.tertiary;
  const inputBg = isDark ? Surface.dark.raised : Surface.light.base;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Save to Collection"
      snapPoints={['55%', '70%']}
      scrollable
    >
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {collections.map((c) => {
          const checked = selectedCollectionIds.includes(c.id);
          return (
            <HapticTouchableOpacity
              key={c.id}
              onPress={() => onToggleCollection(c.id)}
              accessibilityRole="checkbox"
              accessibilityLabel={c.name}
              accessibilityState={{ checked }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  marginRight: 12,
                  borderRadius: 6,
                  backgroundColor: checked ? brandColor : 'transparent',
                  borderWidth: checked ? 0 : 1.5,
                  borderColor: inkTertiary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {checked && <Ionicons name="checkmark" size={14} color={Brand.light.ink} />}
              </View>
              <Text style={{ flex: 1, fontSize: 16, color: inkPrimary }}>{c.name}</Text>
            </HapticTouchableOpacity>
          );
        })}

        {creatingCollection ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
            <TextInput
              value={newCollectionName}
              onChangeText={onChangeNewName}
              placeholder="New collection name"
              style={{
                flex: 1,
                borderRadius: Radius.input,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginRight: 8,
                color: inkPrimary,
                backgroundColor: inputBg,
              }}
              placeholderTextColor={inkTertiary}
              autoFocus
            />
            <BrandButton
              label="Create"
              onPress={onCreateCollection}
              variant="brand"
              style={{ paddingVertical: 0, minWidth: 70 }}
            />
          </View>
        ) : (
          <HapticTouchableOpacity
            onPress={onStartCreating}
            accessibilityRole="button"
            accessibilityLabel="Create new collection"
            style={{ paddingVertical: 14 }}
          >
            <Text style={{ color: brandColor, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
              + Create new collection
            </Text>
          </HapticTouchableOpacity>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
          <HapticTouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel collection selection"
            style={{ paddingHorizontal: 16, paddingVertical: 12 }}
          >
            <Text style={{ color: inkSecondary }}>Cancel</Text>
          </HapticTouchableOpacity>
          <BrandButton label="Save" onPress={onSave} variant="brand" size="compact" />
        </View>
      </View>
    </BottomSheet>
  );
}

export default CollectionPickerModal;
