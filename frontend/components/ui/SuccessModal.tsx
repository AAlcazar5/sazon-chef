import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, StyleSheet, useColorScheme, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SuccessState from './SuccessState';
import { SazonExpression } from '../mascot/SazonMascot';
import { Colors, DarkColors, Gradients } from '../../constants/Colors';
import { Duration, Spring } from '../../constants/Animations';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message?: string;
  expression?: SazonExpression;
  onDismiss: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function SuccessModal({
  visible,
  title,
  message,
  expression = 'chef-kiss',
  onDismiss,
  actionLabel,
  onAction,
}: SuccessModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation values for combined fade + scale effect
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.9)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset values
      overlayOpacity.setValue(0);
      contentScale.setValue(0.9);
      contentOpacity.setValue(0);

      // Animate in: overlay fades, content scales up and fades in
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: Duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          ...Spring.bouncy,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: Duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const animateOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 0.9,
        duration: Duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: Duration.fast,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const handleDismiss = () => {
    animateOut(() => onDismiss());
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    animateOut(() => onDismiss());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      accessibilityViewIsModal={true}
    >
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
        accessibilityRole="alert"
        accessibilityLabel={`Success: ${title}. ${message || ''}`}
      >
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: contentOpacity,
              transform: [{ scale: contentScale }],
            },
          ]}
        >
          <SafeAreaView style={[styles.container, { backgroundColor: isDark ? DarkColors.background : Colors.background }]}>
            <SuccessState
              title={title}
              message={message}
              expression={expression}
              size="large"
              variant="orange"
              fullScreen
              actionLabel={actionLabel}
              onAction={handleAction}
              autoDismiss={!actionLabel}
              onDismiss={handleDismiss}
              dismissDelay={2500}
            />
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});

