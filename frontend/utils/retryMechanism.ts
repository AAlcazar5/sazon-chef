// frontend/utils/retryMechanism.ts
// Retry mechanism with exponential backoff for failed operations

import { logError, ErrorCategory, ErrorSeverity } from './errorLogger';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Whether to use exponential backoff (default: true) */
  useExponentialBackoff?: boolean;
  /** Function to determine if error is retryable (default: retry all) */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback on each retry attempt */
  onRetry?: (attempt: number, delay: number) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  useExponentialBackoff: true,
  shouldRetry: () => true,
  onRetry: () => {},
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  useExponentialBackoff: boolean
): number {
  if (!useExponentialBackoff) {
    return initialDelay;
  }

  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Execute an async operation with retry logic and exponential backoff
 *
 * @example
 * // Basic retry with defaults
 * const result = await retryWithBackoff(() => fetchUserData(userId));
 *
 * @example
 * // Custom retry configuration
 * const result = await retryWithBackoff(
 *   () => uploadImage(file),
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 2000,
 *     shouldRetry: (error) => error.message.includes('network'),
 *     onRetry: (attempt, delay) => console.log(`Retry ${attempt} in ${delay}ms`),
 *   }
 * );
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      const shouldRetry = finalConfig.shouldRetry(lastError, attempt);

      // If this is the last attempt or error is not retryable, throw
      if (attempt === finalConfig.maxAttempts || !shouldRetry) {
        // Log the final failure
        await logError(lastError, {
          action: 'Retry Failed',
          metadata: {
            attempts: attempt,
            maxAttempts: finalConfig.maxAttempts,
            retryable: shouldRetry,
          },
        });
        throw lastError;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(
        attempt,
        finalConfig.initialDelay,
        finalConfig.maxDelay,
        finalConfig.backoffMultiplier,
        finalConfig.useExponentialBackoff
      );

      // Log retry attempt
      if (__DEV__) {
        console.warn(
          `Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${delay}ms:`,
          lastError.message
        );
      }

      // Callback before retry
      finalConfig.onRetry(attempt, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Check if an error is retryable based on common patterns
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors are usually retryable
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('fetch failed') ||
    name.includes('networkerror')
  ) {
    return true;
  }

  // Server errors (5xx) are usually retryable
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return true;
  }

  // Rate limit errors are retryable with backoff
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }

  // Client errors (4xx) are usually not retryable
  if (
    message.includes('400') ||
    message.includes('401') ||
    message.includes('403') ||
    message.includes('404')
  ) {
    return false;
  }

  // Default to not retryable for unknown errors
  return false;
}

/**
 * Retry configuration for network requests
 */
export const NETWORK_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 2,
  useExponentialBackoff: true,
  shouldRetry: isRetryableError,
};

/**
 * Retry configuration for API calls
 */
export const API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1500,
  maxDelay: 10000,
  backoffMultiplier: 2,
  useExponentialBackoff: true,
  shouldRetry: isRetryableError,
};

/**
 * Retry configuration for storage operations
 */
export const STORAGE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  initialDelay: 500,
  maxDelay: 2000,
  backoffMultiplier: 2,
  useExponentialBackoff: false,
  shouldRetry: (error) => {
    const message = error.message.toLowerCase();
    return message.includes('storage') || message.includes('async');
  },
};

/**
 * Wrapper for fetch with automatic retry
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig: RetryConfig = NETWORK_RETRY_CONFIG
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, options);

    // Throw error for non-ok responses so they can be retried
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      throw error;
    }

    return response;
  }, retryConfig);
}
