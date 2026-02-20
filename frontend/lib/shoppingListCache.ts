// frontend/lib/shoppingListCache.ts
// AsyncStorage cache for shopping lists + offline sync queue

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShoppingList } from '../types';

// ─── Storage Keys ────────────────────────────────────────────────────────

const CACHE_KEY_LISTS = 'shopping_list_cache_lists';
const CACHE_KEY_DETAIL_PREFIX = 'shopping_list_cache_detail_';
const SYNC_QUEUE_KEY = 'shopping_list_sync_queue';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PendingOperation {
  id: string;
  type: 'togglePurchased';
  listId: string;
  itemId: string;
  payload: { purchased: boolean };
  timestamp: number;
}

interface CachedListDetail {
  data: ShoppingList;
  cachedAt: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Cache Service ───────────────────────────────────────────────────────

export const shoppingListCache = {
  // ── List Overview Cache ──────────────────────────────────────────────

  async cacheLists(lists: ShoppingList[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY_LISTS, JSON.stringify(lists));
    } catch (error) {
      console.error('Error caching shopping lists:', error);
    }
  },

  async getCachedLists(): Promise<ShoppingList[] | null> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEY_LISTS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading cached lists:', error);
      return null;
    }
  },

  // ── List Detail Cache ────────────────────────────────────────────────

  async cacheListDetail(list: ShoppingList): Promise<void> {
    try {
      const cached: CachedListDetail = { data: list, cachedAt: Date.now() };
      await AsyncStorage.setItem(
        `${CACHE_KEY_DETAIL_PREFIX}${list.id}`,
        JSON.stringify(cached),
      );
    } catch (error) {
      console.error('Error caching list detail:', error);
    }
  },

  async getCachedListDetail(listId: string): Promise<CachedListDetail | null> {
    try {
      const data = await AsyncStorage.getItem(`${CACHE_KEY_DETAIL_PREFIX}${listId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading cached list detail:', error);
      return null;
    }
  },

  // ── Sync Queue ───────────────────────────────────────────────────────

  async getQueue(): Promise<PendingOperation[]> {
    try {
      const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading sync queue:', error);
      return [];
    }
  },

  async enqueue(op: Omit<PendingOperation, 'id' | 'timestamp'>): Promise<void> {
    try {
      const queue = await this.getQueue();
      queue.push({ ...op, id: generateId(), timestamp: Date.now() });
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error enqueuing operation:', error);
    }
  },

  async dequeue(operationId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(op => op.id !== operationId);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error dequeuing operation:', error);
    }
  },

  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  },

  deduplicateQueue(queue: PendingOperation[]): PendingOperation[] {
    const latest = new Map<string, PendingOperation>();
    for (const op of queue) {
      const key = `${op.listId}:${op.itemId}:${op.type}`;
      const existing = latest.get(key);
      if (!existing || op.timestamp > existing.timestamp) {
        latest.set(key, op);
      }
    }
    return Array.from(latest.values()).sort((a, b) => a.timestamp - b.timestamp);
  },

  // ── Apply Operation to Cache ─────────────────────────────────────────
  // Updates the on-disk cache so offline changes survive app restarts

  async applyOperationToCache(op: PendingOperation): Promise<void> {
    try {
      const cached = await this.getCachedListDetail(op.listId);
      if (!cached) return;

      const list = cached.data;
      const itemIndex = list.items.findIndex(item => item.id === op.itemId);
      if (itemIndex === -1) return;

      if (op.type === 'togglePurchased') {
        list.items[itemIndex] = {
          ...list.items[itemIndex],
          purchased: op.payload.purchased,
        };
      }

      await this.cacheListDetail(list);
    } catch (error) {
      console.error('Error applying operation to cache:', error);
    }
  },

  // ── Clear All ────────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(
        key => key.startsWith(CACHE_KEY_DETAIL_PREFIX) || key === CACHE_KEY_LISTS || key === SYNC_QUEUE_KEY,
      );
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing shopping list cache:', error);
    }
  },
};
