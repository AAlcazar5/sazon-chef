// frontend/hooks/useHapticPress.ts
// Custom hook for adding haptic feedback to TouchableOpacity onPress handlers

import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

type HapticStyle = 'light' | 'medium' | 'heavy';

interface UseHapticPressOptions {
  hapticStyle?: HapticStyle;
  disabled?: boolean;
}

/**
 * Custom hook that wraps an onPress handler with haptic feedback
 * 
 * @param onPress - The original onPress handler
 * @param options - Options for haptic feedback
 * @returns A new onPress handler with haptic feedback
 * 
 * @example
 * const handlePress = useHapticPress(() => {
 *   console.log('Button pressed');
 * });
 * 
 * <TouchableOpacity onPress={handlePress}>
 *   <Text>Press Me</Text>
 * </TouchableOpacity>
 */
export function useHapticPress(
  onPress: () => void,
  options: UseHapticPressOptions = {}
): () => void {
  const { hapticStyle = 'light', disabled = false } = options;

  return useCallback(async () => {
    if (!disabled) {
      const styleMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };

      try {
        await Haptics.impactAsync(styleMap[hapticStyle]);
      } catch (error) {
        // Silently fail - haptics may not be available on all devices or simulators
        if (__DEV__) {
          console.debug('Haptic feedback not available:', error);
        }
      }
    }
    onPress();
  }, [onPress, hapticStyle, disabled]);
}

/**
 * Helper function to add haptic feedback to an onPress handler
 * Useful for inline handlers where hooks can't be used
 * 
 * @param onPress - The original onPress handler
 * @param hapticStyle - The haptic feedback style (default: 'light')
 * @returns A new onPress handler with haptic feedback
 * 
 * @example
 * <TouchableOpacity onPress={withHaptic(() => doSomething())}>
 *   <Text>Press Me</Text>
 * </TouchableOpacity>
 */
export function withHaptic(
  onPress: () => void,
  hapticStyle: HapticStyle = 'light'
): () => void {
  return async () => {
    const styleMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };

    try {
      await Haptics.impactAsync(styleMap[hapticStyle]);
    } catch (error) {
      // Silently fail - haptics may not be available on all devices or simulators
      if (__DEV__) {
        console.debug('Haptic feedback not available:', error);
      }
    }
    onPress();
  };
}

