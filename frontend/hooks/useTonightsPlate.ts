// frontend/hooks/useTonightsPlate.ts
// Group 10X Phase 2 — fetches and caches the plate-from-pantry suggestion.

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mealComponentApi, type PermutationCandidate } from '../lib/api';

const CACHE_KEY = 'tonights_plate_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  ts: number;
  plate: PermutationCandidate | null;
}

interface UseTonightsPlateResult {
  plate: PermutationCandidate | null;
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useTonightsPlate(): UseTonightsPlateResult {
  const [plate, setPlate] = useState<PermutationCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const memCacheRef = useRef<CacheEntry | null>(null);

  const fetchFromApi = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await mealComponentApi.plateFromPantry();
      const fetched = res.data?.plate ?? null;
      const entry: CacheEntry = { ts: Date.now(), plate: fetched };
      memCacheRef.current = entry;
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => undefined);
      setPlate(fetched);
    } catch {
      setError(true);
      setPlate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    memCacheRef.current = null;
    void fetchFromApi();
  }, [fetchFromApi]);

  useEffect(() => {
    async function init() {
      if (memCacheRef.current && Date.now() - memCacheRef.current.ts < CACHE_TTL_MS) {
        setPlate(memCacheRef.current.plate);
        setLoading(false);
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: CacheEntry = JSON.parse(raw);
          if (Date.now() - cached.ts < CACHE_TTL_MS) {
            memCacheRef.current = cached;
            setPlate(cached.plate);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Cache read failed — fall through to API call
      }

      await fetchFromApi();
    }

    void init();
  }, [fetchFromApi]);

  return { plate, loading, error, refetch };
}
