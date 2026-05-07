// frontend/__tests__/services/capabilityRegistry.test.ts
// ROADMAP 4.0 N6.2 — capabilityRegistry test.

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

import {
  registerCapability,
  isRevealed,
  getRevealedAt,
  markRevealed,
  pickNextReveal,
  MAX_REVEALS_PER_SESSION,
  __resetRegistryForTests,
  __INTERNALS,
} from '../../services/capabilityRegistry';

beforeEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  __resetRegistryForTests();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

describe('N6.2 — registerCapability', () => {
  it('persists a registration accessible via __INTERNALS.getRegisteredKeys', () => {
    registerCapability({
      featureKey: 'pantry-iq',
      priority: 50,
      copyShort: 'New: Pantry IQ',
      copyLong: 'Sazon now reads your pantry to spot what leans toward what.',
    });
    expect(__INTERNALS.getRegisteredKeys()).toContain('pantry-iq');
  });

  it('rejects empty featureKey', () => {
    expect(() =>
      registerCapability({
        featureKey: '',
        priority: 1,
        copyShort: 'x',
        copyLong: 'y',
      }),
    ).toThrow(/featureKey/);
  });

  it('rejects oversized copy', () => {
    expect(() =>
      registerCapability({
        featureKey: 'long-short',
        priority: 1,
        copyShort: 'x'.repeat(50),
        copyLong: 'short long',
      }),
    ).toThrow(/copyShort/);
    expect(() =>
      registerCapability({
        featureKey: 'long-long',
        priority: 1,
        copyShort: 'short',
        copyLong: 'x'.repeat(300),
      }),
    ).toThrow(/copyLong/);
  });

  it('idempotent (last write wins)', () => {
    registerCapability({
      featureKey: 'k',
      priority: 1,
      copyShort: 'first',
      copyLong: 'first long',
    });
    registerCapability({
      featureKey: 'k',
      priority: 99,
      copyShort: 'second',
      copyLong: 'second long',
    });
    expect(__INTERNALS.getRegisteredKeys().length).toBe(1);
  });
});

describe('N6.2 — isRevealed / getRevealedAt', () => {
  it('isRevealed returns false when no AsyncStorage row', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await isRevealed('k')).toBe(false);
  });

  it('isRevealed returns true when AsyncStorage has an ISO date', async () => {
    mockGetItem.mockResolvedValue(new Date().toISOString());
    expect(await isRevealed('k')).toBe(true);
  });

  it('getRevealedAt parses the ISO date', async () => {
    const t = new Date('2026-04-29T10:00:00Z');
    mockGetItem.mockResolvedValue(t.toISOString());
    const result = await getRevealedAt('k');
    expect(result?.toISOString()).toBe(t.toISOString());
  });

  it('getRevealedAt returns null on malformed storage value', async () => {
    mockGetItem.mockResolvedValue('not-a-date');
    expect(await getRevealedAt('k')).toBeNull();
  });

  it('getRevealedAt returns null on AsyncStorage error', async () => {
    mockGetItem.mockRejectedValue(new Error('storage down'));
    expect(await getRevealedAt('k')).toBeNull();
  });

  it('returns null for empty featureKey', async () => {
    expect(await isRevealed('')).toBe(false);
    expect(await getRevealedAt('')).toBeNull();
    expect(mockGetItem).not.toHaveBeenCalled();
  });
});

describe('N6.2 — markRevealed', () => {
  it('persists the timestamp under the canonical key prefix', async () => {
    const t = new Date('2026-05-06T12:00:00Z');
    await markRevealed('pantry-iq', t);
    expect(mockSetItem).toHaveBeenCalledWith(
      '@sazon/capability_registry/revealed/pantry-iq',
      t.toISOString(),
    );
  });

  it('does NOT increment the per-session counter (counter is bumped inside pickNextReveal, not here)', async () => {
    expect(__INTERNALS.getSessionRevealCount()).toBe(0);
    await markRevealed('a');
    expect(__INTERNALS.getSessionRevealCount()).toBe(0);
    await markRevealed('b');
    expect(__INTERNALS.getSessionRevealCount()).toBe(0);
  });

  it('no-ops on empty featureKey', async () => {
    await markRevealed('');
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(__INTERNALS.getSessionRevealCount()).toBe(0);
  });

  it('does not throw on AsyncStorage error', async () => {
    mockSetItem.mockRejectedValue(new Error('storage down'));
    await expect(markRevealed('k')).resolves.not.toThrow();
  });
});

