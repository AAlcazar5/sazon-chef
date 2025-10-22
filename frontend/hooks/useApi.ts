import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api'; // Our configured axios instance
import { Alert } from 'react-native';

// Define the shape of the state returned by the hook
interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Configuration options for the hook
interface UseApiOptions {
  immediate?: boolean; // Whether to fetch immediately on mount
  showErrorAlert?: boolean; // Whether to show an alert on error
}

export function useApi<T = any>(
  url: string, 
  options: UseApiOptions = { immediate: true, showErrorAlert: true }
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(options.immediate ?? true);
  const [error, setError] = useState<string | null>(null);

  // The main fetch function
  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(url);
      setData(response.data);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred';
      setError(errorMessage);
      
      // Show alert if configured to do so
      if (options.showErrorAlert !== false) {
        Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      }
      
      console.error('API Error:', err);
      
    } finally {
      setLoading(false);
    }
  }, [url, options.showErrorAlert]);

  // Fetch data on mount if immediate is true
  useEffect(() => {
    if (options.immediate !== false) {
      fetchData();
    }
  }, [fetchData, options.immediate]);

  // Return the state and a refetch function
  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Specialized hook for POST requests
export function useApiPost<T = any, D = any>(): {
  execute: (url: string, data: D) => Promise<T | null>;
  loading: boolean;
  error: string | null;
} {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (url: string, postData: D): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(url, postData);
      return response.data;
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred';
      setError(errorMessage);
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      console.error('API POST Error:', err);
      return null;
      
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    execute,
    loading,
    error,
  };
}

// Hook for manual API calls (when you don't want automatic fetching)
export function useApiManual<T = any>(): {
  execute: (url: string) => Promise<T | null>;
  loading: boolean;
  error: string | null;
} {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (url: string): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(url);
      return response.data;
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred';
      setError(errorMessage);
      console.error('API Manual Error:', err);
      return null;
      
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    execute,
    loading,
    error,
  };
}