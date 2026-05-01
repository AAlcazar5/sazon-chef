// frontend/components/recipe/MissingIngredientBanner.tsx
// Group 10Q: "Missing for <recipe>" banner — peach-tinted, max 3 names + "+N more"

import { View, Text, Modal, ScrollView } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Shadows } from '../../constants/Shadows';

interface MissingIngredientItem {
  id: string;
  ingredientName: string;
  recipeId: string;
  dismissed: boolean;
}

interface MissingIngredientBannerProps {
  ingredients: MissingIngredientItem[] | undefined;
  onDismiss: () => void;
  onShowAll: () => void;
}

const PEACH_BG_LIGHT = '#FFF3E0';
const PEACH_BG_DARK = 'rgba(255, 183, 77, 0.12)';
const MAX_VISIBLE = 3;

export default function MissingIngredientBanner({
  ingredients,
  onDismiss,
  onShowAll,
}: MissingIngredientBannerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!ingredients || ingredients.length === 0) return null;

  const visible = ingredients.slice(0, MAX_VISIBLE);
  const overflowCount = ingredients.length - MAX_VISIBLE;

  return (
    <View
      testID="missing-ingredient-banner"
      style={{
        backgroundColor: isDark ? PEACH_BG_DARK : PEACH_BG_LIGHT,
        borderRadius: 20,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        ...Shadows.SM,
      }}
    >
      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 13,
            fontFamily: 'PlusJakartaSans_600SemiBold',
            color: isDark ? '#E5E7EB' : '#78350F',
            marginBottom: 4,
          }}
        >
          Still need for this recipe:
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {visible.map((item) => (
            <Text
              key={item.id}
              style={{
                fontSize: 13,
                color: isDark ? '#D1D5DB' : '#92400E',
                fontFamily: 'PlusJakartaSans_400Regular',
              }}
            >
              {item.ingredientName}
            </Text>
          ))}
          {overflowCount > 0 && (
            <HapticTouchableOpacity onPress={onShowAll}>
              <Text
                style={{
                  fontSize: 13,
                  color: isDark ? '#FCD34D' : '#B45309',
                  fontFamily: 'PlusJakartaSans_600SemiBold',
                }}
              >
                +{overflowCount} more
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>
      </View>

      {/* Dismiss button */}
      <HapticTouchableOpacity
        onPress={onDismiss}
        accessibilityLabel="Dismiss missing ingredients"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ marginLeft: 8 }}
      >
        <Text style={{ fontSize: 18, color: isDark ? '#9CA3AF' : '#B45309' }}>×</Text>
      </HapticTouchableOpacity>
    </View>
  );
}
