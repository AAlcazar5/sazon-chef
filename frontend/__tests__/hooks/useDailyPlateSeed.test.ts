// frontend/__tests__/hooks/useDailyPlateSeed.test.ts
// Group 10X Phase 2 — daily seed hook tests.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../lib/api', () => ({
  mealComponentApi: {
    permutations: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mealComponentApi } from '../../lib/api';
import useDailyPlateSeed from '../../hooks/useDailyPlateSeed';
import type { PermutationCandidate } from '../../lib/api';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockPermutations = mealComponentApi.permutations as jest.Mock;

function dateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const TODAY = dateString(new Date());
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const YESTERDAY = dateString(yesterday);

const makeComponent = (id: string, slot: string, name: string) => ({
  id,
  slot,
  name,
  defaultPortionGrams: 100,
  caloriesPerPortion: 200,
  proteinG: 20,
  carbsG: 30,
  fatG: 5,
  cuisineTags: [],
  dietaryTags: [],
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

describe('useDailyPlateSeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItem.mockResolvedValue(undefined);
  });

  it('returns seed from AsyncStorage when it exists for today', async () => {
    const stored = JSON.stringify({ date: TODAY, permutation: SALMON_PERM });
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'daily_plate_seed') return Promise.resolve(stored);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useDailyPlateSeed());

    await waitFor(() => {
      expect(result.current.seed).toBeTruthy();
    });

    expect(result.current.seed?.id).toBe(SALMON_PERM.id);
    expect(mockPermutations).not.toHaveBeenCalled();
  });

  it('fetches a new seed when stored seed is from a different day (stale)', async () => {
    const stale = JSON.stringify({ date: YESTERDAY, permutation: SALMON_PERM });
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'daily_plate_seed') return Promise.resolve(stale);
      return Promise.resolve(null);
    });
    mockPermutations.mockResolvedValue({ data: { permutations: [CHICKEN_PERM] } });

    const { result } = renderHook(() => useDailyPlateSeed());

    await waitFor(() => {
      expect(result.current.seed?.id).toBe(CHICKEN_PERM.id);
    });

    expect(mockPermutations).toHaveBeenCalled();
    expect(mockSetItem).toHaveBeenCalledWith(
      'daily_plate_seed',
      expect.stringContaining(TODAY),
    );
  });

  it('seed is stable within a day — hook re-mount returns same seed without re-fetching', async () => {
    const stored = JSON.stringify({ date: TODAY, permutation: SALMON_PERM });
    mockGetItem.mockResolvedValue(stored);

    const { result: r1 } = renderHook(() => useDailyPlateSeed());
    await waitFor(() => expect(r1.current.seed).toBeTruthy());

    const { result: r2 } = renderHook(() => useDailyPlateSeed());
    await waitFor(() => expect(r2.current.seed).toBeTruthy());

    expect(r1.current.seed?.id).toBe(r2.current.seed?.id);
    expect(mockPermutations).not.toHaveBeenCalled();
  });

  it('reroll fetches a fresh permutation and persists it', async () => {
    const stored = JSON.stringify({ date: TODAY, permutation: SALMON_PERM });
    mockGetItem.mockResolvedValue(stored);
    mockPermutations.mockResolvedValue({ data: { permutations: [CHICKEN_PERM] } });

    const { result } = renderHook(() => useDailyPlateSeed());
    await waitFor(() => expect(result.current.seed).toBeTruthy());

    await act(async () => {
      await result.current.reroll();
    });

    await waitFor(() => {
      expect(result.current.seed?.id).toBe(CHICKEN_PERM.id);
    });
    expect(mockPermutations).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalled();
  });

  it('avoids repeating yesterdays protein when fetching a new seed', async () => {
    const yesterdayKey = 'daily_plate_seed_yesterday_protein';
    mockGetItem.mockImplementation((key: string) => {
      if (key === 'daily_plate_seed') return Promise.resolve(null);
      if (key === yesterdayKey) return Promise.resolve('salmon');
      return Promise.resolve(null);
    });

    // API returns salmon first, then chicken — hook should skip salmon
    mockPermutations.mockResolvedValue({
      data: { permutations: [SALMON_PERM, CHICKEN_PERM] },
    });

    const { result } = renderHook(() => useDailyPlateSeed());

    await waitFor(() => {
      expect(result.current.seed).toBeTruthy();
    });

    expect(result.current.seed?.id).toBe(CHICKEN_PERM.id);
  });

  it('isStale returns false when seed date matches today', async () => {
    const stored = JSON.stringify({ date: TODAY, permutation: SALMON_PERM });
    mockGetItem.mockResolvedValue(stored);

    const { result } = renderHook(() => useDailyPlateSeed());
    await waitFor(() => expect(result.current.seed).toBeTruthy());

    expect(result.current.isStale).toBe(false);
  });
});
