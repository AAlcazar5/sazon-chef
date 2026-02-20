// frontend/lib/cookbookCache.ts
// AsyncStorage cache for cookbook recipes + offline sync queue

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedRecipe } from '../types';

// ─── Storage Keys ────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'cookbook_cache_';
const SYNC_QUEUE_KEY = 'cookbook_sync_queue';

type ViewMode = 'saved' | 'liked' | 'disliked';

function cacheKeyFor(viewMode: ViewMode): string {
  return `${CACHE_KEY_PREFIX}${viewMode}`;
}

// ─── Types ───────────────────────────────────────────────────────────────

interface CachedRecipes {
  data: SavedRecipe[];
  cachedAt: number;
}

export interface PendingCookbookOperation {
  id: string;
  type: 'updateNotes' | 'updateRating' | 'recordCook' | 'unsaveRecipe';
  recipeId: string;
  payload: any;
  timestamp: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Cache Service ───────────────────────────────────────────────────────

export const cookbookCache = {
  // ── Recipe Cache ─────────────────────────────────────────────────────

  async cacheRecipes(viewMode: ViewMode, recipes: SavedRecipe[]): Promise<void> {
    try {
      const cached: CachedRecipes = { data: recipes, cachedAt: Date.now() };
      await AsyncStorage.setItem(cacheKeyFor(viewMode), JSON.stringify(cached));
    } catch (error) {
      console.error('Error caching cookbook recipes:', error);
    }
  },

  async getCachedRecipes(viewMode: ViewMode): Promise<CachedRecipes | null> {
    try {
      const data = await AsyncStorage.getItem(cacheKeyFor(viewMode));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading cached cookbook recipes:', error);
      return null;
    }
  },

  // ── Sync Queue ───────────────────────────────────────────────────────

  async getQueue(): Promise<PendingCookbookOperation[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading cookbook sync queue:', error);
      return [];
    }
  },

  async enqueue(op: Omit<PendingCookbookOperation, 'id' | 'timestamp'>): Promise<void> {
    try {
      const queue = await this.getQueue();
      queue.push({ ...op, id: generateId(), timestamp: Date.now() });
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error enqueuing cookbook operation:', error);
    }
  },

  async dequeue(operationId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(op => op.id !== operationId);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error dequeuing cookbook operation:', error);
    }
  },

  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing cookbook sync queue:', error);
    }
  },

  deduplicateQueue(queue: PendingCookbookOperation[]): PendingCookbookOperation[] {
    const latest = new Map<string, PendingCookbookOperation>();
    for (const op of queue) {
      const key = `${op.recipeId}:${op.type}`;
      const existing = latest.get(key);
      if (!existing || op.timestamp > existing.timestamp) {
        latest.set(key, op);
      }
    }
    return Array.from(latest.values()).sort((a, b) => a.timestamp - b.timestamp);
  },

  // ── Apply Operation to Cache ─────────────────────────────────────────
  // Updates the on-disk cache so offline changes survive app restarts

  async applyOperationToCache(
    viewMode: ViewMode,
    op: PendingCookbookOperation,
  ): Promise<void> {
    try {
      const cached = await this.getCachedRecipes(viewMode);
      if (!cached) return;

      let recipes = cached.data;

      if (op.type === 'unsaveRecipe') {
        recipes = recipes.filter(r => r.id !== op.recipeId);
      } else {
        recipes = recipes.map(r => {
          if (r.id !== op.recipeId) return r;
          switch (op.type) {
            case 'updateNotes':
              return { ...r, notes: op.payload.notes };
            case 'updateRating':
              return { ...r, rating: op.payload.rating };
            case 'recordCook':
              return {
                ...r,
                cookCount: (r.cookCount || 0) + 1,
                lastCooked: new Date().toISOString(),
              };
            default:
              return r;
          }
        });
      }

      await this.cacheRecipes(viewMode, recipes);
    } catch (error) {
      console.error('Error applying operation to cookbook cache:', error);
    }
  },

  // ── Clear All ────────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        key => key.startsWith(CACHE_KEY_PREFIX) || key === SYNC_QUEUE_KEY,
      );
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing cookbook cache:', error);
    }
  },
};
