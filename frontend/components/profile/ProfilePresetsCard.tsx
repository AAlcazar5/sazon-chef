// frontend/components/profile/ProfilePresetsCard.tsx
// Profile presets card with save/apply/delete functionality

import { useState } from 'react';
import { View, Text, Modal, TextInput, Alert, Switch, ActivityIndicator } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useTheme } from '../../contexts/ThemeContext';
import type { ProfilePreset } from '../../types';

interface ProfilePresetsCardProps {
  presets: ProfilePreset[];
  presetsLoading: boolean;
  onSavePreset: (name: string, description?: string) => Promise<void>;
  onApplyPreset: (preset: ProfilePreset) => Promise<void>;
  onDeletePreset: (id: string) => Promise<void>;
}

export default function ProfilePresetsCard({
  presets,
  presetsLoading,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
}: ProfilePresetsCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const activePreset = presets.find((p) => p.isActive);

  const handleSave = async () => {
    if (!presetName.trim()) return;
    setSaving(true);
    try {
      await onSavePreset(presetName.trim(), presetDescription.trim() || undefined);
      setShowSaveModal(false);
      setPresetName('');
      setPresetDescription('');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = (preset: ProfilePreset) => {
    Alert.alert(
      'Apply Preset',
      `Apply "${preset.name}"? This will update your macros${preset.activityLevel ? ', activity level' : ''}${preset.fitnessGoal ? ', fitness goal' : ''}${preset.maxDailyFoodBudget ? ', and budget' : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setApplying(preset.id);
            try {
              await onApplyPreset(preset);
            } finally {
              setApplying(null);
            }
          },
        },
      ],
    );
  };

  const handleDelete = (preset: ProfilePreset) => {
    Alert.alert('Delete Preset', `Delete "${preset.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDeletePreset(preset.id),
      },
    ]);
  };

  return (
    <>
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 m-4 shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View
              className="rounded-full p-2 mr-3"
              style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
            >
              <Icon name={Icons.BOOKMARK_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Presets" />
            </View>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile Presets</Text>
          </View>
          <HapticTouchableOpacity
            onPress={() => {
              setPresetName('');
              setPresetDescription('');
              setShowSaveModal(true);
            }}
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight }}
          >
            <Text className="text-sm font-semibold" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
              Save Current
            </Text>
          </HapticTouchableOpacity>
        </View>

        {/* Active preset indicator */}
        {activePreset && (
          <View
            className="flex-row items-center px-3 py-2 rounded-lg mb-3"
            style={{ backgroundColor: isDark ? `${Colors.primaryLight}20` : `${Colors.primaryLight}40` }}
          >
            <Icon name={Icons.CHECKMARK_CIRCLE} size={16} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Active" />
            <Text className="text-sm ml-2" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
              Active: <Text className="font-semibold">{activePreset.name}</Text>
            </Text>
          </View>
        )}

        {/* Preset list */}
        {presetsLoading ? (
          <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
        ) : presets.length === 0 ? (
          <Text className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
            No presets yet. Save your current settings to create one.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {presets.map((preset) => (
              <View
                key={preset.id}
                className="rounded-lg p-3 border"
                style={{
                  borderColor: preset.isActive
                    ? (isDark ? DarkColors.primary : Colors.primary)
                    : (isDark ? '#374151' : '#E5E7EB'),
                  backgroundColor: preset.isActive
                    ? (isDark ? `${Colors.primaryLight}10` : `${Colors.primaryLight}20`)
                    : 'transparent',
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center">
                      <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {preset.name}
                      </Text>
                      {preset.isActive && (
                        <View className="ml-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}>
                          <Text className="text-[10px] font-bold text-white">ACTIVE</Text>
                        </View>
                      )}
                    </View>
                    {preset.description && (
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{preset.description}</Text>
                    )}
                    <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {preset.calories} cal | {preset.protein}p / {preset.carbs}c / {preset.fat}f
                    </Text>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    {applying === preset.id ? (
                      <ActivityIndicator size="small" color={isDark ? DarkColors.primary : Colors.primary} />
                    ) : (
                      <HapticTouchableOpacity onPress={() => handleApply(preset)}>
                        <Icon name={Icons.CHECKMARK_CIRCLE_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.primary : Colors.primary} accessibilityLabel="Apply preset" />
                      </HapticTouchableOpacity>
                    )}
                    <HapticTouchableOpacity onPress={() => handleDelete(preset)}>
                      <Icon name={Icons.DELETE_OUTLINE} size={IconSizes.MD} color={isDark ? DarkColors.secondaryRed : Colors.secondaryRed} accessibilityLabel="Delete preset" />
                    </HapticTouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Save Preset Modal */}
      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white dark:bg-gray-800 rounded-xl p-5 w-full" style={{ maxWidth: 400 }}>
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Save Current Settings</Text>

            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 mb-3"
              placeholder="e.g., Cutting Phase, Bulk Mode"
              placeholderTextColor="#9CA3AF"
              value={presetName}
              onChangeText={setPresetName}
              autoFocus
            />

            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description (optional)</Text>
            <TextInput
              className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2.5 text-gray-900 dark:text-gray-100 mb-4"
              placeholder="Brief description..."
              placeholderTextColor="#9CA3AF"
              value={presetDescription}
              onChangeText={setPresetDescription}
            />

            <Text className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              This will save your current macros, activity level, fitness goal, and budget settings.
            </Text>

            <View className="flex-row justify-end" style={{ gap: 12 }}>
              <HapticTouchableOpacity
                onPress={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-lg"
              >
                <Text className="text-gray-600 dark:text-gray-400 font-medium">Cancel</Text>
              </HapticTouchableOpacity>
              <HapticTouchableOpacity
                onPress={handleSave}
                disabled={!presetName.trim() || saving}
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: !presetName.trim() || saving
                    ? (isDark ? '#374151' : '#D1D5DB')
                    : (isDark ? DarkColors.primary : Colors.primary),
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold">Save</Text>
                )}
              </HapticTouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
