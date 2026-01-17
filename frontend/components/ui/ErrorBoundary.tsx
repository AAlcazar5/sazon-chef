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

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
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
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error('🚨 ErrorBoundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Log error details for monitoring
    this.logError(error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Provide haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    // In production, you would send this to an error monitoring service
    // For now, we'll store it locally and log it
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    // Store error for potential reporting
    try {
      // Could store in AsyncStorage for error reporting
      // await AsyncStorage.setItem('last_error', JSON.stringify(errorData));
    } catch (storageError) {
      console.error('Failed to store error:', storageError);
    }

    // In production, send to error monitoring service (e.g., Sentry, Bugsnag)
    // Example: Sentry.captureException(error, { extra: errorInfo });
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

      // Default error UI
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// Error Fallback Component - Now uses ScreenError for consistency
interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const errorMessage = error?.message || '';

  // Determine error type based on error message
  const getErrorType = (): ErrorType => {
    if (errorMessage.includes('network') ||
        errorMessage.includes('Network') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')) {
      return 'network';
    }
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return 'unauthorized';
    }
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return 'notFound';
    }
    if (errorMessage.includes('500') || errorMessage.includes('server')) {
      return 'server';
    }
    return 'generic';
  };

  return (
    <ScreenError
      type={getErrorType()}
      title="Oops! Something went wrong"
      message="We encountered an unexpected error. Don't worry, your data is safe."
      onRetry={onReset}
      retryLabel="Try Again"
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

