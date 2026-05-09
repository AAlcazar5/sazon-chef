// frontend/components/profile/PrivacyToggleRow.tsx
// K20: privacy-setting toggle row — title + description + Switch (or spinner
// while updating). DataPrivacyCard had this pattern duplicated 3× verbatim
// for analytics, data-sharing, and location-services toggles.

import React from 'react';
import { View, Text, Switch } from 'react-native';
import AnimatedActivityIndicator from '../ui/AnimatedActivityIndicator';
import { Colors, DarkColors } from '../../constants/Colors';

export interface PrivacyToggleRowProps {
  title: string;
  description: string;
  value: boolean;
  /** True while the parent is persisting this toggle's change. */
  isUpdating: boolean;
  isDark: boolean;
  onValueChange: (next: boolean) => void;
}

export default function PrivacyToggleRow({
  title,
  description,
  value,
  isUpdating,
  isDark,
  onValueChange,
}: PrivacyToggleRowProps) {
  const titleColor = isDark ? DarkColors.text.primary : Colors.text.primary;
  const descColor = isDark ? DarkColors.text.secondary : Colors.text.secondary;
  const trackOn = isDark ? DarkColors.primary : Colors.primary;

  return (
    <View className="flex-row items-center justify-between py-3 ">
      <View className="flex-1 mr-4">
        <Text className="text-sm font-medium" style={{ color: titleColor }}>
          {title}
        </Text>
        <Text className="text-xs mt-1" style={{ color: descColor }}>
          {description}
        </Text>
      </View>
      {isUpdating ? (
        <AnimatedActivityIndicator
          size="small"
          color={isDark ? DarkColors.primary : Colors.primary}
        />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#D1D5DB', true: trackOn }}
          thumbColor="#FFFFFF"
          accessibilityLabel={title}
        />
      )}
    </View>
  );
}
