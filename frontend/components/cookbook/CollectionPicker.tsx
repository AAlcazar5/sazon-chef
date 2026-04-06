// frontend/components/cookbook/CollectionPicker.tsx
// Modal for selecting view mode and collection filter

import { View, Text, ScrollView, Dimensions, Alert } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
import CollectionCard from '../collection/CollectionCard';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import type { Collection } from '../../types';

export type CollectionSortMode = 'name' | 'count' | 'recent' | 'custom';

const SORT_OPTIONS: { key: CollectionSortMode; label: string }[] = [
  { key: 'name', label: 'A-Z' },
  { key: 'count', label: 'Count' },
  { key: 'recent', label: 'Recent' },
  { key: 'custom', label: 'Custom' },
];

interface CollectionPickerProps {
  visible: boolean;
  onClose: () => void;
  viewMode: 'saved' | 'liked' | 'disliked' | 'collections';
  onViewModeChange: (mode: 'saved' | 'liked' | 'disliked' | 'collections') => void;
  collections: Collection[];
  selectedListId: string | null;
  onSelectList: (listId: string | null) => void;
  onCreateCollection: () => void;
  onEditCollection: (collectionId: string) => void;
  onDeleteCollection: (collectionId: string, collectionName: string) => void;
  onTogglePin?: (collectionId: string) => void;
  onDuplicate?: (collectionId: string) => void;
  onMerge?: () => void;
  sortMode?: CollectionSortMode;
  onSortModeChange?: (mode: CollectionSortMode) => void;
}

function sortCollections(collections: Collection[], mode: CollectionSortMode): Collection[] {
  const sorted = [...collections];
  // Pinned always first
  sorted.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    switch (mode) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'count':
        return (b.recipeCount || 0) - (a.recipeCount || 0);
      case 'recent':
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      case 'custom':
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      default:
        return 0;
    }
  });
  return sorted;
}

