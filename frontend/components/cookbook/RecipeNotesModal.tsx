// frontend/components/cookbook/RecipeNotesModal.tsx
// Modal for editing personal notes on a saved recipe

import { View, Text, TextInput, Modal, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration, Spring } from '../../constants/Animations';

const MAX_NOTES_LENGTH = 500;

interface RecipeNotesModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Close callback */
  onClose: () => void;
  /** Recipe title for header */
  recipeTitle: string;
  /** Current notes value */
  initialNotes: string | null;
  /** Save callback — pass null to clear notes */
  onSave: (notes: string | null) => void;
}

export default function RecipeNotesModal({
  visible,
  onClose,
  recipeTitle,
  initialNotes,
  onSave,
}: RecipeNotesModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [notes, setNotes] = useState(initialNotes || '');
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setNotes(initialNotes || '');
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
  }, [visible, initialNotes, scale, opacity]);

  const handleSave = () => {
    const trimmed = notes.trim();
    onSave(trimmed.length > 0 ? trimmed : null);
  };

  const handleClear = () => {
    setNotes('');
    onSave(null);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Animated.View className="flex-1 bg-black/50 justify-center items-center px-4" style={{ opacity }}>
          <HapticTouchableOpacity
            activeOpacity={1}
            onPress={onClose}
            className="absolute inset-0"
          />
          <Animated.View
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-lg"
            style={{ transform: [{ scale }] }}
          >
            {/* Header */}
            <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recipe Notes</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1" numberOfLines={1}>
                  {recipeTitle}
                </Text>
              </View>
              <HapticTouchableOpacity
                onPress={onClose}
                className="p-2 rounded-full"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }}
              >
                <Icon name={Icons.CLOSE} size={IconSizes.SM} color={isDark ? '#D1D5DB' : '#6B7280'} accessibilityLabel="Close" />
              </HapticTouchableOpacity>
            </View>

            {/* Notes input */}
            <View className="p-4">
              <TextInput
                value={notes}
                onChangeText={(text) => setNotes(text.slice(0, MAX_NOTES_LENGTH))}
                placeholder="Add your notes... (e.g., needs more garlic, kids loved it)"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                className="text-base text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                style={{ minHeight: 120, maxHeight: 200 }}
                autoFocus
              />
              <Text className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-right">
                {notes.length}/{MAX_NOTES_LENGTH}
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row px-4 pb-4" style={{ gap: 12 }}>
              {initialNotes && (
                <HapticTouchableOpacity
                  onPress={handleClear}
                  className="flex-1 py-3 rounded-lg items-center border border-red-200 dark:border-red-800"
                >
                  <Text className="text-sm font-semibold text-red-500 dark:text-red-400">Clear</Text>
                </HapticTouchableOpacity>
              )}
              <HapticTouchableOpacity
                onPress={handleSave}
                className="flex-1 py-3 rounded-lg items-center"
                style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
              >
                <Text className="text-sm font-semibold text-white">Save Notes</Text>
              </HapticTouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
