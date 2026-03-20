// frontend/components/meal-plan/ThawingReminders.tsx
// Section showing thawing reminders for frozen ingredients

import React from 'react';
import { View, Text } from 'react-native';
import { Colors, DarkColors } from '../../constants/Colors';
import { Shadows } from '../../constants/Shadows';

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
      <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? DarkColors.text.primary : Colors.text.primary, marginBottom: 12 }}>
        ❄️ Thawing Reminders
      </Text>
      {thawingReminders.slice(0, 3).map((reminder: any, index: number) => {
        const thawDate = new Date(reminder.recommendedThawDate);
        const isToday = thawDate.toDateString() === new Date().toDateString();
        const isTomorrow = thawDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

        return (
          <View key={index} style={[{ borderRadius: 20, padding: 14, marginBottom: 8, backgroundColor: isDark ? '#2C2C2E' : '#FFF7ED' }, Shadows.SM]}>
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
