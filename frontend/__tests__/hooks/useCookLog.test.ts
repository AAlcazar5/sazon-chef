// W-D Phase 1 / D-1 FE — useCookLog. Cursor-paged Cook Log reader.
// W-D1 invariant: the hook NEVER exposes a total/count — only entries +
// hasMore (driven by an opaque cursor). Memory surface, not a countable
// catalog.

jest.mock('../../lib/api/cook', () => ({
  cookApi: { getCookLog: jest.fn() },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCookLog } from '../../hooks/useCookLog';
import { cookApi } from '../../lib/api/cook';

const getCookLog = cookApi.getCookLog as jest.Mock;
const page = (ids: string[], nextCursor: string | null) => ({
  entries: ids.map((id) => ({
    id,
    type: 'made_it',
    recipeId: null,
    payload: {},
    createdAt: `2026-05-1${id}T10:00:00Z`,
  })),
  nextCursor,
});

beforeEach(() => getCookLog.mockReset());

describe('useCookLog', () => {
  it('loads the first page and never exposes a total/count', async () => {
    getCookLog.mockResolvedValueOnce(page(['1', '2'], 'cursor-A'));
    const { result } = renderHook(() => useCookLog());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e: any) => e.id)).toEqual(['1', '2']);
    expect(result.current.hasMore).toBe(true);
    // W-D1: no count surface of any kind.
    expect((result.current as any).total).toBeUndefined();
    expect((result.current as any).count).toBeUndefined();
    expect(Object.keys(result.current)).not.toContain('total');
  });

  it('loadMore forwards the opaque cursor and appends (no dupes)', async () => {
    getCookLog
      .mockResolvedValueOnce(page(['1', '2'], 'cursor-A'))
      .mockResolvedValueOnce(page(['3'], null));
    const { result } = renderHook(() => useCookLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(getCookLog.mock.calls[1][0]).toEqual(
      expect.objectContaining({ cursor: 'cursor-A' }),
    );
    expect(result.current.entries.map((e: any) => e.id)).toEqual(['1', '2', '3']);
    expect(result.current.hasMore).toBe(false); // nextCursor null → exhausted
  });

  it('loadMore is a no-op once exhausted (no nextCursor)', async () => {
    getCookLog.mockResolvedValueOnce(page(['1'], null));
    const { result } = renderHook(() => useCookLog());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);

    await act(async () => {
      await result.current.loadMore();
    });
    expect(getCookLog).toHaveBeenCalledTimes(1); // no extra fetch
  });

  it('surfaces an error without throwing; entries stay empty', async () => {
    getCookLog.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useCookLog());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.entries).toEqual([]);
  });

  it('refresh re-fetches from the top (cursor reset)', async () => {
    getCookLog
      .mockResolvedValueOnce(page(['1', '2'], 'cursor-A'))
      .mockResolvedValueOnce(page(['9'], 'cursor-Z'));
    const { result } = renderHook(() => useCookLog());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });
    // second call has no cursor (fresh top)
    expect(getCookLog.mock.calls[1][0] ?? {}).not.toHaveProperty('cursor');
    expect(result.current.entries.map((e: any) => e.id)).toEqual(['9']);
  });
});
