// frontend/components/ui/KeyboardAvoidingContainer.tsx
// Reusable KeyboardAvoidingView component that handles cross-platform keyboard behavior

import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ViewStyle } from 'react-native';

interface KeyboardAvoidingContainerProps {
  /** Child components to render inside the container */
  children: ReactNode;
  /** Additional className for styling with NativeWind */
  className?: string;
  /** Additional inline styles */
  style?: ViewStyle;
  /** Custom keyboard vertical offset (default: iOS = 0, Android = 20) */
  keyboardVerticalOffset?: number;
  /** Custom behavior (default: iOS = 'padding', Android = 'height') */
  behavior?: 'padding' | 'height' | 'position';
  /** Whether to enable the keyboard avoiding behavior (default: true) */
  enabled?: boolean;
}

/**
 * Cross-platform KeyboardAvoidingView component that handles keyboard behavior consistently.
 * Automatically applies the correct behavior and offset based on the platform.
 *
 * This component centralizes the keyboard avoiding logic that was duplicated across multiple screens.
 *
 * @example
 * // Basic usage with default settings
 * <KeyboardAvoidingContainer className="flex-1">
 *   <ScrollView>
 *     <TextInput placeholder="Email" />
 *     <TextInput placeholder="Password" />
 *   </ScrollView>
 * </KeyboardAvoidingContainer>
 *
 * @example
 * // Custom offset for screens with navigation headers
 * <KeyboardAvoidingContainer
 *   className="flex-1"
 *   keyboardVerticalOffset={100}
 * >
 *   <ScrollView>
 *     <TextInput placeholder="Name" />
 *   </ScrollView>
 * </KeyboardAvoidingContainer>
 *
 * @example
 * // Disable keyboard avoiding on specific screens
 * <KeyboardAvoidingContainer enabled={false}>
 *   <ScrollView>
 *     <Text>Content without keyboard avoiding</Text>
 *   </ScrollView>
 * </KeyboardAvoidingContainer>
 */
export default function KeyboardAvoidingContainer({
  children,
  className = 'flex-1',
  style,
  keyboardVerticalOffset,
  behavior,
  enabled = true,
}: KeyboardAvoidingContainerProps) {
  // Default platform-specific settings
  const defaultBehavior = behavior ?? (Platform.OS === 'ios' ? 'padding' : 'height');
  const defaultOffset = keyboardVerticalOffset ?? (Platform.OS === 'ios' ? 0 : 20);

  return (
    <KeyboardAvoidingView
      className={className}
      style={style}
      behavior={defaultBehavior}
      keyboardVerticalOffset={defaultOffset}
      enabled={enabled}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
