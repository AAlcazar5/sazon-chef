// frontend/components/ui/HapticTouchableOpacity.tsx
// TouchableOpacity with haptic feedback and Reanimated spring press scale

import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ImpactStyle, HapticPatterns } from '../../constants/Haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type HapticStyle = 'light' | 'medium' | 'heavy';

interface HapticTouchableOpacityProps extends TouchableOpacityProps {
  /** Haptic feedback intensity: light (default), medium, or heavy */
  hapticStyle?: HapticStyle;
  /** Disable haptic feedback for this button */
  hapticDisabled?: boolean;
  /** Enable scale animation on press (default: true) */
  scaleOnPress?: boolean;
  /** Scale factor when pressed (default: 0.97) */
  pressedScale?: number;
}

export default function HapticTouchableOpacity({
  onPress,
  hapticStyle = 'light',
  hapticDisabled = false,
  scaleOnPress = true,
  pressedScale = 0.97,
  disabled,
  accessibilityRole = 'button',
  style,
  ...props
}: HapticTouchableOpacityProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (scaleOnPress && !disabled) {
      scale.value = withSpring(pressedScale, { damping: 20, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (scaleOnPress && !disabled) {
      scale.value = withSpring(1, { damping: 14, stiffness: 300 });
    }
  };

  const handlePress = (event: any) => {
    if (!disabled && !hapticDisabled && onPress) {
      switch (hapticStyle) {
        case 'heavy':
          HapticPatterns.buttonPressDestructive();
          break;
        case 'medium':
          HapticPatterns.buttonPressPrimary();
          break;
        case 'light':
        default:
          HapticPatterns.buttonPress();
          break;
      }
    }
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <AnimatedTouchable
      {...props}
      style={[style, scaleOnPress ? animatedStyle : undefined]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled }}
      activeOpacity={1}
    />
  );
}
