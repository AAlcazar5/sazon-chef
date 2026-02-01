// frontend/utils/errorLogger.ts
// Centralized error logging service with structured logging and severity levels

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Error severity levels for categorization
 */
export enum ErrorSeverity {
  /** Low severity - minor issues, non-critical */
  LOW = 'low',
  /** Medium severity - impacts functionality but has workarounds */
  MEDIUM = 'medium',
  /** High severity - major functionality broken */
  HIGH = 'high',
  /** Critical severity - app crash or data loss */
  CRITICAL = 'critical',
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  /** Network-related errors (fetch, timeout, connection) */
  NETWORK = 'network',
  /** Input validation errors */
  VALIDATION = 'validation',
  /** Authentication and authorization errors */
  AUTH = 'auth',
  /** System or runtime errors */
  SYSTEM = 'system',
  /** Database or storage errors */
  STORAGE = 'storage',
  /** UI rendering errors */
  UI = 'ui',
  /** External API errors */
  API = 'api',
  /** Unknown or uncategorized errors */
  UNKNOWN = 'unknown',
}

/**
 * Context information for error logging
 */
export interface ErrorContext {
  /** User ID if available */
  userId?: string;
  /** Current screen or route */
  screen?: string;
  /** Action being performed when error occurred */
  action?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Component stack trace */
  componentStack?: string;
}

/**
 * Structured error log entry
 */
export interface ErrorLog {
  /** Unique ID for this error log */
  id: string;
  /** When the error occurred */
  timestamp: string;
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** Context information */
  context?: ErrorContext;
  /** Whether the error was recovered */
  recovered?: boolean;
  /** Recovery action taken */
  recoveryAction?: string;
}

const ERROR_STORAGE_KEY = '@sazon_error_logs';
const MAX_STORED_ERRORS = 50; // Maximum number of errors to keep in storage

/**
 * Categorize an error based on its message and properties
 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('connection') ||
    name.includes('networkerror')
  ) {
    return ErrorCategory.NETWORK;
  }

  // Auth errors
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('authentication') ||
    message.includes('token')
  ) {
    return ErrorCategory.AUTH;
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('format') ||
    name.includes('validationerror')
  ) {
    return ErrorCategory.VALIDATION;
  }

  // Storage errors
  if (
    message.includes('storage') ||
    message.includes('asyncstorage') ||
    message.includes('database') ||
    message.includes('prisma')
  ) {
    return ErrorCategory.STORAGE;
  }

  // API errors
  if (
    message.includes('api') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('404')
  ) {
    return ErrorCategory.API;
  }

  // UI errors
  if (
    message.includes('render') ||
    message.includes('component') ||
    message.includes('null is not an object') ||
    message.includes('undefined is not an object')
  ) {
    return ErrorCategory.UI;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Determine error severity based on category and context
 */
export function determineErrorSeverity(
  error: Error,
  category: ErrorCategory
): ErrorSeverity {
  const message = error.message.toLowerCase();

  // Critical errors that cause app crashes
  if (
    message.includes('crash') ||
    message.includes('fatal') ||
    message.includes('critical') ||
    error.name === 'FatalError'
  ) {
    return ErrorSeverity.CRITICAL;
  }

  // High severity based on category
  if (category === ErrorCategory.AUTH || category === ErrorCategory.STORAGE) {
    return ErrorSeverity.HIGH;
  }

  // Network errors are usually medium severity
  if (category === ErrorCategory.NETWORK) {
    return ErrorSeverity.MEDIUM;
  }

  // Validation errors are usually low severity
  if (category === ErrorCategory.VALIDATION) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}

/**
 * Log an error with full context and categorization
 */
export async function logError(
  error: Error,
  context?: ErrorContext,
  severity?: ErrorSeverity,
  category?: ErrorCategory
): Promise<void> {
  try {
    // Auto-categorize if not provided
    const errorCategory = category || categorizeError(error);
    const errorSeverity = severity || determineErrorSeverity(error, errorCategory);

    const errorLog: ErrorLog = {
      id: generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      category: errorCategory,
      severity: errorSeverity,
      context,
    };

    // Log to console in development
    if (__DEV__) {
      const severityEmoji = {
        [ErrorSeverity.LOW]: '⚠️',
        [ErrorSeverity.MEDIUM]: '⚠️',
        [ErrorSeverity.HIGH]: '❌',
        [ErrorSeverity.CRITICAL]: '🚨',
      };

      console.error(
        `${severityEmoji[errorSeverity]} [${errorCategory.toUpperCase()}] ${error.message}`
      );
      if (context) {
        console.error('Context:', context);
      }
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }

    // Store error locally
    await storeErrorLog(errorLog);

    // In production, send to error monitoring service
    // Example: Sentry.captureException(error, { extra: { ...context, category, severity } });
  } catch (loggingError) {
    // Don't throw errors from error logging
    console.error('Failed to log error:', loggingError);
  }
}

