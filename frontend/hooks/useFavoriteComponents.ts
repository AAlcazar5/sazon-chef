// frontend/hooks/useFavoriteComponents.ts
// Group 10X Phase 4 — per-slot affinity data, cached in module-level ref for the session lifetime.

import { useEffect, useRef, useState } from 'react';
import { mealComponentApi } from '../lib/api';
import type { MealComponentSlot } from '../lib/api';

interface AffinityCache {
  favoriteIds: Set<string>;
  scoresById: Map<string, number>;
}

const cache: Partial<Record<MealComponentSlot, AffinityCache>> = {};

export function __resetAffinityCache(): void {
  (Object.keys(cache) as MealComponentSlot[]).forEach((k) => { delete cache[k]; });
}

export function invalidateAffinitySlot(slot: MealComponentSlot): void {
  delete cache[slot];
}

interface UseFavoriteComponentsResult {
  favoriteIds: Set<string>;
  scoresById: Map<string, number>;
  loading: boolean;
}

const EMPTY: UseFavoriteComponentsResult = {
  favoriteIds: new Set(),
  scoresById: new Map(),
  loading: false,
};

export default function useFavoriteComponents(
  slot: MealComponentSlot | null,
): UseFavoriteComponentsResult {
  const [state, setState] = useState<UseFavoriteComponentsResult>(() => {
    if (!slot) return EMPTY;
    const hit = cache[slot];
    if (hit) {
      return { favoriteIds: hit.favoriteIds, scoresById: hit.scoresById, loading: false };
    }
    return { favoriteIds: new Set(), scoresById: new Map(), loading: true };
  });

  const fetchedSlot = useRef<MealComponentSlot | null>(slot && cache[slot] ? slot : null);

  useEffect(() => {
    if (!slot) {
      setState(EMPTY);
      return;
    }
    if (fetchedSlot.current === slot && cache[slot]) return;
    fetchedSlot.current = slot;

    const cached = cache[slot];
    if (cached) {
      setState({ favoriteIds: cached.favoriteIds, scoresById: cached.scoresById, loading: false });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    mealComponentApi.affinity({ slot, limit: 20 })
      .then((res) => {
        if (cancelled) return;
        const favorites = res.data?.favorites ?? [];
        const favoriteIds = new Set(favorites.map((f) => f.componentId));
        const scoresById = new Map(favorites.map((f) => [f.componentId, f.score]));
        cache[slot] = { favoriteIds, scoresById };
        setState({ favoriteIds, scoresById, loading: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ favoriteIds: new Set(), scoresById: new Map(), loading: false });
      });

    return () => { cancelled = true; };
  }, [slot]);

  return state;
}
