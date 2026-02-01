// __tests__/utils/errorLogger.test.ts
// Tests for centralized error logging service

import {
  categorizeError,
  determineErrorSeverity,
  logError,
  getUserFriendlyMessage,
  getRecoveryAction,
  ErrorCategory,
  ErrorSeverity,
  getStoredErrors,
  clearErrorLogs,
} from '../../utils/errorLogger';

describe('errorLogger', () => {
  beforeEach(async () => {
    // Clear error logs before each test
    await clearErrorLogs();
  });

  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const error = new Error('network request failed');
      expect(categorizeError(error)).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize timeout errors as network', () => {
      const error = new Error('Request timeout');
      expect(categorizeError(error)).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize fetch errors as network', () => {
      const error = new Error('fetch failed');
      expect(categorizeError(error)).toBe(ErrorCategory.NETWORK);
    });

    it('should categorize 401 errors as auth', () => {
      const error = new Error('401 unauthorized');
      expect(categorizeError(error)).toBe(ErrorCategory.AUTH);
    });

    it('should categorize authentication errors as auth', () => {
      const error = new Error('authentication required');
      expect(categorizeError(error)).toBe(ErrorCategory.AUTH);
    });

    it('should categorize validation errors', () => {
      const error = new Error('validation failed');
      expect(categorizeError(error)).toBe(ErrorCategory.VALIDATION);
    });

    it('should categorize invalid input as validation', () => {
      const error = new Error('invalid email format');
      expect(categorizeError(error)).toBe(ErrorCategory.VALIDATION);
    });

    it('should categorize storage errors', () => {
      const error = new Error('AsyncStorage error');
      expect(categorizeError(error)).toBe(ErrorCategory.STORAGE);
    });

    it('should categorize 500 errors as API', () => {
      const error = new Error('500 internal server error');
      expect(categorizeError(error)).toBe(ErrorCategory.API);
    });

    it('should categorize 404 errors as API', () => {
      const error = new Error('404 not found');
      expect(categorizeError(error)).toBe(ErrorCategory.API);
    });

    it('should categorize render errors as UI', () => {
      const error = new Error('Component render failed');
      expect(categorizeError(error)).toBe(ErrorCategory.UI);
    });

    it('should categorize null reference errors as UI', () => {
      const error = new Error('null is not an object');
      expect(categorizeError(error)).toBe(ErrorCategory.UI);
    });

    it('should categorize unknown errors as UNKNOWN', () => {
      const error = new Error('something weird happened');
      expect(categorizeError(error)).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('determineErrorSeverity', () => {
    it('should mark fatal errors as CRITICAL', () => {
      const error = new Error('fatal error occurred');
      const severity = determineErrorSeverity(error, ErrorCategory.SYSTEM);
      expect(severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should mark auth errors as HIGH', () => {
      const error = new Error('unauthorized');
      const severity = determineErrorSeverity(error, ErrorCategory.AUTH);
      expect(severity).toBe(ErrorSeverity.HIGH);
    });

    it('should mark storage errors as HIGH', () => {
      const error = new Error('storage failed');
      const severity = determineErrorSeverity(error, ErrorCategory.STORAGE);
      expect(severity).toBe(ErrorSeverity.HIGH);
    });

    it('should mark network errors as MEDIUM', () => {
      const error = new Error('network error');
      const severity = determineErrorSeverity(error, ErrorCategory.NETWORK);
      expect(severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should mark validation errors as LOW', () => {
      const error = new Error('validation failed');
      const severity = determineErrorSeverity(error, ErrorCategory.VALIDATION);
      expect(severity).toBe(ErrorSeverity.LOW);
    });
  });

  describe('logError', () => {
    it('should log error without throwing', async () => {
      const error = new Error('test error');
      await expect(
        logError(error, {
          userId: 'user123',
          screen: 'TestScreen',
          action: 'Test Action',
        })
      ).resolves.not.toThrow();
    });

    it('should complete without error for network errors', async () => {
      const error = new Error('network request failed');
      await expect(logError(error)).resolves.not.toThrow();
    });

    it('should complete without error for custom category', async () => {
      const error = new Error('custom error');
      await expect(
        logError(error, undefined, undefined, ErrorCategory.VALIDATION)
      ).resolves.not.toThrow();
    });

    it('should complete without error for custom severity', async () => {
      const error = new Error('custom error');
      await expect(
        logError(error, undefined, ErrorSeverity.CRITICAL)
      ).resolves.not.toThrow();
    });

    it('should complete without error', async () => {
      const error = new Error('test error');
      await expect(logError(error)).resolves.not.toThrow();
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should provide friendly message for network errors', () => {
      const error = new Error('network failed');
      const message = getUserFriendlyMessage(error, ErrorCategory.NETWORK);
      expect(message).toContain('internet connection');
    });

    it('should provide friendly message for auth errors', () => {
      const error = new Error('unauthorized');
      const message = getUserFriendlyMessage(error, ErrorCategory.AUTH);
      expect(message).toContain('session has expired');
    });

    it('should provide friendly message for validation errors', () => {
      const error = new Error('invalid input');
      const message = getUserFriendlyMessage(error, ErrorCategory.VALIDATION);
      expect(message).toContain('check your input');
    });

    it('should provide friendly message for storage errors', () => {
      const error = new Error('storage failed');
      const message = getUserFriendlyMessage(error, ErrorCategory.STORAGE);
      expect(message).toContain('storage space');
    });

    it('should provide friendly message for API errors', () => {
      const error = new Error('500 error');
      const message = getUserFriendlyMessage(error, ErrorCategory.API);
      expect(message).toContain('servers are experiencing issues');
    });
  });

  describe('getRecoveryAction', () => {
    it('should suggest checking connection for network errors', () => {
      const error = new Error('network failed');
      const action = getRecoveryAction(error, ErrorCategory.NETWORK);
      expect(action).toContain('connection');
    });

    it('should suggest logging in again for auth errors', () => {
      const error = new Error('unauthorized');
      const action = getRecoveryAction(error, ErrorCategory.AUTH);
      expect(action).toContain('Log in');
    });

    it('should suggest reviewing input for validation errors', () => {
      const error = new Error('invalid input');
      const action = getRecoveryAction(error, ErrorCategory.VALIDATION);
      expect(action).toContain('Review');
    });

    it('should suggest restarting for system errors', () => {
      const error = new Error('system error');
      const action = getRecoveryAction(error, ErrorCategory.SYSTEM);
      expect(action).toContain('Restart');
    });
  });

  describe('storage operations', () => {
    it('should handle storage operations without errors', async () => {
      await expect(logError(new Error('error 1'))).resolves.not.toThrow();
      await expect(logError(new Error('error 2'))).resolves.not.toThrow();
      await expect(logError(new Error('error 3'))).resolves.not.toThrow();
    });

    it('should clear logs without throwing', async () => {
      await expect(clearErrorLogs()).resolves.not.toThrow();
    });

    it('should get stored errors without throwing', async () => {
      const storedErrors = await getStoredErrors();
      expect(Array.isArray(storedErrors)).toBe(true);
    });
  });
});
