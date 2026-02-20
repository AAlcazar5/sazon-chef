// frontend/components/meal-plan/ThawingReminders.tsx
// Section showing thawing reminders for frozen ingredients

import React from 'react';
import { View, Text } from 'react-native';
import { Colors, DarkColors } from '../../constants/Colors';

interface ThawingRemindersProps {
  /** Array of thawing reminders */
  thawingReminders: any[];
  /** Whether dark mode is active */
  isDark: boolean;
}

export default function ThawingReminders({
  thawingReminders,
  isDark,
}: ThawingRemindersProps) {
  if (thawingReminders.length === 0) return null;

  return (
    <View className="px-4 mb-4">
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        ❄️ Thawing Reminders
      </Text>
      {thawingReminders.slice(0, 3).map((reminder: any, index: number) => {
        const thawDate = new Date(reminder.recommendedThawDate);
        const isToday = thawDate.toDateString() === new Date().toDateString();
        const isTomorrow = thawDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

        return (
          <View key={index} className="rounded-lg p-3 mb-2 border" style={{ backgroundColor: isDark ? `${Colors.primaryLight}33` : Colors.primaryLight, borderColor: isDark ? DarkColors.primaryDark : Colors.primaryDark }}>
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {reminder.recipe.title}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : thawDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              {reminder.reminderMessage}
            </Text>
            <Text className="text-xs" style={{ color: isDark ? DarkColors.primary : Colors.primary }}>
              ⏰ Thaw {reminder.estimatedThawHours} hours before use
            </Text>
          </View>
        );
      })}
    </View>
  );
}
