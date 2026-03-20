// frontend/components/ui/SettingsRow.tsx
// Settings list row with spring-animated chevron that slides right on press.

import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import Icon from './Icon';
import { Icons, IconSizes } from '../../constants/Icons';

interface SettingsRowProps {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  /** Render a custom right-side element instead of the chevron */
  rightElement?: React.ReactNode;
  /** Show bottom border (default true) */
  showBorder?: boolean;
  labelStyle?: any;
  style?: ViewStyle;
  testID?: string;
  disabled?: boolean;
}

export default function SettingsRow({
  label,
  sublabel,
  icon,
  onPress,
  rightElement,
  showBorder = true,
  labelStyle,
  style,
  testID,
  disabled,
}: SettingsRowProps) {
  const chevronX = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chevronX.value }],
  }));

  const handlePressIn = () => {
    chevronX.value = withSpring(4, { damping: 10, stiffness: 400 });
  };

  const handlePressOut = () => {
    chevronX.value = withSpring(0, { damping: 12, stiffness: 300 });
  };

  return (
    <HapticTouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hapticStyle="light"
      testID={testID}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 14,
          paddingHorizontal: 16,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {icon && <View style={{ marginRight: 12 }}>{icon}</View>}
        <View style={{ flex: 1 }}>
          <Text
            style={[{ fontSize: 16, fontWeight: '500' }, labelStyle]}
            className="text-gray-900 dark:text-gray-100"
          >
            {label}
          </Text>
          {sublabel ? (
            <Text style={{ fontSize: 12, marginTop: 1 }} className="text-gray-500 dark:text-gray-400">
              {sublabel}
            </Text>
          ) : null}
        </View>
      </View>

      {rightElement ?? (
        <Animated.View style={chevronStyle}>
          <Icon
            name={Icons.CHEVRON_FORWARD}
            size={IconSizes.SM}
            color="#9CA3AF"
            accessibilityLabel="Navigate"
          />
        </Animated.View>
      )}
    </HapticTouchableOpacity>
  );
}
