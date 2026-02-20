// frontend/components/meal-plan/SaveTemplateModal.tsx
// Modal for saving the current week's meal plan as a reusable template

import React, { useState } from 'react';
import { View, Text, TextInput, Modal } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import PulsingLoader from '../ui/PulsingLoader';

interface SaveTemplateModalProps {
  visible: boolean;
  saving: boolean;
  isDark: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => void;
}

export default function SaveTemplateModal({
  visible,
  saving,
  isDark,
  onClose,
  onSave,
}: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim() || undefined);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black bg-opacity-50 items-center justify-center px-4">
        <View className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
          <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Save as Template
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
            Save this week's meals as a reusable template you can apply to any future week.
          </Text>

          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Template Name *
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder='e.g., "My Cutting Week", "Family Favorites"'
            placeholderTextColor="#9CA3AF"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-3 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            autoFocus={true}
            maxLength={100}
          />

          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="A short note about this template..."
            placeholderTextColor="#9CA3AF"
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            multiline={true}
            numberOfLines={2}
            maxLength={200}
            style={{ textAlignVertical: 'top', minHeight: 60 }}
          />

          <View className="flex-row" style={{ gap: 12 }}>
            <HapticTouchableOpacity
              onPress={handleClose}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
            </HapticTouchableOpacity>

            <HapticTouchableOpacity
              onPress={handleSave}
              disabled={saving || !name.trim()}
              className={`flex-1 py-3 px-4 bg-emerald-500 dark:bg-emerald-600 rounded-lg ${saving || !name.trim() ? 'opacity-50' : ''} flex-row items-center justify-center`}
            >
              {saving ? (
                <>
                  <PulsingLoader size={14} color="white" />
                  <Text className="text-white font-medium text-center ml-2">Saving...</Text>
                </>
              ) : (
                <Text className="text-white font-medium text-center">Save</Text>
              )}
            </HapticTouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
