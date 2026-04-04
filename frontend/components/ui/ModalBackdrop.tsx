// frontend/components/ui/ModalBackdrop.tsx
// 9-Blind Spots: Reusable modal backdrop with 200ms fade-in (not instant).
// Uses Backdrop tokens from Colors.ts — light (standard) or heavy (celebrations/paywall).

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Backdrop } from '../../constants/Colors';

interface ModalBackdropProps {
  visible: boolean;
  onPress?: () => void;
  variant?: 'light' | 'heavy';
  children?: React.ReactNode;
}

export default function ModalBackdrop({
  visible,
  onPress,
  variant = 'light',
  children,
}: ModalBackdropProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: Backdrop[variant], opacity },
      ]}
    >
      {onPress && <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />}
      {children}
    </Animated.View>
  );
}
