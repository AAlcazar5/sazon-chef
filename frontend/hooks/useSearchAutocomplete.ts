// frontend/hooks/useSearchAutocomplete.ts
// Debounced auto-complete hook for search suggestions

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchApi } from '../lib/api';

export interface SearchSuggestion {
  type: 'recipe' | 'cuisine' | 'ingredient';
  text: string;
  highlight: { start: number; end: number };
  metadata?: { cuisine?: string };
}

interface UseSearchAutocompleteReturn {
  suggestions: SearchSuggestion[];
  loading: boolean;
  getSuggestions: (query: string) => void;
  clearSuggestions: () => void;
}

export function useSearchAutocomplete(debounceMs = 300): UseSearchAutocompleteReturn {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef('');

  const getSuggestions = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const trimmed = query.trim();
      lastQueryRef.current = trimmed;

      if (trimmed.length < 2) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      timerRef.current = setTimeout(async () => {
        try {
          const res = await searchApi.getAutoCompleteSuggestions(trimmed);
          // Only apply if this is still the latest query
          if (lastQueryRef.current === trimmed) {
            setSuggestions(res.data?.suggestions || res.suggestions || []);
          }
        } catch {
          if (lastQueryRef.current === trimmed) {
            setSuggestions([]);
          }
        } finally {
          if (lastQueryRef.current === trimmed) {
            setLoading(false);
          }
        }
      }, debounceMs);
    },
    [debounceMs],
  );

  const clearSuggestions = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    lastQueryRef.current = '';
    setSuggestions([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { suggestions, loading, getSuggestions, clearSuggestions };
}
