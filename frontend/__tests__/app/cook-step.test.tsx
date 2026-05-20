// Tier Y-Live-2 — minimal kitchen-mode step player screen. Loads a
// recipe by id, renders CookStepCard for the current step, prev/next
// navigation, X close → router.back. RED-first: screen does not exist.

const mockHaptic = jest.fn();
jest.mock('expo-haptics', () => ({
  impactAsync: (...a: unknown[]) => mockHaptic(...a),
  notificationAsync: (...a: unknown[]) => mockHaptic(...a),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      background: '#FAF7F4',
      text: { primary: '#111827', secondary: '#6B7280', tertiary: '#9CA3AF' },
    },
  }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('../../lib/api/recipe', () => ({
  recipeApi: { getRecipe: jest.fn() },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CookStepScreen from '../../app/cook-step';
import { recipeApi } from '../../lib/api/recipe';
import { router, useLocalSearchParams } from 'expo-router';

const mockGetRecipe = recipeApi.getRecipe as jest.Mock;
const mockBack = router.back as jest.Mock;
const mockUseLocalSearchParams = useLocalSearchParams as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLocalSearchParams.mockReturnValue({ recipeId: 'rcp_test' });
});

describe('<CookStepScreen />', () => {
  it('loads the recipe + renders step 1; Next advances; Close calls router.back', async () => {
    mockGetRecipe.mockResolvedValue({
      data: {
        title: 'Pizza Margherita',
        imageUrl: 'https://example.com/p.jpg',
        instructions: [
          { text: 'Mix dough.', step: 1 },
          { text: 'Top + bake.', step: 2 },
        ],
      },
    });
    const { findByText, getByLabelText } = render(<CookStepScreen />);
    // Step 1 visible after fetch
    expect(await findByText('Mix dough.')).toBeTruthy();
    // Footer "Step N of M" handled by CookStepCard internally via its
    // step counter; here we assert by stepping forward.
    fireEvent.press(getByLabelText('Next step'));
    expect(await findByText('Top + bake.')).toBeTruthy();
    // Close → router.back
    fireEvent.press(getByLabelText('Close'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('accepts string instructions and treats final step as completion target', async () => {
    mockGetRecipe.mockResolvedValue({
      data: {
        title: 'Single-step',
        instructions: ['Just one thing.'],
      },
    });
    const { findByText, getByLabelText } = render(<CookStepScreen />);
    expect(await findByText('Just one thing.')).toBeTruthy();
    // Last step → Next becomes Finish (CookStepCard contract: isLast).
    expect(getByLabelText('Finish cooking')).toBeTruthy();
  });

  it('shows a graceful error when fetch fails', async () => {
    mockGetRecipe.mockRejectedValue(new Error('network'));
    const { findByText } = render(<CookStepScreen />);
    expect(await findByText(/couldn.?t load/i)).toBeTruthy();
  });

  it('shows a graceful message when recipeId is missing', () => {
    mockUseLocalSearchParams.mockReturnValue({});
    const { getByText } = render(<CookStepScreen />);
    expect(getByText(/no recipe/i)).toBeTruthy();
  });
});
