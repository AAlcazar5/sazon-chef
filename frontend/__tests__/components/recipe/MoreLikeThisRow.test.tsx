// ROADMAP 4.0 RD2.3 — MoreLikeThisRow tests.

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import MoreLikeThisRow from '../../../components/recipe/MoreLikeThisRow';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: any[]) => mockRouterPush(...args) },
}));

const mockGet = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getSimilarRecipes: (id: string, k?: number) => mockGet(id, k),
  },
}));

beforeEach(() => {
  mockGet.mockReset();
  mockRouterPush.mockReset();
});

const card = (id: string) => ({
  id,
  title: `Recipe ${id}`,
  cuisine: 'Italian',
  cookTime: 25,
  imageUrl: null,
});

describe('MoreLikeThisRow (RD2.3)', () => {
  it('hides silently when recipeId is null', () => {
    const { queryByTestId } = renderWithProviders(<MoreLikeThisRow recipeId={null} />);
    expect(queryByTestId('more-like-this-row')).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders cards when api returns recipes', async () => {
    mockGet.mockResolvedValue({ data: { recipes: [card('r1'), card('r2'), card('r3')] } });
    const { findByTestId } = renderWithProviders(<MoreLikeThisRow recipeId="anchor" />);
    expect(await findByTestId('more-like-this-row')).toBeTruthy();
    expect(await findByTestId('more-like-this-card-r1')).toBeTruthy();
    expect(await findByTestId('more-like-this-card-r2')).toBeTruthy();
  });

  it('hides silently when api returns empty array', async () => {
    mockGet.mockResolvedValue({ data: { recipes: [] } });
    const { queryByTestId } = renderWithProviders(<MoreLikeThisRow recipeId="anchor" />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('more-like-this-row')).toBeNull();
  });

  it('hides silently when api errors', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(<MoreLikeThisRow recipeId="anchor" />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('more-like-this-row')).toBeNull();
  });

  it('tapping a card navigates with referrer tag', async () => {
    mockGet.mockResolvedValue({ data: { recipes: [card('r1')] } });
    const { findByTestId } = renderWithProviders(
      <MoreLikeThisRow recipeId="anchor" referrer="detail-similar" />,
    );
    fireEvent.press(await findByTestId('more-like-this-card-r1'));
    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('referrer=detail-similar'),
    );
    expect(mockRouterPush.mock.calls[0][0]).toContain('/recipe/r1');
  });
});
