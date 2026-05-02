// frontend/__tests__/hooks/useShoppingList.autoArchive.test.ts
// TDD: Auto-archive on completion hook
// RED phase — written before implementation

jest.mock('../../lib/api', () => ({
  shoppingListApi: {
    archiveOnCompletion: jest.fn(),
  },
  mealPlanApi: {
    getWeeklyPlan: jest.fn().mockResolvedValue({ data: { days: [] } }),
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('../../utils/hapticChoreography', () => ({
  HapticChoreography: {
    shoppingCelebration: jest.fn(),
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { shoppingListApi } from '../../lib/api';
import { HapticChoreography } from '../../utils/hapticChoreography';
import { useAutoArchiveOnCompletion } from '../../hooks/useShoppingList.autoArchive';

function makeItems(allPurchased: boolean, count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    quantity: '1',
    purchased: allPurchased,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

describe('useAutoArchiveOnCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (shoppingListApi.archiveOnCompletion as jest.Mock).mockResolvedValue({
      archivedListId: 'list-1',
      newActiveListId: 'list-new',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires celebration when all items become purchased', () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    const items = makeItems(true);
    const { result } = renderHook(() =>
      useAutoArchiveOnCompletion({
        listId: 'list-1',
        items,
        loading: false,
        onCelebrate,
        onRefresh,
      })
    );

    expect(onCelebrate).toHaveBeenCalledTimes(1);
  });

  it('calls archiveOnCompletion after 10-second grace period', async () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    const items = makeItems(true);
    renderHook(() =>
      useAutoArchiveOnCompletion({
        listId: 'list-1',
        items,
        loading: false,
        onCelebrate,
        onRefresh,
      })
    );

    expect(shoppingListApi.archiveOnCompletion).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(shoppingListApi.archiveOnCompletion).toHaveBeenCalledWith('list-1');
  });

  it('cancels archive when any item is unchecked within grace period', async () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    const allDoneItems = makeItems(true);
    const { rerender } = renderHook(
      ({ items }: { items: typeof allDoneItems }) =>
        useAutoArchiveOnCompletion({
          listId: 'list-1',
          items,
          loading: false,
          onCelebrate,
          onRefresh,
        }),
      { initialProps: { items: allDoneItems } }
    );

    // Within grace period, uncheck one item
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    const partialItems = [...allDoneItems];
    partialItems[0] = { ...partialItems[0], purchased: false };

    rerender({ items: partialItems });

    // Advance past the full 10s — archive should NOT fire
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });

    expect(shoppingListApi.archiveOnCompletion).not.toHaveBeenCalled();
  });

  it('calls onRefresh after archiveOnCompletion resolves', async () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    const items = makeItems(true);
    renderHook(() =>
      useAutoArchiveOnCompletion({
        listId: 'list-1',
        items,
        loading: false,
        onCelebrate,
        onRefresh,
      })
    );

    await act(async () => {
      jest.advanceTimersByTime(10000);
      // Let promise resolve
      await Promise.resolve();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not fire when items list is empty', () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    renderHook(() =>
      useAutoArchiveOnCompletion({
        listId: 'list-1',
        items: [],
        loading: false,
        onCelebrate,
        onRefresh,
      })
    );

    expect(onCelebrate).not.toHaveBeenCalled();
  });

  it('does not fire when loading is true', () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    const items = makeItems(true);
    renderHook(() =>
      useAutoArchiveOnCompletion({
        listId: 'list-1',
        items,
        loading: true,
        onCelebrate,
        onRefresh,
      })
    );

    expect(onCelebrate).not.toHaveBeenCalled();
  });

  it('does not fire when some items are not purchased', () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    const items = makeItems(false);
    renderHook(() =>
      useAutoArchiveOnCompletion({
        listId: 'list-1',
        items,
        loading: false,
        onCelebrate,
        onRefresh,
      })
    );

    expect(onCelebrate).not.toHaveBeenCalled();
  });

  it('does not re-trigger celebration when re-rendered with same all-done state', () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    const items = makeItems(true);
    const { rerender } = renderHook(
      ({ items: i }: { items: typeof items }) =>
        useAutoArchiveOnCompletion({
          listId: 'list-1',
          items: i,
          loading: false,
          onCelebrate,
          onRefresh,
        }),
      { initialProps: { items } }
    );

    expect(onCelebrate).toHaveBeenCalledTimes(1);

    // Re-render with same all-done items
    rerender({ items: [...items] });

    // Should not fire again
    expect(onCelebrate).toHaveBeenCalledTimes(1);
  });

  it('resets and re-triggers if items go from incomplete to complete again', async () => {
    const onCelebrate = jest.fn();
    const onRefresh = jest.fn();

    const incompleteItems = makeItems(false);
    const completeItems = makeItems(true);

    const { rerender } = renderHook(
      ({ items }: { items: typeof incompleteItems }) =>
        useAutoArchiveOnCompletion({
          listId: 'list-1',
          items,
          loading: false,
          onCelebrate,
          onRefresh,
        }),
      { initialProps: { items: incompleteItems } }
    );

    expect(onCelebrate).toHaveBeenCalledTimes(0);

    rerender({ items: completeItems });

    expect(onCelebrate).toHaveBeenCalledTimes(1);
  });
});