describe('N6.2 — pickNextReveal (per-feature mode)', () => {
  beforeEach(() => {
    registerCapability({
      featureKey: 'pantry-iq',
      priority: 50,
      copyShort: 'New: Pantry IQ',
      copyLong: 'Sazon now reads your pantry.',
    });
  });

  it('returns the registration when feature is unrevealed', async () => {
    mockGetItem.mockResolvedValue(null);
    const reg = await pickNextReveal('pantry-iq');
    expect(reg?.featureKey).toBe('pantry-iq');
  });

  it('returns null when feature is already revealed', async () => {
    mockGetItem.mockResolvedValue(new Date().toISOString());
    expect(await pickNextReveal('pantry-iq')).toBeNull();
  });

  it('returns null for unregistered featureKey', async () => {
    expect(await pickNextReveal('mystery')).toBeNull();
  });
});

describe('N6.2 — pickNextReveal (coordinator mode, no key arg)', () => {
  beforeEach(() => {
    registerCapability({
      featureKey: 'low',
      priority: 10,
      copyShort: 'Low priority',
      copyLong: 'low long',
    });
    registerCapability({
      featureKey: 'mid',
      priority: 50,
      copyShort: 'Mid priority',
      copyLong: 'mid long',
    });
    registerCapability({
      featureKey: 'high',
      priority: 99,
      copyShort: 'High priority',
      copyLong: 'high long',
    });
  });

  it('picks the highest-priority unrevealed feature', async () => {
    mockGetItem.mockResolvedValue(null);
    const reg = await pickNextReveal();
    expect(reg?.featureKey).toBe('high');
  });

  it('skips revealed features', async () => {
    mockGetItem.mockImplementation(async (k: string) =>
      k.includes('high') ? new Date().toISOString() : null,
    );
    const reg = await pickNextReveal();
    expect(reg?.featureKey).toBe('mid');
  });

  it('priority ties break alphabetically by featureKey', async () => {
    __resetRegistryForTests();
    registerCapability({
      featureKey: 'zeta',
      priority: 50,
      copyShort: 'z',
      copyLong: 'zeta long',
    });
    registerCapability({
      featureKey: 'alpha',
      priority: 50,
      copyShort: 'a',
      copyLong: 'alpha long',
    });
    mockGetItem.mockResolvedValue(null);
    const reg = await pickNextReveal();
    expect(reg?.featureKey).toBe('alpha');
  });

  it('returns null when nothing registered', async () => {
    __resetRegistryForTests();
    expect(await pickNextReveal()).toBeNull();
  });

  it('returns null when all are revealed', async () => {
    mockGetItem.mockResolvedValue(new Date().toISOString());
    expect(await pickNextReveal()).toBeNull();
  });
});

describe('N6.2 — per-session cap', () => {
  it('returns null after MAX_REVEALS_PER_SESSION reveals', async () => {
    registerCapability({
      featureKey: 'a',
      priority: 10,
      copyShort: 'a',
      copyLong: 'a',
    });
    registerCapability({
      featureKey: 'b',
      priority: 20,
      copyShort: 'b',
      copyLong: 'b',
    });
    mockGetItem.mockResolvedValue(null);

    // First pick claims the session slot synchronously — second is null due to cap
    const first = await pickNextReveal();
    expect(first).not.toBeNull();
    expect(__INTERNALS.getSessionRevealCount()).toBe(MAX_REVEALS_PER_SESSION);

    const second = await pickNextReveal();
    expect(second).toBeNull();
  });

  it('concurrent picks for different keys: only the first to resolve wins the session slot', async () => {
    registerCapability({
      featureKey: 'a',
      priority: 10,
      copyShort: 'a',
      copyLong: 'a',
    });
    registerCapability({
      featureKey: 'b',
      priority: 20,
      copyShort: 'b',
      copyLong: 'b',
    });
    mockGetItem.mockResolvedValue(null);
    const [first, second] = await Promise.all([
      pickNextReveal('a'),
      pickNextReveal('b'),
    ]);
    // Exactly one is non-null
    const winners = [first, second].filter((r) => r != null);
    expect(winners.length).toBe(1);
    expect(__INTERNALS.getSessionRevealCount()).toBe(MAX_REVEALS_PER_SESSION);
  });

  it('publishes MAX_REVEALS_PER_SESSION as 1 (per spec — never carpet-bomb)', () => {
    expect(MAX_REVEALS_PER_SESSION).toBe(1);
  });
});
