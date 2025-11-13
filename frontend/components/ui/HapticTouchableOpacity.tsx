// frontend/components/ui/HapticTouchableOpacity.tsx
// TouchableOpacity component with automatic haptic feedback

import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import * as Haptics from 'expo-haptics';

type HapticStyle = 'light' | 'medium' | 'heavy';

interface HapticTouchableOpacityProps extends TouchableOpacityProps {
  hapticStyle?: HapticStyle;
  hapticDisabled?: boolean; // Option to disable haptic for specific buttons
}

/**
 * TouchableOpacity component that automatically provides haptic feedback on press
 * 
 * @example
 * <HapticTouchableOpacity onPress={handlePress}>
 *   <Text>Press Me</Text>
 * </HapticTouchableOpacity>
 * 
 * <HapticTouchableOpacity onPress={handlePress} hapticStyle="medium">
 *   <Text>Stronger Feedback</Text>
 * </HapticTouchableOpacity>
 */
export default function HapticTouchableOpacity({
  onPress,
  hapticStyle = 'light',
  hapticDisabled = false,
  disabled,
  ...props
}: HapticTouchableOpacityProps) {
  const handlePress = (event: any) => {
    // Provide haptic feedback if not disabled
    if (!disabled && !hapticDisabled && onPress) {
      const styleMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      
      Haptics.impactAsync(styleMap[hapticStyle]);
    }
    
    // Call original onPress handler
    if (onPress) {
      onPress(event);
    }
  };

  return (
    <TouchableOpacity
      {...props}
      onPress={handlePress}
      disabled={disabled}
    />
  );
}

