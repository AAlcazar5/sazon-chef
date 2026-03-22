import React from 'react';
import { View, Text, Share, Alert } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import BottomSheet from '../ui/BottomSheet';
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
  onAddNotes?: () => void;
  onRate?: () => void;
  onMarkCooked?: () => void;
  onAddToCollection?: () => void;
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
  onAddNotes,
  onRate,
  onMarkCooked,
  onAddToCollection,
}: RecipeActionMenuProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

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
      Alert.alert('Oops!', 'Couldn\'t share the recipe — try again?');
    }
  };

  const handleAction = (action: (() => void) | undefined) => {
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
    ...(onAddToCollection ? [{
      id: 'add-to-collection',
      label: 'Add to Collection',
      icon: Icons.BOOKMARK_OUTLINE,
      color: Colors.primary,
      onPress: () => handleAction(onAddToCollection),
    }] : []),
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
      icon: Icons.FAVORITE_OUTLINE,
      color: Colors.tertiaryGreen,
      onPress: () => handleAction(onHealthify),
    },
    ...(onAddNotes ? [{
      id: 'add-notes',
      label: 'Add Notes',
      icon: Icons.NOTE_OUTLINE,
      color: Colors.primary,
      onPress: () => handleAction(onAddNotes),
    }] : []),
    ...(onRate ? [{
      id: 'rate',
      label: 'Rate Recipe',
      icon: Icons.STAR_OUTLINE,
      color: Colors.primary,
      onPress: () => handleAction(onRate),
    }] : []),
    ...(onMarkCooked ? [{
      id: 'mark-cooked',
      label: 'Mark as Cooked',
      icon: Icons.RESTAURANT_OUTLINE,
      color: Colors.tertiaryGreen,
      onPress: () => handleAction(onMarkCooked),
    }] : []),
    {
      id: 'report-issue',
      label: 'Report Issue',
      icon: Icons.ERROR_OUTLINE,
      color: Colors.secondaryRed,
      onPress: () => handleAction(onReportIssue),
    },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={recipe.title}
      snapPoints={['55%', '80%']}
    >
      <View className="px-6 pb-8">
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Quick Actions
        </Text>

        {/* Action Buttons */}
        <View style={{ gap: 8 }}>
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
    </BottomSheet>
  );
}
