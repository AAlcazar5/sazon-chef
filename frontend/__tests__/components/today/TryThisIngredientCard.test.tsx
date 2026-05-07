// frontend/__tests__/components/today/TryThisIngredientCard.test.tsx
// ROADMAP 4.0 IG8.2 — TryThisIngredientCard test.

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
}));

const mockWeekly = jest.fn();
jest.mock('../../../lib/api', () => ({
  ingredientDiscoveryApi: {
    weekly: (...args: unknown[]) => mockWeekly(...args),
  },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success' },
}));

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import TryThisIngredientCard from '../../../components/today/TryThisIngredientCard';

const NOW = new Date('2026-05-06T12:00:00Z');

const mkSuggestion = (over: Partial<any> = {}) => ({
  ingredient: 'sumac',
  cuisine: 'persian',
  primerTitle: 'Why Persian rice gets fluffed, not stirred',
  primerBody:
    "Saffron is the soul; tahdig is the prize. Persian rice is steamed, not boiled.",
  recipeId: 'r-fattoush',
  recipeTitle: 'Fattoush',
  ...over,
});

beforeEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockWeekly.mockReset();
  mockPush.mockReset();
  mockGetItem.mockResolvedValue(null);
});

describe('TryThisIngredientCard (IG8.2)', () => {
  it('hides when API returns suggestion: null', async () => {
    mockWeekly.mockResolvedValue({ data: { suggestion: null } });
    const { queryByTestId } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    await waitFor(() => expect(mockWeekly).toHaveBeenCalled());
    expect(queryByTestId('try-this-ingredient-card')).toBeNull();
  });

  it('hides when API errors', async () => {
    mockWeekly.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    await waitFor(() => expect(mockWeekly).toHaveBeenCalled());
    expect(queryByTestId('try-this-ingredient-card')).toBeNull();
  });

  it('renders ingredient + cuisine eyebrow + primer + recipe pairing', async () => {
    mockWeekly.mockResolvedValue({ data: { suggestion: mkSuggestion() } });
    const { findByTestId, getByText } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    expect(await findByTestId('try-this-ingredient-card')).toBeTruthy();
    expect(getByText('PERSIAN')).toBeTruthy();
    expect(
      getByText('Why Persian rice gets fluffed, not stirred'),
    ).toBeTruthy();
    expect(getByText(/Try Fattoush/)).toBeTruthy();
  });

  it('omits the recipe pill when no recipe pairing was found', async () => {
    mockWeekly.mockResolvedValue({
      data: {
        suggestion: mkSuggestion({ recipeId: null, recipeTitle: null }),
      },
    });
    const { findByTestId, queryByTestId } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    await findByTestId('try-this-ingredient-card');
    expect(queryByTestId('try-this-ingredient-recipe')).toBeNull();
  });

  it('tap on recipe pill routes to /recipe/<id>?referrer=try-this-ingredient', async () => {
    mockWeekly.mockResolvedValue({ data: { suggestion: mkSuggestion() } });
    const { findByTestId } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    fireEvent.press(await findByTestId('try-this-ingredient-recipe'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toContain('referrer=try-this-ingredient');
    expect(mockPush.mock.calls[0][0]).toContain('r-fattoush');
  });

  it('dismiss persists timestamp + hides the card', async () => {
    mockWeekly.mockResolvedValue({ data: { suggestion: mkSuggestion() } });
    const { findByTestId, queryByTestId } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    fireEvent.press(await findByTestId('try-this-ingredient-dismiss'));
    await waitFor(() => expect(mockSetItem).toHaveBeenCalled());
    expect(mockSetItem.mock.calls[0][0]).toBe(
      '@sazon/try_this_ingredient/last_dismissed_at',
    );
    expect(mockSetItem.mock.calls[0][1]).toBe(String(NOW.getTime()));
    expect(queryByTestId('try-this-ingredient-card')).toBeNull();
  });

  it('hides if dismissed within the past 7 days', async () => {
    // Dismissed 3 days ago → still in dismiss window
    mockGetItem.mockResolvedValue(
      String(NOW.getTime() - 3 * 86400000),
    );
    mockWeekly.mockResolvedValue({ data: { suggestion: mkSuggestion() } });
    const { queryByTestId } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());
    // mockWeekly should NOT be called either — dismiss window shorts the fetch
    expect(mockWeekly).not.toHaveBeenCalled();
    expect(queryByTestId('try-this-ingredient-card')).toBeNull();
  });

  it('re-fetches once dismiss window elapses (>7 days)', async () => {
    // Dismissed 8 days ago → window expired
    mockGetItem.mockResolvedValue(
      String(NOW.getTime() - 8 * 86400000),
    );
    mockWeekly.mockResolvedValue({ data: { suggestion: mkSuggestion() } });
    const { findByTestId } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    expect(await findByTestId('try-this-ingredient-card')).toBeTruthy();
  });

  it('does not fetch when enabled=false', async () => {
    const { queryByTestId } = renderWithProviders(
      <TryThisIngredientCard enabled={false} now={NOW} />,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(mockWeekly).not.toHaveBeenCalled();
    expect(queryByTestId('try-this-ingredient-card')).toBeNull();
  });

  it('lifestyle voice — render contains no banned vocabulary', async () => {
    mockWeekly.mockResolvedValue({ data: { suggestion: mkSuggestion() } });
    const { findByTestId, queryByText } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    await findByTestId('try-this-ingredient-card');
    expect(queryByText(/missing/i)).toBeNull();
    expect(queryByText(/you should/i)).toBeNull();
    expect(queryByText(/diverse/i)).toBeNull();
  });

  it('a11y — surface label includes ingredient + cuisine', async () => {
    mockWeekly.mockResolvedValue({ data: { suggestion: mkSuggestion() } });
    const { findByLabelText } = renderWithProviders(
      <TryThisIngredientCard now={NOW} />,
    );
    expect(
      await findByLabelText(/Try this ingredient: sumac from persian/),
    ).toBeTruthy();
  });
});
