import React from 'react';
import { Text, StyleSheet, ViewProps, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { EditorialFontFamily } from '../../constants/Typography';
import { EditorialShadows } from '../../constants/Shadows';
import { triggerHaptic, ImpactStyle } from '../../constants/Haptics';

interface BlackPillCTAProps extends ViewProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}

export function BlackPillCTA({ label, icon, onPress, disabled, testID, ...props }: BlackPillCTAProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled) return;
    triggerHaptic('impact', ImpactStyle.medium);
    onPress();
  };

  const shadowStyle = Platform.select({
    ios: EditorialShadows.blackCTA.ios,
    android: EditorialShadows.blackCTA.android,
    default: {},
  });

  return (
    <Animated.View
      testID={testID}
      style={[styles.container, shadowStyle, animatedStyle, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      {...props}
    >
      <Animated.View style={styles.pressable}>
        <Text
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.inner}
          suppressHighlighting
        >
          {icon && (
            <Ionicons name={icon} size={18} color="#FFFFFF" style={styles.icon} />
          )}
          <Text style={styles.label}>{label}</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    height: 52,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontFamily: EditorialFontFamily.body.extrabold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
