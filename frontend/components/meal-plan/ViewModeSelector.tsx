// frontend/components/meal-plan/ViewModeSelector.tsx
// Dropdown button to open view mode picker

import React from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Shadows } from '../../constants/Shadows';
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
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="px-4 mb-4">
      <Animated.View style={animStyle}>
        <HapticTouchableOpacity
          onPress={onOpenPicker}
          onPressIn={() => { scale.value = withSpring(0.97, { damping: 10, stiffness: 400 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
          style={[{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 16,
            backgroundColor: '#FFFFFF',
          }, Shadows.SM]}
          className="dark:bg-[#1C1C1E]"
        >
          <View className="flex-row items-center flex-1">
            <Icon name={Icons.MEAL_PLAN_OUTLINE} size={IconSizes.MD} color="#6B7280" accessibilityLabel="View mode" style={{ marginRight: 8 }} />
            <Text className="text-gray-900 dark:text-gray-100 font-medium text-base">
              {VIEW_MODE_LABELS[viewMode]}
            </Text>
          </View>
          <Icon name={Icons.CHEVRON_DOWN} size={IconSizes.MD} color="#6B7280" accessibilityLabel="Open dropdown" />
        </HapticTouchableOpacity>
      </Animated.View>
    </View>
  );
}


export default React.memo(ViewModeSelector);
