// frontend/components/cookbook/ImportFromUrlModal.tsx
// Modal for importing a recipe from a URL — 3 states: Input → Loading → Preview

import {
  View,
  Text,
  TextInput,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration, Spring } from '../../constants/Animations';
import { recipeApi } from '../../lib/api';
import AnimatedSazon from '../mascot/AnimatedSazon';

type ImportState = 'input' | 'loading' | 'preview';

interface PreviewRecipe {
  id: string;
  title: string;
  description: string;
  cookTime: number;
  servings: number;
  cuisine: string;
  mealType: string | null;
  ingredients: Array<{ text: string }>;
  instructions: Array<{ text: string }>;
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string;
}

interface ImportFromUrlModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ImportFromUrlModal({
  visible,
  onClose,
  onSuccess,
}: ImportFromUrlModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [importState, setImportState] = useState<ImportState>('input');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<PreviewRecipe | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setImportState('input');
      setUrl('');
      setPreview(null);
      setErrorMsg(null);
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
  }, [visible]);

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a recipe URL');
      return;
    }
    if (!isValidUrl(trimmed)) {
      setErrorMsg('Please enter a valid URL (starting with http:// or https://)');
      return;
    }

    setErrorMsg(null);
    setImportState('loading');

    try {
      const response = await recipeApi.importRecipeFromUrl(trimmed);
      const recipe = (response as any).data?.data || (response as any).data;
      if (!recipe) throw new Error('No recipe data returned');
      setPreview(recipe);
      setImportState('preview');
    } catch (error: any) {
      setImportState('input');
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to import recipe. Please check the URL and try again.';
      setErrorMsg(message);
    }
  }

  function handleClose() {
    if (importState === 'loading') return; // Block close during load
    onClose();
  }

  function handleDone() {
    onSuccess();
    onClose();
  }

  const primaryColor = isDark ? DarkColors.primary : Colors.primary;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <SafeAreaView
              className="bg-white dark:bg-gray-900 rounded-t-3xl"
              edges={['bottom']}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center gap-2">
                  <Icon
                    name={Icons.LINK}
                    size={IconSizes.MD}
                    color={primaryColor}
                  />
                  <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Import from URL
                  </Text>
                </View>
                {importState !== 'loading' && (
                  <HapticTouchableOpacity onPress={handleClose} className="p-2">
                    <Icon
                      name={Icons.CLOSE}
                      size={IconSizes.MD}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  </HapticTouchableOpacity>
                )}
              </View>

              {/* Input State */}
              {importState === 'input' && (
                <View className="px-5 pt-4 pb-6">
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Paste any recipe URL — AllRecipes, BBC Food, NYT Cooking, and more.
                  </Text>

                  <View
                    className="flex-row items-center border rounded-xl px-3 mb-2"
                    style={{
                      borderColor: errorMsg
                        ? '#EF4444'
                        : isDark
                        ? '#374151'
                        : '#E5E7EB',
                      backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                    }}
                  >
                    <Icon
                      name={Icons.GLOBE}
                      size={IconSizes.SM}
                      color={isDark ? '#6B7280' : '#9CA3AF'}
                    />
                    <TextInput
                      value={url}
                      onChangeText={(t) => {
                        setUrl(t);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="https://www.allrecipes.com/recipe/..."
                      placeholderTextColor={isDark ? '#4B5563' : '#9CA3AF'}
                      className="flex-1 py-3 px-2 text-gray-900 dark:text-gray-100"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      returnKeyType="go"
                      onSubmitEditing={handleImport}
                    />
                    {url.length > 0 && (
                      <HapticTouchableOpacity onPress={() => { setUrl(''); setErrorMsg(null); }}>
                        <Icon
                          name={Icons.CLOSE}
                          size={16}
                          color={isDark ? '#6B7280' : '#9CA3AF'}
                        />
                      </HapticTouchableOpacity>
                    )}
                  </View>

                  {errorMsg && (
                    <Text className="text-red-500 text-sm mb-3">{errorMsg}</Text>
                  )}

                  <HapticTouchableOpacity
                    onPress={handleImport}
                    hapticStyle="medium"
                    className="py-3 rounded-xl items-center flex-row justify-center mt-2"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Icon
                      name={Icons.LINK_OUTLINE}
                      size={IconSizes.SM}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-semibold text-base">
                      Import Recipe
                    </Text>
                  </HapticTouchableOpacity>
                </View>
              )}

              {/* Loading State */}
              {importState === 'loading' && (
                <View className="px-5 py-10 items-center">
                  <AnimatedSazon expression="thinking" size="medium" />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4">
                    Extracting Recipe...
                  </Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                    Sazon is reading the page and pulling out the recipe for you.
                  </Text>
                </View>
              )}

              {/* Preview State */}
              {importState === 'preview' && preview && (
                <ScrollView
                  className="max-h-96 px-5 pt-4"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Success header */}
                  <View className="flex-row items-center mb-4">
                    <View className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mr-3">
                      <Icon name={Icons.CHECKMARK} size={IconSizes.SM} color="#22C55E" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-900 dark:text-gray-100 text-base" numberOfLines={2}>
                        {preview.title}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        From {preview.sourceName}
                      </Text>
                    </View>
                  </View>

                  {/* Quick stats */}
                  <View className="flex-row gap-3 mb-4">
                    <View className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 items-center">
                      <Text className="text-xl">⏱️</Text>
                      <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                        {preview.cookTime} min
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Cook Time</Text>
                    </View>
                    <View className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 items-center">
                      <Text className="text-xl">🍽️</Text>
                      <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                        {preview.servings}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Servings</Text>
                    </View>
                    <View className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 items-center">
                      <Text className="text-xl">🌍</Text>
                      <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1" numberOfLines={1}>
                        {preview.cuisine}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">Cuisine</Text>
                    </View>
                  </View>

                  {/* Ingredient count */}
                  <View className="flex-row items-center mb-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                    <Text className="text-lg mr-2">📋</Text>
                    <Text className="text-sm text-gray-700 dark:text-gray-300">
                      <Text className="font-semibold">{preview.ingredients.length} ingredients</Text>
                      {' · '}
                      <Text className="font-semibold">{preview.instructions.length} steps</Text>
                      {' '}extracted
                    </Text>
                  </View>

                  {/* Action buttons */}
                  <View className="pb-6 gap-2">
                    <HapticTouchableOpacity
                      onPress={handleDone}
                      hapticStyle="medium"
                      className="py-3 rounded-xl items-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Text className="text-white font-semibold text-base">
                        Saved to Cookbook ✓
                      </Text>
                    </HapticTouchableOpacity>

                    <HapticTouchableOpacity
                      onPress={() => {
                        setImportState('input');
                        setUrl('');
                        setPreview(null);
                      }}
                      hapticStyle="light"
                      className="py-3 rounded-xl items-center border border-gray-200 dark:border-gray-700"
                    >
                      <Text className="text-gray-700 dark:text-gray-300 font-medium text-base">
                        Import Another
                      </Text>
                    </HapticTouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}
