import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HapticTouchableOpacity from './HapticTouchableOpacity';
import ScreenError, { ErrorType } from './ScreenError';
import Icon from './Icon';
import { Icons, IconSizes } from '../../constants/Icons';
import { Colors, DarkColors } from '../../constants/Colors';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import {
  logError,
  ErrorCategory,
  ErrorSeverity,
  categorizeError,
  getUserFriendlyMessage,
  getRecoveryAction,
} from '../../utils/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Screen name for error context */
  screen?: string;
  /** User ID for error context */
  userId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCategory?: ErrorCategory;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    const category = categorizeError(error);
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCategory: category,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with full context using centralized error logger
    const category = categorizeError(error);
    logError(error, {
      userId: this.props.userId,
      screen: this.props.screen,
      action: 'Component Render',
      componentStack: errorInfo.componentStack,
      metadata: {
        errorName: error.name,
        errorStack: error.stack,
      },
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
      errorCategory: category,
    });

    // Provide haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }


  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with category
      return (
        <ErrorFallback
          error={this.state.error}
          errorCategory={this.state.errorCategory}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// Error Fallback Component - Now uses ScreenError with enhanced categorization
interface ErrorFallbackProps {
  error: Error | null;
  errorCategory?: ErrorCategory;
  onReset: () => void;
}

function ErrorFallback({ error, errorCategory, onReset }: ErrorFallbackProps) {
  // Map error category to ScreenError type
  const getErrorType = (): ErrorType => {
    if (!errorCategory) return 'generic';

    switch (errorCategory) {
      case ErrorCategory.NETWORK:
        return 'network';
      case ErrorCategory.AUTH:
        return 'unauthorized';
      case ErrorCategory.API:
        return 'server';
      default:
        return 'generic';
    }
  };

  // Get user-friendly message
  const message = error ? getUserFriendlyMessage(error, errorCategory) : 'An unexpected error occurred.';
  const recoveryAction = error ? getRecoveryAction(error, errorCategory) : 'Try Again';

  return (
    <ScreenError
      type={getErrorType()}
      title="Oops! Something went wrong"
      message={message}
      onRetry={onReset}
      retryLabel={recoveryAction}
      showMascot={true}
      errorDetails={__DEV__ ? error?.stack || error?.message : undefined}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  errorDetails: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
    maxHeight: 300,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  stackTrace: {
    maxHeight: 150,
  },
  stackText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

// Export as functional component wrapper for hooks support
export default function ErrorBoundary(props: Props) {
  return <ErrorBoundaryClass {...props} />;
}

