// frontend/hooks/useCookbookCache.ts
// Cache-first loading + offline sync for cookbook recipes

import { useState, useCallback, useEffect, useRef } from 'react';
import { recipeApi } from '../lib/api';
import { cookbookCache, type PendingCookbookOperation } from '../lib/cookbookCache';
import { useNetworkStatus } from './useNetworkStatus';
import type { SavedRecipe } from '../types';

type ViewMode = 'saved' | 'liked' | 'disliked';

const PAGE_SIZE = 50;

interface UseCookbookCacheReturn {
  recipes: SavedRecipe[];
  loading: boolean;
  loadingMore: boolean;
  cacheAge: number | null;
  isOffline: boolean;
  hasPendingSync: boolean;
  totalRecipes: number;
  hasMore: boolean;
  loadRecipes: (viewMode: ViewMode, collectionIds?: string[]) => Promise<void>;
  loadMore: () => Promise<void>;
  updateNotes: (recipeId: string, notes: string | null) => Promise<void>;
  updateRating: (recipeId: string, rating: number | null) => Promise<void>;
  recordCook: (recipeId: string, notes?: string) => Promise<void>;
  unsaveRecipe: (recipeId: string) => Promise<void>;
  flushSyncQueue: () => Promise<void>;
}

export function useCookbookCache(): UseCookbookCacheReturn {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOnline = isConnected && isInternetReachable;

  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const wasOfflineRef = useRef(false);
  const currentViewModeRef = useRef<ViewMode>('saved');
  const currentPageRef = useRef(0);
  const currentCollectionIdsRef = useRef<string[] | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check for pending sync on mount
  useEffect(() => {
    cookbookCache.getQueue().then(queue => {
      setHasPendingSync(queue.length > 0);
    });
  }, []);

  // ── Load Recipes (cache-first) ─────────────────────────────────────

  const loadRecipes = useCallback(async (viewMode: ViewMode, collectionIds?: string[]) => {
    // Cancel any in-flight request from a previous call
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    currentViewModeRef.current = viewMode;
    currentPageRef.current = 0;
    currentCollectionIdsRef.current = collectionIds;
    setLoading(true);

    // 1. Load from cache immediately
    const cached = await cookbookCache.getCachedRecipes(viewMode);
    if (cached) {
      let cachedData = cached.data;
      // Apply collection filter client-side
      if (collectionIds && collectionIds.length > 0) {
        cachedData = cachedData.filter((r: any) =>
          r.recipeCollections?.some((rc: any) =>
            collectionIds.includes(rc.collectionId || rc.collection?.id),
          ),
        );
      }
      setRecipes(cachedData);
      setTotalRecipes(cachedData.length);
      setCacheAge(Date.now() - cached.cachedAt);
    }

    // 2. If online, fetch first page from API
    if (isOnline) {
      try {
        let response;
        const paginationOpts = { page: 0, limit: PAGE_SIZE };
        const signal = controller.signal;

        if (viewMode === 'liked') {
          response = await recipeApi.getLikedRecipes(paginationOpts, { signal });
        } else if (viewMode === 'disliked') {
          response = await recipeApi.getDislikedRecipes(paginationOpts, { signal });
        } else {
          response = await recipeApi.getSavedRecipes({
            ...paginationOpts,
            collectionId: collectionIds?.join(','),
          }, { signal });
        }

        // If this request was aborted, ignore results
        if (signal.aborted) return;

        const data = response.data;

        // Parse response (handle both array and paginated object formats)
        let freshRecipes: SavedRecipe[] = [];
        let serverTotal = 0;

        if (data && typeof data === 'object' && 'recipes' in data) {
          freshRecipes = (data as any).recipes || [];
          serverTotal = (data as any).pagination?.total ?? freshRecipes.length;
        } else if (Array.isArray(data)) {
          freshRecipes = data;
          serverTotal = data.length;
        }

        // Cache the fetched page
        await cookbookCache.cacheRecipes(viewMode, freshRecipes);
        setCacheAge(null);
        setTotalRecipes(serverTotal);
        setHasMore(freshRecipes.length < serverTotal);

        // Apply collection filter client-side for liked/disliked (saved already filtered server-side)
        let filtered = freshRecipes;
        if (viewMode !== 'saved' && collectionIds && collectionIds.length > 0) {
          filtered = freshRecipes.filter((r: any) =>
            r.recipeCollections?.some((rc: any) =>
              collectionIds.includes(rc.collectionId || rc.collection?.id),
            ),
          );
        }
        setRecipes(filtered);
      } catch (error: any) {
        // Ignore aborted/cancelled requests
        // Axios on React Native can report 'CLIENT_ERROR' with message 'cancelled' when aborted
        if (
          controller.signal.aborted ||
          error?.name === 'AbortError' ||
          error?.code === 'ERR_CANCELED' ||
          error?.message === 'cancelled' ||
          error?.message === 'Request aborted'
        ) return;
        console.error('Error fetching cookbook recipes:', error);
        if (!cached) {
          setRecipes([]);
        }
      }
    } else if (!cached) {
      setRecipes([]);
    }

    setLoading(false);
  }, [isOnline]);

  // ── Load More (next page) ─────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !isOnline) return;

    const nextPage = currentPageRef.current + 1;
    const viewMode = currentViewModeRef.current;
    const collectionIds = currentCollectionIdsRef.current;
    setLoadingMore(true);

    try {
      let response;
      const paginationOpts = { page: nextPage, limit: PAGE_SIZE };

      if (viewMode === 'liked') {
        response = await recipeApi.getLikedRecipes(paginationOpts);
      } else if (viewMode === 'disliked') {
        response = await recipeApi.getDislikedRecipes(paginationOpts);
      } else {
        response = await recipeApi.getSavedRecipes({
          ...paginationOpts,
          collectionId: collectionIds?.join(','),
        });
      }

      const data = response.data;
      let newRecipes: SavedRecipe[] = [];
      let serverTotal = 0;

      if (data && typeof data === 'object' && 'recipes' in data) {
        newRecipes = (data as any).recipes || [];
        serverTotal = (data as any).pagination?.total ?? 0;
      } else if (Array.isArray(data)) {
        newRecipes = data;
      }

      if (newRecipes.length > 0) {
        currentPageRef.current = nextPage;

        // Append new recipes, avoiding duplicates
        setRecipes(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const unique = newRecipes.filter(r => !existingIds.has(r.id));
          const merged = [...prev, ...unique];
          // Update cache with accumulated recipes
          cookbookCache.cacheRecipes(viewMode, merged);
          return merged;
        });

        setHasMore((nextPage + 1) * PAGE_SIZE < serverTotal);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more cookbook recipes:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, isOnline]);

  // ── Mutation Helpers ───────────────────────────────────────────────

  const executeMutation = useCallback(async (
    op: Omit<PendingCookbookOperation, 'id' | 'timestamp'>,
    apiFn: () => Promise<any>,
  ) => {
    const viewMode = currentViewModeRef.current;

    // Apply to cache immediately
    const fullOp: PendingCookbookOperation = {
      ...op,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };
    await cookbookCache.applyOperationToCache(viewMode, fullOp);

    // If online, try API call
    if (isOnline) {
      try {
        await apiFn();
        return; // Success — no need to queue
      } catch (error) {
        console.error(`Error executing ${op.type}:`, error);
        // Fall through to enqueue
      }
    }

    // Offline or API failed — queue for later
    await cookbookCache.enqueue(op);
    setHasPendingSync(true);
  }, [isOnline]);

  // ── Mutations ──────────────────────────────────────────────────────

  const updateNotes = useCallback(async (recipeId: string, notes: string | null) => {
    // Optimistic UI update
    setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, notes } : r));

    await executeMutation(
      { type: 'updateNotes', recipeId, payload: { notes } },
      () => recipeApi.updateSavedMeta(recipeId, { notes }),
    );
  }, [executeMutation]);

  const updateRating = useCallback(async (recipeId: string, rating: number | null) => {
    setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, rating } : r));

    await executeMutation(
      { type: 'updateRating', recipeId, payload: { rating } },
      () => recipeApi.updateSavedMeta(recipeId, { rating }),
    );
  }, [executeMutation]);

  const recordCook = useCallback(async (recipeId: string, notes?: string) => {
    setRecipes(prev => prev.map(r =>
      r.id === recipeId
        ? { ...r, cookCount: (r.cookCount || 0) + 1, lastCooked: new Date().toISOString() }
        : r,
    ));

    await executeMutation(
      { type: 'recordCook', recipeId, payload: { notes } },
      () => recipeApi.recordCook(recipeId, notes),
    );
  }, [executeMutation]);

  const unsaveRecipe = useCallback(async (recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));

    await executeMutation(
      { type: 'unsaveRecipe', recipeId, payload: {} },
      () => recipeApi.unsaveRecipe(recipeId),
    );
  }, [executeMutation]);

  // ── Sync Queue Flush ───────────────────────────────────────────────

  const flushSyncQueue = useCallback(async () => {
    const queue = await cookbookCache.getQueue();
    if (queue.length === 0) {
      setHasPendingSync(false);
      return;
    }

    const deduped = cookbookCache.deduplicateQueue(queue);

    for (const op of deduped) {
      try {
        switch (op.type) {
          case 'updateNotes':
            await recipeApi.updateSavedMeta(op.recipeId, { notes: op.payload.notes });
            break;
          case 'updateRating':
            await recipeApi.updateSavedMeta(op.recipeId, { rating: op.payload.rating });
            break;
          case 'recordCook':
            await recipeApi.recordCook(op.recipeId, op.payload.notes);
            break;
          case 'unsaveRecipe':
            await recipeApi.unsaveRecipe(op.recipeId);
            break;
        }
        await cookbookCache.dequeue(op.id);
      } catch (error: any) {
        // Stop on network errors; skip 404s (recipe deleted server-side)
        if (error?.response?.status === 404) {
          await cookbookCache.dequeue(op.id);
          continue;
        }
        break;
      }
    }

    const remaining = await cookbookCache.getQueue();
    setHasPendingSync(remaining.length > 0);
  }, []);

  // ── Auto-sync on Reconnect ────────────────────────────────────────

  useEffect(() => {
    if (isOnline && wasOfflineRef.current && hasPendingSync) {
      flushSyncQueue();
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, hasPendingSync, flushSyncQueue]);

  return {
    recipes,
    loading,
    loadingMore,
    cacheAge,
    isOffline: !isOnline,
    hasPendingSync,
    totalRecipes,
    hasMore,
    loadRecipes,
    loadMore,
    updateNotes,
    updateRating,
    recordCook,
    unsaveRecipe,
    flushSyncQueue,
  };
}
