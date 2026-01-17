import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogoMascot, { LogoMascotExpression } from '../mascot/LogoMascot';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import Icon from './Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Duration } from '../../constants/Animations';
import { HapticPatterns } from '../../constants/Haptics';

export type HelpTooltipType = 'info' | 'guide' | 'support';

interface HelpTooltipProps {
  visible: boolean;
  title: string;
  message: string;
  type?: HelpTooltipType;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function HelpTooltip({
  visible,
  title,
  message,
  type = 'info',
  onDismiss,
  actionLabel,
  onAction,
}: HelpTooltipProps) {
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: Duration.medium,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: Duration.fast,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const getMascotExpression = (): LogoMascotExpression => {
    switch (type) {
      case 'guide':
        return 'curious';
      case 'support':
        return 'supportive';
      default:
        return 'curious';
    }
  };

  const handleDismiss = () => {
    HapticPatterns.buttonPress();
    onDismiss();
  };

  const handleAction = () => {
    if (onAction) {
      HapticPatterns.buttonPressPrimary();
      onAction();
    }
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <SafeAreaView
        className="flex-1 bg-black/50"
        edges={['top', 'bottom']}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDismiss}
          className="flex-1"
        >
          <Animated.View
            style={{ opacity: fadeAnim }}
            className="flex-1 justify-center px-4"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700"
            >
              {/* Header with Mascot */}
              <View className="flex-row items-center mb-4">
                <LogoMascot
                  expression={getMascotExpression()}
                  size="medium"
                />
                <View className="flex-1 ml-4">
                  <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {title}
                  </Text>
                </View>
                <HapticTouchableOpacity
                  onPress={handleDismiss}
                  className="p-2"
                  hapticStyle="light"
                >
                  <Icon
                    name={Icons.CLOSE}
                    size={IconSizes.MD}
                    color="#6B7280"
                    accessibilityLabel="Close tooltip"
                  />
                </HapticTouchableOpacity>
              </View>

              {/* Message */}
              <Text className="text-gray-700 dark:text-gray-200 text-base mb-6 leading-6">
                {message}
              </Text>

              {/* Actions */}
              <View className="flex-row justify-end gap-3">
                {actionLabel && onAction && (
                  <HapticTouchableOpacity
                    onPress={handleAction}
                    className="bg-orange-500 dark:bg-orange-600 px-6 py-3 rounded-lg"
                    hapticStyle="medium"
                  >
                    <Text className="text-white font-semibold">
                      {actionLabel}
                    </Text>
                  </HapticTouchableOpacity>
                )}
                <HapticTouchableOpacity
                  onPress={handleDismiss}
                  className="bg-gray-100 dark:bg-gray-700 px-6 py-3 rounded-lg"
                  hapticStyle="light"
                >
                  <Text className="text-gray-900 dark:text-gray-100 font-semibold">
                    Got it
                  </Text>
                </HapticTouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

