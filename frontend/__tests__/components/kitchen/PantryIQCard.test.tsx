// frontend/__tests__/components/kitchen/PantryIQCard.test.tsx
// ROADMAP 4.0 IG10.1 — PantryIQCard test.

const mockGet = jest.fn();
jest.mock('../../../lib/api', () => ({
  pantryIQApi: { get: (...args: unknown[]) => mockGet(...args) },
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
import PantryIQCard from '../../../components/kitchen/PantryIQCard';

beforeEach(() => {
  mockGet.mockReset();
  mockPush.mockReset();
});

describe('PantryIQCard (IG10.1)', () => {
  it('hides when API returns iq: null (cold-start)', async () => {
    mockGet.mockResolvedValue({ data: { iq: null } });
    const { queryByTestId } = renderWithProviders(<PantryIQCard />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('pantry-iq-card')).toBeNull();
  });

  it('hides when API errors', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    const { queryByTestId } = renderWithProviders(<PantryIQCard />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('pantry-iq-card')).toBeNull();
  });

  it('renders the 3 stat rows when all signals are present', async () => {
    mockGet.mockResolvedValue({
      data: {
        iq: {
          topCuisine: { cuisine: 'Mediterranean', cookCount: 12, perWeek: 4 },
          mostUsed: { ingredientName: 'lemon', cookCount: 8 },
          underused: { ingredientName: 'chickpeas', daysSinceLastUse: 23 },
          totalCooksInWindow: 18,
        },
      },
    });
    const { findByTestId, getByText } = renderWithProviders(<PantryIQCard />);
    expect(await findByTestId('pantry-iq-card')).toBeTruthy();
    expect(getByText('Top cuisine')).toBeTruthy();
    expect(getByText('Mediterranean')).toBeTruthy();
    expect(getByText('lemon')).toBeTruthy();
    expect(getByText('chickpeas')).toBeTruthy();
    expect(getByText('Last cooked 23 days ago')).toBeTruthy();
  });

  it('renders only the available rows when some signals are null', async () => {
    mockGet.mockResolvedValue({
      data: {
        iq: {
          topCuisine: { cuisine: 'Italian', cookCount: 5, perWeek: 1.7 },
          mostUsed: null,
          underused: null,
          totalCooksInWindow: 8,
        },
      },
    });
    const { findByTestId, queryByText } = renderWithProviders(<PantryIQCard />);
    await findByTestId('pantry-iq-card');
    expect(queryByText('Top cuisine')).toBeTruthy();
    expect(queryByText('Most-used')).toBeNull();
    expect(queryByText('Underused')).toBeNull();
  });

  it('hides when iq is non-null but has no usable rows', async () => {
    mockGet.mockResolvedValue({
      data: {
        iq: {
          topCuisine: null,
          mostUsed: null,
          underused: null,
          totalCooksInWindow: 9,
        },
      },
    });
    const { queryByTestId } = renderWithProviders(<PantryIQCard />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(queryByTestId('pantry-iq-card')).toBeNull();
  });

  it('tap on the underused row routes to ?craving=<name>', async () => {
    mockGet.mockResolvedValue({
      data: {
        iq: {
          topCuisine: { cuisine: 'Italian', cookCount: 5, perWeek: 1.7 },
          mostUsed: null,
          underused: { ingredientName: 'chickpeas', daysSinceLastUse: 23 },
          totalCooksInWindow: 6,
        },
      },
    });
    const { findByText } = renderWithProviders(<PantryIQCard />);
    // Find the underused row and tap it
    const underusedValue = await findByText('chickpeas');
    fireEvent.press(underusedValue);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toContain('craving=chickpeas');
  });

  it('does not fetch when enabled=false', async () => {
    const { queryByTestId } = renderWithProviders(<PantryIQCard enabled={false} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockGet).not.toHaveBeenCalled();
    expect(queryByTestId('pantry-iq-card')).toBeNull();
  });

  it('lifestyle voice — labels are invitational, never punitive', async () => {
    mockGet.mockResolvedValue({
      data: {
        iq: {
          topCuisine: { cuisine: 'Italian', cookCount: 5, perWeek: 1.7 },
          mostUsed: { ingredientName: 'lemon', cookCount: 3 },
          underused: { ingredientName: 'chickpeas', daysSinceLastUse: 30 },
          totalCooksInWindow: 8,
        },
      },
    });
    const { findByTestId, queryByText } = renderWithProviders(<PantryIQCard />);
    await findByTestId('pantry-iq-card');
    // No verdict / shame copy
    expect(queryByText(/wasted/i)).toBeNull();
    expect(queryByText(/expiring soon/i)).toBeNull();
    expect(queryByText(/you should/i)).toBeNull();
    expect(queryByText(/deficient/i)).toBeNull();
  });
});
