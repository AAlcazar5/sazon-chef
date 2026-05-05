// frontend/lib/storeReview.ts
// ROADMAP 4.0 E5 — StoreReview prompt with cooking-history bucketed pre-prompt
// copy + 30-day cooldown. Fires AFTER successful in-store-mode shopping
// completion (highest-satisfaction state).

import AsyncStorage from '@react-native-async-storage/async-storage';

const COOLDOWN_DAYS = 30;
const STORAGE_KEY = '@sazon/store_review_last_prompted_at';

export type CookHistoryBucket = 'new' | 'engaged' | 'power';

export interface PrePromptCopy {
  title: string;
  body: string;
}

export function bucketForCookCount(cookCount: number): CookHistoryBucket {
  if (cookCount <= 5) return 'new';
  if (cookCount <= 30) return 'engaged';
  return 'power';
}

export function preromptCopyFor(cookCount: number): PrePromptCopy {
  const bucket = bucketForCookCount(cookCount);
  switch (bucket) {
    case 'new':
      return {
        title: 'Loving Sazon?',
        body: 'A quick rating helps a lot.',
      };
    case 'engaged':
      return {
        title: `You've cooked ${cookCount} plates this month —`,
        body: 'would you tell others?',
      };
    case 'power':
      return {
        title: "You're a Sazon power user —",
        body: 'your review carries weight.',
      };
  }
}

interface RequestArgs {
  cookCount: number;
  now?: () => number;
  storage?: Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
  storeReview?: {
    isAvailableAsync: () => Promise<boolean>;
    requestReview: () => Promise<void>;
  } | null;
}

function loadStoreReview(): RequestArgs['storeReview'] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-store-review');
  } catch {
    return null;
  }
}

/**
 * Fires StoreReview.requestReview() if the 30-day cooldown has elapsed.
 * Returns the bucket if fired, or `null` if suppressed.
 */
export async function requestStoreReview(args: RequestArgs): Promise<CookHistoryBucket | null> {
  const now = (args.now ?? Date.now)();
  const storage = args.storage ?? AsyncStorage;
  const storeReview = args.storeReview === undefined ? loadStoreReview() : args.storeReview;
  if (!storeReview) return null;

  const last = await storage.getItem(STORAGE_KEY);
  if (last) {
    const elapsedMs = now - Number(last);
    const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (Number.isFinite(elapsedMs) && elapsedMs < cooldownMs) {
      return null;
    }
  }

  const available = await storeReview.isAvailableAsync();
  if (!available) return null;

  await storeReview.requestReview();
  await storage.setItem(STORAGE_KEY, String(now));
  return bucketForCookCount(args.cookCount);
}

export const __testing = {
  STORAGE_KEY,
  COOLDOWN_DAYS,
};
