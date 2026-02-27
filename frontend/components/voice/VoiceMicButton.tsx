// frontend/components/voice/VoiceMicButton.tsx
// Reusable mic button with pulsing animation when listening.

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import HapticTouchableOpacity from '../ui/HapticTouchableOpacity';
import Icon from '../ui/Icon';
import { Icons } from '../../constants/Icons';
import { Colors } from '../../constants/Colors';

interface VoiceMicButtonProps {
  isListening: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const SIZES = {
  small: { button: 36, icon: 18, ring: 48 },
  medium: { button: 44, icon: 22, ring: 58 },
  large: { button: 56, icon: 28, ring: 72 },
};

export default function VoiceMicButton({
  isListening,
  onPress,
  onLongPress,
  size = 'medium',
  disabled = false,
}: VoiceMicButtonProps) {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const dims = SIZES[size];

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withTiming(1.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isListening]);

  const pulseRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: dims.ring, height: dims.ring }]}>
      <Animated.View
        style={[
          styles.pulseRing,
          { width: dims.ring, height: dims.ring, borderRadius: dims.ring / 2 },
          pulseRingStyle,
        ]}
      />
      <HapticTouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        style={[
          styles.button,
          {
            width: dims.button,
            height: dims.button,
            borderRadius: dims.button / 2,
            backgroundColor: isListening ? Colors.secondaryRed : '#F3F4F6',
          },
        ]}
      >
        <Icon
          name={isListening ? Icons.MIC : Icons.MIC_OUTLINE}
          size={dims.icon}
          color={isListening ? 'white' : Colors.secondary}
        />
      </HapticTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: Colors.secondaryRed,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
