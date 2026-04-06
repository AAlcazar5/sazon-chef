// frontend/components/cookbook/QuickAddRecipeModal.tsx
// Fast-path creation sheet: title + ingredients + optional macros.
// Full details (instructions, photo, etc.) can be added later from the recipe form.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration, Spring } from '../../constants/Animations';
import { recipeApi } from '../../lib/api';

interface QuickAddRecipeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (recipeId?: string) => void;
  /** If set, the created recipe auto-joins this collection. */
  activeCollectionId?: string;
}

function parseIngredients(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function QuickAddRecipeModal({
  visible,
  onClose,
  onSuccess,
  activeCollectionId,
}: QuickAddRecipeModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState('');
  const [ingredientsRaw, setIngredientsRaw] = useState('');
  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setTitle('');
      setIngredientsRaw('');
      setProtein('');
      setCalories('');
      setErrorMsg(null);
      setSaving(false);
      scale.setValue(0.9);
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
  }, [visible]);

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setErrorMsg('Please name your recipe first');
      return;
    }
    setErrorMsg(null);
    setSaving(true);

    const payload: Record<string, unknown> = {
      title: trimmed,
      ingredients: parseIngredients(ingredientsRaw),
      protein: protein ? Number(protein) || 0 : 0,
      calories: calories ? Number(calories) || 0 : 0,
    };
    if (activeCollectionId) {
      payload.collectionIds = [activeCollectionId];
    }

    try {
      const response = await recipeApi.createRecipe(payload);
      const recipeId =
        (response as any)?.data?.data?.id || (response as any)?.data?.id;
      onSuccess(recipeId);
      onClose();
    } catch {
      setSaving(false);
      setErrorMsg("We couldn't save that one — try again?");
    }
  }

  const primaryColor = isDark ? DarkColors.primary : Colors.primary;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <SafeAreaView
              className="bg-white dark:bg-gray-900"
              edges={['bottom']}
              style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <Text style={{ fontSize: 22 }}>⚡️</Text>
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Quick Add Recipe
                  </Text>
                </View>
                <HapticTouchableOpacity
                  onPress={onClose}
                  accessibilityLabel="Close quick add"
                  className="p-2"
                >
                  <Icon
                    name={Icons.CLOSE}
                    size={IconSizes.MD}
                    color={isDark ? '#9CA3AF' : '#6B7280'}
                  />
                </HapticTouchableOpacity>
              </View>

              <ScrollView
                className="px-5 pb-6"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Just the essentials — add instructions and a photo later.
                </Text>

                {/* Title */}
                <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Recipe name
                </Text>
                <TextInput
                  value={title}
                  onChangeText={(t) => {
                    setTitle(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. Oat Protein Pancakes"
                  placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
                  className="py-3 px-4 mb-3 text-gray-900 dark:text-gray-100"
                  style={{
                    borderRadius: 14,
                    backgroundColor: isDark ? DarkColors.card : Colors.surface,
                  }}
                />

                {/* Ingredients */}
                <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Ingredients
                </Text>
                <TextInput
                  value={ingredientsRaw}
                  onChangeText={setIngredientsRaw}
                  placeholder={'One ingredient per line\n1 cup oats\n1 scoop protein...'}
                  placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
                  className="py-3 px-4 mb-3 text-gray-900 dark:text-gray-100"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={{
                    borderRadius: 14,
                    minHeight: 110,
                    backgroundColor: isDark ? DarkColors.card : Colors.surface,
                  }}
                />

                {/* Macros row */}
                <View className="flex-row mb-3" style={{ gap: 10 }}>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Protein (optional)
                    </Text>
                    <TextInput
                      value={protein}
                      onChangeText={setProtein}
                      placeholder="Protein (g)"
                      placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
                      keyboardType="numeric"
                      className="py-3 px-4 text-gray-900 dark:text-gray-100"
                      style={{
                        borderRadius: 14,
                        backgroundColor: isDark ? DarkColors.card : Colors.surface,
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Calories (optional)
                    </Text>
                    <TextInput
                      value={calories}
                      onChangeText={setCalories}
                      placeholder="Calories"
                      placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
                      keyboardType="numeric"
                      className="py-3 px-4 text-gray-900 dark:text-gray-100"
                      style={{
                        borderRadius: 14,
                        backgroundColor: isDark ? DarkColors.card : Colors.surface,
                      }}
                    />
                  </View>
                </View>

                {errorMsg && (
                  <Text className="text-red-500 text-sm mb-2">{errorMsg}</Text>
                )}

                <HapticTouchableOpacity
                  onPress={handleSave}
                  hapticStyle="medium"
                  disabled={saving}
                  className="py-3 rounded-xl items-center mt-2"
                  style={{
                    backgroundColor: primaryColor,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text className="text-white font-semibold text-base">
                    {saving ? 'Saving...' : 'Save Recipe'}
                  </Text>
                </HapticTouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}
