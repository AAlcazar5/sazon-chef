// frontend/components/recipe/AIDescriptionAssist.tsx
// Free-text → full recipe via Claude. Mounts at the top of the recipe form
// so users can skip filling every field manually.

import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import { Colors, DarkColors } from '../../constants/Colors';
import { recipeApi } from '../../lib/api';

export interface GeneratedRecipeShape {
  title: string;
  description?: string;
  cookTime?: number;
  cuisine?: string;
  mealType?: string;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  servings?: number;
  ingredients: string[];
  instructions: string[];
}

interface AIDescriptionAssistProps {
  onRecipeGenerated: (recipe: GeneratedRecipeShape) => void;
}

export default function AIDescriptionAssist({
  onRecipeGenerated,
}: AIDescriptionAssistProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const primaryColor = isDark ? DarkColors.primary : Colors.primary;

  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const trimmed = description.trim();
  const disabled = trimmed.length === 0 || generating;

  async function handleGenerate() {
    if (disabled) return;
    setErrorMsg(null);
    setGenerating(true);
    try {
      const response = await recipeApi.generateFromDescription(trimmed);
      const recipe =
        (response as any)?.data?.data?.recipe || (response as any)?.data?.recipe;
      if (!recipe) {
        throw new Error('No recipe returned');
      }
      onRecipeGenerated(recipe as GeneratedRecipeShape);
      setDescription('');
    } catch {
      setErrorMsg("We couldn't generate that — try rephrasing?");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <View
      style={{
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(232,77,61,0.06)',
      }}
    >
      <View className="flex-row items-center" style={{ gap: 6, marginBottom: 6 }}>
        <Text style={{ fontSize: 16 }}>✨</Text>
        <Text
          className="font-semibold text-gray-900 dark:text-gray-100"
          style={{ fontSize: 14 }}
        >
          Let Sazon fill this out
        </Text>
      </View>
      <Text
        className="text-gray-500 dark:text-gray-400"
        style={{ fontSize: 12, marginBottom: 8 }}
      >
        Describe what you made — Sazon will estimate macros, ingredients, and steps.
      </Text>

      <TextInput
        value={description}
        onChangeText={(t) => {
          setDescription(t);
          if (errorMsg) setErrorMsg(null);
        }}
        placeholder="Describe what you made (e.g. oat protein pancakes with chia seeds)"
        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
        multiline
        numberOfLines={2}
        className="text-gray-900 dark:text-gray-100"
        style={{
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: 64,
          backgroundColor: isDark ? DarkColors.card : '#FFFFFF',
          textAlignVertical: 'top',
          fontSize: 14,
        }}
      />

      {errorMsg && (
        <Text className="text-red-500" style={{ fontSize: 12, marginTop: 6 }}>
          {errorMsg}
        </Text>
      )}

      <HapticTouchableOpacity
        onPress={handleGenerate}
        disabled={disabled}
        testID="ai-assist-cta"
        accessibilityLabel="Let Sazon help fill out this recipe"
        accessibilityState={{ disabled }}
        hapticStyle="medium"
        style={{
          marginTop: 10,
          paddingVertical: 10,
          borderRadius: 100,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: primaryColor,
          opacity: disabled ? 0.5 : 1,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 14 }}>✨</Text>
        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>
          {generating ? 'Generating...' : 'Let Sazon help'}
        </Text>
      </HapticTouchableOpacity>
    </View>
  );
}
