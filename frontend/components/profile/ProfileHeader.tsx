// frontend/components/profile/ProfileHeader.tsx
// Profile header with avatar, name, email, and edit name modal

import { View, Text, Modal, TextInput, Image, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { useState } from 'react';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { UserProfile } from '../../types';

interface ProfileHeaderProps {
  profile: UserProfile;
  profilePicture: string | null;
  uploadingPicture: boolean;
  onChangeProfilePicture: () => void;
  onSaveName: (name: string) => Promise<boolean>;
}

export default function ProfileHeader({
  profile,
  profilePicture,
  uploadingPicture,
  onChangeProfilePicture,
  onSaveName,
}: ProfileHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

  const handleEditName = () => {
    setEditingName(profile.name);
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    if (!editingName.trim()) return;
    setUpdatingName(true);
    const success = await onSaveName(editingName);
    setUpdatingName(false);
    if (success) setShowEditNameModal(false);
  };

  return (
    <>
      <View className="bg-white dark:bg-gray-800 px-4 pt-4 pb-6 border-b border-gray-200 dark:border-gray-700">
        <View className="items-center">
          <HapticTouchableOpacity
            onPress={onChangeProfilePicture}
            disabled={uploadingPicture}
            className="relative mb-3"
            activeOpacity={0.8}
          >
            <View className="w-20 h-20 rounded-full items-center justify-center overflow-hidden" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
              {profilePicture ? (
                <Image
                  source={{ uri: profilePicture }}
                  style={{ width: 80, height: 80 }}
                  className="rounded-full"
                />
              ) : (
                <Text className="text-white text-2xl font-bold">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </Text>
              )}
            </View>
            {uploadingPicture ? (
              <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                <ActivityIndicator size="small" color="white" />
              </View>
            ) : (
              <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full items-center justify-center border-2 border-white dark:border-gray-800" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
                <Icon name={Icons.EDIT_OUTLINE} size={12} color="white" accessibilityLabel="Edit profile picture" />
              </View>
            )}
          </HapticTouchableOpacity>
          <View className="flex-row items-center mb-1">
            <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100 mr-2" accessibilityRole="header">{profile.name}</Text>
            <HapticTouchableOpacity
              onPress={handleEditName}
              className="p-1"
              activeOpacity={0.7}
            >
              <Icon
                name={Icons.EDIT_OUTLINE}
                size={IconSizes.SM}
                color={isDark ? DarkColors.text.secondary : Colors.text.secondary}
                accessibilityLabel="Edit name"
              />
            </HapticTouchableOpacity>
          </View>
          <Text className="text-gray-500 dark:text-gray-200">{profile.email}</Text>
        </View>
      </View>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
          <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Edit Name
            </Text>

            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Name</Text>
              <TextInput
                value={editingName}
                onChangeText={setEditingName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                autoComplete="name"
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </View>

            <View className="flex-row space-x-3">
              <HapticTouchableOpacity
                onPress={() => {
                  setShowEditNameModal(false);
                  setEditingName('');
                }}
                disabled={updatingName}
                className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
              </HapticTouchableOpacity>

              <HapticTouchableOpacity
                onPress={handleSaveName}
                disabled={updatingName || !editingName.trim()}
                className={`flex-1 py-3 px-4 rounded-lg ${updatingName || !editingName.trim() ? 'opacity-50' : ''}`}
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                {updatingName ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-medium text-center">Save</Text>
                )}
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
