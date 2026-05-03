// Phase 6 (10Y-C): Profile entry point + weekly check-in toggle.
// Free → toggle taps open the paywall. Pro → toggle persists via userApi.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockUpdateMyPreferences = jest.fn();

jest.mock('../../../lib/api', () => ({
  userApi: {
    updateMyPreferences: (...args: unknown[]) =>
      mockUpdateMyPreferences(...args),
  },
}));

const mockUseSubscription = jest.fn();

jest.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => mockUseSubscription(),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

jest.mock('../../../lib/coachAnalytics', () => ({
  emit: jest.fn(),
}));

import CoachMemoryCard from '../../../components/profile/CoachMemoryCard';

describe('CoachMemoryCard', () => {
  beforeEach(() => {
    mockUpdateMyPreferences.mockReset();
    mockUseSubscription.mockReset();
  });

  it('opens paywall when free user taps the weekly check-in row', () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'free', isPremium: false },
      startCheckout: jest.fn(),
    });
    const { getByLabelText, getAllByText } = render(<CoachMemoryCard />);
    fireEvent.press(getByLabelText(/Weekly check-in \(Pro\)/i));
    // Paywall sheet headline contains "weekly check-ins"
    expect(getAllByText(/weekly check-ins/i).length).toBeGreaterThan(0);
    expect(mockUpdateMyPreferences).not.toHaveBeenCalled();
  });

  it('persists weekly check-in toggle for Pro users', async () => {
    mockUseSubscription.mockReturnValue({
      subscription: { tier: 'premium', isPremium: true },
      startCheckout: jest.fn(),
    });
    mockUpdateMyPreferences.mockResolvedValue({ data: { weeklyCheckinOptIn: true } });

    const { getByLabelText } = render(
      <CoachMemoryCard initialWeeklyCheckin={false} />,
    );
    fireEvent(getByLabelText(/Weekly check-in toggle/i), 'valueChange', true);
    await waitFor(() =>
      expect(mockUpdateMyPreferences).toHaveBeenCalledWith({
        weeklyCheckinOptIn: true,
      }),
    );
  });
});
