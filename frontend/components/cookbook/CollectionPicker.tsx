// frontend/components/cookbook/CollectionPicker.tsx
// Modal for selecting view mode and collection filter

import { View, Text, ScrollView, Modal, Animated, Dimensions, Alert } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useRef, useEffect, useState } from 'react';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import CollectionCard from '../collection/CollectionCard';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Spacing } from '../../constants/Spacing';
import { Duration, Spring } from '../../constants/Animations';
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
  viewMode: 'saved' | 'liked' | 'disliked';
  onViewModeChange: (mode: 'saved' | 'liked' | 'disliked') => void;
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

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          ...Spring.stiff,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

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
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View
        className="flex-1 bg-black/50 justify-center items-center px-4"
        style={{ opacity: opacityAnim }}
      >
        <HapticTouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="flex-1 w-full justify-center items-center"
        >
          <HapticTouchableOpacity
            activeOpacity={1}
            onPress={() => {
              // Prevent closing the modal when tapping inside content
            }}
          >
            <Animated.View
              className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm shadow-lg"
              style={{
                transform: [{ scale: scaleAnim }],
              }}
            >
              <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select View & Collection</Text>
              </View>

              <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.5 }}>
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
              </ScrollView>

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

              {/* Close Button */}
              <HapticTouchableOpacity
                onPress={onClose}
                className="px-4 py-3 border-t border-gray-200 dark:border-gray-700"
              >
                <Text className="text-gray-600 dark:text-gray-100 font-medium text-center">Close</Text>
              </HapticTouchableOpacity>
            </Animated.View>
          </HapticTouchableOpacity>
        </HapticTouchableOpacity>
      </Animated.View>
    </Modal>
  );
}
