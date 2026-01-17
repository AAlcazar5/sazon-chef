// frontend/components/ui/HapticTouchableOpacity.tsx
// TouchableOpacity component with automatic haptic feedback and scale animation

import { useRef } from 'react';
import { TouchableOpacity, TouchableOpacityProps, Animated } from 'react-native';
import { ImpactStyle, HapticPatterns } from '../../constants/Haptics';
import { Duration, Spring } from '../../constants/Animations';

// Create AnimatedTouchable once outside component to avoid re-creation on each render
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

/**
 * TouchableOpacity component that automatically provides haptic feedback on press.
 * Uses standardized haptic patterns from the design system.
 * Includes subtle scale animation on press for visual feedback.
 *
 * @example
 * // Default light haptic with scale animation
 * <HapticTouchableOpacity onPress={handlePress}>
 *   <Text>Press Me</Text>
 * </HapticTouchableOpacity>
 *
 * @example
 * // Medium haptic for primary actions
 * <HapticTouchableOpacity onPress={handlePress} hapticStyle="medium">
 *   <Text>Important Action</Text>
 * </HapticTouchableOpacity>
 *
 * @example
 * // Heavy haptic for destructive actions
 * <HapticTouchableOpacity onPress={handleDelete} hapticStyle="heavy">
 *   <Text>Delete</Text>
 * </HapticTouchableOpacity>
 *
 * @example
 * // Disable scale animation
 * <HapticTouchableOpacity onPress={handlePress} scaleOnPress={false}>
 *   <Text>No Scale</Text>
 * </HapticTouchableOpacity>
 */
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
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (scaleOnPress && !disabled) {
      Animated.spring(scaleValue, {
        toValue: pressedScale,
        useNativeDriver: true,
        ...Spring.stiff,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (scaleOnPress && !disabled) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        ...Spring.gentle,
      }).start();
    }
  };

  const handlePress = (event: any) => {
    // Provide haptic feedback if not disabled
    if (!disabled && !hapticDisabled && onPress) {
      // Use standardized haptic patterns based on style
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

    // Call original onPress handler
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <AnimatedTouchable
      {...props}
      style={[style, scaleOnPress ? { transform: [{ scale: scaleValue }] } : undefined]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: disabled }}
      activeOpacity={0.7}
    />
  );
}