/**
 * Store error log in AsyncStorage
 */
async function storeErrorLog(errorLog: ErrorLog): Promise<void> {
  try {
    // Get existing errors
    const existingLogs = await getStoredErrors();

    // Add new error to the beginning
    const updatedLogs = [errorLog, ...existingLogs].slice(0, MAX_STORED_ERRORS);

    // Store updated logs
    await AsyncStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(updatedLogs));
  } catch (error) {
    console.error('Failed to store error log:', error);
  }
}

/**
 * Get all stored error logs
 */
export async function getStoredErrors(): Promise<ErrorLog[]> {
  try {
    const storedLogs = await AsyncStorage.getItem(ERROR_STORAGE_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (error) {
    console.error('Failed to retrieve error logs:', error);
    return [];
  }
}

/**
 * Clear all stored error logs
 */
export async function clearErrorLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ERROR_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear error logs:', error);
  }
}

/**
 * Mark an error as recovered
 */
export async function markErrorRecovered(
  errorId: string,
  recoveryAction: string
): Promise<void> {
  try {
    const errors = await getStoredErrors();
    const updatedErrors = errors.map((error) =>
      error.id === errorId
        ? { ...error, recovered: true, recoveryAction }
        : error
    );
    await AsyncStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(updatedErrors));
  } catch (error) {
    console.error('Failed to mark error as recovered:', error);
  }
}

/**
 * Get error statistics for monitoring
 */
export async function getErrorStats(): Promise<{
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  recovered: number;
}> {
  const errors = await getStoredErrors();

  const stats = {
    total: errors.length,
    byCategory: {} as Record<ErrorCategory, number>,
    bySeverity: {} as Record<ErrorSeverity, number>,
    recovered: errors.filter((e) => e.recovered).length,
  };

  // Count by category
  Object.values(ErrorCategory).forEach((category) => {
    stats.byCategory[category] = errors.filter(
      (e) => e.category === category
    ).length;
  });

  // Count by severity
  Object.values(ErrorSeverity).forEach((severity) => {
    stats.bySeverity[severity] = errors.filter(
      (e) => e.severity === severity
    ).length;
  });

  return stats;
}

/**
 * Generate a unique error ID
 */
function generateErrorId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyMessage(
  error: Error,
  category?: ErrorCategory
): string {
  const errorCategory = category || categorizeError(error);

  const messages: Record<ErrorCategory, string> = {
    [ErrorCategory.NETWORK]:
      'Unable to connect to the server. Please check your internet connection and try again.',
    [ErrorCategory.VALIDATION]:
      'Please check your input and try again. Some fields may be invalid.',
    [ErrorCategory.AUTH]:
      'Your session has expired. Please log in again to continue.',
    [ErrorCategory.STORAGE]:
      'Unable to save your data. Please ensure you have enough storage space.',
    [ErrorCategory.API]:
      'Our servers are experiencing issues. Please try again in a few moments.',
    [ErrorCategory.UI]:
      'Something went wrong displaying this screen. Please restart the app.',
    [ErrorCategory.SYSTEM]:
      'An unexpected error occurred. Please restart the app and try again.',
    [ErrorCategory.UNKNOWN]:
      'An unexpected error occurred. If the problem persists, please contact support.',
  };

  return messages[errorCategory] || messages[ErrorCategory.UNKNOWN];
}

/**
 * Get recovery action suggestion based on error type
 */
export function getRecoveryAction(
  error: Error,
  category?: ErrorCategory
): string {
  const errorCategory = category || categorizeError(error);

  const actions: Record<ErrorCategory, string> = {
    [ErrorCategory.NETWORK]: 'Check your connection and retry',
    [ErrorCategory.VALIDATION]: 'Review your input and try again',
    [ErrorCategory.AUTH]: 'Log in again',
    [ErrorCategory.STORAGE]: 'Free up storage space',
    [ErrorCategory.API]: 'Try again later',
    [ErrorCategory.UI]: 'Restart the app',
    [ErrorCategory.SYSTEM]: 'Restart the app',
    [ErrorCategory.UNKNOWN]: 'Contact support if issue persists',
  };

  return actions[errorCategory] || actions[ErrorCategory.UNKNOWN];
}
