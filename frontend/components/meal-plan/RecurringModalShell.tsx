// frontend/components/meal-plan/RecurringModalShell.tsx
// K21: shared shell for the two recurring-meal modals (create/edit + manage).
// Both modals had identical Modal + Animated overlay + scale-in + header
// (title/subtitle/close button) + ScrollView setup. Body content varies and
// stays in the consuming components.

import React, { useEffect, useRef, ReactNode } from 'react';
import { View, Text, Modal, ScrollView, Animated } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Duration, Spring } from '../../constants/Animations';

export interface RecurringModalShellProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Optional one-line subtitle under the title. */
  subtitle?: string;
  /** Max height of the inner sheet (e.g., '80%' or 600). Default unconstrained. */
  maxHeight?: number | `${number}%`;
  /** Body content rendered inside the inner ScrollView. */
  children: ReactNode;
}

export default function RecurringModalShell({
  visible,
  onClose,
  title,
  subtitle,
  maxHeight,
  children,
}: RecurringModalShellProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.8);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: Spring.default.friction,
          tension: Spring.default.tension,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: Duration.medium,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        className="flex-1 bg-black/50 justify-center items-center px-4"
        style={{ opacity }}
      >
        <HapticTouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="absolute inset-0"
          accessibilityLabel="Close"
        />
        <Animated.View
          className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-lg"
          style={[
            { transform: [{ scale }] },
            maxHeight ? ({ maxHeight } as { maxHeight: number | `${number}%` }) : null,
          ]}
        >
          {/* Header */}
          <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </Text>
              {subtitle && (
                <Text
                  className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              )}
            </View>
            <HapticTouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}
              accessibilityLabel="Close"
            >
              <Icon
                name={Icons.CLOSE}
                size={IconSizes.SM}
                color={isDark ? '#D1D5DB' : '#6B7280'}
                accessibilityLabel="Close"
              />
            </HapticTouchableOpacity>
          </View>

          <ScrollView className="p-4">{children}</ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
