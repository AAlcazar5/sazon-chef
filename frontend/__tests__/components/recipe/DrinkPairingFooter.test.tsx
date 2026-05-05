// frontend/__tests__/components/recipe/DrinkPairingFooter.test.tsx
// ROADMAP 4.0 F8 — DrinkPairingFooter (TDD).

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

const mockGet = jest.fn();
jest.mock('../../../lib/api', () => ({
  drinkPairingApi: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import DrinkPairingFooter from '../../../components/recipe/DrinkPairingFooter';

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('<DrinkPairingFooter />', () => {
  it('renders nothing while suggestions are pending', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { queryByTestId } = render(<DrinkPairingFooter cuisine="persian" />);
    expect(queryByTestId('drink-pairing-footer')).toBeNull();
  });

  it('renders the suggestions returned by the API', async () => {
    mockGet.mockResolvedValue({
      data: { suggestions: ['Côtes-du-Rhône', 'sparkling water with mint', 'saffron tea'] },
    });
    const { getByTestId, getByText } = render(<DrinkPairingFooter cuisine="persian" />);
    await flush();
    await waitFor(() => {
      expect(getByTestId('drink-pairing-footer')).toBeTruthy();
      expect(getByText(/Côtes-du-Rhône/)).toBeTruthy();
      expect(getByText(/sparkling water with mint/)).toBeTruthy();
      expect(getByText(/saffron tea/)).toBeTruthy();
    });
  });

  it('skips fetch entirely when cuisine is null', () => {
    render(<DrinkPairingFooter cuisine={null} />);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('skips fetch entirely when cuisine is empty', () => {
    render(<DrinkPairingFooter cuisine="" />);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('hides the card on fetch error (best-effort)', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    const { queryByTestId } = render(<DrinkPairingFooter cuisine="persian" />);
    await flush();
    expect(queryByTestId('drink-pairing-footer')).toBeNull();
  });

  it('hides the card when the API returns an empty suggestions array', async () => {
    mockGet.mockResolvedValue({ data: { suggestions: [] } });
    const { queryByTestId } = render(<DrinkPairingFooter cuisine="persian" />);
    await flush();
    expect(queryByTestId('drink-pairing-footer')).toBeNull();
  });

  it('renders the eyebrow + lifestyle voice ("Drinks well with")', async () => {
    mockGet.mockResolvedValue({
      data: { suggestions: ['something tasty', 'sparkling water'] },
    });
    const { getByText } = render(<DrinkPairingFooter cuisine="thai" />);
    await flush();
    await waitFor(() => {
      expect(getByText('DRINKS WELL WITH')).toBeTruthy();
    });
  });
});
