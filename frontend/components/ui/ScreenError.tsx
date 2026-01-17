// ScreenError - Full-screen error component for Sazon Chef
// Provides consistent error display with retry functionality

import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { Typography, FontSize } from '../../constants/Typography';
import { Spacing, BorderRadius } from '../../constants/Spacing';
import { alertAccessibility } from '../../utils/accessibility';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import LogoMascot from '../mascot/LogoMascot';
import { HapticPatterns } from '../../constants/Haptics';

export type ErrorType = 'network' | 'server' | 'notFound' | 'unauthorized' | 'generic' | 'offline';

interface ScreenErrorProps {
  /** Type of error to display */
  type?: ErrorType;
  /** Custom title (overrides type-based title) */
  title?: string;
  /** Custom message (overrides type-based message) */
  message?: string;
  /** Retry button handler */
  onRetry?: () => void;
  /** Retry button label */
  retryLabel?: string;
  /** Secondary action handler (e.g., go back, go home) */
  onSecondaryAction?: () => void;
  /** Secondary action label */
  secondaryActionLabel?: string;
  /** Show mascot instead of icon */
  showMascot?: boolean;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Technical error details (for debugging) */
  errorDetails?: string;
  /** Whether to show full screen with SafeAreaView */
  fullScreen?: boolean;
}

/**
 * Error configurations based on error type
 */
const errorConfigs: Record<ErrorType, { title: string; message: string; icon: keyof typeof Ionicons.glyphMap }> = {
  network: {
    title: 'Connection Error',
    message: 'Please check your internet connection and try again.',
    icon: 'wifi-outline',
  },
  server: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    icon: 'server-outline',
  },
  notFound: {
    title: 'Not Found',
    message: 'The content you\'re looking for doesn\'t exist or has been removed.',
    icon: 'search-outline',
  },
  unauthorized: {
    title: 'Access Denied',
    message: 'You don\'t have permission to view this content. Please log in again.',
    icon: 'lock-closed-outline',
  },
  offline: {
    title: 'You\'re Offline',
    message: 'Connect to the internet to access this feature.',
    icon: 'cloud-offline-outline',
  },
  generic: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    icon: 'warning-outline',
  },
};

export default function ScreenError({
  type = 'generic',
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  onSecondaryAction,
  secondaryActionLabel,
  showMascot = true,
  isRetrying = false,
  errorDetails,
  fullScreen = true,
}: ScreenErrorProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const config = errorConfigs[type];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  const colors = {
    background: isDark ? DarkColors.background : Colors.background,
    text: isDark ? DarkColors.text.primary : Colors.text.primary,
    textSecondary: isDark ? DarkColors.text.secondary : Colors.text.secondary,
    textTertiary: isDark ? DarkColors.text.tertiary : Colors.text.tertiary,
    primary: isDark ? DarkColors.primary : Colors.primary,
    error: Colors.error,
    surface: isDark ? DarkColors.surface : Colors.surface,
  };

  const handleRetry = () => {
    HapticPatterns.buttonPressPrimary();
    onRetry?.();
  };

  const handleSecondaryAction = () => {
    HapticPatterns.buttonPress();
    onSecondaryAction?.();
  };

  const content = (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Icon or Mascot */}
        <View style={styles.iconContainer}>
          {showMascot ? (
            <LogoMascot expression="supportive" size="large" />
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: `${colors.error}15` }]}>
              <Ionicons name={config.icon} size={48} color={colors.error} />
            </View>
          )}
        </View>

        {/* Title */}
        <Text
          style={[styles.title, { color: colors.text }]}
          {...alertAccessibility(displayTitle, 'error')}
        >
          {displayTitle}
        </Text>

        {/* Message */}
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {displayMessage}
        </Text>

        {/* Error Details (Debug) */}
        {__DEV__ && errorDetails && (
          <View style={[styles.errorDetails, { backgroundColor: colors.surface }]}>
            <Text style={[styles.errorDetailsText, { color: colors.textTertiary }]}>
              {errorDetails}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {onRetry && (
            <HapticTouchableOpacity
              onPress={handleRetry}
              disabled={isRetrying}
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: isRetrying ? 0.7 : 1 },
              ]}
            >
              {isRetrying ? (
                <View style={styles.buttonContent}>
                  <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.spinningIcon} />
                  <Text style={styles.primaryButtonText}>Retrying...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>{retryLabel}</Text>
                </View>
              )}
            </HapticTouchableOpacity>
          )}

          {onSecondaryAction && secondaryActionLabel && (
            <HapticTouchableOpacity
              onPress={handleSecondaryAction}
              style={styles.secondaryButton}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                {secondaryActionLabel}
              </Text>
            </HapticTouchableOpacity>
          )}
        </View>
      </View>

      {/* Footer hint */}
      {type === 'network' || type === 'offline' ? (
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Check your Wi-Fi or mobile data settings
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {content}
      </SafeAreaView>
    );
  }

  return content;
}

/**
 * Inline Error - Smaller error component for inline use
 */
export function InlineError({
  message,
  onRetry,
  retryLabel = 'Retry',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.inlineContainer, { backgroundColor: `${Colors.error}10` }]}>
      <Ionicons name="alert-circle" size={20} color={Colors.error} />
      <Text style={[styles.inlineMessage, { color: isDark ? DarkColors.text.primary : Colors.text.primary }]}>
        {message}
      </Text>
      {onRetry && (
        <HapticTouchableOpacity onPress={onRetry}>
          <Text style={[styles.inlineRetry, { color: Colors.error }]}>{retryLabel}</Text>
        </HapticTouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: FontSize.md * 1.5,
    marginBottom: Spacing.xl,
  },
  errorDetails: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  errorDetailsText: {
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
  },
  primaryButton: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  spinningIcon: {
    // Note: Add spinning animation if needed
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSize.sm,
  },

  // Inline Error
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  inlineMessage: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  inlineRetry: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
