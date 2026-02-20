// frontend/components/cookbook/MarkCookedModal.tsx
// Confirmation modal for marking a recipe as cooked

import { View, Text, TextInput, Modal, Animated } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Duration, Spring } from '../../constants/Animations';

interface MarkCookedModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Close callback */
  onClose: () => void;
  /** Recipe title for display */
  recipeTitle: string;
  /** Confirm callback with optional cooking session notes */
  onConfirm: (notes?: string) => void;
  /** Number of times previously cooked */
  cookCount?: number;
  /** ISO timestamp of last cook */
  lastCooked?: string | null;
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) > 1 ? 's' : ''} ago`;
}

export default function MarkCookedModal({
  visible,
  onClose,
  recipeTitle,
  onConfirm,
  cookCount = 0,
  lastCooked,
}: MarkCookedModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [sessionNotes, setSessionNotes] = useState('');
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSessionNotes('');
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
  }, [visible, scale, opacity]);

  const handleConfirm = () => {
    const trimmed = sessionNotes.trim();
    onConfirm(trimmed.length > 0 ? trimmed : undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View className="flex-1 bg-black/50 justify-center items-center px-4" style={{ opacity }}>
        <HapticTouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          className="absolute inset-0"
        />
        <Animated.View
          className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm shadow-lg"
          style={{ transform: [{ scale }] }}
        >
          {/* Header */}
          <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">Mark as Cooked</Text>
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

          <View className="p-4">
            {/* Cooking stats */}
            {(cookCount > 0 || lastCooked) && (
              <View className="flex-row mb-4" style={{ gap: 16 }}>
                {cookCount > 0 && (
                  <View className="flex-row items-center">
                    <Icon name={Icons.CHECKMARK_CIRCLE} size={IconSizes.SM} color={isDark ? DarkColors.primary : Colors.primary} />
                    <Text className="text-sm text-gray-600 dark:text-gray-300 ml-1">
                      Cooked {cookCount} time{cookCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {lastCooked && (
                  <View className="flex-row items-center">
                    <Icon name={Icons.TIME_OUTLINE} size={IconSizes.SM} color="#9CA3AF" />
                    <Text className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                      {formatTimeAgo(lastCooked)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Session notes (optional) */}
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session notes (optional)
            </Text>
            <TextInput
              value={sessionNotes}
              onChangeText={setSessionNotes}
              placeholder="How did it turn out? Any adjustments?"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="text-base text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4"
              style={{ minHeight: 80 }}
            />

            {/* Confirm button */}
            <HapticTouchableOpacity
              onPress={handleConfirm}
              className="py-3 rounded-lg items-center flex-row justify-center"
              style={{ backgroundColor: isDark ? DarkColors.primary : Colors.primary }}
            >
              <Text className="text-base font-semibold text-white mr-2">Mark as Cooked</Text>
              <Text style={{ fontSize: 18 }}>🍳</Text>
            </HapticTouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
