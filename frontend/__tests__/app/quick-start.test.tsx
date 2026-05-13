// P0 retention — day-1 quick-start screen.
// Smoke + selection logic + save-on-continue.

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

const mockGetRecipes = jest.fn();
const mockSaveRecipe = jest.fn();
jest.mock('../../lib/api/recipe', () => ({
  recipeApi: {
    getRecipes: (...args: unknown[]) => mockGetRecipes(...args),
    saveRecipe: (...args: unknown[]) => mockSaveRecipe(...args),
  },
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../constants/Haptics', () => ({
  HapticPatterns: { buttonPress: jest.fn(), success: jest.fn() },
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

jest.mock('../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return TouchableOpacity;
});

jest.mock('../../components/ui/BrandButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockBrandButton({ label, onPress, testID, accessibilityLabel }: any) {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} accessibilityLabel={accessibilityLabel}>
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import QuickStartScreen from '../../app/quick-start';

const makeRecipe = (id: string, title: string) => ({
  id,
  title,
  description: '',
  cookTime: 25,
  cuisine: 'Mexican',
  difficulty: 'easy',
  servings: 4,
  ingredients: [],
  instructions: [],
  calories: 400,
  protein: 25,
  carbs: 40,
  fat: 12,
  imageUrl: `https://example.com/${id}.jpg`,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveRecipe.mockResolvedValue({ data: { ok: true } });
  mockGetRecipes.mockResolvedValue({
    data: {
      recipes: [
        makeRecipe('r1', 'Tacos al Pastor'),
        makeRecipe('r2', 'Pozole Rojo'),
        makeRecipe('r3', 'Mole Poblano'),
        makeRecipe('r4', 'Enchiladas'),
        makeRecipe('r5', 'Chiles Rellenos'),
      ],
    },
  });
});

describe('<QuickStartScreen />', () => {
  it('renders the pick-a-few headline and the fetched recipes', async () => {
    const { findByText, getByTestId } = render(<QuickStartScreen />);
    await findByText(/Pick a few you'd cook tonight/i);
    expect(getByTestId('quick-start-card-r1')).toBeTruthy();
    expect(getByTestId('quick-start-card-r5')).toBeTruthy();
  });

  it('shows Skip CTA when no recipes are picked', async () => {
    const { findByTestId } = render(<QuickStartScreen />);
    const skip = await findByTestId('quick-start-skip');
    expect(skip).toBeTruthy();
  });

  it('caps selection at MAX_PICKS (3)', async () => {
    const { findByTestId, queryByTestId } = render(<QuickStartScreen />);
    await findByTestId('quick-start-card-r1');

    act(() => {
      fireEvent.press(queryByTestId('quick-start-card-r1')!);
      fireEvent.press(queryByTestId('quick-start-card-r2')!);
      fireEvent.press(queryByTestId('quick-start-card-r3')!);
      fireEvent.press(queryByTestId('quick-start-card-r4')!); // overflow — ignored
    });

    expect(queryByTestId('quick-start-card-r1-checkmark')).toBeTruthy();
    expect(queryByTestId('quick-start-card-r2-checkmark')).toBeTruthy();
    expect(queryByTestId('quick-start-card-r3-checkmark')).toBeTruthy();
    expect(queryByTestId('quick-start-card-r4-checkmark')).toBeNull();
  });

  it('saves each picked recipe and routes to /(tabs) on continue', async () => {
    const { findByTestId, queryByTestId } = render(<QuickStartScreen />);
    await findByTestId('quick-start-card-r1');

    act(() => {
      fireEvent.press(queryByTestId('quick-start-card-r1')!);
      fireEvent.press(queryByTestId('quick-start-card-r3')!);
    });

    const cta = queryByTestId('quick-start-continue');
    expect(cta).toBeTruthy();
    fireEvent.press(cta!);

    await waitFor(() => {
      expect(mockSaveRecipe).toHaveBeenCalledTimes(2);
    });
    expect(mockSaveRecipe).toHaveBeenCalledWith('r1');
    expect(mockSaveRecipe).toHaveBeenCalledWith('r3');
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('Skip routes straight to /(tabs) without saving', async () => {
    const { findByTestId } = render(<QuickStartScreen />);
    const skip = await findByTestId('quick-start-skip');
    fireEvent.press(skip);
    expect(mockSaveRecipe).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('still routes onward even when the recipe fetch fails', async () => {
    mockGetRecipes.mockRejectedValueOnce(new Error('network'));
    const { findByText, findByTestId } = render(<QuickStartScreen />);
    await findByText(/Couldn't pull anything in just yet/i);
    const skip = await findByTestId('quick-start-skip');
    fireEvent.press(skip);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
