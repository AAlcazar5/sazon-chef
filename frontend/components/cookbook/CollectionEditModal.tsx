// frontend/components/cookbook/CollectionEditModal.tsx
// Modal for creating/editing collections with name, description, and cover image

import { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, Dimensions, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { Collection } from '../../types';

interface CollectionEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description?: string; coverImageUrl?: string | null }) => void;
  /** If provided, modal is in edit mode. Otherwise create mode. */
  collection?: Collection | null;
  /** Recipe images available for cover selection (from recipes in this collection) */
  recipeImages?: string[];
}

export default function CollectionEditModal({
  visible,
  onClose,
  onSave,
  collection,
  recipeImages = [],
}: CollectionEditModalProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  const isEditMode = !!collection;

  useEffect(() => {
    if (visible) {
      setName(collection?.name || '');
      setDescription(collection?.description || '');
      setCoverImageUrl(collection?.coverImageUrl || null);
    }
  }, [visible, collection]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      name: trimmedName,
      description: description.trim() || undefined,
      coverImageUrl,
    });
  };

  const uniqueImages = [...new Set(recipeImages)].slice(0, 12);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            className="mx-6 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              width: Dimensions.get('window').width - 48,
              maxHeight: Dimensions.get('window').height * 0.75,
            }}
          >
            <ScrollView bounces={false}>
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-lg font-bold" style={{ color: isDark ? '#F3F4F6' : '#111827' }}>
                  {isEditMode ? 'Edit Collection' : 'New Collection'}
                </Text>
                <HapticTouchableOpacity onPress={onClose} accessibilityLabel="Close">
                  <Icon name={Icons.CLOSE} size={IconSizes.LG} color={colors.text.secondary} accessibilityLabel="Close" />
                </HapticTouchableOpacity>
              </View>

              <View className="p-4" style={{ gap: 16 }}>
                {/* Name */}
                <View>
                  <Text className="text-sm font-semibold mb-1.5" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    Name
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Collection name"
                    placeholderTextColor="#9CA3AF"
                    className="border rounded-lg px-3 py-2.5"
                    style={{
                      borderColor: isDark ? '#4B5563' : '#D1D5DB',
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      color: isDark ? '#F3F4F6' : '#111827',
                      fontSize: 16,
                    }}
                    autoFocus={!isEditMode}
                  />
                </View>

                {/* Description */}
                <View>
                  <Text className="text-sm font-semibold mb-1.5" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                    Description (optional)
                  </Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="What's this collection about?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    className="border rounded-lg px-3 py-2.5"
                    style={{
                      borderColor: isDark ? '#4B5563' : '#D1D5DB',
                      backgroundColor: isDark ? '#374151' : '#F9FAFB',
                      color: isDark ? '#F3F4F6' : '#111827',
                      fontSize: 14,
                      minHeight: 72,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>

                {/* Cover Image Picker */}
                {uniqueImages.length > 0 && (
                  <View>
                    <Text className="text-sm font-semibold mb-1.5" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
                      Cover Image
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View className="flex-row" style={{ gap: 8 }}>
                        {/* Auto option */}
                        <HapticTouchableOpacity
                          onPress={() => setCoverImageUrl(null)}
                          className="rounded-lg overflow-hidden items-center justify-center"
                          style={{
                            width: 72,
                            height: 72,
                            borderWidth: coverImageUrl === null ? 2 : 1,
                            borderColor: coverImageUrl === null
                              ? (isDark ? DarkColors.primary : Colors.primary)
                              : (isDark ? '#4B5563' : '#D1D5DB'),
                            backgroundColor: isDark ? '#374151' : '#F3F4F6',
                          }}
                        >
                          <Icon name={Icons.IMAGE_OUTLINE} size={IconSizes.LG} color={isDark ? '#9CA3AF' : '#6B7280'} accessibilityLabel="Auto cover" />
                          <Text className="text-xs mt-0.5" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>Auto</Text>
                        </HapticTouchableOpacity>

                        {uniqueImages.map((imgUrl) => (
                          <HapticTouchableOpacity
                            key={imgUrl}
                            onPress={() => setCoverImageUrl(imgUrl)}
                            className="rounded-lg overflow-hidden"
                            style={{
                              width: 72,
                              height: 72,
                              borderWidth: coverImageUrl === imgUrl ? 2 : 1,
                              borderColor: coverImageUrl === imgUrl
                                ? (isDark ? DarkColors.primary : Colors.primary)
                                : (isDark ? '#4B5563' : '#D1D5DB'),
                            }}
                          >
                            <Image
                              source={{ uri: imgUrl }}
                              style={{ width: '100%', height: '100%' }}
                              contentFit="cover"
                              transition={200}
                            />
                            {coverImageUrl === imgUrl && (
                              <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <Icon name={Icons.CHECKMARK} size={IconSizes.LG} color="#FFFFFF" accessibilityLabel="Selected" />
                              </View>
                            )}
                          </HapticTouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row p-4 border-t border-gray-200 dark:border-gray-700" style={{ gap: 12 }}>
              <HapticTouchableOpacity
                onPress={onClose}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
              >
                <Text className="font-semibold" style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleSave}
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: name.trim()
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? '#374151' : '#E5E7EB'),
                }}
                disabled={!name.trim()}
              >
                <Text className="font-semibold" style={{ color: name.trim() ? '#FFFFFF' : '#9CA3AF' }}>
                  {isEditMode ? 'Save' : 'Create'}
                </Text>
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
