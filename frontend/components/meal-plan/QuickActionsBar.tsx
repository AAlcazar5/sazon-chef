// frontend/components/meal-plan/QuickActionsBar.tsx
// Horizontal scrollable quick action badges for meal plan
// Redesigned: elevation over borders, spring press feedback

import React, { useCallback } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';
import { HapticPatterns } from '../../constants/Haptics';

interface ActionBadgeProps {
  emoji: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
  isDark: boolean;
}

function ActionBadge({ emoji, label, onPress, disabled, destructive, isDark }: ActionBadgeProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 10, stiffness: 400 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }, []);

  return (
    <Animated.View style={animStyle}>
      <HapticTouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 100,
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            opacity: disabled ? 0.5 : 1,
          },
          Shadows.SM,
        ]}
      >
        <Text style={{ fontSize: 15 }}>{emoji}</Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            marginLeft: 6,
            color: destructive
              ? (isDark ? DarkColors.secondaryRed : Colors.secondaryRed)
              : (isDark ? '#E5E7EB' : '#374151'),
          }}
        >
          {label}
        </Text>
      </HapticTouchableOpacity>
    </Animated.View>
  );
}

interface QuickActionsBarProps {
  generatingPlan: boolean;
  generatingShoppingList: boolean;
  isDark: boolean;
  onGenerateFullDay: () => void;
  onGenerateRemainingMeals: () => void;
  onGenerateWeeklyPlan: () => void;
  onShowShoppingListModal: () => void;
  onClearAll: () => void;
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  onUseTemplate: () => void;
  onRecurring: () => void;
}

export default function QuickActionsBar({
  generatingPlan,
  generatingShoppingList,
  isDark,
  onGenerateFullDay,
  onGenerateRemainingMeals,
  onGenerateWeeklyPlan,
  onShowShoppingListModal,
  onClearAll,
  onDuplicate,
  onSaveAsTemplate,
  onUseTemplate,
  onRecurring,
}: QuickActionsBarProps) {
  return (
    <View style={{ paddingTop: 12, paddingBottom: 8 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        style={{ flexGrow: 0 }}
        nestedScrollEnabled
      >
        <ActionBadge
          emoji="🤖"
          label={generatingPlan ? 'Creating...' : 'Full Day'}
          onPress={() => { if (!generatingPlan) onGenerateFullDay(); }}
          disabled={generatingPlan}
          isDark={isDark}
        />
        <ActionBadge
          emoji="🍽️"
          label="Remaining"
          onPress={() => { if (!generatingPlan) onGenerateRemainingMeals(); }}
          disabled={generatingPlan}
          isDark={isDark}
        />
        <ActionBadge
          emoji="📅"
          label={generatingPlan ? 'Creating...' : 'Weekly Plan'}
          onPress={() => { if (!generatingPlan) onGenerateWeeklyPlan(); }}
          disabled={generatingPlan}
          isDark={isDark}
        />
        <ActionBadge
          emoji="🛒"
          label={generatingShoppingList ? 'Creating...' : 'Shopping List'}
          onPress={onShowShoppingListModal}
          disabled={generatingShoppingList}
          isDark={isDark}
        />
        <ActionBadge emoji="📑" label="Duplicate" onPress={onDuplicate} isDark={isDark} />
        <ActionBadge emoji="📋" label="Template" onPress={onUseTemplate} isDark={isDark} />
        <ActionBadge emoji="🔖" label="Save" onPress={onSaveAsTemplate} isDark={isDark} />
        <ActionBadge emoji="🔁" label="Recurring" onPress={onRecurring} isDark={isDark} />
        <ActionBadge
          emoji="🗑️"
          label="Clear All"
          destructive
          onPress={() => {
            HapticPatterns.buttonPress();
            Alert.alert('Clear Day', 'Clear all meals for this day?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: onClearAll },
            ]);
          }}
          isDark={isDark}
        />
      </ScrollView>
    </View>
  );
}
