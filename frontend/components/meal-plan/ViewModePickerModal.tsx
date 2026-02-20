// frontend/components/meal-plan/ViewModePickerModal.tsx
// Modal for selecting the meal plan view mode

import React from 'react';
import { View, Text, Modal } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';
import type { ViewMode } from '../../hooks/useMealPlanUI';

interface ViewModePickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Currently selected view mode */
  viewMode: ViewMode;
  /** Whether dark mode is active */
  isDark: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Select a view mode */
  onSelectViewMode: (mode: ViewMode) => void;
}

const VIEW_MODES = [
  { value: '24hour' as ViewMode, label: '24-Hour Timeline', description: 'See all meals organized by time of day' },
  { value: 'compact' as ViewMode, label: 'Compact (Meal Types)', description: 'Group meals by breakfast, lunch, dinner, snacks' },
  { value: 'collapsible' as ViewMode, label: 'Collapsible Weekly', description: 'See all days at once, expand to view details' },
];

export default function ViewModePickerModal({
  visible,
  viewMode,
  isDark,
  onClose,
  onSelectViewMode,
}: ViewModePickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <HapticTouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/50 justify-center items-center px-4"
      >
        <HapticTouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm shadow-lg"
        >
          <View className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Select View Mode</Text>
          </View>

          <View>
            {VIEW_MODES.map((mode) => (
              <HapticTouchableOpacity
                key={mode.value}
                onPress={() => {
                  onSelectViewMode(mode.value);
                  onClose();
                  HapticPatterns.buttonPress();
                }}
                className={`px-4 py-4 flex-row items-center border-b border-gray-100 dark:border-gray-700 ${
                  viewMode === mode.value ? '' : 'bg-white dark:bg-gray-800'
                }`}
                style={viewMode === mode.value ? { backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight } : undefined}
              >
                <Icon
                  name={viewMode === mode.value ? Icons.CHECKMARK_CIRCLE : Icons.ELLIPSE_OUTLINE}
                  size={IconSizes.MD}
                  color={viewMode === mode.value ? (isDark ? DarkColors.primary : Colors.primary) : "#9CA3AF"}
                  accessibilityLabel={viewMode === mode.value ? "Selected" : "Not selected"}
                  style={{ marginRight: 12 }}
                />
                <View className="flex-1">
                  <Text className={`text-base ${viewMode === mode.value ? 'font-semibold' : ''} text-gray-900 dark:text-gray-100`}
                    style={viewMode === mode.value ? { color: isDark ? DarkColors.primaryDark : Colors.primaryDark } : undefined}>
                    {mode.label}
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {mode.description}
                  </Text>
                </View>
              </HapticTouchableOpacity>
            ))}
          </View>
        </HapticTouchableOpacity>
      </HapticTouchableOpacity>
    </Modal>
  );
}
