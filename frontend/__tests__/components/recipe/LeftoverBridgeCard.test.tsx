// ROADMAP 4.0 RD4.2 — LeftoverBridgeCard tests.

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import LeftoverBridgeCard from '../../../components/recipe/LeftoverBridgeCard';

jest.mock('../../../components/ui/HapticTouchableOpacity', () => {
  const { TouchableOpacity } = require('react-native');
  return function MockHTO(props: any) {
    return <TouchableOpacity {...props} />;
  };
});

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: any[]) => mockPush(...args) },
}));

const mockGet = jest.fn();
jest.mock('../../../lib/api', () => ({
  recipeApi: {
    getLeftoverBridge: (k: number) => mockGet(k),
  },
}));

const recipe = (id: string) => ({ id, title: `Recipe ${id}`, cuisine: 'Italian', cookTime: 25, imageUrl: null });

beforeEach(() => {
  mockGet.mockReset();
  mockPush.mockReset();
});

describe('LeftoverBridgeCard (RD4.2)', () => {
  it('hides silently when api returns no rows', async () => {
    mockGet.mockResolvedValue({ data: { rows: [] } });
    const { queryByTestId } = renderWithProviders(<LeftoverBridgeCard />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('leftover-bridge-card')).toBeNull();
  });

  it('hides silently when first row has no recipes', async () => {
    mockGet.mockResolvedValue({ data: { rows: [{ leftoverIngredient: 'cilantro', expiringIn: 1, recipes: [] }] } });
    const { queryByTestId } = renderWithProviders(<LeftoverBridgeCard />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('leftover-bridge-card')).toBeNull();
  });

  it('renders headline + pills when first row has recipes', async () => {
    mockGet.mockResolvedValue({
      data: { rows: [{ leftoverIngredient: 'cilantro', expiringIn: 1, recipes: [recipe('r1'), recipe('r2'), recipe('r3'), recipe('r4')] }] },
    });
    const { findByTestId, findByText } = renderWithProviders(<LeftoverBridgeCard />);
    expect(await findByTestId('leftover-bridge-card')).toBeTruthy();
    expect(await findByText(/Your cilantro wants to be in something tonight/i)).toBeTruthy();
    // Top-3 cap (recipe r4 is dropped at the surface).
    expect(await findByTestId('leftover-bridge-pill-r1')).toBeTruthy();
    expect(await findByTestId('leftover-bridge-pill-r2')).toBeTruthy();
    expect(await findByTestId('leftover-bridge-pill-r3')).toBeTruthy();
  });

  it('uses lifestyle voice (no expiring/waste/throwing-out copy)', async () => {
    mockGet.mockResolvedValue({
      data: { rows: [{ leftoverIngredient: 'cilantro', expiringIn: 1, recipes: [recipe('r1')] }] },
    });
    const { findByTestId, queryByText } = renderWithProviders(<LeftoverBridgeCard />);
    await findByTestId('leftover-bridge-card');
    expect(queryByText(/expiring/i)).toBeNull();
    expect(queryByText(/waste/i)).toBeNull();
    expect(queryByText(/throwing/i)).toBeNull();
    expect(queryByText(/spoil/i)).toBeNull();
  });

  it('tap on a pill navigates with referrer=detail-bridge', async () => {
    mockGet.mockResolvedValue({
      data: { rows: [{ leftoverIngredient: 'cilantro', expiringIn: 1, recipes: [recipe('r1')] }] },
    });
    const { findByTestId } = renderWithProviders(<LeftoverBridgeCard />);
    fireEvent.press(await findByTestId('leftover-bridge-pill-r1'));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('referrer=detail-bridge'));
    expect(mockPush.mock.calls[0][0]).toContain('/recipe/r1');
  });

  it('does not fetch when enabled=false', async () => {
    const { queryByTestId } = renderWithProviders(<LeftoverBridgeCard enabled={false} />);
    expect(queryByTestId('leftover-bridge-card')).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
