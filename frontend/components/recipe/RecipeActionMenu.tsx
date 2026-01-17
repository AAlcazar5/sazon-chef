import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Share, Alert } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import type { Recipe } from '../../types';

interface RecipeActionMenuProps {
  visible: boolean;
  recipe: Recipe;
  onClose: () => void;
  onAddToMealPlan?: () => void;
  onViewSimilar?: () => void;
  onHealthify?: () => void;
  onReportIssue?: () => void;
  onShare?: () => void;
}

export default function RecipeActionMenu({
  visible,
  recipe,
  onClose,
  onAddToMealPlan,
  onViewSimilar,
  onHealthify,
  onReportIssue,
  onShare,
}: RecipeActionMenuProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this recipe: ${recipe.title}\n\n${recipe.description || ''}\n\nView it in Sazon Chef!`,
        title: recipe.title,
      });
      
      if (result.action === Share.sharedAction) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onShare?.();
      }
      onClose();
    } catch (error) {
      console.error('Error sharing recipe:', error);
      Alert.alert('Error', 'Failed to share recipe');
    }
  };

  const handleAction = (action: () => void | undefined) => {
    if (action) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      action();
      onClose();
    }
  };

  const actions = [
    {
      id: 'add-to-meal-plan',
      label: 'Add to Meal Plan',
      icon: Icons.MEAL_PLAN_OUTLINE,
      color: Colors.primary,
      onPress: () => handleAction(onAddToMealPlan),
    },
    {
      id: 'share',
      label: 'Share Recipe',
      icon: Icons.SHARE_OUTLINE,
      color: Colors.tertiaryGreen,
      onPress: handleShare,
    },
    {
      id: 'view-similar',
      label: 'View Similar',
      icon: Icons.SWAP_HORIZONTAL,
      color: Colors.primary,
      onPress: () => handleAction(onViewSimilar),
    },
    {
      id: 'healthify',
      label: 'Healthify Recipe',
      icon: Icons.HEART_OUTLINE,
      color: Colors.tertiaryGreen,
      onPress: () => handleAction(onHealthify),
    },
    {
      id: 'report-issue',
      label: 'Report Issue',
      icon: Icons.ALERT_CIRCLE_OUTLINE,
      color: Colors.secondaryRed,
      onPress: () => handleAction(onReportIssue),
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/50 justify-end"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                }),
              },
            ],
          }}
        >
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl p-6"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {recipe.title}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Quick Actions
                </Text>
              </View>
              <HapticTouchableOpacity
                onPress={onClose}
                className="p-2"
                hapticStyle="light"
              >
                <Icon
                  name={Icons.CLOSE}
                  size={IconSizes.MD}
                  color={isDark ? '#9CA3AF' : '#6B7280'}
                  accessibilityLabel="Close menu"
                />
              </HapticTouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View className="space-y-2">
              {actions.map((action) => (
                <HapticTouchableOpacity
                  key={action.id}
                  onPress={action.onPress}
                  className="flex-row items-center p-4 rounded-xl border"
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? '#374151' : '#E5E7EB',
                  }}
                  activeOpacity={0.7}
                  hapticStyle="light"
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: `${action.color}20` }}
                  >
                    <Icon
                      name={action.icon}
                      size={IconSizes.MD}
                      color={action.color}
                      accessibilityLabel={action.label}
                    />
                  </View>
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 flex-1">
                    {action.label}
                  </Text>
                  <Icon
                    name={Icons.CHEVRON_FORWARD}
                    size={IconSizes.SM}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                    accessibilityLabel=""
                  />
                </HapticTouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <HapticTouchableOpacity
              onPress={onClose}
              className="mt-4 p-4 rounded-xl items-center"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              }}
              activeOpacity={0.7}
              hapticStyle="light"
            >
              <Text className="text-base font-semibold text-gray-600 dark:text-gray-300">
                Cancel
              </Text>
            </HapticTouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

