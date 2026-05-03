// frontend/__tests__/components/meal-plan/NutrientNudge.test.tsx
// Group 10R Surface 5 — NutrientNudge tests (TDD).

jest.mock('../../../hooks/useFoodIntelUserState', () => ({
  __esModule: true,
  default: () => ({ userId: 'user-123' }),
}));

jest.mock('../../../lib/api', () => ({
  pantryApi: { getAll: jest.fn() },
  recipeApi: { getSavedRecipes: jest.fn() },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  createAnimatedComponent: (component: any) => component,
  useReducedMotion: () => false,
}));

import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import NutrientNudge from '../../../components/meal-plan/NutrientNudge';
import { pantryApi, recipeApi } from '../../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const adequateMacros = {
  fiberG: 30,
  proteinG: 120,
  proteinTargetG: 140,
  ingredients: ['spinach', 'rice', 'chicken'],
};

const lowFiberMacros = {
  fiberG: 6,
  proteinG: 130,
  proteinTargetG: 140,
  ingredients: ['spinach', 'beef'],
};

const lowProteinMacros = {
  fiberG: 25,
  proteinG: 60,
  proteinTargetG: 140,
  ingredients: ['spinach', 'rice'],
};

const lowIronMacros = {
  fiberG: 25,
  proteinG: 130,
  proteinTargetG: 140,
  ingredients: ['rice', 'apple', 'cheese'],
};

const multiGapMacros = {
  fiberG: 6,
  proteinG: 60,
  proteinTargetG: 140,
  ingredients: ['rice', 'apple'],
};

beforeEach(() => {
  jest.clearAllMocks();
  (pantryApi.getAll as jest.Mock).mockResolvedValue({ data: { items: [] } });
  (recipeApi.getSavedRecipes as jest.Mock).mockResolvedValue({ data: { recipes: [] } });
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
});

describe('NutrientNudge', () => {
  test('shows fiber nudge when day total fiber < 15g', async () => {
    const { getByTestId, queryAllByText } = render(<NutrientNudge dayMacros={lowFiberMacros} />);
    await flush();
    expect(getByTestId('nutrient-nudge')).toBeTruthy();
    expect(queryAllByText(/fiber/i).length).toBeGreaterThan(0);
  });

  test('shows protein nudge when day total protein < 80% of target', async () => {
    const { getByTestId, queryAllByText } = render(<NutrientNudge dayMacros={lowProteinMacros} />);
    await flush();
    expect(getByTestId('nutrient-nudge')).toBeTruthy();
    expect(queryAllByText(/protein/i).length).toBeGreaterThan(0);
  });

  test('hidden when all nutrients adequate', async () => {
    const { queryByTestId } = render(<NutrientNudge dayMacros={adequateMacros} />);
    await flush();
    expect(queryByTestId('nutrient-nudge')).toBeNull();
  });

  test('max 1 nudge per day view (only one nutrient gap surfaced even if multiple exist)', async () => {
    const { queryAllByTestId } = render(<NutrientNudge dayMacros={multiGapMacros} />);
    await flush();
    expect(queryAllByTestId('nutrient-nudge').length).toBe(1);
  });

  test('actionable text includes a food suggestion (verify the rendered text contains a food name)', async () => {
    const { getByTestId } = render(<NutrientNudge dayMacros={lowFiberMacros} />);
    await flush();
    const nudge = getByTestId('nutrient-nudge');
    const label: string = nudge.props.accessibilityLabel ?? '';
    // Generic fiber fallback mentions pumpkin seeds; pantry/cookbook fallbacks add other foods.
    expect(label.toLowerCase()).toMatch(/pumpkin seeds|chia|oats|black beans|lentils|raspberries/);
  });

  test('pantry-first: when pantry has an iron-rich item, suggestion text references it', async () => {
    (pantryApi.getAll as jest.Mock).mockResolvedValue({
      data: { items: [{ id: '1', name: 'Spinach' }, { id: '2', name: 'Rice' }] },
    });
    const { getByTestId } = render(<NutrientNudge dayMacros={lowIronMacros} />);
    await flush();
    const nudge = getByTestId('nutrient-nudge');
    const label: string = nudge.props.accessibilityLabel ?? '';
    expect(label.toLowerCase()).toContain('spinach');
  });

  test('pantry-first: when pantry empty, falls back to cookbook', async () => {
    (pantryApi.getAll as jest.Mock).mockResolvedValue({ data: { items: [] } });
    (recipeApi.getSavedRecipes as jest.Mock).mockResolvedValue({
      data: {
        recipes: [
          {
            id: 'r1',
            title: 'Beef Stir Fry',
            ingredients: [{ name: 'beef' }, { name: 'soy sauce' }],
          },
        ],
      },
    });
    const { getByTestId } = render(<NutrientNudge dayMacros={lowIronMacros} />);
    await flush();
    const nudge = getByTestId('nutrient-nudge');
    const label: string = nudge.props.accessibilityLabel ?? '';
    expect(label.toLowerCase()).toContain('beef stir fry');
  });

  test('pantry-first: when neither pantry nor cookbook has match, falls back to generic', async () => {
    (pantryApi.getAll as jest.Mock).mockResolvedValue({ data: { items: [] } });
    (recipeApi.getSavedRecipes as jest.Mock).mockResolvedValue({ data: { recipes: [] } });
    const { getByTestId } = render(<NutrientNudge dayMacros={lowIronMacros} />);
    await flush();
    const nudge = getByTestId('nutrient-nudge');
    const label: string = nudge.props.accessibilityLabel ?? '';
    // Generic iron fallback names a known iron-rich food
    expect(label.toLowerCase()).toMatch(/spinach|lentils|beef|sardines/);
  });

  test('dismiss persists for the day (tap dismiss → unmount → re-mount → does not render)', async () => {
    const store: Record<string, string> = {};
    (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
      Promise.resolve(store[k] ?? null),
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
      store[k] = v;
      return Promise.resolve();
    });

    const first = render(<NutrientNudge dayMacros={lowFiberMacros} />);
    await flush();
    const dismiss = first.getByTestId('nutrient-nudge-dismiss');
    fireEvent.press(dismiss);
    await waitFor(() => {
      expect(first.queryByTestId('nutrient-nudge')).toBeNull();
    });
    first.unmount();

    const second = render(<NutrientNudge dayMacros={lowFiberMacros} />);
    await flush();
    expect(second.queryByTestId('nutrient-nudge')).toBeNull();
  });
});
