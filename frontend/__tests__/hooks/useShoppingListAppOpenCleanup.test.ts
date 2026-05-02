// frontend/__tests__/hooks/useShoppingListAppOpenCleanup.test.ts
// TDD: 10Q-ListMgmt tasks 2 & 3 — app-open cleanup hooks + archive tiering

import { renderHook, act } from '@testing-library/react-native';

// ── AsyncStorage mock ─────────────────────────────────────────────────────────
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: any[]) => mockGetItem(...args),
    setItem: (...args: any[]) => mockSetItem(...args),
  },
}));

// ── API mocks ─────────────────────────────────────────────────────────────────
const mockCleanupOrphans = jest.fn();
const mockAutoArchiveStale = jest.fn();
const mockTierArchived = jest.fn();

jest.mock('../../lib/api', () => ({
  shoppingListApi: {
    cleanupOrphans: (...args: any[]) => mockCleanupOrphans(...args),
    autoArchiveStale: (...args: any[]) => mockAutoArchiveStale(...args),
    tierArchived: (...args: any[]) => mockTierArchived(...args),
  },
}));

// ── Toast mock ────────────────────────────────────────────────────────────────
const mockShowToast = jest.fn();
jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast, hideToast: jest.fn() }),
}));

// ── Router mock ───────────────────────────────────────────────────────────────
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: any[]) => mockRouterPush(...args) },
}));

// ── Import hook under test (after mocks) ─────────────────────────────────────
import { useShoppingListAppOpenCleanup } from '../../hooks/useShoppingListAppOpenCleanup';

const CLEANUP_KEY = 'lastShoppingListCleanup';
const MS_24H = 24 * 60 * 60 * 1000;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useShoppingListAppOpenCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCleanupOrphans.mockResolvedValue({ data: { deletedCount: 0 } });
    mockAutoArchiveStale.mockResolvedValue({ data: { archivedIds: [] } });
    mockTierArchived.mockResolvedValue({ data: { tieredCount: 0 } });
    mockGetItem.mockResolvedValue(null); // No previous cleanup by default
    mockSetItem.mockResolvedValue(undefined);
  });

  it('calls cleanupOrphans, autoArchiveStale, and tierArchived on first app open (no stored timestamp)', async () => {
    mockGetItem.mockResolvedValue(null);

    const { result } = renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockCleanupOrphans).toHaveBeenCalledTimes(1);
    expect(mockAutoArchiveStale).toHaveBeenCalledTimes(1);
    expect(mockTierArchived).toHaveBeenCalledTimes(1);
  });

  it('calls all three APIs in parallel (Promise.all pattern)', async () => {
    mockGetItem.mockResolvedValue(null);

    const order: string[] = [];
    mockCleanupOrphans.mockImplementation(() => {
      order.push('cleanup');
      return Promise.resolve({ data: { deletedCount: 0 } });
    });
    mockAutoArchiveStale.mockImplementation(() => {
      order.push('archive');
      return Promise.resolve({ data: { archivedIds: [] } });
    });
    mockTierArchived.mockImplementation(() => {
      order.push('tier');
      return Promise.resolve({ data: { tieredCount: 0 } });
    });

    renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // All three were invoked
    expect(order).toContain('cleanup');
    expect(order).toContain('archive');
    expect(order).toContain('tier');
  });

  it('skips all API calls when cleanup ran within the last 24 hours', async () => {
    const recentTimestamp = (Date.now() - 1000 * 60 * 60).toString(); // 1 hour ago
    mockGetItem.mockResolvedValue(recentTimestamp);

    renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockCleanupOrphans).not.toHaveBeenCalled();
    expect(mockAutoArchiveStale).not.toHaveBeenCalled();
    expect(mockTierArchived).not.toHaveBeenCalled();
  });

  it('runs again when stored timestamp is older than 24 hours', async () => {
    const oldTimestamp = (Date.now() - MS_24H - 1000).toString(); // 24h + 1s ago
    mockGetItem.mockResolvedValue(oldTimestamp);

    renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockCleanupOrphans).toHaveBeenCalledTimes(1);
    expect(mockAutoArchiveStale).toHaveBeenCalledTimes(1);
    expect(mockTierArchived).toHaveBeenCalledTimes(1);
  });

  it('updates AsyncStorage timestamp after successful cleanup', async () => {
    mockGetItem.mockResolvedValue(null);

    renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockSetItem).toHaveBeenCalledWith(CLEANUP_KEY, expect.any(String));
    const storedValue = mockSetItem.mock.calls[0][1];
    expect(Number(storedValue)).toBeGreaterThan(Date.now() - 5000);
  });

  it('shows no toast when autoArchiveStale returns zero archivedIds', async () => {
    mockGetItem.mockResolvedValue(null);
    mockAutoArchiveStale.mockResolvedValue({ data: { archivedIds: [] } });

    renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows batched toast when autoArchiveStale returns non-empty archivedIds', async () => {
    mockGetItem.mockResolvedValue(null);
    mockAutoArchiveStale.mockResolvedValue({ data: { archivedIds: ['list-1', 'list-2', 'list-3'] } });

    renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    const toastMsg: string = mockShowToast.mock.calls[0][0];
    expect(toastMsg).toContain('3');
    expect(toastMsg).toMatch(/archived/i);
  });

  it('does not throw or update timestamp when an API call fails', async () => {
    mockGetItem.mockResolvedValue(null);
    mockCleanupOrphans.mockRejectedValue(new Error('Network error'));
    mockAutoArchiveStale.mockRejectedValue(new Error('Network error'));
    mockTierArchived.mockRejectedValue(new Error('Network error'));

    // Should not throw
    expect(() => {
      renderHook(() => useShoppingListAppOpenCleanup());
    }).not.toThrow();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Timestamp should NOT be written on failure
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('reads from AsyncStorage using the correct key', async () => {
    mockGetItem.mockResolvedValue(null);

    renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockGetItem).toHaveBeenCalledWith(CLEANUP_KEY);
  });

  it('only runs once per hook mount (effect fires once)', async () => {
    mockGetItem.mockResolvedValue(null);

    const { rerender } = renderHook(() => useShoppingListAppOpenCleanup());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    rerender({});

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should still only have been called once despite rerender
    expect(mockCleanupOrphans).toHaveBeenCalledTimes(1);
  });
});
