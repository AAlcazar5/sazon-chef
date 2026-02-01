// __tests__/utils/retryMechanism.test.ts
// Tests for retry mechanism with exponential backoff

import {
  retryWithBackoff,
  isRetryableError,
  fetchWithRetry,
  NETWORK_RETRY_CONFIG,
} from '../../utils/retryMechanism';

// Mock fetch
global.fetch = jest.fn();

describe('retryMechanism', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt if operation succeeds', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockOperation, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(mockOperation, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(
        retryWithBackoff(mockOperation, { maxAttempts: 3, initialDelay: 10 })
      ).rejects.toThrow('fail');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff by default', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn();

      await retryWithBackoff(mockOperation, {
        maxAttempts: 3,
        initialDelay: 10,
        backoffMultiplier: 2,
        onRetry,
      });

      // First retry: 10ms, Second retry: 20ms
      expect(onRetry).toHaveBeenCalledWith(1, 10);
      expect(onRetry).toHaveBeenCalledWith(2, 20);
    });

    it('should respect maxDelay', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn();

      await retryWithBackoff(mockOperation, {
        maxAttempts: 3,
        initialDelay: 50,
        maxDelay: 60,
        backoffMultiplier: 2,
        onRetry,
      });

      // First retry: 50ms, Second retry: capped at 60ms (not 100ms)
      expect(onRetry).toHaveBeenCalledWith(1, 50);
      expect(onRetry).toHaveBeenCalledWith(2, 60);
    });

    it('should use custom shouldRetry function', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('auth error'));

      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(
        retryWithBackoff(mockOperation, {
          maxAttempts: 3,
          initialDelay: 10,
          shouldRetry,
        })
      ).rejects.toThrow('auth error');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not retry
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should not use exponential backoff if disabled', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success');

      const onRetry = jest.fn();

      await retryWithBackoff(mockOperation, {
        maxAttempts: 3,
        initialDelay: 10,
        useExponentialBackoff: false,
        onRetry,
      });

      // Both retries should use same delay
      expect(onRetry).toHaveBeenCalledWith(1, 10);
      expect(onRetry).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      expect(isRetryableError(new Error('network request failed'))).toBe(true);
      expect(isRetryableError(new Error('Network timeout'))).toBe(true);
      expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    });

    it('should identify 5xx errors as retryable', () => {
      expect(isRetryableError(new Error('500 internal server error'))).toBe(true);
      expect(isRetryableError(new Error('502 bad gateway'))).toBe(true);
      expect(isRetryableError(new Error('503 service unavailable'))).toBe(true);
    });

    it('should identify rate limit errors as retryable', () => {
      expect(isRetryableError(new Error('429 too many requests'))).toBe(true);
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true);
    });

    it('should identify 4xx client errors as not retryable', () => {
      expect(isRetryableError(new Error('400 bad request'))).toBe(false);
      expect(isRetryableError(new Error('401 unauthorized'))).toBe(false);
      expect(isRetryableError(new Error('403 forbidden'))).toBe(false);
      expect(isRetryableError(new Error('404 not found'))).toBe(false);
    });

    it('should identify unknown errors as not retryable', () => {
      expect(isRetryableError(new Error('Something went wrong'))).toBe(false);
    });
  });

  describe('fetchWithRetry', () => {
    it('should successfully fetch on first attempt', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await fetchWithRetry('https://api.example.com/data');

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const response = await fetchWithRetry('https://api.example.com/data', undefined, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on 500 error', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const response = await fetchWithRetry('https://api.example.com/data', undefined, {
        maxAttempts: 3,
        initialDelay: 10,
      });

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));

      await expect(
        fetchWithRetry('https://api.example.com/data', undefined, {
          maxAttempts: 2,
          initialDelay: 10,
        })
      ).rejects.toThrow('network error');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should pass fetch options correctly', async () => {
      const mockResponse = { ok: true, status: 200 };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      };

      await fetchWithRetry('https://api.example.com/data', fetchOptions);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        fetchOptions
      );
    });
  });

  describe('NETWORK_RETRY_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(NETWORK_RETRY_CONFIG.maxAttempts).toBe(3);
      expect(NETWORK_RETRY_CONFIG.initialDelay).toBe(1000);
      expect(NETWORK_RETRY_CONFIG.maxDelay).toBe(5000);
      expect(NETWORK_RETRY_CONFIG.useExponentialBackoff).toBe(true);
      expect(NETWORK_RETRY_CONFIG.shouldRetry).toBe(isRetryableError);
    });
  });
});
