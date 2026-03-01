// frontend/components/meal-plan/SurpriseBadge.tsx
// "New for you" badge for recipes the user has never cooked

import React from 'react';
import { View, Text } from 'react-native';

interface SurpriseBadgeProps {
  recipeId: string | null | undefined;
  cookedRecipeIds: Set<string>;
  isDark: boolean;
}

export default function SurpriseBadge({ recipeId, cookedRecipeIds, isDark }: SurpriseBadgeProps) {
  if (!recipeId || cookedRecipeIds.has(recipeId)) return null;

  return (
    <View
      className="flex-row items-center px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: isDark ? '#FBBF24' : '#B45309',
        }}
      >
        New for you
      </Text>
    </View>
  );
}
