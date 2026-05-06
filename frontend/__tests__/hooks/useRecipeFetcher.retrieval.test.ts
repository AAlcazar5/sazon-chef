// ROADMAP 4.0 TB1.3 — Hook resilience over retrieval-vs-rule-based responses.
//
// The retrieval / rule-based switch is server-side; the hook should
// transparently consume either response shape (paginated envelope or
// legacy array) and fall through unchanged on transient errors.

jest.mock('../../lib/api', () => ({
  recipeApi: {
    getAllRecipes: jest.fn(),
  },
}));

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { error: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useRecipeFetcher } from '../../hooks/useRecipeFetcher';
import { recipeApi } from '../../lib/api';

const mockGetAllRecipes = recipeApi.getAllRecipes as jest.Mock;

describe('useRecipeFetcher (TB1.3 retrieval interop)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('consumes the retrieval-shaped paginated response unchanged', async () => {
    mockGetAllRecipes.mockResolvedValueOnce({
      data: {
        recipes: [
          { id: 'r1', title: 'Ravioli', ingredients: [], instructions: [] },
          { id: 'r2', title: 'Risotto', ingredients: [], instructions: [] },
        ],
        pagination: { total: 2, page: 0, limit: 20 },
      },
    });
    const { result } = renderHook(() => useRecipeFetcher());
    let res: any;
    await act(async () => {
      res = await result.current.fetchRecipes({ page: 0, limit: 20 });
    });
    expect(res?.recipes).toHaveLength(2);
    expect(res?.total).toBe(2);
  });

  it('still works when the server falls back to a legacy array response', async () => {
    mockGetAllRecipes.mockResolvedValueOnce({
      data: [
        { id: 'r1', title: 'Pasta', ingredients: [], instructions: [] },
      ],
    });
    const { result } = renderHook(() => useRecipeFetcher());
    let res: any;
    await act(async () => {
      res = await result.current.fetchRecipes({ page: 0, limit: 20 });
    });
    expect(res?.recipes).toHaveLength(1);
  });

  it('returns null without throwing when the server reports an error', async () => {
    mockGetAllRecipes.mockRejectedValueOnce({
      message: 'fail',
      failureClass: 'server_error',
    });
    const onError = jest.fn();
    const { result } = renderHook(() => useRecipeFetcher({ onError }));
    let res: any;
    await act(async () => {
      res = await result.current.fetchRecipes({ page: 0, limit: 20 });
    });
    expect(res).toBeNull();
    expect(onError).toHaveBeenCalled();
  });
});
