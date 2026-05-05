// frontend/__tests__/components/StoreReviewPrompt.test.ts
// ROADMAP 4.0 E5 — store review pre-prompt + cooldown logic.

import {
  bucketForCookCount,
  preromptCopyFor,
  requestStoreReview,
  __testing,
} from '../../lib/storeReview';

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    _store: store,
  };
}

function fakeStoreReview() {
  return {
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    requestReview: jest.fn().mockResolvedValue(undefined),
  };
}

describe('cookHistoryBucket', () => {
  it('≤5 cooks → new', () => {
    expect(bucketForCookCount(0)).toBe('new');
    expect(bucketForCookCount(5)).toBe('new');
  });
  it('6–30 cooks → engaged', () => {
    expect(bucketForCookCount(6)).toBe('engaged');
    expect(bucketForCookCount(30)).toBe('engaged');
  });
  it('30+ cooks → power', () => {
    expect(bucketForCookCount(31)).toBe('power');
    expect(bucketForCookCount(500)).toBe('power');
  });
});

describe('preromptCopyFor', () => {
  it('new bucket copy is the loving-Sazon line', () => {
    expect(preromptCopyFor(2).title).toMatch(/Loving Sazon/i);
  });
  it('engaged bucket interpolates the cook count', () => {
    const copy = preromptCopyFor(12);
    expect(copy.title).toContain('12');
  });
  it('power bucket reads as the power-user line', () => {
    expect(preromptCopyFor(60).title).toMatch(/power user/i);
  });
});

describe('requestStoreReview (E5)', () => {
  it('fires once on first call (no prior timestamp)', async () => {
    const storage = memoryStorage();
    const sr = fakeStoreReview();
    const bucket = await requestStoreReview({ cookCount: 12, storage, storeReview: sr });
    expect(sr.requestReview).toHaveBeenCalledTimes(1);
    expect(bucket).toBe('engaged');
    expect(storage._store.get(__testing.STORAGE_KEY)).toBeTruthy();
  });

  it('respects 30-day cooldown — second call within window is suppressed', async () => {
    const storage = memoryStorage();
    const sr = fakeStoreReview();
    const NOW = 1_700_000_000_000;
    await requestStoreReview({ cookCount: 12, storage, storeReview: sr, now: () => NOW });
    sr.requestReview.mockClear();

    // 10 days later — still in cooldown
    const tenDaysLater = NOW + 10 * 24 * 60 * 60 * 1000;
    const result = await requestStoreReview({
      cookCount: 12,
      storage,
      storeReview: sr,
      now: () => tenDaysLater,
    });
    expect(result).toBeNull();
    expect(sr.requestReview).not.toHaveBeenCalled();
  });

  it('fires again after the cooldown elapses', async () => {
    const storage = memoryStorage();
    const sr = fakeStoreReview();
    const NOW = 1_700_000_000_000;
    await requestStoreReview({ cookCount: 12, storage, storeReview: sr, now: () => NOW });
    sr.requestReview.mockClear();

    const thirtyOneDaysLater = NOW + 31 * 24 * 60 * 60 * 1000;
    const result = await requestStoreReview({
      cookCount: 60,
      storage,
      storeReview: sr,
      now: () => thirtyOneDaysLater,
    });
    expect(result).toBe('power');
    expect(sr.requestReview).toHaveBeenCalledTimes(1);
  });

  it('no-op when StoreReview module is unavailable', async () => {
    const storage = memoryStorage();
    const result = await requestStoreReview({ cookCount: 5, storage, storeReview: null });
    expect(result).toBeNull();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('no-op when isAvailableAsync returns false', async () => {
    const storage = memoryStorage();
    const sr = {
      isAvailableAsync: jest.fn().mockResolvedValue(false),
      requestReview: jest.fn(),
    };
    const result = await requestStoreReview({ cookCount: 5, storage, storeReview: sr });
    expect(result).toBeNull();
    expect(sr.requestReview).not.toHaveBeenCalled();
  });
});

