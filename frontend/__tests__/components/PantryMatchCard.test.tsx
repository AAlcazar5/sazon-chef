// frontend/__tests__/components/PantryMatchCard.test.tsx
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const mockPantryMatch = jest.fn();
jest.mock('../../lib/api', () => ({
  pantryApi: {
    pantryMatch: (...args: any[]) => mockPantryMatch(...args),
  },
}));

import PantryMatchCard from '../../components/home/PantryMatchCard';

function makeRecipes(total: number, nearCount: number) {
  const recipes: Array<{ missingIngredients: string[] }> = [];
  for (let i = 0; i < total - nearCount; i++) recipes.push({ missingIngredients: [] });
  for (let i = 0; i < nearCount; i++) recipes.push({ missingIngredients: ['basil'] });
  return recipes;
}

describe('PantryMatchCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state while fetching', async () => {
    mockPantryMatch.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByTestId } = render(<PantryMatchCard onPress={jest.fn()} />);
    expect(getByTestId('pantry-match-card-loading')).toBeTruthy();
  });

  it('renders nothing when pantry is empty', async () => {
    mockPantryMatch.mockResolvedValue({ data: { recipes: [], pantrySize: 0 } });
    const { queryByTestId } = render(<PantryMatchCard onPress={jest.fn()} />);
    await waitFor(() => {
      expect(queryByTestId('pantry-match-card-loading')).toBeNull();
    });
    expect(queryByTestId('pantry-match-card')).toBeNull();
  });

  it('renders nothing on API error', async () => {
    mockPantryMatch.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = render(<PantryMatchCard onPress={jest.fn()} />);
    await waitFor(() => {
      expect(queryByTestId('pantry-match-card-loading')).toBeNull();
    });
    expect(queryByTestId('pantry-match-card')).toBeNull();
  });

  it('displays total match count when data available', async () => {
    mockPantryMatch.mockResolvedValue({
      data: { recipes: makeRecipes(5, 2), pantrySize: 10 },
    });
    const { getByTestId } = render(<PantryMatchCard onPress={jest.fn()} />);
    await waitFor(() => {
      expect(getByTestId('pantry-match-card-title').props.children).toMatch(/5 recipes/);
    });
  });

  it('toggles to "near matches" count when user taps 1-2 filter', async () => {
    mockPantryMatch.mockResolvedValue({
      data: { recipes: makeRecipes(5, 2), pantrySize: 10 },
    });
    const { getByTestId } = render(<PantryMatchCard onPress={jest.fn()} />);
    await waitFor(() => getByTestId('pantry-match-card'));

    fireEvent.press(getByTestId('pantry-match-toggle-near'));

    await waitFor(() => {
      expect(getByTestId('pantry-match-card-title').props.children).toMatch(/2 recipes/);
    });
  });

  it('calls onPress with no filter in "all" mode', async () => {
    const onPress = jest.fn();
    mockPantryMatch.mockResolvedValue({
      data: { recipes: makeRecipes(3, 1), pantrySize: 10 },
    });
    const { getByTestId } = render(<PantryMatchCard onPress={onPress} />);
    await waitFor(() => getByTestId('pantry-match-card'));

    fireEvent.press(getByTestId('pantry-match-card'));
    expect(onPress).toHaveBeenCalledWith({});
  });

  it('calls onPress with maxMissing:2 filter in "near" mode', async () => {
    const onPress = jest.fn();
    mockPantryMatch.mockResolvedValue({
      data: { recipes: makeRecipes(3, 1), pantrySize: 10 },
    });
    const { getByTestId } = render(<PantryMatchCard onPress={onPress} />);
    await waitFor(() => getByTestId('pantry-match-card'));

    fireEvent.press(getByTestId('pantry-match-toggle-near'));
    fireEvent.press(getByTestId('pantry-match-card'));
    expect(onPress).toHaveBeenCalledWith({ maxMissing: 2 });
  });

  it('fetches pantry-match API with correct params on mount', async () => {
    mockPantryMatch.mockResolvedValue({
      data: { recipes: makeRecipes(1, 0), pantrySize: 5 },
    });
    render(<PantryMatchCard onPress={jest.fn()} />);
    await waitFor(() => {
      expect(mockPantryMatch).toHaveBeenCalledWith({ minMatch: 60, limit: 50 });
    });
  });
});