export default function CollectionPicker({
  visible,
  onClose,
  viewMode,
  onViewModeChange,
  collections,
  selectedListId,
  onSelectList,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
  onTogglePin,
  onDuplicate,
  onMerge,
  sortMode = 'name',
  onSortModeChange,
}: CollectionPickerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const viewModes = [
    {
      mode: 'saved' as const,
      label: 'Saved',
      activeColor: isDark ? DarkColors.primary : Colors.primary,
      activeBg: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight,
      activeDark: isDark ? DarkColors.primaryDark : Colors.primaryDark,
    },
    {
      mode: 'liked' as const,
      label: 'Liked',
      icon: Icons.LIKE,
      activeColor: isDark ? DarkColors.tertiaryGreen : Colors.tertiaryGreen,
      activeBg: isDark ? `${Colors.tertiaryGreenLight}33` : Colors.tertiaryGreenLight,
      activeDark: isDark ? DarkColors.tertiaryGreenDark : Colors.tertiaryGreenDark,
    },
    {
      mode: 'disliked' as const,
      label: 'Disliked',
      icon: Icons.DISLIKE,
      activeColor: isDark ? DarkColors.secondaryRed : Colors.secondaryRed,
      activeBg: isDark ? `${Colors.secondaryRedLight}33` : Colors.secondaryRedLight,
      activeDark: isDark ? DarkColors.secondaryRedDark : Colors.secondaryRedDark,
    },
    {
      mode: 'collections' as const,
      label: 'Collections',
      activeColor: '#AB47BC',
      activeBg: isDark ? 'rgba(206,147,216,0.15)' : '#F3E5F5',
      activeDark: '#9C27B0',
    },
  ];

  const sortedCollections = sortCollections(collections, sortMode);

  const showLongPressMenu = (collection: Collection) => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => onEditCollection(collection.id) },
    ];
    if (onTogglePin) {
      options.push({
        text: collection.isPinned ? 'Unpin' : 'Pin to Top',
        onPress: () => onTogglePin(collection.id),
      });
    }
    if (onDuplicate) {
      options.push({
        text: 'Duplicate',
        onPress: () => onDuplicate(collection.id),
      });
    }
    if (onMerge && collections.length > 1) {
      options.push({
        text: 'Merge Collections...',
        onPress: () => { onClose(); onMerge(); },
      });
    }
    options.push({
      text: 'Delete',
      style: 'destructive',
      onPress: () => onDeleteCollection(collection.id, collection.name),
    });

    Alert.alert(
      'Collection Options',
      `What would you like to do with "${collection.name}"?`,
      options
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Select View & Collection"
      snapPoints={['60%', '80%']}
      scrollable
    >
      <View style={{ paddingBottom: 24 }}>
                {/* View Mode Options */}
                <View className="px-2 pt-2">
                  <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 px-2">View Mode</Text>
                  {viewModes.map((vm) => {
                    const isActive = viewMode === vm.mode;
                    return (
                      <HapticTouchableOpacity
                        key={vm.mode}
                        onPress={() => {
                          onViewModeChange(vm.mode);
                          onClose();
                        }}
                        className={`px-4 py-3 flex-row items-center rounded-lg mb-2 ${
                          isActive ? '' : 'bg-white dark:bg-gray-800'
                        }`}
                        style={isActive ? { backgroundColor: vm.activeBg } : undefined}
                      >
                        <Icon
                          name={isActive ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE}
                          size={IconSizes.MD}
                          color={isActive ? vm.activeColor : "#9CA3AF"}
                          accessibilityLabel={isActive ? "Selected" : "Not selected"}
                          style={{ marginRight: 12 }}
                        />
                        {vm.icon && (
                          <Icon
                            name={vm.icon}
                            size={IconSizes.SM}
                            color={isActive ? vm.activeColor : '#6B7280'}
                            accessibilityLabel={vm.label}
                            style={{ marginRight: 8 }}
                          />
                        )}
                        <Text
                          className={`flex-1 text-base ${isActive ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`}
                          style={isActive ? { color: vm.activeDark } : undefined}
                        >
                          {vm.label}
                        </Text>
                      </HapticTouchableOpacity>
                    );
                  })}
                </View>

                {/* Collections Section */}
                <View className="px-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                  <View className="flex-row items-center justify-between mb-2 px-2">
                    <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Collections</Text>
                    {/* Sort Chips */}
                    {onSortModeChange && (
                      <View className="flex-row" style={{ gap: 4 }}>
                        {SORT_OPTIONS.map((opt) => (
                          <HapticTouchableOpacity
                            key={opt.key}
                            onPress={() => onSortModeChange(opt.key)}
                            className="px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: sortMode === opt.key
                                ? (isDark ? DarkColors.primary : Colors.primary)
                                : (isDark ? '#374151' : '#F3F4F6'),
                            }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{
                                color: sortMode === opt.key ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280'),
                              }}
                            >
                              {opt.label}
                            </Text>
                          </HapticTouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* "All" option */}
                  <HapticTouchableOpacity
                    onPress={() => onSelectList(null)}
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
                    <Text
                      className={`flex-1 text-base ${selectedListId === null ? 'font-semibold' : 'text-gray-900 dark:text-gray-100'}`}
                      style={selectedListId === null ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}
                    >
                      All
                    </Text>
                  </HapticTouchableOpacity>

                  {/* Collection cards */}
                  <View className="px-2 py-2">
                    <View className="flex-row flex-wrap" style={{ marginHorizontal: -Spacing.sm }}>
                      {sortedCollections.map((collection) => (
                        <View key={collection.id} style={{ width: '50%', paddingHorizontal: Spacing.sm, marginBottom: Spacing.md }}>
                          <CollectionCard
                            collection={collection}
                            isSelected={selectedListId === collection.id}
                            onPress={() => onSelectList(collection.id)}
                            onLongPress={() => showLongPressMenu(collection)}
                            onEdit={() => onEditCollection(collection.id)}
                            onDelete={() => onDeleteCollection(collection.id, collection.name)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

              {/* Create New Collection Button */}
              <View className="p-4 border-t border-gray-200 dark:border-gray-700">
                <HapticTouchableOpacity
                  onPress={() => {
                    onClose();
                    onCreateCollection();
                  }}
                  className="px-4 py-3 rounded-lg flex-row items-center justify-center"
                  style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                >
                  <Icon name={Icons.ADD} size={IconSizes.MD} color="white" accessibilityLabel="Create new collection" />
                  <Text className="text-white font-semibold ml-2">Create New Collection</Text>
                </HapticTouchableOpacity>
              </View>

      </View>
    </BottomSheet>
  );
}
