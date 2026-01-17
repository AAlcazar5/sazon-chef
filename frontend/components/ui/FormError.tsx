// FormError - Standardized error message component for Sazon Chef
// Provides consistent error styling for form validation

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { FontSize } from '../../constants/Typography';
import { Spacing } from '../../constants/Spacing';

interface FormErrorProps {
  /** Error message to display */
  message?: string | null;
  /** Whether to show icon (default: true) */
  showIcon?: boolean;
  /** Icon name override */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Container style override */
  style?: ViewStyle;
  /** Whether to center the error (default: false) */
  centered?: boolean;
}

/**
 * FormError - Inline error message component
 *
 * Usage:
 * ```tsx
 * <FormError message={errors.email} />
 * <FormError message="Invalid password" showIcon={false} />
 * <FormError message="Form submission failed" centered />
 * ```
 */
export default function FormError({
  message,
  showIcon = true,
  icon = 'alert-circle',
  style,
  centered = false,
}: FormErrorProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Don't render if no message
  if (!message) return null;

  return (
    <View
      style={[
        styles.container,
        centered && styles.centered,
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {showIcon && (
        <Ionicons
          name={icon}
          size={14}
          color={Colors.error}
          style={styles.icon}
        />
      )}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

/**
 * FormFieldError - Compact version for use directly below form fields
 * Smaller spacing designed to sit tight against input fields
 */
export function FormFieldError({
  message,
  showIcon = true,
  style,
}: Pick<FormErrorProps, 'message' | 'showIcon' | 'style'>) {
  if (!message) return null;

  return (
    <View
      style={[styles.fieldContainer, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {showIcon && (
        <Ionicons
          name="alert-circle"
          size={12}
          color={Colors.error}
          style={styles.fieldIcon}
        />
      )}
      <Text style={styles.fieldMessage}>{message}</Text>
    </View>
  );
}

/**
 * FormSummaryError - For displaying multiple errors or form-level errors
 * Usually shown at the top or bottom of a form
 */
export function FormSummaryError({
  title = 'Please fix the following errors:',
  errors,
  style,
}: {
  title?: string;
  errors: string[];
  style?: ViewStyle;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!errors || errors.length === 0) return null;

  return (
    <View
      style={[
        styles.summaryContainer,
        {
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          borderColor: Colors.error,
        },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.summaryHeader}>
        <Ionicons name="warning" size={18} color={Colors.error} />
        <Text style={styles.summaryTitle}>{title}</Text>
      </View>
      <View style={styles.summaryList}>
        {errors.map((error, index) => (
          <View key={index} style={styles.summaryItem}>
            <Text style={styles.summaryBullet}>•</Text>
            <Text style={styles.summaryItemText}>{error}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Standard inline error
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  centered: {
    justifyContent: 'center',
  },
  icon: {
    marginRight: Spacing.xs,
  },
  message: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.error,
    flexShrink: 1,
  },

  // Compact field error
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  fieldIcon: {
    marginRight: 4,
  },
  fieldMessage: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: Colors.error,
    flexShrink: 1,
  },

  // Summary error box
  summaryContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.error,
    marginLeft: Spacing.sm,
  },
  summaryList: {
    marginLeft: Spacing.xl,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  summaryBullet: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginRight: Spacing.xs,
    lineHeight: 20,
  },
  summaryItemText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    flex: 1,
    lineHeight: 20,
  },
});
