// frontend/__tests__/hooks/useDailyPlateSeed.test.tsx
// Group 10X Phase 2 — daily seed hook tests.
// P5 (persister): tests now wrap renderHook in QueryClientProvider; the
// "served from cache" path uses queryClient.setQueryData (which is what
// the persister does on cold start hydration).

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../lib/api', () => ({
  mealComponentApi: {
    permutations: jest.fn(),
  },
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mealComponentApi } from '../../lib/api';
import useDailyPlateSeed from '../../hooks/useDailyPlateSeed';
import type { PermutationCandidate } from '../../lib/api';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockPermutations = mealComponentApi.permutations as jest.Mock;

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
}

function withClient(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function todayString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const TODAY = todayString();

const makeComponent = (id: string, slot: string, name: string) => ({
  id, slot, name,
  defaultPortionGrams: 100,
  caloriesPerPortion: 200,
  proteinG: 20, carbsG: 30, fatG: 5,
  cuisineTags: [], dietaryTags: [],
  cookMethodHint: 'simmer',
  pantryIngredientNames: [name.toLowerCase()],
  pantryCoveragePercent: 90,
});

const makeSeedPerm = (proteinId: string, proteinName: string): PermutationCandidate => ({
  id: `perm-${proteinId}`,
  components: [
    { slot: 'protein' as any, component: makeComponent(proteinId, 'protein', proteinName) as any, portionMultiplier: 1 },
    { slot: 'base' as any, component: makeComponent('farro', 'base', 'Farro') as any, portionMultiplier: 1 },
    { slot: 'vegetable' as any, component: makeComponent('carrots', 'vegetable', 'Carrots') as any, portionMultiplier: 1 },
    { slot: 'sauce' as any, component: makeComponent('yogurt', 'sauce', 'Yogurt') as any, portionMultiplier: 1 },
  ],
  coherenceScore: 0.9,
  pantryCoveragePercent: 90,
  macroFitScore: 0.85,
});

const SALMON_PERM = makeSeedPerm('salmon', 'Salmon');
const CHICKEN_PERM = makeSeedPerm('chicken', 'Chicken');

describe('useDailyPlateSeed (P5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);
  });

  it('fetches a fresh seed from the API on first mount', async () => {
    mockPermutations.mockResolvedValue({ data: { permutations: [SALMON_PERM] } });
    const { result } = renderHook(() => useDailyPlateSeed(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.seed).toBeTruthy());
    expect(result.current.seed?.id).toBe(SALMON_PERM.id);
    expect(mockPermutations).toHaveBeenCalled();
  });

  it('persists chosen protein id to AsyncStorage so tomorrow can avoid it', async () => {
    mockPermutations.mockResolvedValue({ data: { permutations: [SALMON_PERM] } });
    renderHook(() => useDailyPlateSeed(), { wrapper: withClient(makeClient()) });
    await waitFor(() =>
      expect(mockSetItem).toHaveBeenCalledWith(
        'daily_plate_seed_yesterday_protein',
        'salmon',
      ),
    );
  });

  it('avoids repeating yesterdays protein when picking a new seed', async () => {
    mockGetItem.mockImplementation((key: string) =>
      key === 'daily_plate_seed_yesterday_protein'
        ? Promise.resolve('salmon')
        : Promise.resolve(null),
    );
    mockPermutations.mockResolvedValue({
      data: { permutations: [SALMON_PERM, CHICKEN_PERM] },
    });
    const { result } = renderHook(() => useDailyPlateSeed(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.seed).toBeTruthy());
    expect(result.current.seed?.id).toBe(CHICKEN_PERM.id);
  });

  it('serves persister-hydrated seed and skips the network', async () => {
    const client = makeClient();
    // Simulate persister hydration: seed today's queryKey before the hook mounts.
    client.setQueryData(['dailyPlateSeed', TODAY], SALMON_PERM);

    const { result } = renderHook(() => useDailyPlateSeed(), {
      wrapper: withClient(client),
    });
    await waitFor(() => expect(result.current.seed).toBeTruthy());
    expect(result.current.seed?.id).toBe(SALMON_PERM.id);
    expect(mockPermutations).not.toHaveBeenCalled();
  });

  it('reroll() invalidates and re-hits the API', async () => {
    mockPermutations
      .mockResolvedValueOnce({ data: { permutations: [SALMON_PERM] } })
      .mockResolvedValueOnce({ data: { permutations: [CHICKEN_PERM] } });
    const { result } = renderHook(() => useDailyPlateSeed(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.seed?.id).toBe(SALMON_PERM.id));
    await act(async () => {
      await result.current.reroll();
    });
    await waitFor(() => expect(result.current.seed?.id).toBe(CHICKEN_PERM.id));
    expect(mockPermutations).toHaveBeenCalledTimes(2);
  });

  it('isStale is always false (date is in the queryKey)', async () => {
    mockPermutations.mockResolvedValue({ data: { permutations: [SALMON_PERM] } });
    const { result } = renderHook(() => useDailyPlateSeed(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => expect(result.current.seed).toBeTruthy());
    expect(result.current.isStale).toBe(false);
  });

  it('returns null seed when the API returns no permutations', async () => {
    mockPermutations.mockResolvedValue({ data: { permutations: [] } });
    const { result } = renderHook(() => useDailyPlateSeed(), {
      wrapper: withClient(makeClient()),
    });
    await waitFor(() => {
      // queryFn resolves to null; the hook surfaces that.
      expect(result.current.seed).toBeNull();
    });
  });

  it('shares one cache entry across multiple consumers (P5 dedup)', async () => {
    mockPermutations.mockResolvedValue({ data: { permutations: [SALMON_PERM] } });
    const client = makeClient();
    const wrapper = withClient(client);
    const a = renderHook(() => useDailyPlateSeed(), { wrapper });
    const b = renderHook(() => useDailyPlateSeed(), { wrapper });
    await waitFor(() => {
      expect(a.result.current.seed).toBeTruthy();
      expect(b.result.current.seed).toBeTruthy();
    });
    expect(mockPermutations).toHaveBeenCalledTimes(1);
  });
});
