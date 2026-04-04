// frontend/components/recipe/FiberTooltip.tsx
// One-time educational tooltip explaining why we promote fiber as a core macro.
// Fires on first recipe detail view. Dismiss = never show again.

import { View, Text, Modal, Pressable, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import ModalBackdrop from '../ui/ModalBackdrop';
import { Colors, DarkColors } from '../../constants/Colors';

const STORAGE_KEY = 'sazon:fiber_tooltip_seen';

export default function FiberTooltip() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [visible, setVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 15 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const dismiss = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
      <ModalBackdrop visible={visible} onPress={dismiss} />
      <View pointerEvents="box-none" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            marginHorizontal: 32,
            maxWidth: 340,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 12,
          }}
        >
          <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>
            {'\u{1F33E}'}
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
            Fiber is a core macro
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-300 text-center leading-5 mb-5">
            We show fiber alongside protein, carbs, and fat because getting enough daily fiber is one
            of the highest-impact things you can do for long-term gut health.
          </Text>
          <HapticTouchableOpacity
            onPress={dismiss}
            style={{
              backgroundColor: isDark ? DarkColors.primary : Colors.primary,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text className="text-white font-semibold">Got it</Text>
          </HapticTouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
