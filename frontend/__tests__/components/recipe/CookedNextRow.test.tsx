// frontend/__tests__/components/recipe/CookedNextRow.test.tsx
// ROADMAP 4.0 RD5.2 — "Cooked this and then…" cohort row test.

const mockGetCookedNext = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getCookedNext: (...args: unknown[]) => mockGetCookedNext(...args),
  },
}));

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

const mockTrack = jest.fn();
jest.mock('../../../lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
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
import CookedNextRow from '../../../components/recipe/CookedNextRow';

beforeEach(() => {
  mockGetCookedNext.mockReset();
  mockRouterPush.mockReset();
  mockTrack.mockReset();
});

const mkRecipe = (id: string, title: string, over: Record<string, unknown> = {}) => ({
  id,
  title,
  cuisine: 'persian',
  cookTime: 30,
  imageUrl: null,
  cookCount: 5,
  ...over,
});

const okPayload = (recipes: any[]) => ({
  data: { recipes, privacyOptOut: false, belowKAnonFloor: false },
});

describe('RD5.2 — CookedNextRow', () => {
  it('renders 4 cards when api returns 4', async () => {
    mockGetCookedNext.mockResolvedValueOnce(
      okPayload([
        mkRecipe('a', 'Sumac Chicken'),
        mkRecipe('b', 'Persian Rice'),
        mkRecipe('c', 'Fesenjan'),
        mkRecipe('d', 'Joojeh Kabab'),
      ]),
    );
    const { findByText } = renderWithProviders(
      <CookedNextRow recipeId="anchor" />,
    );
    expect(await findByText('Sumac Chicken')).toBeTruthy();
    expect(await findByText('Persian Rice')).toBeTruthy();
    expect(await findByText('Fesenjan')).toBeTruthy();
    expect(await findByText('Joojeh Kabab')).toBeTruthy();
  });

  it('hides silently when api returns fewer than 4 (privacy floor creep)', async () => {
    mockGetCookedNext.mockResolvedValueOnce(
      okPayload([mkRecipe('a', 'Sumac Chicken'), mkRecipe('b', 'Persian Rice')]),
    );
    const { queryByTestId } = renderWithProviders(
      <CookedNextRow recipeId="anchor" />,
    );
    await waitFor(() => expect(mockGetCookedNext).toHaveBeenCalled());
    expect(queryByTestId('cooked-next-row')).toBeNull();
  });

  it('hides when api returns belowKAnonFloor', async () => {
    mockGetCookedNext.mockResolvedValueOnce({
      data: { recipes: [], privacyOptOut: false, belowKAnonFloor: true },
    });
    const { queryByTestId } = renderWithProviders(
      <CookedNextRow recipeId="anchor" />,
    );
    await waitFor(() => expect(mockGetCookedNext).toHaveBeenCalled());
    expect(queryByTestId('cooked-next-row')).toBeNull();
  });

  it('hides when caller has privacyOptOut', async () => {
    mockGetCookedNext.mockResolvedValueOnce({
      data: { recipes: [], privacyOptOut: true, belowKAnonFloor: false },
    });
    const { queryByTestId } = renderWithProviders(
      <CookedNextRow recipeId="anchor" />,
    );
    await waitFor(() => expect(mockGetCookedNext).toHaveBeenCalled());
    expect(queryByTestId('cooked-next-row')).toBeNull();
  });

  it('hides on null/undefined recipeId without fetching', () => {
    const { queryByTestId } = renderWithProviders(<CookedNextRow recipeId={null} />);
    expect(queryByTestId('cooked-next-row')).toBeNull();
    expect(mockGetCookedNext).not.toHaveBeenCalled();
  });

  it('hides on api error', async () => {
    mockGetCookedNext.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(
      <CookedNextRow recipeId="anchor" />,
    );
    await waitFor(() => expect(mockGetCookedNext).toHaveBeenCalled());
    expect(queryByTestId('cooked-next-row')).toBeNull();
  });

  it('tap navigates to /recipe/<id>?referrer=detail-cookednext + fires analytics', async () => {
    mockGetCookedNext.mockResolvedValueOnce(
      okPayload([
        mkRecipe('a', 'Sumac Chicken'),
        mkRecipe('b', 'Persian Rice'),
        mkRecipe('c', 'Fesenjan'),
        mkRecipe('d', 'Joojeh Kabab'),
      ]),
    );
    const { findByTestId } = renderWithProviders(
      <CookedNextRow recipeId="anchor" />,
    );
    const card = await findByTestId('cooked-next-card-b');
    fireEvent.press(card);
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('/recipe/b'),
    );
    expect(mockRouterPush.mock.calls[0][0]).toMatch(/referrer=detail-cookednext/);
    expect(mockTrack).toHaveBeenCalledWith(
      'recipe_detail_cookednext_tap',
      expect.objectContaining({
        anchorRecipeId: 'anchor',
        targetRecipeId: 'b',
      }),
    );
  });

  it('renders heading "Cooked this and then…"', async () => {
    mockGetCookedNext.mockResolvedValueOnce(
      okPayload([
        mkRecipe('a', 'Sumac Chicken'),
        mkRecipe('b', 'Persian Rice'),
        mkRecipe('c', 'Fesenjan'),
        mkRecipe('d', 'Joojeh Kabab'),
      ]),
    );
    const { findByText } = renderWithProviders(
      <CookedNextRow recipeId="anchor" />,
    );
    expect(await findByText(/cooked this and then/i)).toBeTruthy();
  });

  it('a11y: each card has accessibilityRole + accessibilityLabel', async () => {
    mockGetCookedNext.mockResolvedValueOnce(
      okPayload([
        mkRecipe('a', 'Sumac Chicken'),
        mkRecipe('b', 'Persian Rice'),
        mkRecipe('c', 'Fesenjan'),
        mkRecipe('d', 'Joojeh Kabab'),
      ]),
    );
    const { findByTestId } = renderWithProviders(
      <CookedNextRow recipeId="anchor" />,
    );
    const card = await findByTestId('cooked-next-card-a');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toMatch(/sumac chicken/i);
  });
});
