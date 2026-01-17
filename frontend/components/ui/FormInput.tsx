// FormInput - Standardized form input component for Sazon Chef
// Provides consistent styling, validation states, and accessibility

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Typography, FontSize } from '../../constants/Typography';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { Duration } from '../../constants/Animations';
import { inputAccessibility } from '../../utils/accessibility';
import HapticTouchableOpacity from './HapticTouchableOpacity';

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  /** Label text displayed above the input */
  label?: string;
  /** Hint text displayed below the input */
  hint?: string;
  /** Error message to display (shows error state when present) */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether to show character count */
  showCharCount?: boolean;
  /** Maximum character count (for showCharCount) */
  maxCharCount?: number;
  /** Left icon name */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Right icon name */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  /** Right icon press handler */
  onRightIconPress?: () => void;
  /** Container style override */
  containerStyle?: ViewStyle;
  /** Input style override */
  inputStyle?: TextStyle;
  /** Whether the input is disabled */
  disabled?: boolean;
}

export default function FormInput({
  label,
  hint,
  error,
  required = false,
  showCharCount = false,
  maxCharCount,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  disabled = false,
  value,
  onFocus,
  onBlur,
  ...textInputProps
}: FormInputProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useRef(new Animated.Value(0)).current;
  const underlineWidth = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  const hasError = Boolean(error);
  const currentLength = (value as string)?.length || 0;

  // Colors based on state
  const colors = {
    border: hasError
      ? Colors.error
      : isFocused
        ? (isDark ? DarkColors.primary : Colors.primary)
        : (isDark ? DarkColors.border.light : Colors.border.light),
    background: disabled
      ? (isDark ? '#1a1a2e' : '#F3F4F6')
      : (isDark ? '#1F2937' : '#FFFFFF'),
    backgroundFocused: isDark ? '#262f3d' : '#FFF7ED', // Subtle orange tint on focus
    text: disabled
      ? (isDark ? DarkColors.text.tertiary : Colors.text.tertiary)
      : (isDark ? DarkColors.text.primary : Colors.text.primary),
    placeholder: isDark ? DarkColors.text.tertiary : Colors.text.tertiary,
    label: isDark ? DarkColors.text.primary : Colors.text.primary,
    hint: isDark ? DarkColors.text.secondary : Colors.text.secondary,
    error: Colors.error,
    icon: isFocused
      ? (isDark ? DarkColors.primary : Colors.primary)
      : (isDark ? DarkColors.text.tertiary : Colors.text.tertiary),
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);

    // Animate border, underline, and background
    Animated.parallel([
      Animated.timing(borderColor, {
        toValue: 1,
        duration: Duration.fast,
        useNativeDriver: false,
      }),
      Animated.timing(underlineWidth, {
        toValue: 1,
        duration: Duration.normal,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: Duration.fast,
        useNativeDriver: false,
      }),
    ]).start();

    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);

    // Animate border, underline, and background back
    Animated.parallel([
      Animated.timing(borderColor, {
        toValue: 0,
        duration: Duration.fast,
        useNativeDriver: false,
      }),
      Animated.timing(underlineWidth, {
        toValue: 0,
        duration: Duration.fast,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: Duration.fast,
        useNativeDriver: false,
      }),
    ]).start();

    onBlur?.(e);
  };

  const animatedBorderColor = borderColor.interpolate({
    inputRange: [0, 1],
    outputRange: [
      hasError ? Colors.error : (isDark ? DarkColors.border.light : Colors.border.light),
      hasError ? Colors.error : (isDark ? DarkColors.primary : Colors.primary),
    ],
  });

  const animatedBackgroundColor = backgroundOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background, colors.backgroundFocused],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.label }]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      {/* Input Container */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: animatedBorderColor,
            backgroundColor: disabled ? colors.background : animatedBackgroundColor,
          },
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={hasError ? colors.error : colors.icon}
            style={styles.leftIcon}
          />
        )}

        {/* Text Input */}
        <TextInput
          value={value}
          editable={!disabled}
          placeholderTextColor={colors.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            { color: colors.text },
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            inputStyle,
          ]}
          {...inputAccessibility(label || textInputProps.placeholder || '', {
            hint,
            error,
            required,
            value: value as string,
          })}
          {...textInputProps}
        />

        {/* Right Icon */}
        {rightIcon && (
          <HapticTouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIcon}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={hasError ? colors.error : colors.icon}
            />
          </HapticTouchableOpacity>
        )}

        {/* Animated Underline (on focus) */}
        <Animated.View
          style={[
            styles.underline,
            {
              backgroundColor: hasError ? colors.error : (isDark ? DarkColors.primary : Colors.primary),
              transform: [{
                scaleX: underlineWidth,
              }],
            },
          ]}
        />
      </Animated.View>

      {/* Bottom Row (Error/Hint and Character Count) */}
      <View style={styles.bottomRow}>
        {/* Error or Hint */}
        <View style={styles.messageContainer}>
          {hasError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            </View>
          ) : hint ? (
            <Text style={[styles.hint, { color: colors.hint }]}>{hint}</Text>
          ) : null}
        </View>

        {/* Character Count */}
        {showCharCount && maxCharCount && (
          <Text
            style={[
              styles.charCount,
              {
                color: currentLength > maxCharCount
                  ? colors.error
                  : colors.hint,
              },
            ]}
          >
            {currentLength}/{maxCharCount}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  required: {
    color: Colors.error,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.xs,
  },
  leftIcon: {
    marginLeft: Spacing.md,
  },
  rightIcon: {
    padding: Spacing.md,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
    minHeight: 18,
  },
  messageContainer: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  error: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  hint: {
    fontSize: FontSize.sm,
  },
  charCount: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
  },
});

// Also export a FormSelect component placeholder for future implementation
export interface FormSelectProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  options: Array<{ label: string; value: string }>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Note: FormSelect will be implemented as a separate component
// when needed, using a modal picker or dropdown
