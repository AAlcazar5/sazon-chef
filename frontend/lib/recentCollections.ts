// frontend/lib/recentCollections.ts
// MRU-ordered list of recently-used collection IDs, persisted in AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@sazon/recent_collection_ids';
const MAX = 10;

export async function getRecentCollectionIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Prepend `ids` to the front of the recent list, de-duplicate, and cap at 10.
 * Skips write if `ids` is empty.
 */
export async function recordRecentCollections(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const existing = await getRecentCollectionIds();
  const combined = [...ids, ...existing.filter(id => !ids.includes(id))].slice(0, MAX);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
}
