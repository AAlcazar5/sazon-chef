// frontend/components/home/DislikeReasonSheet.tsx
// Bottom sheet shown after a user hides/dislikes a recipe — captures the reason.
// Reason feeds into behavioral scoring to suppress similar recipes.

import { View, Text, Modal, Pressable, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { useColorScheme } from 'nativewind';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { HapticPatterns } from '../../constants/Haptics';

export type DislikeReason = 'not_my_style' | 'too_complex' | 'missing_ingredients' | 'already_tried';

interface DislikeReasonOption {
  reason: DislikeReason;
  label: string;
  description: string;
  icon: string;
}

const OPTIONS: DislikeReasonOption[] = [
  {
    reason: 'not_my_style',
    label: 'Not my style',
    description: "Cuisine or flavors don't match my taste",
    icon: Icons.CLOSE_CIRCLE_OUTLINE,
  },
  {
    reason: 'too_complex',
    label: 'Too complex',
    description: 'Too many steps or advanced techniques',
    icon: Icons.TIMER_OUTLINE,
  },
  {
    reason: 'missing_ingredients',
    label: 'Missing ingredients',
    description: "I don't have the key ingredients",
    icon: Icons.CART_OUTLINE,
  },
  {
    reason: 'already_tried',
    label: 'Already tried it',
    description: "I've made this before",
    icon: Icons.CHECKMARK_CIRCLE_OUTLINE,
  },
];

interface DislikeReasonSheetProps {
  visible: boolean;
  recipeName?: string;
  onSelectReason: (reason: DislikeReason) => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export default function DislikeReasonSheet({
  visible,
  recipeName,
  onSelectReason,
  onSkip,
  onDismiss,
}: DislikeReasonSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleSelectReason = (reason: DislikeReason) => {
    HapticPatterns.buttonPress();
    onSelectReason(reason);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      {/* Backdrop */}
      <Animated.View
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropAnim }}
      >
        <Pressable style={{ flex: 1 }} onPress={onDismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          transform: [{ translateY: slideAnim }],
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: 34,
        }}
      >
        {/* Handle */}
        <View className="items-center pt-3 pb-1">
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
            }}
          />
        </View>

        {/* Header */}
        <View className="px-5 pt-4 pb-3">
          <Text
            className="text-lg font-bold text-gray-900 dark:text-gray-100"
            numberOfLines={1}
          >
            Why hide{recipeName ? ` "${recipeName}"` : ' this recipe'}?
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your feedback helps us find better matches.
          </Text>
        </View>

        {/* Options */}
        <View className="px-4">
          {OPTIONS.map((opt, idx) => (
            <HapticTouchableOpacity
              key={opt.reason}
              onPress={() => handleSelectReason(opt.reason)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 14,
                marginBottom: idx < OPTIONS.length - 1 ? 8 : 0,
                backgroundColor: isDark ? DarkColors.cardRaised : Colors.surface,
              }}
              accessibilityLabel={opt.label}
              accessibilityHint={opt.description}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#4B5563' : '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14,
                }}
              >
                <Icon
                  name={opt.icon as any}
                  size={IconSizes.MD}
                  color={isDark ? DarkColors.primary : Colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {opt.label}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {opt.description}
                </Text>
              </View>
              <Icon
                name={Icons.CHEVRON_FORWARD as any}
                size={16}
                color={isDark ? '#4B5563' : '#D1D5DB'}
              />
            </HapticTouchableOpacity>
          ))}
        </View>

        {/* Skip */}
        <HapticTouchableOpacity onPress={onSkip} className="items-center mt-4 py-2">
          <Text
            className="text-sm font-medium"
            style={{ color: isDark ? DarkColors.text.secondary : Colors.text.secondary }}
          >
            Skip — just hide it
          </Text>
        </HapticTouchableOpacity>
      </Animated.View>
    </Modal>
  );
}
