// frontend/__tests__/components/build-a-plate/PermutationCarousel.test.tsx
// Group 10X Phase 2 — PermutationCarousel component tests.

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', isDark: false }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('../../../lib/api', () => ({
  mealComponentApi: {
    list: jest.fn(),
    permutations: jest.fn(),
  },
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PermutationCarousel from '../../../components/build-a-plate/PermutationCarousel';
import { mealComponentApi } from '../../../lib/api';
import type { PermutationCandidate } from '../../../lib/api';

const mockPermutations = mealComponentApi.permutations as jest.Mock;

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
  pantryCoveragePercent: 80,
});

const makePermutation = (id: string, pantryCoverage: number): PermutationCandidate => ({
  id,
  components: [
    { slot: 'protein' as any, component: makeComponent('p1', 'protein', 'Salmon') as any, portionMultiplier: 1 },
    { slot: 'base' as any, component: makeComponent('b1', 'base', 'Farro') as any, portionMultiplier: 1 },
    { slot: 'vegetable' as any, component: makeComponent('v1', 'vegetable', 'Carrots') as any, portionMultiplier: 1 },
    { slot: 'sauce' as any, component: makeComponent('s1', 'sauce', 'Yogurt') as any, portionMultiplier: 1 },
  ],
  coherenceScore: 0.9,
  pantryCoveragePercent: pantryCoverage,
  macroFitScore: 0.8,
});

const LOCKED_SLOTS = [{ slot: 'protein' as any, componentId: 'p1' }];

describe('PermutationCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when the API returns an empty permutations array', async () => {
    mockPermutations.mockResolvedValue({ data: { permutations: [] } });

    const { queryByTestId } = render(
      <PermutationCarousel
        lockedSlots={LOCKED_SLOTS}
        slotsToFill={['base', 'vegetable', 'sauce'] as any}
        onApply={jest.fn()}
        testID="permutation-carousel"
      />,
    );

    await waitFor(() => {
      expect(mockPermutations).toHaveBeenCalled();
    });

    expect(queryByTestId('permutation-carousel')).toBeNull();
  });

  it('renders N cards matching the API response', async () => {
    const perms = [
      makePermutation('perm-1', 95),
      makePermutation('perm-2', 85),
      makePermutation('perm-3', 75),
    ];
    mockPermutations.mockResolvedValue({ data: { permutations: perms } });

    const { getByTestId } = render(
      <PermutationCarousel
        lockedSlots={LOCKED_SLOTS}
        slotsToFill={['base', 'vegetable', 'sauce'] as any}
        onApply={jest.fn()}
        testID="permutation-carousel"
      />,
    );

    await waitFor(() => {
      expect(getByTestId('permutation-carousel')).toBeTruthy();
    });

    expect(getByTestId('permutation-card-perm-1')).toBeTruthy();
    expect(getByTestId('permutation-card-perm-2')).toBeTruthy();
    expect(getByTestId('permutation-card-perm-3')).toBeTruthy();
  });

  it('tapping a card calls onApply with the full permutation', async () => {
    const perm = makePermutation('perm-1', 95);
    mockPermutations.mockResolvedValue({ data: { permutations: [perm] } });

    const onApply = jest.fn();
    const { getByTestId } = render(
      <PermutationCarousel
        lockedSlots={LOCKED_SLOTS}
        slotsToFill={['base', 'vegetable', 'sauce'] as any}
        onApply={onApply}
        testID="permutation-carousel"
      />,
    );

    await waitFor(() => {
      expect(getByTestId('permutation-card-perm-1')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('permutation-card-perm-1'));
    });

    expect(onApply).toHaveBeenCalledWith(perm);
  });

  it('passes correct body to permutations API', async () => {
    mockPermutations.mockResolvedValue({ data: { permutations: [] } });

    render(
      <PermutationCarousel
        lockedSlots={LOCKED_SLOTS}
        slotsToFill={['base', 'vegetable', 'sauce'] as any}
        onApply={jest.fn()}
        testID="permutation-carousel"
      />,
    );

    await waitFor(() => {
      expect(mockPermutations).toHaveBeenCalledWith({
        lockedSlots: LOCKED_SLOTS,
        slotsToFill: ['base', 'vegetable', 'sauce'],
        maxResults: 6,
        prioritizePantry: true,
      });
    });
  });
});
