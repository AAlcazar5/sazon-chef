// frontend/components/cookbook/MergeCollectionsModal.tsx
// Modal for merging multiple collections into one

import { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, Dimensions, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { Collection } from '../../types';

interface MergeCollectionsModalProps {
  visible: boolean;
  onClose: () => void;
  collections: Collection[];
  onMerge: (sourceIds: string[], targetId: string) => void;
}

export default function MergeCollectionsModal({
  visible,
  onClose,
  collections,
  onMerge,
}: MergeCollectionsModalProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetId, setTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set());
      setTargetId(null);
    }
  }, [visible]);

  const toggleSelected = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      if (targetId === id) setTargetId(null);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const sourceIds = useMemo(
    () => [...selectedIds].filter((id) => id !== targetId),
    [selectedIds, targetId]
  );

  const totalRecipes = useMemo(
    () => sourceIds.reduce((sum, id) => sum + (collections.find((c) => c.id === id)?.recipeCount || 0), 0),
    [sourceIds, collections]
  );

  const targetCollection = collections.find((c) => c.id === targetId);
  const canMerge = sourceIds.length > 0 && targetId;

  const handleMerge = () => {
    if (!canMerge) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onMerge(sourceIds, targetId!);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          className="mx-6 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            width: Dimensions.get('window').width - 48,
            maxHeight: Dimensions.get('window').height * 0.7,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <View className="flex-row items-center">
              <Icon name={Icons.MERGE_LISTS} size={IconSizes.LG} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Merge" />
              <Text className="text-lg font-bold ml-2" style={{ color: isDark ? '#F3F4F6' : '#111827' }}>
                Merge Collections
              </Text>
            </View>
            <HapticTouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Icon name={Icons.CLOSE} size={IconSizes.LG} color={colors.text.secondary} accessibilityLabel="Close" />
            </HapticTouchableOpacity>
          </View>

          <ScrollView className="px-4 py-3" style={{ maxHeight: Dimensions.get('window').height * 0.45 }}>
            {/* Step 1: Select collections */}
            <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
              Select collections to merge
            </Text>
            {collections.map((col) => {
              const isSelected = selectedIds.has(col.id);
              const isTarget = targetId === col.id;
              return (
                <HapticTouchableOpacity
                  key={col.id}
                  onPress={() => toggleSelected(col.id)}
                  className="flex-row items-center py-3 px-3 rounded-lg mb-2"
                  style={{
                    backgroundColor: isTarget
                      ? (isDark ? `${Colors.primaryLight}33` : Colors.primaryLight)
                      : isSelected
                        ? (isDark ? '#374151' : '#F3F4F6')
                        : 'transparent',
                    borderWidth: isTarget ? 2 : 0,
                    borderColor: isDark ? DarkColors.primary : Colors.primary,
                  }}
                >
                  <Icon
                    name={isSelected ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE}
                    size={IconSizes.MD}
                    color={isSelected ? (isDark ? DarkColors.primary : Colors.primary) : '#9CA3AF'}
                    accessibilityLabel={isSelected ? 'Selected' : 'Not selected'}
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-base font-medium" style={{ color: isDark ? '#F3F4F6' : '#111827' }}>
                      {col.name}
                    </Text>
                    <Text className="text-xs" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                      {col.recipeCount || 0} recipes
                    </Text>
                  </View>
                  {isTarget && (
                    <View className="px-2 py-1 rounded-full" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
                      <Text className="text-xs font-bold text-white">Target</Text>
                    </View>
                  )}
                </HapticTouchableOpacity>
              );
            })}

            {/* Step 2: Pick target */}
            {selectedIds.size >= 2 && (
              <View className="mt-3">
                <Text className="text-sm font-semibold mb-2" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                  Merge into (tap to set target)
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {[...selectedIds].map((id) => {
                    const col = collections.find((c) => c.id === id);
                    if (!col) return null;
                    const isTarget = targetId === id;
                    return (
                      <HapticTouchableOpacity
                        key={id}
                        onPress={() => setTargetId(id)}
                        className="px-3 py-2 rounded-full"
                        style={{
                          backgroundColor: isTarget
                            ? (isDark ? DarkColors.primary : Colors.primary)
                            : (isDark ? '#374151' : '#F3F4F6'),
                        }}
                      >
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: isTarget ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563') }}
                        >
                          {col.name}
                        </Text>
                      </HapticTouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Summary & Merge Button */}
          <View className="p-4 border-t border-gray-200 dark:border-gray-700">
            {canMerge && (
              <Text className="text-xs text-center mb-3" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                {totalRecipes} recipe{totalRecipes !== 1 ? 's' : ''} will be moved to "{targetCollection?.name}".{'\n'}
                {sourceIds.length} collection{sourceIds.length !== 1 ? 's' : ''} will be deleted.
              </Text>
            )}
            <View className="flex-row" style={{ gap: 12 }}>
              <HapticTouchableOpacity
                onPress={onClose}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
              >
                <Text className="font-semibold" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleMerge}
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: canMerge
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? '#374151' : '#E5E7EB'),
                }}
                disabled={!canMerge}
              >
                <Text className="font-semibold" style={{ color: canMerge ? '#FFFFFF' : '#9CA3AF' }}>
                  Merge
                </Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
