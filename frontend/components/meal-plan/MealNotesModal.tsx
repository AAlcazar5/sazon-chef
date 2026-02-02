// frontend/components/meal-plan/MealNotesModal.tsx
// Modal for editing meal notes with templates and formatting tools

import React from 'react';
import { View, Text, Modal, TextInput, ScrollView } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';
import { HapticPatterns } from '../../constants/Haptics';

interface MealNotesModalProps {
  visible: boolean;
  editingMealName: string;
  editingNotes: string;
  quickTemplates: Array<{ label: string; text: string }>;
  isDark: boolean;
  onClose: () => void;
  onSave: () => void;
  onNotesChange: (text: string) => void;
  onInsertBulletPoint: () => void;
  onInsertTemplate: (template: string) => void;
}

function MealNotesModal({
  visible,
  editingMealName,
  editingNotes,
  quickTemplates,
  isDark,
  onClose,
  onSave,
  onNotesChange,
  onInsertBulletPoint,
  onInsertTemplate,
}: MealNotesModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black bg-opacity-50">
        <View className="flex-1 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl max-h-[85%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Meal Notes
                </Text>
                {editingMealName && (
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {editingMealName}
                  </Text>
                )}
              </View>
              <HapticTouchableOpacity
                onPress={onClose}
                className="p-2"
              >
                <Icon
                  name={Icons.CLOSE}
                  size={IconSizes.LG}
                  color={isDark ? DarkColors.text.primary : Colors.text.primary}
                  accessibilityLabel="Close"
                />
              </HapticTouchableOpacity>
            </View>

            {/* Quick Templates */}
            <View className="px-6 pt-4 pb-2">
              <Text className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Quick Templates
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" nestedScrollEnabled={true}>
                <View className="flex-row space-x-2">
                  {quickTemplates.map((template, index) => (
                    <HapticTouchableOpacity
                      key={index}
                      onPress={() => {
                        HapticPatterns.buttonPress();
                        onInsertTemplate(template.text);
                      }}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }}
                    >
                      <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}>
                        {template.label}
                      </Text>
                    </HapticTouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Text Input */}
            <View className="px-6 pb-4">
              <TextInput
                value={editingNotes}
                onChangeText={onNotesChange}
                placeholder="Add notes about this meal... (e.g., taste, modifications, prep tips)"
                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                multiline
                className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-gray-900 dark:text-gray-100"
                style={{
                  minHeight: 200,
                  maxHeight: 300,
                  textAlignVertical: 'top',
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  fontSize: FontSize.base,
                  lineHeight: 22,
                  color: isDark ? DarkColors.text.primary : Colors.text.primary
                }}
              />

              {/* Character Count & Formatting Tools */}
              <View className="flex-row items-center justify-between mt-2">
                <View className="flex-row items-center space-x-3">
                  <HapticTouchableOpacity
                    onPress={() => {
                      HapticPatterns.buttonPress();
                      onInsertBulletPoint();
                    }}
                    className="px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: isDark ? '#374151' : '#E5E7EB' }}
                  >
                    <Text className="text-xs font-medium" style={{ color: isDark ? DarkColors.text.primary : Colors.text.primary }}>
                      • Bullet
                    </Text>
                  </HapticTouchableOpacity>
                </View>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {editingNotes.length} characters
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="px-6 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700">
              <View className="flex-row space-x-3">
                <HapticTouchableOpacity
                  onPress={onClose}
                  className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <Text className="text-gray-700 dark:text-gray-100 font-medium text-center">Cancel</Text>
                </HapticTouchableOpacity>

                <HapticTouchableOpacity
                  onPress={onSave}
                  className="flex-1 py-3 px-4 rounded-lg"
                  style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
                >
                  <Text className="text-white font-medium text-center">Save Notes</Text>
                </HapticTouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default MealNotesModal;
