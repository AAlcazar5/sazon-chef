// frontend/components/meal-plan/ViewModeSelector.tsx
// Dropdown button to open view mode picker

import React from 'react';
import { View, Text } from 'react-native';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import type { ViewMode } from '../../hooks/useMealPlanUI';

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  '24hour': '24-Hour Timeline',
  'compact': 'Compact (Meal Types)',
  'collapsible': 'Collapsible Weekly',
};

interface ViewModeSelectorProps {
  /** Current view mode */
  viewMode: ViewMode;
  /** Open the view mode picker modal */
  onOpenPicker: () => void;
}

function ViewModeSelector({
  viewMode,
  onOpenPicker,
}: ViewModeSelectorProps) {
  return (
    <View className="px-4 mb-4">
      <HapticTouchableOpacity
        onPress={onOpenPicker}
        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 flex-row items-center justify-between"
      >
        <View className="flex-row items-center flex-1">
          <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="View mode" style={{ marginRight: 8 }} />
          <Text className="text-gray-900 dark:text-gray-100 font-medium text-base">
            {VIEW_MODE_LABELS[viewMode]}
          </Text>
        </View>
        <Icon name={Icons.CHEVRON_DOWN} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Open dropdown" />
      </HapticTouchableOpacity>
    </View>
  );
}


export default React.memo(ViewModeSelector);
